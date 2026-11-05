// Cliente de Supabase para Server Components, Route Handlers y Server Actions.
// Se crea en cada llamada para no compartir estado entre peticiones.
// Ojo: cookies() hace dinámica la ruta; con cacheComponents, quien lo use
// debe envolver ese render en <Suspense>.
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from './database.types';
import { getSupabaseEnv } from './env';
export async function createClient(): Promise<SupabaseClient<Database>> {
  const { url, publishableKey } = getSupabaseEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Un Server Component no puede escribir cookies. Se ignora: el
          // refresco de sesión llegará con proxy.ts en la spec de auth.
        }
      },
    },
  });
}
