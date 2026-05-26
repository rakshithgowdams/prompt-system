import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const shareId = url.searchParams.get("id");
    if (!shareId) return json({ error: "Missing share id" }, 400);

    // Service role bypasses RLS — all access rules enforced manually below.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // 1. Fetch share record
    const { data: share, error: shareErr } = await admin
      .from("course_shares")
      .select("*")
      .eq("id", shareId)
      .maybeSingle();

    if (shareErr || !share) return json({ error: "not_found" }, 404);
    if (!share.is_active) return json({ error: "not_found" }, 404);

    // 2. Check expiry
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return json({ error: "expired" }, 410);
    }

    // 3. Password gate
    if (share.access_type === "password") {
      const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
      const attempt: string | undefined = body.password_hash;
      if (!attempt || attempt !== share.password_hash) {
        return json({
          status: "password_required",
          share: {
            id: share.id,
            share_name: share.share_name,
            access_type: share.access_type,
            expires_at: share.expires_at,
          },
        });
      }
    }

    // 4. Increment view count (fire-and-forget)
    admin.rpc("increment_course_share_view", { share_id: share.id }).then(() => {});

    // 5. Fetch full course with sections and lessons
    const { data: course } = await admin
      .from("courses")
      .select("*")
      .eq("id", share.course_id)
      .maybeSingle();

    if (!course) return json({ error: "course_not_found" }, 404);

    const { data: sections } = await admin
      .from("course_sections")
      .select("*")
      .eq("course_id", share.course_id)
      .order("position", { ascending: true });

    const { data: lessons } = await admin
      .from("course_lessons")
      .select("*")
      .eq("course_id", share.course_id)
      .order("position", { ascending: true });

    // 6. Generate signed cover URL if present
    let coverUrl: string | null = null;
    if (course.cover_image) {
      const { data: signed } = await admin.storage
        .from("prompt-media")
        .createSignedUrl(course.cover_image, 3600);
      coverUrl = signed?.signedUrl ?? null;
    }

    // 7. Generate signed URLs for preview lessons only (video_path)
    const lessonsWithUrls = await Promise.all(
      (lessons ?? []).map(async (lesson) => {
        let signedVideoUrl: string | null = null;
        if (lesson.is_preview && lesson.video_path) {
          const { data: sv } = await admin.storage
            .from("prompt-media")
            .createSignedUrl(lesson.video_path, 3600);
          signedVideoUrl = sv?.signedUrl ?? null;
        }
        // Strip video_path from non-preview lessons for security
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
    });
  } catch (err) {
    console.error("get-course-share error", err);
    return json({ error: "internal_error" }, 500);
  }
});
