import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient, buildCorsHeaders, getClientIp,
  checkRateLimit, tooManyRequestsResponse,
  isValidUuid, logAudit, safeErrorResponse,
} from "../_shared/security.ts";

function buildCertEmailHtml(params: {
  studentName: string;
  courseTitle: string;
  serialNumber: string;
  issuedDate: string;
  certificateUrl: string;
}): string {
  const { studentName, courseTitle, serialNumber, issuedDate, certificateUrl } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Congratulations! Course Completed</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F8FAFC;padding:48px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation"
        style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:linear-gradient(135deg,#0F172A 0%,#1e3a5f 100%);padding:28px 36px 24px;">
            <p style="margin:0 0 16px;font-size:15px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">aiwithrakshith.tech</p>
            <table cellpadding="0" cellspacing="0" role="presentation">
              <tr><td style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:14px;padding:14px 18px;">
                <table cellpadding="0" cellspacing="0" role="presentation"><tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <div style="width:44px;height:44px;background:linear-gradient(135deg,#f59e0b,#f97316);border-radius:12px;text-align:center;line-height:44px;font-size:22px;">&#127942;</div>
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.08em;">Certificate of Completion</p>
                    <p style="margin:4px 0 0;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.4px;">Congratulations!</p>
                  </td>
                </tr></table>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:36px 36px 28px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0F172A;letter-spacing:-0.5px;line-height:1.3;">You did it, ${studentName}!</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">You have successfully completed the course and earned your verified certificate of completion.</p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
            style="background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:12px;margin-bottom:28px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#16A34A;text-transform:uppercase;letter-spacing:0.1em;">Course Completed</p>
              <p style="margin:0;font-size:16px;font-weight:700;color:#0F172A;line-height:1.4;">${courseTitle}</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
            <tr>
              <td width="50%" style="padding-right:8px;vertical-align:top;">
                <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px 16px;">
                  <p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.08em;">Serial Number</p>
                  <p style="margin:0;font-size:12px;font-weight:700;color:#0F172A;font-family:'Courier New',monospace;word-break:break-all;">${serialNumber}</p>
                </div>
              </td>
              <td width="50%" style="padding-left:8px;vertical-align:top;">
                <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px 16px;">
                  <p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.08em;">Issued On</p>
                  <p style="margin:0;font-size:12px;font-weight:700;color:#0F172A;">${issuedDate}</p>
                </div>
              </td>
            </tr>
          </table>
          <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
            <tr><td style="border-radius:12px;background:linear-gradient(135deg,#f59e0b,#f97316);">
              <a href="${certificateUrl}" target="_blank"
                style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;letter-spacing:-0.2px;">
                &#127942;&nbsp; View &amp; Download Certificate
              </a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:12px;font-weight:600;color:#16A34A;">This certificate is verified and tamper-proof</p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0;">
            <tr><td style="border-top:1px solid #E2E8F0;"></td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#64748B;line-height:1.7;">Share your achievement on LinkedIn, GitHub, or anywhere you showcase your skills. We're proud of your dedication and hard work.</p>
        </td></tr>
        <tr><td style="padding:16px 36px;background:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#0F172A;">aiwithrakshith.tech</p>
          <p style="margin:0;font-size:11px;color:#94A3B8;">&copy; 2026 aiwithrakshith.tech &mdash; All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
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
    // Require auth — caller must present a valid Bearer token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cert_id = typeof body.cert_id === "string" ? body.cert_id.trim() : "";
    if (!isValidUuid(cert_id)) {
      return new Response(JSON.stringify({ error: "invalid_cert_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = getClientIp(req);
    const supabase = adminClient();

    // Verify JWT and get calling user
    const token = authHeader.slice(7);
    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 20/hr by IP
    const byIp = await checkRateLimit(supabase,
      { bucket: "cert-email", max: 20, windowSeconds: 3600, keyBy: "ip" }, ip);
    if (!byIp.allowed) {
      await logAudit(supabase, { action: "send-cert-email.rate_limited", metadata: { cert_id, by: "ip" }, ip });
      return tooManyRequestsResponse(byIp, corsHeaders);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const siteUrl = Deno.env.get("SITE_URL") || "https://aiwithrakshith.tech";

    const { data: cert, error: certErr } = await supabase
      .from("course_certificates")
      .select("id, user_id, course_id, student_name, course_title, serial_number, issued_at, email_sent, slug")
      .eq("id", cert_id)
      .maybeSingle();

    if (certErr || !cert) {
      return new Response(JSON.stringify({ error: "Certificate not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ownership check: caller must be the cert owner, the course instructor, or an admin
    const [profileResult, courseResult] = await Promise.all([
      supabase.from("user_profiles").select("is_admin").eq("id", caller.id).maybeSingle(),
      supabase.from("courses").select("user_id").eq("id", cert.course_id).maybeSingle(),
    ]);

    const isOwner      = caller.id === cert.user_id;
    const isInstructor = courseResult.data?.user_id === caller.id;
    const isAdmin      = !!profileResult.data?.is_admin;

    if (!isOwner && !isInstructor && !isAdmin) {
      await logAudit(supabase, {
        action: "send-cert-email.forbidden",
        metadata: { cert_id, caller_id: caller.id, cert_owner_id: cert.user_id },
        ip,
      });
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency
    if (cert.email_sent) {
      return new Response(JSON.stringify({ skipped: true, reason: "already_sent" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(cert.user_id);
    if (userErr || !userData?.user?.email) {
      return new Response(JSON.stringify({ error: "User email not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const studentEmail = userData.user.email;

    // Rate limit: 20/hr by recipient email
    const byEmail = await checkRateLimit(supabase,
      { bucket: "cert-email", max: 20, windowSeconds: 3600, keyBy: "email" }, ip, studentEmail);
    if (!byEmail.allowed) {
      await logAudit(supabase, { action: "send-cert-email.rate_limited", metadata: { cert_id, by: "email" }, ip });
      return tooManyRequestsResponse(byEmail, corsHeaders);
    }

    const issuedDate = new Date(cert.issued_at).toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    });
    const certificateUrl = cert.slug
      ? `${siteUrl}/c/${cert.slug}`
      : `${siteUrl}/courses/${cert.course_id}/certificate`;

    const html = buildCertEmailHtml({
      studentName: cert.student_name || studentEmail.split("@")[0],
      courseTitle: cert.course_title,
      serialNumber: cert.serial_number,
      issuedDate,
      certificateUrl,
    });

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "aiwithrakshith <certificates@aiwithrakshith.tech>",
        to: [studentEmail],
        subject: `Congratulations! Your certificate for "${cert.course_title}" is ready`,
        html,
      }),
    });

    if (!emailRes.ok) {
      console.error("Resend error:", await emailRes.text());
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("course_certificates").update({ email_sent: true }).eq("id", cert_id);

    await logAudit(supabase, {
      action: "send-cert-email.sent",
      metadata: { cert_id, course_id: cert.course_id, caller_id: caller.id },
      ip,
    });

    return new Response(JSON.stringify({ success: true, sent_to: studentEmail }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return safeErrorResponse(err, corsHeaders);
  }
});
