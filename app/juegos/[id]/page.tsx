import Link from 'next/link';
import { notFound, unstable_rethrow } from 'next/navigation';
import { Suspense } from 'react';
import EmptyLeaderboard from '@/app/components/EmptyLeaderboard';
import GameDetailSkeleton from '@/app/components/GameDetailSkeleton';
import LoadError from '@/app/components/LoadError';
import type { Game } from '@/app/data/games';
import { getGame, getGameStats, getLeaderboard } from '@/app/lib/games';
export default function GameDetail({ params }: PageProps<'/juegos/[id]'>) {
  return (
    <Suspense fallback={<GameDetailSkeleton />}>
      <GameDetailContent params={params} />
    </Suspense>
  );
}
// Lee juego, estadísticas y top 10 en paralelo, en cada petición.
// Cada sección muestra su propio error sin romper la página.
async function GameDetailContent({ params }: { params: PageProps<'/juegos/[id]'>['params'] }) {
  const { id } = await params;
  const [gameRes, statsRes, boardRes] = await Promise.allSettled([
    getGame(id),
    getGameStats(id),
    getLeaderboard(id, 10),
  ]);
  for (const res of [gameRes, statsRes, boardRes]) {
    if (res.status === 'rejected') {
      unstable_rethrow(res.reason);
      console.error(res.reason);
    }
  }
  if (gameRes.status === 'rejected') {
    return (
      <div className="load-error-wrap">
        <LoadError
          detail="La ficha del juego no responde. Recarga para intentarlo de nuevo."
          retryHref={`/juegos/${id}`}
        />
      </div>
    );
  }
  const game: Game | null = gameRes.value;
  if (!game) notFound();
  const stats = statsRes.status === 'fulfilled' ? statsRes.value : null;
  const scores = boardRes.status === 'fulfilled' ? boardRes.value : null;
  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={'cover-bg ' + game.cover}></div>
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            {stats ? (
              <>
                <div>
                  <div className="l">Partidas</div>
                  <div className="v">{stats.plays.toLocaleString('es-ES')}</div>
                </div>
                <div>
                  <div className="l">Mejor global</div>
                  <div
                    className="v"
                    style={{
                      color: 'var(--magenta)',
                      textShadow: '0 0 6px rgba(255,0,110,0.5)',
                    }}
                  >
                    {stats.best === null ? '—' : stats.best.toLocaleString('es-ES')}
                  </div>
                </div>
              </>
            ) : (
              <div className="stat-error" role="alert">
                <div className="l">Partidas y mejor global</div>
                <div className="v">NO SE PUDO CARGAR</div>
              </div>
            )}
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{
                  color: 'var(--yellow)',
                  textShadow: '0 0 6px rgba(245,255,0,0.5)',
                }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/juegos/${game.id}/jugar`} className="btn xl pulse">
              ▶ JUGAR AHORA
            </Link>
            <Link href="/juegos" className="btn ghost lg">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>
      <aside>
        <div className="leaderboard">
          <h3>MEJORES PUNTUACIONES</h3>
          {scores === null ? (
            <LoadError
              compact
              detail="El ranking no responde. Recarga para intentarlo de nuevo."
              retryHref={`/juegos/${game.id}`}
            />
          ) : scores.length === 0 ? (
            <EmptyLeaderboard />
          ) : (
            scores.map((r, i) => (
              <div
                key={r.rank}
                className={
                  'lb-row' + (i === 0 ? ' top1' : i === 1 ? ' top2' : i === 2 ? ' top3' : '')
                }
              >
                <div className="rk">#{String(r.rank).padStart(2, '0')}</div>
                <div className="pl">
                  {r.name}
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--ink-faint)',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {r.date}
                  </div>
                </div>
                <div className="sc">{r.score.toLocaleString('es-ES')}</div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
