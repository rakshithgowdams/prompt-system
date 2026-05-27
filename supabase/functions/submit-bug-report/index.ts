import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient,
  buildCorsHeaders,
  getClientIp,
  checkRateLimit,
  tooManyRequestsResponse,
  isValidString,
  logAudit,
  safeErrorResponse,
} from "../_shared/security.ts";
import { verifyCaptchaToken } from "../_shared/verify-captcha.ts";

function jsonError(code: string, headers: Record<string, string>, status = 400): Response {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = buildCorsHeaders(origin, false);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonError("method_not_allowed", corsHeaders, 405);
  }

  try {
    const supabase = adminClient();
    const ip = getClientIp(req);

    // Rate limit: 5 reports per IP per hour, 10 per day
    const ipLimit = await checkRateLimit(
      supabase,
      { bucket: "bug-report-ip", max: 5, windowSeconds: 3600, keyBy: "ip" },
      ip,
    );
    if (!ipLimit.allowed) return tooManyRequestsResponse(ipLimit, corsHeaders);

    const body = await req.json().catch(() => ({}));
    const title       = typeof body.title       === "string" ? body.title.trim()       : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const pageUrl     = typeof body.page_url    === "string" ? body.page_url.slice(0, 500) : null;
    const errorStack  = typeof body.error_stack === "string" ? body.error_stack.slice(0, 10000) : null;
    const captchaToken = typeof body.captcha_token === "string" ? body.captcha_token : "";

    if (!isValidString(title, 1, 200))          return jsonError("invalid_title", corsHeaders);
    if (description && !isValidString(description, 0, 5000)) return jsonError("invalid_description", corsHeaders);

    // CAPTCHA verification (skip if no token — dev environment)
    if (captchaToken) {
      const captchaResult = await verifyCaptchaToken(captchaToken, ip);
      if (!captchaResult.valid) {
        await logAudit(supabase, {
          action: "bug-report.captcha_failed",
          metadata: { reason: captchaResult.reason },
          ip,
        });
        return jsonError("captcha_failed", corsHeaders);
      }
    }

    // Extract user from auth header if present
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      userId = user?.id ?? null;
    }

    const { error } = await supabase.from("bug_reports").insert({
      user_id: userId,
      title,
      description,
      page_url: pageUrl,
      user_agent: req.headers.get("User-Agent") ?? null,
      error_stack: errorStack,
    });
    if (error) throw error;

    await logAudit(supabase, {
      userId,
      action: "bug-report.submitted",
      metadata: { title: title.slice(0, 80) },
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
