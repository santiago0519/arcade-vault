import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { Suspense } from 'react';
import EmptyLeaderboard from '@/app/components/EmptyLeaderboard';
import HallSkeleton from '@/app/components/HallSkeleton';
import HallTabs from '@/app/components/HallTabs';
import LoadError from '@/app/components/LoadError';
import type { Game } from '@/app/data/games';
import { getGames, getLeaderboard, type LeaderboardRow } from '@/app/lib/games';
export default function HallOfFame({ searchParams }: PageProps<'/salon'>) {
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>
      <Suspense fallback={<HallSkeleton />}>
        <HallContent searchParams={searchParams} />
      </Suspense>
      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <Link href="/juegos" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
// Lee ?juego=, el catálogo y el top 12 en cada petición; vive en <Suspense>.
async function HallContent({
  searchParams,
}: {
  searchParams: PageProps<'/salon'>['searchParams'];
}) {
  const { juego } = await searchParams;
  const requested = Array.isArray(juego) ? juego[0] : juego;
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
        detail="El salón de la fama no responde. Recarga para intentarlo de nuevo."
        retryHref="/salon"
      />
    );
  }
  if (games.length === 0) return <EmptyLeaderboard />;
  // Sin ?juego=, o con un id que no existe, se usa el primer juego.
  const active = games.find((g) => g.id === requested) ?? games[0];
  let rows: LeaderboardRow[] | null = null;
  try {
    rows = await getLeaderboard(active.id, 12);
  } catch (error) {
    unstable_rethrow(error);
    console.error(error);
  }
  return <HallTabs games={games} activeId={active.id} rows={rows} />;
}
