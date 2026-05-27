import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient, buildCorsHeaders, getClientIp,
  checkRateLimit, tooManyRequestsResponse,
  isValidEmail, logAudit, safeErrorResponse,
} from "../_shared/security.ts";

function buildResetEmailHtml(resetUrl: string, email: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Reset your password</title></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F1F5F9;padding:48px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
<tr><td style="background:#0F172A;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td style="height:3px;background:linear-gradient(90deg,#A435F0 0%,#C77DFF 50%,#F472B6 100%);"></td></tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td style="padding:18px 32px;">
      <table cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="background:#A435F0;border-radius:8px;padding:6px 8px;vertical-align:middle;"><span style="font-size:14px;color:#ffffff;font-weight:900;">&#9889;</span></td>
          <td style="padding-left:10px;vertical-align:middle;"><span style="font-size:15px;font-weight:800;color:#ffffff;">aiwithrakshith.tech</span></td>
        </tr>
      </table>
    </td></tr>
  </table>
</td></tr>
<tr><td style="padding:40px 40px 32px;text-align:center;">
  <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 24px;">
    <tr><td align="center" style="width:56px;height:56px;background:#F5EBFD;border:1px solid #E3CFFA;border-radius:12px;"><span style="font-size:26px;line-height:56px;">&#128274;</span></td></tr>
  </table>
  <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#1C1D1F;">Reset your password</h1>
  <p style="margin:0 0 8px;font-size:14px;color:#6A6F73;line-height:1.6;">We received a request to reset the password for</p>
  <p style="margin:0 0 28px;font-size:14px;font-weight:600;color:#1C1D1F;">${email}</p>
  <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 28px;">
    <tr><td align="center" style="border-radius:10px;background:#A435F0;">
      <a href="${resetUrl}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Set New Password</a>
    </td></tr>
  </table>
  <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 28px;background:#FFF9F0;border:1px solid #FDE68A;border-radius:8px;max-width:380px;width:100%;">
    <tr><td style="padding:12px 16px;"><p style="margin:0;font-size:12.5px;color:#92400E;text-align:center;line-height:1.6;"><strong>This link expires in 1 hour.</strong> If you didn't request a password reset, you can safely ignore this email.</p></td></tr>
  </table>
  <p style="margin:20px 0 0;font-size:12px;color:#94A3B8;line-height:1.7;text-align:left;">If the button doesn't work, copy and paste this link:<br><a href="${resetUrl}" style="color:#A435F0;word-break:break-all;font-size:11px;">${resetUrl}</a></p>
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

    // Rate limit: 3 per 30 min per email
    const byEmail = await checkRateLimit(supabase,
      { bucket: "send-reset", max: 3, windowSeconds: 1800, keyBy: "email" }, ip, email);
    if (!byEmail.allowed) {
      await logAudit(supabase, { action: "send-reset.rate_limited", metadata: { email }, ip });
      // Return success to avoid email enumeration
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: "https://aiwithrakshith.tech/reset-password",
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("generateLink error:", linkError);
      // Return success to avoid email enumeration
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let actionLink: string = linkData.properties.action_link;
    if (!actionLink.includes("redirect_to")) {
      const url = new URL(actionLink);
      url.searchParams.set("redirect_to", "https://aiwithrakshith.tech/reset-password");
      actionLink = url.toString();
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "aiwithrakshith <noreply@aiwithrakshith.tech>",
        to: [email],
        subject: "Reset your aiwithrakshith.tech password",
        html: buildResetEmailHtml(actionLink, email),
      }),
    });

    if (!emailRes.ok) {
      console.error("Resend error:", await emailRes.text());
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await logAudit(supabase, { action: "send-reset.sent", metadata: { email }, ip });

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return safeErrorResponse(err, corsHeaders);
  }
});
