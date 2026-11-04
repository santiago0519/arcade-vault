'use client';
import { useEffect, useRef, useState } from 'react';
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
