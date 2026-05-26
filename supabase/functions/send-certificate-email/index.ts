import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="560" cellpadding="0" cellspacing="0" role="presentation"
          style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

          <!-- Dark header with gradient -->
          <tr>
            <td style="background:linear-gradient(135deg,#0F172A 0%,#1e3a5f 100%);padding:28px 36px 24px;">
              <p style="margin:0 0 16px;font-size:15px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">
                aiwithrakshith.tech
              </p>
              <!-- Trophy icon row -->
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:14px;padding:14px 18px;">
                    <table cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="vertical-align:middle;padding-right:12px;">
                          <div style="width:44px;height:44px;background:linear-gradient(135deg,#f59e0b,#f97316);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;text-align:center;line-height:44px;">
                            &#127942;
                          </div>
                        </td>
                        <td style="vertical-align:middle;">
                          <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.08em;">Certificate of Completion</p>
                          <p style="margin:4px 0 0;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.4px;">Congratulations!</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 28px;">

              <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0F172A;letter-spacing:-0.5px;line-height:1.3;">
                You did it, ${studentName}!
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
                You have successfully completed the course and earned your verified certificate of completion.
              </p>

              <!-- Course box -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#16A34A;text-transform:uppercase;letter-spacing:0.1em;">Course Completed</p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#0F172A;line-height:1.4;">${courseTitle}</p>
                  </td>
                </tr>
              </table>

              <!-- Certificate details grid -->
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

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
                <tr>
                  <td style="border-radius:12px;background:linear-gradient(135deg,#f59e0b,#f97316);">
                    <a href="${certificateUrl}" target="_blank"
                      style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;letter-spacing:-0.2px;">
                      &#127942;&nbsp; View &amp; Download Certificate
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Verified badge line -->
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:8px;">
                <tr>
                  <td style="vertical-align:middle;padding-right:8px;">
                    <div style="width:20px;height:20px;background:#16A34A;border-radius:50%;text-align:center;line-height:20px;font-size:12px;color:#fff;">&#10003;</div>
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-size:12px;font-weight:600;color:#16A34A;">This certificate is blockchain-verified and tamper-proof</p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0;">
                <tr><td style="border-top:1px solid #E2E8F0;"></td></tr>
              </table>

              <p style="margin:0;font-size:13px;color:#64748B;line-height:1.7;">
                Share your achievement on LinkedIn, GitHub, or anywhere you showcase your skills.
                We're proud of your dedication and hard work.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 36px;background:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#0F172A;">aiwithrakshith.tech</p>
              <p style="margin:0;font-size:11px;color:#94A3B8;">&copy; 2026 aiwithrakshith.tech &mdash; All rights reserved.</p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { cert_id } = await req.json();

    if (!cert_id) {
      return new Response(JSON.stringify({ error: "cert_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const siteUrl = Deno.env.get("SITE_URL") || "https://aiwithrakshith.tech";

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch cert + user email (using service role to bypass RLS)
    const { data: cert, error: certErr } = await supabase
      .from("course_certificates")
      .select("id, user_id, course_id, student_name, course_title, serial_number, issued_at, email_sent")
      .eq("id", cert_id)
      .maybeSingle();

    if (certErr || !cert) {
      console.error("cert fetch error:", certErr);
      return new Response(JSON.stringify({ error: "Certificate not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency — never send twice
    if (cert.email_sent) {
      return new Response(JSON.stringify({ skipped: true, reason: "already_sent" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get student email
    const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(cert.user_id);
    if (userErr || !userData?.user?.email) {
      console.error("user fetch error:", userErr);
      return new Response(JSON.stringify({ error: "User email not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const studentEmail = userData.user.email;
    const issuedDate = new Date(cert.issued_at).toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    });
    const certificateUrl = `${siteUrl}/courses/${cert.course_id}/certificate`;

    const html = buildCertEmailHtml({
      studentName: cert.student_name || studentEmail.split("@")[0],
      courseTitle: cert.course_title,
      serialNumber: cert.serial_number,
      issuedDate,
      certificateUrl,
    });

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "aiwithrakshith <certificates@aiwithrakshith.tech>",
        to: [studentEmail],
        subject: `🎉 Congratulations! Your certificate for "${cert.course_title}" is ready`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error("Resend error:", errBody);
      return new Response(JSON.stringify({ error: "Failed to send email", detail: errBody }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark email as sent so it never fires again
    await supabase
      .from("course_certificates")
      .update({ email_sent: true })
      .eq("id", cert_id);

    return new Response(JSON.stringify({ success: true, sent_to: studentEmail }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("send-certificate-email error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
