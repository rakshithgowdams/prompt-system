import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient, buildCorsHeaders, getClientIp,
  checkRateLimit, tooManyRequestsResponse,
  isValidEmail, logAudit, safeErrorResponse,
} from "../_shared/security.ts";

function generateOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, "0");
}

function buildEmailHtml(otp: string, email: string): string {
  const digitCells = otp.split("").map((d) =>
    `<td style="padding:0 4px;">` +
    `<table cellpadding="0" cellspacing="0" role="presentation">` +
    `<tr><td align="center" valign="middle" style="` +
    `width:48px;height:56px;background:#ffffff;border:1.5px solid #CBD5E1;border-radius:8px;` +
    `font-size:28px;font-weight:700;color:#0F172A;font-family:'Courier New',Courier,monospace;` +
    `text-align:center;vertical-align:middle;">${d}</td></tr>` +
    `</table></td>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Your verification code</title></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F1F5F9;padding:48px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
<tr><td style="background:#0F172A;padding:20px 32px;"><p style="margin:0;font-size:16px;font-weight:700;color:#ffffff;">aiwithrakshith.tech</p></td></tr>
<tr><td style="padding:40px 40px 32px;text-align:center;">
<h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0F172A;">Your verification code</h1>
<p style="margin:0 0 28px;font-size:14px;color:#64748B;line-height:1.6;">Enter the code below to verify <strong style="color:#0F172A;">${email}</strong> and complete your account setup.</p>
<table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 28px;"><tr>${digitCells}</tr></table>
<p style="margin:0 0 28px;font-size:13px;color:#64748B;">This code expires in <strong style="color:#0F172A;">10 minutes</strong>.</p>
<p style="margin:24px 0 0;font-size:12px;color:#94A3B8;line-height:1.7;text-align:left;">If you did not request this code, you can safely ignore this email.</p>
</td></tr>
<tr><td style="padding:16px 40px;background:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;"><p style="margin:0;font-size:11px;color:#94A3B8;">&copy; 2026 aiwithrakshith.tech</p></td></tr>
</table>
</td></tr></table>
</body></html>`;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = buildCorsHeaders(origin, false);

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  // Reject unlisted origins before any work
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

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "invalid_email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = getClientIp(req);
    const supabase = adminClient();

    // Rate limit by email (3/hour)
    const byEmail = await checkRateLimit(supabase,
      { bucket: "send-otp", max: 3, windowSeconds: 3600, keyBy: "email" }, ip, email);
    if (!byEmail.allowed) {
      await logAudit(supabase, { action: "send-otp.rate_limited", metadata: { email, by: "email" }, ip });
      return tooManyRequestsResponse(byEmail, corsHeaders);
    }

    // Rate limit by IP (10/hour)
    const byIp = await checkRateLimit(supabase,
      { bucket: "send-otp-ip", max: 10, windowSeconds: 3600, keyBy: "ip" }, ip, email);
    if (!byIp.allowed) {
      await logAudit(supabase, { action: "send-otp.rate_limited", metadata: { email, by: "ip" }, ip });
      return tooManyRequestsResponse(byIp, corsHeaders);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    // Invalidate previous unused OTPs
    await supabase.from("email_otps").update({ used: true })
      .eq("email", email).eq("used", false);

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from("email_otps").insert({
      email, otp_code: otp, expires_at: expiresAt, used: false,
    });

    if (insertError) {
      console.error("OTP insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to generate OTP" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "aiwithrakshith <otp@aiwithrakshith.tech>",
        to: [email],
        subject: `${otp} is your verification code`,
        html: buildEmailHtml(otp, email),
      }),
    });

    if (!emailRes.ok) {
      console.error("Resend error:", await emailRes.text());
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await logAudit(supabase, {
      action: "send-otp.sent", metadata: { email }, ip,
      userAgent: req.headers.get("User-Agent") ?? undefined,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return safeErrorResponse(err, corsHeaders);
  }
});
