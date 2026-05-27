import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient,
  buildCorsHeaders,
  getClientIp,
  checkRateLimit,
  tooManyRequestsResponse,
  isValidEmail,
  isValidString,
  logAudit,
  safeErrorResponse,
} from "../_shared/security.ts";
import { verifyCaptchaToken } from "../_shared/verify-captcha.ts";

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = buildCorsHeaders(origin, false);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = adminClient();
    const ip = getClientIp(req);

    // Rate limit: 3 signups per IP per hour
    const ipLimit = await checkRateLimit(
      supabase,
      { bucket: "notify-signup-ip", max: 3, windowSeconds: 3600, keyBy: "ip" },
      ip,
    );
    if (!ipLimit.allowed) return tooManyRequestsResponse(ipLimit, corsHeaders);

    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const tier = typeof body.tier === "string" ? body.tier.trim().toLowerCase() : "standard";
    const captchaToken = typeof body.captcha_token === "string" ? body.captcha_token : "";

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "invalid_email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isValidString(tier, 1, 50)) {
      return new Response(JSON.stringify({ error: "invalid_tier" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Per-email cap: 3 per day
    const emailLimit = await checkRateLimit(
      supabase,
      { bucket: "notify-signup-email", max: 3, windowSeconds: 86400, keyBy: "email" },
      ip,
      email,
    );
    if (!emailLimit.allowed) return tooManyRequestsResponse(emailLimit, corsHeaders);

    // CAPTCHA verification (skip if no token — dev environment)
    if (captchaToken) {
      const captchaResult = await verifyCaptchaToken(captchaToken, ip);
      if (!captchaResult.valid) {
        await logAudit(supabase, {
          action: "notify-signup.captcha_failed",
          metadata: { email, reason: captchaResult.reason },
          ip,
        });
        return new Response(JSON.stringify({ error: "captcha_failed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Insert via service role (bypasses RLS)
    const { error } = await supabase.from("notify_signups").insert({ email, tier });
    if (error && error.code !== "23505") {
      // 23505 = unique violation (already on the list) — treat as success
      throw error;
    }

    await logAudit(supabase, {
      action: "notify-signup.success",
      metadata: { email, tier },
      ip,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return safeErrorResponse(err, corsHeaders);
  }
});
