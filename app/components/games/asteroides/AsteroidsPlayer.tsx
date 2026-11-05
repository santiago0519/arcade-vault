'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from 'react';
import { loadPlayerName, normalizePlayerName, savePlayerName } from '@/app/lib/player-name';
import { insertScore } from '@/app/lib/scores';
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
// Estados del guardado en Supabase desde el modal de fin de partida.
type SaveState = 'idle' | 'saving' | 'saved' | 'error';
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
// Dispositivo sin puntero fino (móvil/tablet táctil): el juego solo se controla con teclado.
const COARSE_QUERY = '(pointer: coarse)';
const ANY_FINE_QUERY = '(any-pointer: fine)';
function subscribePointer(onChange: () => void) {
  const queries = [window.matchMedia(COARSE_QUERY), window.matchMedia(ANY_FINE_QUERY)];
  queries.forEach((q) => q.addEventListener('change', onChange));
  return () => queries.forEach((q) => q.removeEventListener('change', onChange));
}
function getNeedsKeyboard() {
  return window.matchMedia(COARSE_QUERY).matches && !window.matchMedia(ANY_FINE_QUERY).matches;
}
// En el servidor no se sabe: no se muestra el aviso hasta hidratar.
function getNeedsKeyboardServer() {
  return false;
}
export default function AsteroidsPlayer({ title }: { title: string }) {
  const needsKeyboard = useSyncExternalStore(
    subscribePointer,
    getNeedsKeyboard,
    getNeedsKeyboardServer,
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidsEngine | null>(null);
  const [snap, setSnap] = useState<AsteroidsSnapshot>(INITIAL_SNAPSHOT);
  const [name, setName] = useState('');
  // Fin de partida: lo abre el motor (última vida perdida o end()) con la puntuación real.
  const [over, setOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  // Bloqueo síncrono: un doble clic no debe lanzar dos inserts.
  const savingRef = useRef(false);
  // El motor se crea al montar y se destruye al desmontar (navegación, Strict Mode),
  // así no quedan listeners de window ni loops de requestAnimationFrame duplicados.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createAsteroidsEngine({
      canvas,
      // El motor solo emite cuando cambia algún campo: no hay un render por frame.
      onChange: setSnap,
      onGameOver: (score) => {
        setFinalScore(score);
        setSaveState('idle');
        // Precarga el último nombre guardado con éxito, si existe.
        setName((prev) => loadPlayerName() ?? prev);
        setOver(true);
      },
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
  const save = async () => {
    if (savingRef.current || saveState === 'saved') return;
    savingRef.current = true;
    setSaveState('saving');
    const playerName = normalizePlayerName(name);
    try {
      await insertScore({ gameId: 'asteroides', playerName, score: finalScore });
      savePlayerName(playerName);
      setName(playerName);
      setSaveState('saved');
    } catch (error) {
      console.error(error);
      setSaveState('error');
    } finally {
      savingRef.current = false;
    }
  };
  const playAgain = (e: MouseEvent<HTMLButtonElement>) => {
    blurTarget(e);
    setOver(false);
    setSaveState('idle');
    engineRef.current?.restart();
  };
  return (
    <div className="av-player av-asteroids fade-in">
      <div className="player-hud">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: 'var(--ink)' }}>
              {normalizePlayerName(name)}
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
      {needsKeyboard && (
        <div className="av-asteroids-kbd" role="status">
          <span className="ico" aria-hidden="true">
            ⌨
          </span>
          <div>
            <div className="t">REQUIERE TECLADO</div>
            <div className="d">
              Se juega con ← → para rotar, ↑ para propulsar y ESPACIO para disparar. Conecta un
              teclado físico para jugar.
            </div>
          </div>
        </div>
      )}
      <div className="crt">
        <div className="crt-screen">
          <canvas
            ref={canvasRef}
            width={ASTEROIDS_WIDTH}
            height={ASTEROIDS_HEIGHT}
            aria-label="Asteroides: usa las flechas para rotar y propulsar, y Espacio para disparar"
            className="av-asteroids-canvas"
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
      {over && (
        <div className="modal-bd">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="asteroides-fin">
            <h2 id="asteroides-fin">FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{finalScore.toLocaleString('es-ES')}</div>
            {saveState !== 'saved' ? (
              <>
                <div className="input-row">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 10))}
                    maxLength={10}
                    placeholder="TU NOMBRE"
                    aria-label="Tu nombre"
                    disabled={saveState === 'saving'}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn yellow"
                    onClick={save}
                    disabled={saveState === 'saving'}
                    aria-busy={saveState === 'saving'}
                  >
                    {saveState === 'saving' ? 'GUARDANDO…' : 'GUARDAR PUNTUACIÓN'}
                  </button>
                </div>
                {saveState === 'error' && (
                  <div className="save-error" role="alert">
                    <div className="t pixel">NO SE PUDO GUARDAR</div>
                    <div className="d">Revisa tu conexión y pulsa GUARDAR PUNTUACIÓN otra vez.</div>
                  </div>
                )}
              </>
            ) : (
              <div className="toast-saved" role="status">
                ▸ PUNTUACIÓN GUARDADA_
              </div>
            )}
            <div className="actions">
              <button type="button" className="btn" onClick={playAgain}>
                JUGAR DE NUEVO
              </button>
              <Link href="/juegos" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
