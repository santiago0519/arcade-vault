import Link from 'next/link';
import EmptyLeaderboard from '@/app/components/EmptyLeaderboard';
import LoadError from '@/app/components/LoadError';
import type { Game } from '@/app/data/games';
import type { LeaderboardRow } from '@/app/lib/games';
// Pestañas como enlaces a /salon?juego=<id> + podio y tabla del juego activo.
// rows === null significa que falló la lectura del ranking.
export default function HallTabs({
  games,
  activeId,
  rows,
}: {
  games: Game[];
  activeId: string;
  rows: LeaderboardRow[] | null;
}) {
  return (
    <>
      <nav className="hall-tabs" aria-label="Juegos del salón de la fama">
        {games.map((g) => (
          <Link
            key={g.id}
            href={`/salon?juego=${g.id}`}
            scroll={false}
            className={'chip' + (activeId === g.id ? ' active' : '')}
            aria-current={activeId === g.id ? 'page' : undefined}
          >
            {g.title}
          </Link>
        ))}
      </nav>
      {rows === null ? (
        <LoadError
          detail="El ranking no responde. Recarga para intentarlo de nuevo."
          retryHref={`/salon?juego=${activeId}`}
        />
      ) : rows.length === 0 ? (
        <div className="hall-table">
          <EmptyLeaderboard playHref={`/juegos/${activeId}/jugar`} />
        </div>
      ) : (
        <>
          <Podium rows={rows} />
          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.rank}
                className={'tr' + (i === 0 ? ' top1' : i === 1 ? ' top2' : i === 2 ? ' top3' : '')}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, '0')}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{r.score.toLocaleString('es-ES')}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
// Solo pinta los puestos que tienen puntuación.
function Podium({ rows }: { rows: LeaderboardRow[] }) {
  const [first, second, third] = rows;
  return (
    <div className="podium">
      {second && (
        <div className="podium-slot silver">
          <div className="rank-num">02</div>
          <div className="name">{second.name}</div>
          <div className="score">{second.score.toLocaleString('es-ES')}</div>
          <div className="date">{second.date}</div>
        </div>
      )}
      {first && (
        <div className="podium-slot gold">
          <div
            className="pixel"
            style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.18em' }}
          >
            CAMPEÓN
          </div>
          <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
            01
          </div>
          <div className="name">{first.name}</div>
          <div className="score" style={{ fontSize: 20 }}>
            {first.score.toLocaleString('es-ES')}
          </div>
          <div className="date">{first.date}</div>
        </div>
      )}
      {third && (
        <div className="podium-slot bronze">
          <div className="rank-num">03</div>
          <div className="name">{third.name}</div>
          <div className="score">{third.score.toLocaleString('es-ES')}</div>
          <div className="date">{third.date}</div>
        </div>
      )}
    </div>
  );
}
