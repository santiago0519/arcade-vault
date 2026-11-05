import { notFound, unstable_rethrow } from 'next/navigation';
import { Suspense } from 'react';
import AsteroidsPlayer from '@/app/components/games/asteroides/AsteroidsPlayer';
import LoadError from '@/app/components/LoadError';
import PlayerSkeleton from '@/app/components/PlayerSkeleton';
import type { Game } from '@/app/data/games';
import { getGame } from '@/app/lib/games';
// Play-page propia del juego real. El título se lee de Supabase en cada
// petición, así que el reproductor vive dentro de <Suspense>.
export default function AsteroidesJugarPage() {
  return (
    <Suspense fallback={<PlayerSkeleton />}>
      <AsteroidesPlayerContent />
    </Suspense>
  );
}
async function AsteroidesPlayerContent() {
  let game: Game | null;
  try {
    game = await getGame('asteroides');
  } catch (error) {
    unstable_rethrow(error);
    console.error(error);
    return (
      <div className="load-error-wrap">
        <LoadError
          detail="No se pudo preparar la partida. Recarga para intentarlo de nuevo."
          retryHref="/juegos/asteroides/jugar"
        />
      </div>
    );
  }
  if (!game) notFound();
  return <AsteroidsPlayer title={game.title} />;
}
