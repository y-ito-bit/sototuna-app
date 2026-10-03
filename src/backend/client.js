import { createClient } from '@supabase/supabase-js';

// No implicit fallback to mock login or local contact data.
export function createBackend({ url, publishableKey }) {
  if (!url || !publishableKey) throw new Error('Supabaseの接続設定が必要です。');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(parsed.hostname)) {
    throw new Error('SupabaseにはHTTPSで接続してください。');
  }
  if (!publishableKey.startsWith('sb_publishable_')) {
    throw new Error('ブラウザにはSupabaseのpublishable keyを設定してください。');
  }
  return createClient(url, publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' },
  });
}
