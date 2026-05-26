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

    // Use service role to bypass RLS — this is intentional and safe because
    // we enforce all access rules manually below (expiry, is_active, password gate).
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // 1. Fetch the share record
    const { data: share, error: shareErr } = await admin
      .from("file_shares")
      .select("*")
      .eq("id", shareId)
      .maybeSingle();

    if (shareErr || !share) return json({ error: "not_found" }, 404);
    if (!share.is_active) return json({ error: "not_found" }, 404);

    // 2. Check expiry
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return json({ error: "expired" }, 410);
    }

    // 3. If password-protected, verify the password hash passed in the request
    if (share.access_type === "password") {
      const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
      const attempt: string | undefined = body.password_hash;
      if (!attempt || attempt !== share.password_hash) {
        // Return share metadata only — no files
        return json({
          status: "password_required",
          share: {
            id: share.id,
            share_name: share.share_name,
            access_type: share.access_type,
            allow_download: share.allow_download,
            expires_at: share.expires_at,
          },
        });
      }
    }

    // 4. Increment view count (fire-and-forget, non-blocking)
    admin.rpc("increment_share_view", { share_id: share.id }).then(() => {});

    // 5. Fetch project name
    const { data: project } = await admin
      .from("projects")
      .select("name")
      .eq("id", share.project_id)
      .maybeSingle();

    // 6. Fetch files
    let rawFiles: Record<string, unknown>[] = [];
    let folderName = "";

    if (share.file_id) {
      const { data } = await admin
        .from("project_files")
        .select("*")
        .eq("id", share.file_id)
        .maybeSingle();
      if (data) rawFiles = [data];
    } else if (share.folder_id) {
      const { data: folder } = await admin
        .from("folders")
        .select("name")
        .eq("id", share.folder_id)
        .maybeSingle();
      folderName = folder?.name ?? "";
      const { data } = await admin
        .from("project_files")
        .select("*")
        .eq("folder_id", share.folder_id)
        .order("created_at", { ascending: true });
      rawFiles = data ?? [];
    } else {
      // Whole project — top-level files only
      const { data } = await admin
        .from("project_files")
        .select("*")
        .eq("project_id", share.project_id)
        .is("folder_id", null)
        .order("created_at", { ascending: true });
      rawFiles = data ?? [];
    }

    // 7. Generate signed URLs for all files (60-minute expiry)
    const files = await Promise.all(
      rawFiles.map(async (f) => {
        try {
          const { data: signed } = await admin.storage
            .from("prompt-media")
            .createSignedUrl(f.file_path as string, 3600);
          return { ...f, signedUrl: signed?.signedUrl ?? "" };
        } catch {
          return { ...f, signedUrl: "" };
        }
      })
    );

    return json({
      status: "ok",
      share: {
        id: share.id,
        share_name: share.share_name,
        access_type: share.access_type,
        allow_download: share.allow_download,
        expires_at: share.expires_at,
        project_id: share.project_id,
        file_id: share.file_id,
        folder_id: share.folder_id,
      },
      projectName: project?.name ?? "",
      folderName,
      files,
    });
  } catch (err) {
    console.error("get-share error", err);
    return json({ error: "internal_error" }, 500);
  }
});
