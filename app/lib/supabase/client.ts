// Cliente de Supabase para Client Components.
// Se crea en cada llamada, nunca a nivel de módulo.
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './env';
export function createClient(): SupabaseClient {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient(url, publishableKey);
}
