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

    // Send email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "aiwithrakshith <noreply@aiwithrakshith.tech>",
        to: [email],
        subject: "Your verification code",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
              <tr>
                <td align="center">
                  <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
                    <tr>
                      <td style="background:#111827;padding:24px 32px;text-align:center;">
                        <span style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:-0.5px;">aiwithrakshith.tech</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:40px 32px;text-align:center;">
                        <p style="margin:0 0 8px;color:#6b7280;font-size:14px;font-weight:500;text-transform:uppercase;letter-spacing:1px;">Verification Code</p>
                        <div style="margin:20px auto;padding:20px 32px;background:#f9fafb;border:2px solid #e5e7eb;border-radius:8px;display:inline-block;">
                          <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#111827;font-family:monospace;">${otp}</span>
                        </div>
                        <p style="margin:20px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">
                          Enter this code to verify your email address.<br>
                          This code expires in <strong style="color:#111827;">10 minutes</strong>.
                        </p>
                        <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">
                          If you did not request this, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
                        <p style="margin:0;color:#9ca3af;font-size:12px;">aiwithrakshith.tech &mdash; AI Prompt Management</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
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
