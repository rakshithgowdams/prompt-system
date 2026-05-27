import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient,
  buildCorsHeaders,
  getClientIp,
  checkRateLimit,
  tooManyRequestsResponse,
  isValidUuid,
  safeErrorResponse,
} from "../_shared/security.ts";

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  // Public endpoint — Explore page is accessible unauthenticated
  const corsHeaders = buildCorsHeaders(origin, true);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = adminClient();
    const ip = getClientIp(req);

    // 100 signed URL requests per 10 minutes per IP
    const limit = await checkRateLimit(
      supabase,
      { bucket: "published-media-url", max: 100, windowSeconds: 600, keyBy: "ip" },
      ip,
    );
    if (!limit.allowed) return tooManyRequestsResponse(limit, corsHeaders);

    const body = await req.json().catch(() => ({}));
    const mediaFileId = body.media_file_id;

    if (!isValidUuid(mediaFileId)) {
      return new Response(JSON.stringify({ error: "invalid_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify media belongs to a published prompt
    const { data: media } = await supabase
      .from("media_files")
      .select("file_path, prompts!inner(is_published)")
      .eq("id", mediaFileId)
      .maybeSingle();

    if (!media || !(media.prompts as { is_published: boolean }).is_published) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signed } = await supabase.storage
      .from("prompt-media")
      .createSignedUrl(media.file_path, 3600);

    if (!signed?.signedUrl) {
      return new Response(JSON.stringify({ error: "signing_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ signed_url: signed.signedUrl, expires_in: 3600 }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600",
        },
      },
    );
  } catch (err) {
    return safeErrorResponse(err, corsHeaders);
  }
});
