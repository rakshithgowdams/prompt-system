import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient, buildCorsHeaders, getClientIp,
  checkRateLimit, tooManyRequestsResponse,
  isValidUuid, logAudit,
} from "../_shared/security.ts";
import { completedEmail, sendResendEmail } from "../_shared/todo-email-templates.ts";

const APP_URL = Deno.env.get("APP_URL") ?? "https://aiwithrakshith.tech";

Deno.serve(async (req) => {
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

  // Require auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const todo_id = typeof body.todo_id === "string" ? body.todo_id.trim() : "";
    if (!isValidUuid(todo_id)) {
      return new Response(JSON.stringify({ error: "invalid_todo_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = getClientIp(req);
    const supabase = adminClient();

    // Verify caller JWT
    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(authHeader.slice(7));
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 100/hr by IP
    const byIp = await checkRateLimit(supabase,
      { bucket: "todo-completed", max: 100, windowSeconds: 3600, keyBy: "ip" }, ip);
    if (!byIp.allowed) {
      await logAudit(supabase, { action: "todo-completed.rate_limited", metadata: { todo_id, by: "ip" }, ip });
      return tooManyRequestsResponse(byIp, corsHeaders);
    }

    // Rate limit: 100/hr by email
    const byEmail = await checkRateLimit(supabase,
      { bucket: "todo-completed", max: 100, windowSeconds: 3600, keyBy: "email" }, ip, caller.email ?? "");
    if (!byEmail.allowed) {
      await logAudit(supabase, { action: "todo-completed.rate_limited", metadata: { todo_id, by: "email" }, ip });
      return tooManyRequestsResponse(byEmail, corsHeaders);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const { data: todo } = await supabase
      .from("todos")
      .select("id, user_id, title, notes, due_at, priority, completed, completed_email_sent_at")
      .eq("id", todo_id)
      .maybeSingle();

    if (!todo) {
      return new Response(JSON.stringify({ error: "todo not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (caller.id !== todo.user_id) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!todo.completed) {
      return new Response(JSON.stringify({ skipped: "todo is not completed" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (todo.completed_email_sent_at) {
      return new Response(JSON.stringify({ skipped: "already sent" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(todo.user_id);
    if (!authUser?.email) {
      return new Response(JSON.stringify({ error: "no email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("display_name, todo_emails_enabled")
      .eq("id", todo.user_id)
      .maybeSingle();

    if (profile?.todo_emails_enabled === false) {
      return new Response(JSON.stringify({ skipped: "user opted out" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userName = profile?.display_name?.trim() || authUser.email.split("@")[0];
    const { subject, html } = completedEmail({
      todoTitle: todo.title,
      todoNotes: todo.notes,
      dueAt: todo.due_at,
      priority: todo.priority,
      userName,
      appUrl: APP_URL,
    });

    const result = await sendResendEmail(resendApiKey, authUser.email, subject, html);
    if (!result.success) {
      console.error("[todo-completed] resend failed:", result.error);
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("todos").update({ completed_email_sent_at: new Date().toISOString() }).eq("id", todo_id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[todo-completed] uncaught:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
