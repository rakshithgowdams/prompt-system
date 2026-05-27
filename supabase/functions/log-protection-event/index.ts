import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient, buildCorsHeaders, getClientIp,
  checkRateLimit, tooManyRequestsResponse,
  logAudit, safeErrorResponse,
} from "../_shared/security.ts";

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = buildCorsHeaders(origin, false);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!corsHeaders["Access-Control-Allow-Origin"]) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = adminClient();
    const ip = getClientIp(req);

    const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const limit = await checkRateLimit(supabase,
      { bucket: "protection-event", max: 300, windowSeconds: 3600, keyBy: "ip+email" }, ip, user.email ?? "");
    if (!limit.allowed) return tooManyRequestsResponse(limit, corsHeaders);

    const body = await req.json().catch(() => ({}));
    const event = typeof body.event === "string" ? body.event.slice(0, 50) : "unknown";
    const courseId = typeof body.course_id === "string" ? body.course_id : null;
    const lessonId = typeof body.lesson_id === "string" ? body.lesson_id : null;

    await logAudit(supabase, {
      userId: user.id,
      action: `content-protection.${event}`,
      targetType: courseId ? "course" : undefined,
      targetId: courseId ?? undefined,
      metadata: { user_email: user.email, lesson_id: lessonId },
      ip,
      userAgent: req.headers.get("User-Agent") ?? undefined,
    });

    return new Response(JSON.stringify({ logged: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return safeErrorResponse(err, corsHeaders);
  }
});
