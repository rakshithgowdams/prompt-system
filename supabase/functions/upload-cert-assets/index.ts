import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Accept multipart form data with the three files
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
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      const { error } = await supabase.storage
        .from("certificate-assets")
        .upload(storageName, uint8, {
          contentType: file.type || "image/png",
          upsert: true,
        });

      if (error) {
        results[storageName] = `UPLOAD_FAILED: ${error.message}`;
      } else {
        const { data } = supabase.storage
          .from("certificate-assets")
          .getPublicUrl(storageName);
        results[storageName] = data.publicUrl;
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
