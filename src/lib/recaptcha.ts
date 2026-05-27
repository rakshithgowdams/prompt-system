// ── reCAPTCHA v3 (invisible) + v2 checkbox ────────────────────────────────────

declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
      render: (
        container: string | HTMLElement,
        params: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark';
          size?: 'normal' | 'compact';
        }
      ) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
  }
}

export const RECAPTCHA_V3_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string;
export const RECAPTCHA_V2_SITE_KEY = import.meta.env.VITE_RECAPTCHA_V2_SITE_KEY as string;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ── Script loader ─────────────────────────────────────────────────────────────

let v3ScriptLoaded = false;
let v3LoadPromise: Promise<void> | null = null;

export function loadRecaptchaV3(): Promise<void> {
  if (v3ScriptLoaded) return Promise.resolve();
  if (v3LoadPromise) return v3LoadPromise;

  v3LoadPromise = new Promise((resolve, reject) => {
    if (!RECAPTCHA_V3_SITE_KEY) {
      resolve(); // dev mode, skip
      return;
    }
    if (document.querySelector('script[data-recaptcha-v3]')) {
      v3ScriptLoaded = true;
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_V3_SITE_KEY}`;
    s.dataset.recaptchaV3 = 'true';
    s.async = true;
    s.onload = () => { v3ScriptLoaded = true; resolve(); };
    s.onerror = () => reject(new Error('reCAPTCHA v3 failed to load'));
    document.head.appendChild(s);
  });

  return v3LoadPromise;
}

let v2ScriptLoaded = false;
let v2LoadPromise: Promise<void> | null = null;

export function loadRecaptchaV2(): Promise<void> {
  if (v2ScriptLoaded) return Promise.resolve();
  if (v2LoadPromise) return v2LoadPromise;

  v2LoadPromise = new Promise((resolve, reject) => {
    if (!RECAPTCHA_V2_SITE_KEY) { resolve(); return; }
    // If v3 is already loaded, grecaptcha also supports v2 render — just resolve
    if (document.querySelector('script[data-recaptcha-v3]')) {
      v2ScriptLoaded = true;
      resolve();
      return;
    }
    if (document.querySelector('script[data-recaptcha-v2]')) {
      v2ScriptLoaded = true;
      resolve();
      return;
    }
    const s = document.createElement('script');
    // Render=explicit lets us control when to render widgets
    s.src = `https://www.google.com/recaptcha/api.js?render=explicit`;
    s.dataset.recaptchaV2 = 'true';
    s.async = true;
    s.onload = () => { v2ScriptLoaded = true; resolve(); };
    s.onerror = () => reject(new Error('reCAPTCHA v2 failed to load'));
    document.head.appendChild(s);
  });

  return v2LoadPromise;
}

// ── v3 token getter ───────────────────────────────────────────────────────────

export async function getRecaptchaToken(action: string): Promise<string | null> {
  if (!RECAPTCHA_V3_SITE_KEY) return null;
  try {
    await loadRecaptchaV3();
    return await new Promise<string>((resolve, reject) => {
      window.grecaptcha.ready(async () => {
        try {
          const token = await window.grecaptcha.execute(RECAPTCHA_V3_SITE_KEY, { action });
          resolve(token);
        } catch (err) { reject(err); }
      });
    });
  } catch (err) {
    console.error('[recaptcha-v3] error:', err);
    return null;
  }
}

// ── v2 widget renderer ────────────────────────────────────────────────────────

export async function renderRecaptchaV2(
  container: HTMLElement,
  onVerified: (token: string) => void,
  onExpired: () => void,
): Promise<number> {
  if (!RECAPTCHA_V2_SITE_KEY) {
    // Dev mode — immediately call onVerified with a placeholder
    onVerified('dev-v2-bypass');
    return -1;
  }
  // If v3 was already loaded, grecaptcha is ready for v2 render too
  if (!v3ScriptLoaded && !v2ScriptLoaded) {
    await loadRecaptchaV2();
  }
  return await new Promise<number>((resolve) => {
    window.grecaptcha.ready(() => {
      const widgetId = window.grecaptcha.render(container, {
        sitekey: RECAPTCHA_V2_SITE_KEY,
        callback: onVerified,
        'expired-callback': onExpired,
        'error-callback': onExpired,
        theme: 'light',
        size: 'normal',
      });
      resolve(widgetId);
    });
  });
}

export function resetRecaptchaV2(widgetId?: number) {
  if (!RECAPTCHA_V2_SITE_KEY) return;
  try {
    window.grecaptcha?.reset(widgetId ?? undefined);
  } catch { /* silent */ }
}

// ── Shared server-side verification ──────────────────────────────────────────

export async function verifyRecaptchaServerSide(
  token: string,
  action: string,
): Promise<boolean> {
  if (!token || token === 'dev-v2-bypass') return true; // dev bypass
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-recaptcha`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ token, action }),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && data.success === true;
  } catch {
    return false;
  }
}
