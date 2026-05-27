import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient, buildCorsHeaders, getClientIp,
  checkRateLimit, tooManyRequestsResponse,
  logAudit,
} from "../_shared/security.ts";

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

Deno.serve(async (req: Request) => {
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
    const ip = getClientIp(req);
    const supabase = adminClient();

    // Verify JWT and get user
    const token = authHeader.slice(7);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 30/hr by IP
    const byIp = await checkRateLimit(supabase,
      { bucket: "cert-upload", max: 30, windowSeconds: 3600, keyBy: "ip" }, ip);
    if (!byIp.allowed) {
      await logAudit(supabase, { action: "upload-cert-assets.rate_limited", metadata: { by: "ip", user_id: user.id }, ip });
      return tooManyRequestsResponse(byIp, corsHeaders);
    }

    // Rate limit: 30/hr by email
    const byEmail = await checkRateLimit(supabase,
      { bucket: "cert-upload", max: 30, windowSeconds: 3600, keyBy: "email" }, ip, user.email ?? "");
    if (!byEmail.allowed) {
      await logAudit(supabase, { action: "upload-cert-assets.rate_limited", metadata: { by: "email", user_id: user.id }, ip });
      return tooManyRequestsResponse(byEmail, corsHeaders);
    }

    const formData = await req.formData();
    const results: Record<string, string> = {};

    const fileMap: Record<string, string> = {
      "company-logo": "company-logo.png",
      "round-seal": "round-seal.png",
      "founder-signature": "founder-signature.png",
    };

    for (const [field, storageName] of Object.entries(fileMap)) {
      const file = formData.get(field) as File | null;
      if (!file) {
        results[storageName] = "NOT_PROVIDED";
        continue;
      }

      // MIME allowlist
      if (!ALLOWED_MIME.has(file.type)) {
        results[storageName] = `REJECTED: unsupported file type ${file.type}`;
        continue;
      }

      // Size limit
      if (file.size > MAX_FILE_BYTES) {
        results[storageName] = `REJECTED: file too large (${file.size} bytes)`;
        continue;
      }

      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      const { error } = await supabase.storage
        .from("certificate-assets")
        .upload(storageName, uint8, {
          contentType: file.type,
          upsert: true,
        });

      if (error) {
        results[storageName] = `UPLOAD_FAILED: ${error.message}`;
      } else {
        const { data } = supabase.storage.from("certificate-assets").getPublicUrl(storageName);
        results[storageName] = data.publicUrl;
      }
    }

    await logAudit(supabase, {
      action: "upload-cert-assets.uploaded",
      metadata: { user_id: user.id, files: Object.keys(results) },
      ip,
    });

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("upload-cert-assets error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
