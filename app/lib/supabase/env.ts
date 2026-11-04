// Sin "use client": lo importan tanto client.ts como server.ts.
// Las variables se leen con nombre literal para que Next.js inyecte
// los valores NEXT_PUBLIC_* en el bundle del navegador.
export function getSupabaseEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url) {
    throw new Error('Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!publishableKey) {
    throw new Error('Falta la variable de entorno NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }
  return { url, publishableKey };
}
