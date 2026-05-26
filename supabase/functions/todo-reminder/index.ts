import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { reminderEmail, sendResendEmail } from "../_shared/todo-email-templates.ts";

const APP_URL = Deno.env.get("APP_URL") ?? "https://aiwithrakshith.tech";

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const now = new Date();
    const lowerBound = new Date(now.getTime() + 25 * 60 * 1000).toISOString();
    const upperBound = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

    const { data: todos, error } = await supabase
      .from("todos")
      .select("id, user_id, title, notes, due_at, priority")
      .eq("completed", false)
      .is("reminder_sent_at", null)
      .gte("due_at", lowerBound)
      .lte("due_at", upperBound);

    if (error) {
      console.error("[todo-reminder] query failed:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const results = { processed: 0, sent: 0, skipped: 0, failed: 0 };

    for (const todo of todos ?? []) {
      results.processed++;
      try {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(todo.user_id);
        if (!authUser?.email) { results.skipped++; continue; }

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("display_name, todo_emails_enabled")
          .eq("id", todo.user_id)
          .maybeSingle();

        if (profile?.todo_emails_enabled === false) {
          await supabase.from("todos").update({ reminder_sent_at: new Date().toISOString() }).eq("id", todo.id);
          results.skipped++;
          continue;
        }

        const userName = profile?.display_name?.trim() || authUser.email.split("@")[0];
        const { subject, html } = reminderEmail({
          todoTitle: todo.title,
          todoNotes: todo.notes,
          dueAt: todo.due_at,
          priority: todo.priority,
          userName,
          appUrl: APP_URL,
        });

        const result = await sendResendEmail(resendApiKey, authUser.email, subject, html);
        if (!result.success) {
          console.error(`[todo-reminder] resend failed for todo ${todo.id}:`, result.error);
          results.failed++;
          continue;
        }

        await supabase.from("todos").update({ reminder_sent_at: new Date().toISOString() }).eq("id", todo.id);
        results.sent++;
      } catch (e) {
        console.error(`[todo-reminder] error on todo ${todo.id}:`, e);
        results.failed++;
      }
    }

    console.log("[todo-reminder] run complete:", results);
    return new Response(JSON.stringify(results), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[todo-reminder] uncaught:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
