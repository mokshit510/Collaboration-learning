import { createClient } from '@supabase/supabase-js';
import config from './env.js';

let supabaseClient = null;
let supabaseAdmin = null;

if (config.supabase.isConfigured) {
  try {
    supabaseClient = createClient(config.supabase.url, config.supabase.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    if (config.supabase.serviceRoleKey && !config.supabase.serviceRoleKey.includes('placeholder')) {
      supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
  } catch (err) {
    console.warn('[Supabase] Initialization warning:', err.message);
  }
} else {
  console.info('[Supabase] Running with mock / unconfigured credentials. Set valid SUPABASE_URL and SUPABASE_ANON_KEY in .env for Phase 3.');
}

/**
 * Check if Supabase connection is active and healthy
 * @returns {Promise<{ connected: boolean, message: string }>}
 */
export async function checkSupabaseConnection() {
  if (!config.supabase.isConfigured || !supabaseClient) {
    return {
      connected: false,
      message: 'Supabase credentials not configured (mock mode active)',
    };
  }

  try {
    const { error } = await supabaseClient.from('audit_logs').select('count', { count: 'exact', head: true });
    if (error && error.code !== 'PGRST116') {
      return {
        connected: false,
        message: `Supabase query failed: ${error.message}`,
      };
    }
    return {
      connected: true,
      message: 'Supabase connected successfully',
    };
  } catch (err) {
    return {
      connected: false,
      message: `Supabase error: ${err.message}`,
    };
  }
}

export { supabaseClient, supabaseAdmin };
export default { supabaseClient, supabaseAdmin, checkSupabaseConnection };
