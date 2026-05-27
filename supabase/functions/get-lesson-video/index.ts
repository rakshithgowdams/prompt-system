import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient, buildCorsHeaders, getClientIp,
  checkRateLimit, tooManyRequestsResponse,
  isValidUuid, logAudit, safeErrorResponse,
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

    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.slice(7));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const limit = await checkRateLimit(supabase,
      { bucket: "lesson-video", max: 15, windowSeconds: 60, keyBy: "ip+email" }, ip, user.email ?? "");
    if (!limit.allowed) {
      await logAudit(supabase, { action: "lesson-video.rate_limited", metadata: { user_id: user.id }, ip });
      return tooManyRequestsResponse(limit, corsHeaders);
    }

    const body = await req.json().catch(() => ({}));
    const lessonId = body.lesson_id;
    if (!isValidUuid(lessonId)) {
      return new Response(JSON.stringify({ error: "invalid_lesson_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lesson } = await supabase
      .from("course_lessons")
      .select("id, video_path, course_id, courses!inner(user_id, title)")
      .eq("id", lessonId)
      .maybeSingle();

    if (!lesson || !lesson.video_path) {
      return new Response(JSON.stringify({ error: "lesson_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const courseOwnerId = (lesson.courses as any).user_id;
    const isOwner = courseOwnerId === user.id;

    let isEnrolled = false;
    if (!isOwner) {
      const { data: enrollment } = await supabase
        .from("course_enrollments")
        .select("id")
        .eq("course_id", lesson.course_id)
        .eq("user_id", user.id)
        .maybeSingle();
      isEnrolled = !!enrollment;
    }

    if (!isOwner && !isEnrolled) {
      await logAudit(supabase, {
        action: "lesson-video.forbidden",
        metadata: { lesson_id: lessonId, user_id: user.id, course_id: lesson.course_id },
        ip,
      });
      return new Response(JSON.stringify({ error: "not_enrolled" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5-minute signed URL -- short enough to prevent "save and download later"
    const { data: signed, error: signErr } = await supabase
      .storage.from("prompt-media")
      .createSignedUrl(lesson.video_path, 300);

    if (signErr || !signed) {
      return new Response(JSON.stringify({ error: "signing_failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await logAudit(supabase, {
      userId: user.id,
      action: "lesson-video.access",
      targetType: "course_lesson",
      targetId: lessonId,
      metadata: {
        course_id: lesson.course_id,
        is_owner: isOwner,
        user_email: user.email,
      },
      ip,
      userAgent: req.headers.get("User-Agent") ?? undefined,
    });

    return new Response(JSON.stringify({
      signed_url: signed.signedUrl,
      expires_in: 300,
      watermark: user.email ?? user.id.slice(0, 8),
      user_id: user.id,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return safeErrorResponse(err, corsHeaders);
  }
});
