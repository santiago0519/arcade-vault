import Link from 'next/link';
// Ranking sin puntuaciones: un puesto #01 vacío, como la pantalla de
// iniciales de una recreativa esperando al primer jugador.
export default function EmptyLeaderboard({ playHref }: { playHref?: string }) {
  return (
    <div className="lb-empty">
      <div className="lb-empty-slot" aria-hidden="true">
        <span className="rk">#01</span>
        <span className="initials">
          _ _ _<span className="blink">▌</span>
        </span>
        <span className="sc">000000</span>
      </div>
      <p className="lb-empty-title pixel">SÉ EL PRIMERO EN ENTRAR AL SALÓN DE LA FAMA</p>
      <p className="lb-empty-hint">
        Juega una partida y guarda tu puntuación para estrenar el ranking.
      </p>
      {playHref && (
        <Link href={playHref} className="btn yellow">
          ▶ JUGAR AHORA
        </Link>
      )}
    </div>
  );
}
