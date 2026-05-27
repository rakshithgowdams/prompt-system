import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  buildCorsHeaders, getClientIp, checkRateLimit,
  tooManyRequestsResponse, isValidString, logAudit, safeErrorResponse, adminClient,
} from "../_shared/security.ts";

const RECAPTCHA_SECRET_V3 = Deno.env.get("RECAPTCHA_SECRET_KEY") ?? "";
const RECAPTCHA_SECRET_V2 = Deno.env.get("RECAPTCHA_V2_SECRET_KEY") ?? "";
const MIN_SCORE_V3 = 0.5;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = buildCorsHeaders(origin, false);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (!corsHeaders["Access-Control-Allow-Origin"]) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = typeof body.token === "string" ? body.token.trim() : "";
    const action = typeof body.action === "string" ? body.action.trim() : "";
    // version: "v2" | "v3" (default v3)
    const version = typeof body.version === "string" ? body.version : "v3";

    if (!isValidString(token, 1, 4096)) {
      return new Response(JSON.stringify({ error: "missing_token" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = getClientIp(req);
    const supabase = adminClient();

    // Rate limit: 20 verifications per minute per IP
    const limit = await checkRateLimit(supabase,
      { bucket: "verify-recaptcha", max: 20, windowSeconds: 60, keyBy: "ip" }, ip);
    if (!limit.allowed) {
      await logAudit(supabase, { action: "verify-recaptcha.rate_limited", metadata: { action, version }, ip });
      return tooManyRequestsResponse(limit, corsHeaders);
    }

    const secret = version === "v2" ? RECAPTCHA_SECRET_V2 : RECAPTCHA_SECRET_V3;

    if (!secret) {
      // Secret not configured — skip verification in dev
      console.warn(`[verify-recaptcha] secret for ${version} not set — skipping`);
      return new Response(JSON.stringify({ success: true, score: 1.0, skipped: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });

    const result = await verifyRes.json() as {
      success: boolean;
      score?: number;
      action?: string;
      "error-codes"?: string[];
    };

    if (!result.success) {
      await logAudit(supabase, {
        action: `verify-recaptcha.${version}_failure`,
        metadata: { recaptcha_action: action, error_codes: result["error-codes"] },
        ip,
      });
      return new Response(JSON.stringify({ success: false, error: "recaptcha_failed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // v3-only: score check and action validation
    if (version === "v3") {
      const score = result.score ?? 0;
      if (score < MIN_SCORE_V3) {
        await logAudit(supabase, {
          action: "verify-recaptcha.low_score",
          metadata: { recaptcha_action: action, score },
          ip,
        });
        return new Response(JSON.stringify({ success: false, error: "bot_detected", score }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action && result.action && result.action !== action) {
        await logAudit(supabase, {
          action: "verify-recaptcha.action_mismatch",
          metadata: { expected: action, received: result.action },
          ip,
        });
        return new Response(JSON.stringify({ success: false, error: "action_mismatch" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, score: result.score }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // v2: success = checkbox was solved
    await logAudit(supabase, { action: "verify-recaptcha.v2_success", metadata: { recaptcha_action: action }, ip });
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return safeErrorResponse(err, corsHeaders);
  }
});
