import { unstable_rethrow } from 'next/navigation';
import { Suspense } from 'react';
import LibraryBrowser from '@/app/components/LibraryBrowser';
import LibrarySkeleton from '@/app/components/LibrarySkeleton';
import LoadError from '@/app/components/LoadError';
import type { Game } from '@/app/data/games';
import { getGames } from '@/app/lib/games';
export default function Juegos() {
  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>
      <Suspense fallback={<LibrarySkeleton />}>
        <Library />
      </Suspense>
    </div>
  );
}
// Lee el catálogo en cada petición (cookies() del cliente de servidor),
// por eso vive dentro de <Suspense>.
async function Library() {
  let games: Game[] | null = null;
  try {
    games = await getGames();
  } catch (error) {
    // Deja pasar las interrupciones internas de Next.js (prerender, notFound…).
    unstable_rethrow(error);
    console.error(error);
  }
  if (!games) {
    return (
      <div className="load-error-wrap">
        <LoadError
          detail="El catálogo de juegos no responde. Recarga para intentarlo de nuevo."
          retryHref="/juegos"
        />
      </div>
    );
  }
  return <LibraryBrowser games={games} />;
}
