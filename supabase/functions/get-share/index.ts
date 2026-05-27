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
      { bucket: "get-share", max: 30, windowSeconds: 600, keyBy: "ip" }, ip);
    if (!limit.allowed) {
      await logAudit(supabase, { action: "get-share.rate_limited", metadata: { share_id: shareId }, ip });
      return tooManyRequestsResponse(limit, corsHeaders);
    }

    // Check in-memory cache (30s TTL) — only for non-password shares
    const cacheKey = `share:${shareId}`;
    let share = cacheGet<Record<string, unknown>>(cacheKey);

    if (!share) {
      const { data, error: shareErr } = await supabase
        .from("file_shares")
        .select("*")
        .eq("id", shareId)
        .maybeSingle();

      if (shareErr || !data) {
        await logAudit(supabase, { action: "get-share.not_found", metadata: { share_id: shareId }, ip });
        return json({ error: "not_found" }, 404, corsHeaders);
      }
      share = data;
      // Only cache open/public shares (not password-protected — password check needs fresh data)
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

      // Validate: password_hash must be a 64-char hex string (sha256)
      if (!isValidString(attempt, 64, 64)) {
        return json({
          status: "password_required",
          share: {
            id: share.id,
            share_name: share.share_name,
            access_type: share.access_type,
            allow_download: share.allow_download,
            expires_at: share.expires_at,
          },
        }, 200, corsHeaders);
      }

      if (attempt !== share.password_hash) {
        await logAudit(supabase, { action: "get-share.wrong_password", metadata: { share_id: shareId }, ip });
        return json({
          status: "password_required",
          share: {
            id: share.id,
            share_name: share.share_name,
            access_type: share.access_type,
            allow_download: share.allow_download,
            expires_at: share.expires_at,
          },
        }, 200, corsHeaders);
      }
    }

    // Increment view count (fire-and-forget)
    supabase.rpc("increment_share_view", { share_id: share.id }).then(() => {});

    const { data: project } = await supabase
      .from("projects").select("name").eq("id", share.project_id).maybeSingle();

    let rawFiles: Record<string, unknown>[] = [];
    let folderName = "";

    if (share.file_id) {
      const { data } = await supabase.from("project_files").select("*").eq("id", share.file_id).maybeSingle();
      if (data) rawFiles = [data];
    } else if (share.folder_id) {
      const { data: folder } = await supabase.from("folders").select("name").eq("id", share.folder_id).maybeSingle();
      folderName = folder?.name ?? "";
      const allFolderIds = await collectFolderIds(supabase, share.folder_id as string);
      const { data } = await supabase.from("project_files").select("*")
        .in("folder_id", allFolderIds).order("created_at", { ascending: true });
      rawFiles = data ?? [];
    } else {
      const { data } = await supabase.from("project_files").select("*")
        .eq("project_id", share.project_id).order("created_at", { ascending: true });
      rawFiles = data ?? [];
    }

    const files = await Promise.all(
      rawFiles.map(async (f) => {
        const filePath = f.file_path as string;
        if (!filePath) return { ...f, signedUrl: "" };
        try {
          const { data: signed } = await supabase.storage
            .from("prompt-media").createSignedUrl(filePath, 3600);
          return { ...f, signedUrl: signed?.signedUrl ?? "" };
        } catch {
          return { ...f, signedUrl: "" };
        }
      })
    );

    return json({
      status: "ok",
      share: {
        id: share.id, share_name: share.share_name, access_type: share.access_type,
        allow_download: share.allow_download, expires_at: share.expires_at,
        project_id: share.project_id, file_id: share.file_id, folder_id: share.folder_id,
      },
      projectName: project?.name ?? "",
      folderName,
      files,
    }, 200, corsHeaders);

  } catch (err) {
    return safeErrorResponse(err, corsHeaders);
  }
});

async function collectFolderIds(
  admin: ReturnType<typeof createClient>,
  rootFolderId: string,
): Promise<string[]> {
  const ids: string[] = [rootFolderId];
  const queue: string[] = [rootFolderId];
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const { data: children } = await admin.from("folders").select("id").eq("parent_folder_id", parentId);
    if (children) {
      for (const child of children) { ids.push(child.id); queue.push(child.id); }
    }
  }
  return ids;
}
