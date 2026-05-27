import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  adminClient, buildCorsHeaders, getClientIp,
  checkRateLimit, tooManyRequestsResponse,
  isValidUuid, isValidString, logAudit, cacheGet, cacheSet, safeErrorResponse,
} from "../_shared/security.ts";

function json(data: unknown, status = 200, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = buildCorsHeaders(origin, true); // public endpoint

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const shareId = url.searchParams.get("id");

    if (!isValidUuid(shareId)) {
      return json({ error: "invalid_share_id" }, 400, corsHeaders);
    }

    const ip = getClientIp(req);
    const supabase = adminClient();

    // Rate limit: 30 per 10 min per IP
    const limit = await checkRateLimit(supabase,
      { bucket: "get-course-share", max: 30, windowSeconds: 600, keyBy: "ip" }, ip);
    if (!limit.allowed) {
      await logAudit(supabase, { action: "get-course-share.rate_limited", metadata: { share_id: shareId }, ip });
      return tooManyRequestsResponse(limit, corsHeaders);
    }

    // In-memory cache (30s TTL) — only for non-password shares
    const cacheKey = `course-share:${shareId}`;
    let share = cacheGet<Record<string, unknown>>(cacheKey);

    if (!share) {
      const { data, error: shareErr } = await supabase
        .from("course_shares")
        .select("*")
        .eq("id", shareId)
        .maybeSingle();

      if (shareErr || !data) {
        await logAudit(supabase, { action: "get-course-share.not_found", metadata: { share_id: shareId }, ip });
        return json({ error: "not_found" }, 404, corsHeaders);
      }
      share = data;
      if (data.access_type !== "password") {
        cacheSet(cacheKey, share, 30);
      }
    }

    if (!share.is_active) return json({ error: "not_found" }, 404, corsHeaders);

    if (share.expires_at && new Date(share.expires_at as string) < new Date()) {
      return json({ error: "expired" }, 410, corsHeaders);
    }

    // Password gate
    if (share.access_type === "password") {
      const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
      const attempt: unknown = body.password_hash;

      if (!isValidString(attempt, 64, 64)) {
        return json({
          status: "password_required",
          share: {
            id: share.id,
            share_name: share.share_name,
            access_type: share.access_type,
            expires_at: share.expires_at,
          },
        }, 200, corsHeaders);
      }

      if (attempt !== share.password_hash) {
        await logAudit(supabase, { action: "get-course-share.wrong_password", metadata: { share_id: shareId }, ip });
        return json({
          status: "password_required",
          share: {
            id: share.id,
            share_name: share.share_name,
            access_type: share.access_type,
            expires_at: share.expires_at,
          },
        }, 200, corsHeaders);
      }
    }

    // Increment view count (fire-and-forget)
    supabase.rpc("increment_course_share_view", { share_id: share.id }).then(() => {});

    const { data: course } = await supabase
      .from("courses")
      .select("*")
      .eq("id", share.course_id)
      .maybeSingle();

    if (!course) return json({ error: "course_not_found" }, 404, corsHeaders);

    const { data: sections } = await supabase
      .from("course_sections")
      .select("*")
      .eq("course_id", share.course_id)
      .order("position", { ascending: true });

    const { data: lessons } = await supabase
      .from("course_lessons")
      .select("*")
      .eq("course_id", share.course_id)
      .order("position", { ascending: true });

    let coverUrl: string | null = null;
    if (course.cover_image) {
      const { data: signed } = await supabase.storage
        .from("prompt-media")
        .createSignedUrl(course.cover_image, 3600);
      coverUrl = signed?.signedUrl ?? null;
    }

    const lessonsWithUrls = await Promise.all(
      (lessons ?? []).map(async (lesson) => {
        let signedVideoUrl: string | null = null;
        if (lesson.is_preview && lesson.video_path) {
          const { data: sv } = await supabase.storage
            .from("prompt-media")
            .createSignedUrl(lesson.video_path, 3600);
          signedVideoUrl = sv?.signedUrl ?? null;
        }
        return {
          ...lesson,
          video_path: lesson.is_preview ? lesson.video_path : null,
          signed_video_url: lesson.is_preview ? signedVideoUrl : null,
        };
      })
    );

    return json({
      status: "ok",
      share: {
        id: share.id,
        share_name: share.share_name,
        access_type: share.access_type,
        expires_at: share.expires_at,
        view_count: share.view_count,
      },
      course: { ...course, cover_url: coverUrl },
      sections: sections ?? [],
      lessons: lessonsWithUrls,
    }, 200, corsHeaders);

  } catch (err) {
    return safeErrorResponse(err, corsHeaders);
  }
});
