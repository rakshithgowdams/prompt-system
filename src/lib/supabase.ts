import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Netlify site settings under ' +
    'Site configuration → Environment variables.'
  );
}

/**
 * sessionStorage-first auth storage adapter.
 *
 * Reduces XSS blast radius: tokens land in sessionStorage (cleared on tab close)
 * rather than localStorage (persists indefinitely). An attacker exfiltrating tokens
 * via XSS gets at most the current-session window, not the 7-day refresh token.
 *
 * Backwards-compatible: existing localStorage sessions keep working automatically
 * (getItem reads localStorage as fallback), so no forced logout on deploy.
 *
 * "Stay signed in" opt-in: if the user sets `sb-persist=true` in localStorage
 * (e.g. via a "Remember me" Settings toggle), tokens are also written to localStorage
 * so they survive tab closes.
 */
const sessionStorageAdapter = {
  getItem(key: string): string | null {
    // Prefer sessionStorage (current tab); fall back to localStorage (existing sessions)
    return sessionStorage.getItem(key) ?? localStorage.getItem(key);
  },
  setItem(key: string, value: string): void {
    sessionStorage.setItem(key, value);
    // Mirror to localStorage only when the user explicitly opted into "stay signed in"
    if (localStorage.getItem('sb-persist') === 'true') {
      localStorage.setItem(key, value);
    }
  },
  removeItem(key: string): void {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
