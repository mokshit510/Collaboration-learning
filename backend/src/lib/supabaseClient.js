import { createClient } from '@supabase/supabase-js';
import config from '../config/env.js';

let supabaseClient = null;

/**
 * Server-side Supabase client for backend verification operations.
 * Uses SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY).
 * Never exposed to frontend code.
 */
export function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = process.env.SUPABASE_URL || config.supabase?.url;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    config.supabase?.secretKey ||
    config.supabase?.serviceRoleKey ||
    config.supabase?.anonKey;

  if (!url || !secretKey || url.includes('your-project') || secretKey.includes('placeholder')) {
    throw new Error(
      '[Supabase] Server configuration missing. Please ensure SUPABASE_URL and SUPABASE_SECRET_KEY are defined in backend/.env'
    );
  }

  try {
    supabaseClient = createClient(url, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    console.log('[Supabase] Initialized server-side client for:', url);
    return supabaseClient;
  } catch (err) {
    console.error('[Supabase] Failed to initialize client:', err.message);
    throw new Error(`[Supabase] Client initialization failed: ${err.message}`);
  }
}

export const supabase = {
  from: (table) => getSupabaseClient().from(table),
  rpc: (fn, args) => getSupabaseClient().rpc(fn, args),
};

export default supabase;
