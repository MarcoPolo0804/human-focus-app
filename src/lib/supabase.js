import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client = null;
try {
  // createClient throws synchronously on a malformed URL (e.g. a leftover
  // placeholder value in an env var), which would otherwise crash the whole
  // app at load time before React ever renders anything.
  if (supabaseUrl && supabaseAnonKey) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
} catch {
  client = null;
}

export const supabase = client;
export const isSupabaseConfigured = Boolean(client);
