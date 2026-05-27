import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient, buildCorsHeaders, getClientIp,
  checkRateLimit, tooManyRequestsResponse,
  isValidEmail, logAudit, safeErrorResponse,
} from "../_shared/security.ts";
import { verifyCaptchaToken } from "../_shared/verify-captcha.ts";

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = buildCorsHeaders(origin, false);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!corsHeaders["Access-Control-Allow-Origin"]) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = adminClient();
    const ip = getClientIp(req);

    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const captchaToken = typeof body.captcha_token === "string" ? body.captcha_token : "";

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "invalid_email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const limit = await checkRateLimit(supabase,
      { bucket: "login-captcha", max: 10, windowSeconds: 600, keyBy: "ip" }, ip);
    if (!limit.allowed) {
      return tooManyRequestsResponse(limit, corsHeaders);
    }

    const captchaResult = await verifyCaptchaToken(captchaToken, ip);
    if (!captchaResult.valid) {
      await logAudit(supabase, {
        action: "login.captcha_failed",
        metadata: { email, reason: captchaResult.reason },
        ip,
      });
      return new Response(JSON.stringify({
        success: false,
        error: "captcha_failed",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return safeErrorResponse(err, corsHeaders);
  }
});
