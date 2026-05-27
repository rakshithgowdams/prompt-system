import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

// ─── Origin allowlist ──────────────────────────────────────────────────────

const ALLOWED_ORIGINS = new Set([
  "https://aiwithrakshith.tech",
  "https://www.aiwithrakshith.tech",
  "https://aiwithrakshith.netlify.app",
  "http://localhost:5173",
  "http://localhost:3000",
]);

/**
 * Build CORS headers based on request origin.
 * isPublic=true → wildcard (for share/course-share read-only endpoints)
 * isPublic=false → origin must be on the allowlist (for auth/sensitive endpoints)
 */
export function buildCorsHeaders(
  origin: string | null,
  isPublic: boolean,
): Record<string, string> {
  const base = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Forwarded-For",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };

  if (isPublic) {
    return { ...base, "Access-Control-Allow-Origin": "*" };
  }

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return { ...base, "Access-Control-Allow-Origin": origin };
  }

  // Unknown origin — return base without Allow-Origin header (request will be blocked by browser)
  return base;
}

// ─── IP extraction ──────────────────────────────────────────────────────────

export function getClientIp(req: Request): string {
  const cf = req.headers.get("CF-Connecting-IP");
  if (cf) return cf.trim();
  const xff = req.headers.get("X-Forwarded-For");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("X-Real-IP");
  if (real) return real.trim();
  return "unknown";
}

// ─── Rate limiting ──────────────────────────────────────────────────────────

export interface RateLimitConfig {
  bucket: string;
  max: number;
  windowSeconds: number;
  keyBy: "ip" | "email" | "ip+email";
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  current: number;
  limit: number;
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  config: RateLimitConfig,
  ip: string,
  email?: string,
): Promise<RateLimitResult> {
  let scopeKey: string;
  switch (config.keyBy) {
    case "ip":
      scopeKey = `${config.bucket}:ip:${ip}`;
      break;
    case "email":
      scopeKey = `${config.bucket}:email:${(email ?? "").toLowerCase()}`;
      break;
    case "ip+email":
      scopeKey = `${config.bucket}:ipe:${ip}:${(email ?? "").toLowerCase()}`;
      break;
  }

  const { data, error } = await supabase.rpc("rate_limit_check_and_increment", {
    p_scope_key: scopeKey,
    p_window_seconds: config.windowSeconds,
    p_ip: ip,
  });

  if (error) {
    // Fail open on rate-limit infra errors — log loudly
    console.error("[rate-limit] infra error:", error.message);
    return { allowed: true, remaining: config.max, retryAfterSeconds: 0, current: 0, limit: config.max };
  }

  const current = (data?.[0]?.current_count as number | undefined) ?? 1;
  const allowed = current <= config.max;

  return {
    allowed,
    remaining: Math.max(0, config.max - current),
    retryAfterSeconds: allowed ? 0 : config.windowSeconds,
    current,
    limit: config.max,
  };
}

export function tooManyRequestsResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      error: "rate_limit_exceeded",
      message: "Too many requests. Please try again later.",
      retry_after_seconds: result.retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}

// ─── Audit log ──────────────────────────────────────────────────────────────

export async function logAudit(
  supabase: SupabaseClient,
  params: {
    userId?: string | null;
    action: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
  },
): Promise<void> {
  try {
    await supabase.rpc("log_audit_event", {
      p_user_id: params.userId ?? null,
      p_action: params.action,
      p_target_type: params.targetType ?? null,
      p_target_id: params.targetId ?? null,
      p_metadata: params.metadata ?? null,
      p_ip: params.ip ?? null,
      p_user_agent: params.userAgent ?? null,
    });
  } catch (e) {
    // Audit failures must never block the request
    console.error("[audit] failed to log:", e);
  }
}

// ─── Constant-time compare ──────────────────────────────────────────────────

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// ─── Input validators ───────────────────────────────────────────────────────

export function isValidEmail(s: unknown): s is string {
  if (typeof s !== "string") return false;
  if (s.length < 3 || s.length > 254) return false;
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(s);
}

export function isValidUuid(s: unknown): s is string {
  return (
    typeof s === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
  );
}

export function isValidString(s: unknown, min: number, max: number): s is string {
  return typeof s === "string" && s.length >= min && s.length <= max;
}

// ─── Admin Supabase client ──────────────────────────────────────────────────

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// ─── In-memory edge-function cache ─────────────────────────────────────────

interface CacheEntry<T> { value: T; expiresAt: number }
const memCache = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const entry = memCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) { memCache.delete(key); return null; }
  return entry.value;
}

export function cacheSet<T>(key: string, value: T, ttlSeconds: number): void {
  if (memCache.size > 1000) {
    // Evict oldest 100 entries when cache grows large
    const keys = Array.from(memCache.keys()).slice(0, 100);
    keys.forEach((k) => memCache.delete(k));
  }
  memCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

// ─── Safe error response ────────────────────────────────────────────────────

/**
 * Convert any caught error into a safe response.
 * The real error is logged server-side only — never sent to the client.
 */
export function safeErrorResponse(
  err: unknown,
  corsHeaders: Record<string, string>,
  status = 500,
  publicMessage = "Something went wrong. Please try again.",
): Response {
  console.error("[edge-function-error]", err);
  return new Response(
    JSON.stringify({ error: "internal_error", message: publicMessage }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
