import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function sanitizeUrl(url: string): string {
  const clean = (url || '').trim().replace(/\/+$/, '');
  try {
    return new URL(clean).origin;
  } catch {
    return clean;
  }
}

const url = sanitizeUrl(import.meta.env.VITE_SUPABASE_URL || '');
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(url && anonKey);
export const DATA_TABLE = 'atlas_data';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    try {
      client = createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
    } catch (err) {
      console.error('Supabase: URL/chave inválidas', err);
      return null;
    }
  }
  return client;
}
