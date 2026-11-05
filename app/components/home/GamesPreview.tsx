import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { Suspense } from 'react';
import LoadError from '@/app/components/LoadError';
import type { Game } from '@/app/data/games';
import { getGames } from '@/app/lib/games';
function MiniCard({ game }: { game: Game }) {
  return (
    <Link href={`/juegos/${game.id}`} className="mini-card">
      <div className="mini-cover">
        <div className={'cover-bg ' + game.cover}></div>
      </div>
      <div className="mini-meta">
        <div className="mini-title">{game.title}</div>
        <div className="mini-cat">{game.cat}</div>
      </div>
    </Link>
  );
}
function MiniRailSkeleton() {
  return (
    <div className="mini-rail" aria-busy="true">
      <span className="sr-only">Cargando juegos…</span>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="skel-mini" aria-hidden="true">
          <div className="skel skel-mini-cover"></div>
          <div className="skel-mini-meta">
            <div className="skel skel-line"></div>
            <div className="skel skel-line short"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
// Lee el catálogo en cada petición; vive dentro de <Suspense>.
async function GamesRail() {
  let games: Game[] | null = null;
  try {
    games = await getGames();
  } catch (error) {
    unstable_rethrow(error);
    console.error(error);
  }
  if (!games) {
    return (
      <LoadError
        compact
        detail="La lista de juegos no responde. Recarga para intentarlo de nuevo."
        retryHref="/"
      />
    );
  }
  return (
    <div className="mini-rail">
      {games.slice(0, 6).map((g) => (
        <MiniCard key={g.id} game={g} />
      ))}
    </div>
  );
}
// La sección .reveal queda fuera de <Suspense> para que RevealOnScroll la
// observe desde el shell estático; solo el rail llega en streaming.
export default function GamesPreview() {
  return (
    <section className="home-section reveal">
      <div className="section-head">
        <div className="kicker pixel neon-cyan">{'// 02'}</div>
        <h2 className="section-title">JUEGOS DISPONIBLES AHORA</h2>
        <div className="section-rule"></div>
      </div>
      <Suspense fallback={<MiniRailSkeleton />}>
        <GamesRail />
      </Suspense>
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Link href="/juegos" className="btn lg">
          VER TODOS LOS JUEGOS →
        </Link>
      </div>
    </section>
  );
}
