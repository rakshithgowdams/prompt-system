import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient, buildCorsHeaders, getClientIp,
  checkRateLimit, tooManyRequestsResponse,
  isValidEmail, isValidString, timingSafeEqual, logAudit, safeErrorResponse,
} from "../_shared/security.ts";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

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
    const otp_code = typeof body.otp_code === "string" ? body.otp_code.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "invalid_email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isValidString(otp_code, 6, 6) || !/^\d{6}$/.test(otp_code)) {
      return new Response(JSON.stringify({ error: "invalid_otp_format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isValidString(password, 8, 128)) {
      return new Response(JSON.stringify({ error: "invalid_password" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = getClientIp(req);
    const supabase = adminClient();

    // Rate limit: 8 attempts per 15 min per email
    const byEmail = await checkRateLimit(supabase,
      { bucket: "verify-otp", max: 8, windowSeconds: 900, keyBy: "email" }, ip, email);
    if (!byEmail.allowed) {
      await logAudit(supabase, { action: "verify-otp.rate_limited", metadata: { email }, ip });
      return tooManyRequestsResponse(byEmail, corsHeaders);
    }

    // Fetch most recent unused OTP (includes lockout columns)
    const { data: latestOtp } = await supabase
      .from("email_otps")
      .select("id, otp_code, expires_at, used, failed_attempts, locked_until")
      .eq("email", email)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Check account lockout before anything else
    if (latestOtp?.locked_until && new Date(latestOtp.locked_until) > new Date()) {
      await logAudit(supabase, { action: "verify-otp.locked_account_attempt", metadata: { email }, ip });
      return new Response(JSON.stringify({
        error: "account_locked",
        message: "Too many failed attempts. Try again in 15 minutes.",
      }), { status: 423, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!latestOtp) {
      await logAudit(supabase, { action: "verify-otp.not_found", metadata: { email }, ip });
      return new Response(JSON.stringify({ error: "Invalid or expired code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(latestOtp.expires_at) < new Date()) {
      await logAudit(supabase, { action: "verify-otp.expired", metadata: { email }, ip });
      return new Response(JSON.stringify({ error: "Code has expired. Please request a new one." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Timing-safe OTP comparison
    if (!timingSafeEqual(otp_code, latestOtp.otp_code)) {
      const newAttempts = (latestOtp.failed_attempts ?? 0) + 1;
      const update: Record<string, unknown> = { failed_attempts: newAttempts };

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        update.locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
        await logAudit(supabase, {
          action: "verify-otp.account_locked",
          metadata: { email, attempts: newAttempts },
          ip,
        });
      }

      await supabase.from("email_otps").update(update).eq("id", latestOtp.id);

      await logAudit(supabase, { action: "verify-otp.wrong_code", metadata: { email }, ip });
      return new Response(JSON.stringify({
        error: "Invalid or expired code",
        attempts_remaining: Math.max(0, MAX_FAILED_ATTEMPTS - newAttempts),
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // OTP correct — reset lockout state and mark used
    await supabase.from("email_otps")
      .update({ used: true, failed_attempts: 0, locked_until: null })
      .eq("id", latestOtp.id);

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email
    );

    let session = null;

    if (existingUser) {
      await supabase.auth.admin.updateUserById(existingUser.id, {
        email_confirm: true, password,
      });
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        return new Response(JSON.stringify({ error: "Authentication failed after verification" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      session = signInData.session;
    } else {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true,
      });
      if (createError || !newUser.user) {
        return new Response(JSON.stringify({ error: "Failed to create account" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        return new Response(JSON.stringify({ error: "Account created but sign-in failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      session = signInData.session;
    }

    await logAudit(supabase, {
      action: "verify-otp.success",
      metadata: { email, user_id: session?.user?.id },
      ip, userAgent: req.headers.get("User-Agent") ?? undefined,
    });

    return new Response(
      JSON.stringify({
        success: true,
        access_token: session?.access_token,
        refresh_token: session?.refresh_token,
        expires_at: session?.expires_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return safeErrorResponse(err, corsHeaders);
  }
});
