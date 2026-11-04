'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  ASTEROIDS_HEIGHT,
  ASTEROIDS_WIDTH,
  createAsteroidsEngine,
  type AsteroidsEngine,
  type AsteroidsSnapshot,
} from './engine';
const INITIAL_SNAPSHOT: AsteroidsSnapshot = {
  score: 0,
  lives: 3,
  level: 1,
  tripleShot: 0,
  state: 'playing',
  paused: false,
};
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}
// Quita el foco del botón tras el clic para que Espacio dispare y no lo vuelva a pulsar.
function blurTarget(e: MouseEvent<HTMLElement>) {
  e.currentTarget.blur();
}
export default function AsteroidsPlayer({ title }: { title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidsEngine | null>(null);
  const [snap, setSnap] = useState<AsteroidsSnapshot>(INITIAL_SNAPSHOT);
  const [name] = useState('INVITADO');
  // El motor se crea al montar y se destruye al desmontar (navegación, Strict Mode),
  // así no quedan listeners de window ni loops de requestAnimationFrame duplicados.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createAsteroidsEngine({
      canvas,
      // El motor solo emite cuando cambia algún campo: no hay un render por frame.
      onChange: setSnap,
      onGameOver: () => {},
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);
  // P y Escape alternan la pausa (no con el foco en un campo ni con la partida terminada).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isEditableTarget(e.target)) return;
      if (e.code !== 'KeyP' && e.key !== 'Escape') return;
      const engine = engineRef.current;
      if (!engine || snap.state === 'gameover') return;
      e.preventDefault();
      engine.togglePause();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [snap.state]);
  const paused = snap.paused;
  const togglePause = (e: MouseEvent<HTMLButtonElement>) => {
    blurTarget(e);
    engineRef.current?.togglePause();
  };
  const endGame = (e: MouseEvent<HTMLButtonElement>) => {
    blurTarget(e);
    engineRef.current?.end();
  };
  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: 'var(--ink)' }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{snap.score.toLocaleString('es-ES')}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{'♥ '.repeat(Math.max(0, snap.lives)).trim() || '—'}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(snap.level).padStart(2, '0')}</div>
          </div>
          {snap.tripleShot > 0 && (
            <div className="hud-stat" aria-label="Triple disparo activo">
              <div className="l">Triple disparo</div>
              <div className="v">3x {snap.tripleShot.toFixed(1)}s</div>
            </div>
          )}
        </div>
        <div className="hud-actions">
          <button
            type="button"
            className="btn yellow"
            onClick={togglePause}
            disabled={snap.state === 'gameover'}
          >
            {paused ? 'REANUDAR' : 'PAUSA'}
          </button>
          <button
            type="button"
            className="btn magenta"
            onClick={endGame}
            disabled={snap.state === 'gameover'}
          >
            FIN
          </button>
          <Link href="/juegos/asteroides" className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>
      <div className="crt">
        <div className="crt-screen">
          <canvas
            ref={canvasRef}
            width={ASTEROIDS_WIDTH}
            height={ASTEROIDS_HEIGHT}
            aria-label="Asteroides: usa las flechas para rotar y propulsar, y Espacio para disparar"
            style={{ display: 'block', width: '100%', height: '100%' }}
          />
          {paused && (
            <div className="crt-content" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-dim)',
                    marginTop: 10,
                    letterSpacing: '0.16em',
                  }}
                >
                  PULSA REANUDAR, P O ESC PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{title} · CRT-83 · 60 HZ</span>
          <span>VECTOR · 800×600</span>
        </div>
      </div>
    </div>
  );
}
