import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { completedEmail, sendResendEmail } from "../_shared/todo-email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const APP_URL = Deno.env.get("APP_URL") ?? "https://aiwithrakshith.tech";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { todo_id } = await req.json();
    if (!todo_id) {
      return new Response(JSON.stringify({ error: "todo_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const authHeader = req.headers.get("Authorization");
    let callerUserId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      callerUserId = user?.id ?? null;
    }

    const { data: todo } = await supabase
      .from("todos")
      .select("id, user_id, title, notes, due_at, priority, completed, completed_email_sent_at")
      .eq("id", todo_id)
      .single();

    if (!todo) {
      return new Response(JSON.stringify({ error: "todo not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (callerUserId && callerUserId !== todo.user_id) {
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

    await supabase
      .from("todos")
      .update({ completed_email_sent_at: new Date().toISOString() })
      .eq("id", todo_id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[todo-completed] uncaught:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
