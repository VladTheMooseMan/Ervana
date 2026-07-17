// ============================================================================
// Supabase client — shared connection for auth + database
// ============================================================================
// Env vars are baked in at build time (Vite reads them from .env.local locally
// and from GitHub Actions / build environment in CI). The anon key is safe to
// ship to the browser because access is gated by Row-Level Security policies
// defined on the database.
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  console.error(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Create .env.local at project root and rebuild.'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
