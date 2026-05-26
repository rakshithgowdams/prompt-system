import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function generateOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, "0");
}

function buildEmailHtml(otp: string, email: string): string {
  // Design tokens matched to the app's Tailwind config:
  // brand-400 = #A435F0, ink-900 = #1C1D1F, ink-700 = #2D2F31
  // ink-500 = #6A6F73, ink-300 = #D1D7DC, ink-100 = #F7F9FA

  const digits = otp.split("");

  const digitCells = digits
    .map(
      (d) => `
      <td style="padding:0 5px;">
        <div style="
          width:44px;height:52px;
          background:#ffffff;
          border:2px solid #D1D7DC;
          border-radius:8px;
          display:inline-flex;align-items:center;justify-content:center;
          font-size:26px;font-weight:800;
          color:#1C1D1F;
          font-family:'Courier New',Courier,monospace;
          letter-spacing:0;
        ">${d}</div>
      </td>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Your verification code</title>
</head>
<body style="margin:0;padding:0;background:#F7F9FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background:#F7F9FA;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="480" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:480px;width:100%;background:#ffffff;border:1px solid #D1D7DC;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- ── Header ──────────────────────────────────────── -->
          <tr>
            <td style="background:#1C1D1F;padding:24px 32px;text-align:center;">
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
                <tr>
                  <td style="padding-right:10px;vertical-align:middle;">
                    <!-- Lightning bolt icon approximated with unicode -->
                    <div style="
                      width:32px;height:32px;
                      background:#A435F0;
                      border-radius:6px;
                      display:inline-block;
                      text-align:center;line-height:32px;
                      font-size:18px;
                    ">&#9889;</div>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="color:#ffffff;font-size:17px;font-weight:800;letter-spacing:-0.3px;">
                      aiwithrakshith.tech
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Body ───────────────────────────────────────── -->
          <tr>
            <td style="padding:40px 32px 32px;text-align:center;">

              <!-- Icon badge -->
              <div style="
                width:56px;height:56px;
                background:#F5EBFD;
                border:1px solid #E3CFFA;
                border-radius:12px;
                margin:0 auto 20px;
                display:inline-block;
                text-align:center;line-height:56px;
                font-size:26px;
              ">&#128140;</div>

              <!-- Heading -->
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1C1D1F;letter-spacing:-0.5px;">
                Verify your email
              </h1>
              <p style="margin:0 0 6px;color:#6A6F73;font-size:14px;line-height:1.5;">
                Use the code below to complete your sign-up for
              </p>
              <p style="margin:0 0 28px;">
                <span style="
                  display:inline-block;
                  padding:4px 14px;
                  background:#F7F9FA;
                  border:1px solid #D1D7DC;
                  border-radius:20px;
                  font-size:13px;font-weight:600;color:#1C1D1F;
                ">${email}</span>
              </p>

              <!-- Label -->
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#6A6F73;text-transform:uppercase;letter-spacing:1.2px;">
                Your one-time code
              </p>

              <!-- OTP digit boxes -->
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 8px;">
                <tr>${digitCells}</tr>
              </table>

              <!-- Divider line between first 3 and last 3 is omitted — all 6 inline looks cleaner -->

              <!-- Expiry note -->
              <p style="margin:20px 0 0;color:#6A6F73;font-size:13px;line-height:1.6;">
                This code expires in
                <strong style="color:#1C1D1F;">10 minutes</strong>.
              </p>

              <!-- Security notice box -->
              <div style="
                margin:24px 0 0;
                padding:14px 18px;
                background:#F7F9FA;
                border:1px solid #D1D7DC;
                border-radius:8px;
                text-align:left;
              ">
                <p style="margin:0;font-size:12px;color:#6A6F73;line-height:1.6;">
                  <strong style="color:#1C1D1F;">Didn't request this?</strong>
                  You can safely ignore this email. Your account will not be created unless the code is entered.
                </p>
              </div>

            </td>
          </tr>

          <!-- ── Footer ──────────────────────────────────────── -->
          <tr>
            <td style="padding:20px 32px;background:#F7F9FA;border-top:1px solid #D1D7DC;text-align:center;">
              <p style="margin:0 0 4px;font-size:11px;color:#6A6F73;">
                Sent by <strong style="color:#1C1D1F;">aiwithrakshith.tech</strong> &mdash; AI Prompt Management
              </p>
              <p style="margin:0;font-size:11px;color:#D1D7DC;">
                &copy; 2026 aiwithrakshith.tech. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

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

    const { email } = await req.json();

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Invalidate any previous unused OTPs for this email
    await supabase
      .from("email_otps")
      .update({ used: true })
      .eq("email", email.toLowerCase())
      .eq("used", false);

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from("email_otps").insert({
      email: email.toLowerCase(),
      otp_code: otp,
      expires_at: expiresAt,
      used: false,
    });

    if (insertError) {
      console.error("OTP insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to generate OTP" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "aiwithrakshith <otp@aiwithrakshith.tech>",
        to: [email],
        subject: `${otp} is your aiwithrakshith.tech verification code`,
        html: buildEmailHtml(otp, email),
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error("Resend error:", errBody);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-otp error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
