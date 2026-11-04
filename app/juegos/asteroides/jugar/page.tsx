import { notFound } from 'next/navigation';
import AsteroidsPlayer from '@/app/components/games/asteroides/AsteroidsPlayer';
import { GAMES } from '@/app/data/games';
// Play-page propia del juego real. El segmento estático `asteroides` tiene prioridad
// sobre la ruta genérica `/juegos/[id]/jugar`, que sigue sirviendo a los juegos simulados.
export default function AsteroidesJugarPage() {
  const game = GAMES.find((g) => g.id === 'asteroides');
  if (!game) notFound();
  return <AsteroidsPlayer title={game.title} />;
}
