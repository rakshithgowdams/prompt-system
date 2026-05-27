import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  buildCorsHeaders, getClientIp, checkRateLimit,
  tooManyRequestsResponse, isValidString, logAudit, safeErrorResponse, adminClient,
} from "../_shared/security.ts";

const RECAPTCHA_SECRET = Deno.env.get("RECAPTCHA_SECRET_KEY") ?? "";
const MIN_SCORE = 0.5;

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
      await logAudit(supabase, { action: "verify-recaptcha.rate_limited", metadata: { action }, ip });
      return tooManyRequestsResponse(limit, corsHeaders);
    }

    if (!RECAPTCHA_SECRET) {
      // Secret not configured — skip verification in dev, warn
      console.warn("[verify-recaptcha] RECAPTCHA_SECRET_KEY not set — skipping verification");
      return new Response(JSON.stringify({ success: true, score: 1.0, skipped: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: RECAPTCHA_SECRET, response: token }),
    });

    const result = await verifyRes.json() as {
      success: boolean;
      score: number;
      action: string;
      "error-codes"?: string[];
    };

    if (!result.success) {
      await logAudit(supabase, {
        action: "verify-recaptcha.google_failure",
        metadata: { recaptcha_action: action, error_codes: result["error-codes"] },
        ip,
      });
      return new Response(JSON.stringify({ success: false, error: "recaptcha_failed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (result.score < MIN_SCORE) {
      await logAudit(supabase, {
        action: "verify-recaptcha.low_score",
        metadata: { recaptcha_action: action, score: result.score },
        ip,
      });
      return new Response(JSON.stringify({ success: false, error: "bot_detected", score: result.score }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optionally validate action matches expected
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

  } catch (err) {
    return safeErrorResponse(err, corsHeaders);
  }
});
