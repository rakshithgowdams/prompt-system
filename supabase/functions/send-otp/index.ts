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
  const digitCells = otp
    .split("")
    .map(
      (d) =>
        `<td style="padding:0 4px;">` +
        `<table cellpadding="0" cellspacing="0" role="presentation">` +
        `<tr><td align="center" valign="middle" style="` +
        `width:48px;height:56px;` +
        `background:#ffffff;` +
        `border:1.5px solid #CBD5E1;` +
        `border-radius:8px;` +
        `font-size:28px;font-weight:700;` +
        `color:#0F172A;` +
        `font-family:'Courier New',Courier,monospace;` +
        `text-align:center;vertical-align:middle;` +
        `">${d}</td></tr>` +
        `</table></td>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Your verification code</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F1F5F9;padding:48px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="520" cellpadding="0" cellspacing="0" role="presentation"
          style="max-width:520px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">

          <!-- Header -->
          <tr>
            <td style="background:#0F172A;padding:20px 32px;">
              <p style="margin:0;font-size:16px;font-weight:700;color:#ffffff;letter-spacing:-0.2px;">
                aiwithrakshith.tech
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;text-align:center;">

              <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0F172A;letter-spacing:-0.3px;">
                Your verification code
              </h1>

              <p style="margin:0 0 28px;font-size:14px;color:#64748B;line-height:1.6;">
                Enter the code below to verify <strong style="color:#0F172A;">${email}</strong><br>
                and complete your account setup.
              </p>

              <!-- OTP row -->
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 28px;">
                <tr>${digitCells}</tr>
              </table>

              <!-- Expiry -->
              <p style="margin:0 0 28px;font-size:13px;color:#64748B;">
                This code expires in <strong style="color:#0F172A;">10 minutes</strong>.
              </p>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr><td style="border-top:1px solid #E2E8F0;"></td></tr>
              </table>

              <!-- Security notice -->
              <p style="margin:24px 0 0;font-size:12px;color:#94A3B8;line-height:1.7;text-align:left;">
                If you did not request this code, you can safely ignore this email.
                Your account will not be created unless this code is entered.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 40px;background:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0;font-size:11px;color:#94A3B8;">
                &copy; 2026 aiwithrakshith.tech &mdash; All rights reserved.
              </p>
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
        subject: `${otp} is your verification code`,
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
