'use client';
import { useEffect, useRef } from 'react';
import {
  ASTEROIDS_HEIGHT,
  ASTEROIDS_WIDTH,
  createAsteroidsEngine,
  type AsteroidsEngine,
} from './engine';
export default function AsteroidsPlayer({ title }: { title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidsEngine | null>(null);
  // El motor se crea al montar y se destruye al desmontar (navegación, Strict Mode),
  // así no quedan listeners de window ni loops de requestAnimationFrame duplicados.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createAsteroidsEngine({
      canvas,
      onChange: () => {},
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
