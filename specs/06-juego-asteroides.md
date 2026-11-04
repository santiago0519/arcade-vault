# SPEC 06 — Juego real de Asteroides

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 03
> **Date:** 2026-11-03
> **Objective:** Portar a TypeScript el juego de `references/started-games/02-asteroids/` y jugarlo de verdad en `/juegos/asteroides/jugar`, como nueva entrada `asteroides` del catálogo, con HUD, pausa, fin de partida y guardado de puntuación de la plataforma.

---

## Por qué existe esta spec

Hasta ahora todos los juegos del catálogo son simulados: `PlayerScreen` sube la puntuación con un `setInterval` y pinta una arena falsa. `references/started-games/02-asteroids/` trae un Asteroids completo en canvas (`game.js`, 510 líneas, sin dependencias) pensado para abrirse como página suelta: usa globales, registra listeners en `window` al cargar y arranca solo su `requestAnimationFrame`.

Esta spec lo convierte en el primer juego jugable de la plataforma. Fija además el patrón que seguirán los siguientes (`03-tetris`, `04-arkanoid`): motor en TypeScript sin React, un Client Component que lo monta y una play-page propia por juego, sin tocar la ruta genérica ni los juegos simulados.

---

## Scope

**In:**

- Nueva entrada en `GAMES` (`app/data/games.ts`), **al principio de la lista**:
  - `id: "asteroides"`, `title: "ASTEROIDES"`, `cat: "SHOOTER"`, `color: "cyan"`, `cover: "cover-asteroides"`, `best: 0`, `plays: "0"`.
  - `short` y `long` en español que describan solo lo que el juego tiene (nave, asteroides que se parten, triple disparo, niveles).
- Nueva portada CSS `cover-asteroides` en `app/globals.css`: nave y rocas vectoriales en blanco sobre negro, coherente con el estilo del juego.
- Motor portado a TypeScript en `app/components/games/asteroides/engine.ts`, sin React ni globales de módulo:
  - Clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` con la misma física, constantes y puntuación que `game.js` (grande 20, mediano 50, pequeño 100; 3 vidas; invencibilidad de 3 s; `dt` limitado a 50 ms; espacio toroidal 800×600).
  - Power-up de triple disparo tal cual: 15 % de probabilidad, garantizado a las 5 bajas, uno por nivel, 5 s de duración, 12 s de vida.
  - Estilo visual original: trazos blancos sobre negro, power-up cian, fuente `monospace`.
  - HUD del canvas original (SCORE, NIVEL, iconos de vida, `3x  N.Ns`).
  - **Se elimina** el overlay "GAME OVER … ESPACIO PARA REINICIAR" del canvas y el reinicio con Espacio: el fin de partida lo gestiona la plataforma.
  - API de control: arrancar, pausar, reanudar, reiniciar, terminar y destruir (ver Data model).
  - Listeners de teclado registrados al crear el motor y eliminados en `destroy()`.
- Client Component `app/components/games/asteroides/AsteroidsPlayer.tsx`:
  - Misma estructura y clases que `PlayerScreen` (`av-player`, `player-hud`, `hud-stat`, `hud-actions`, `crt`, `crt-screen`, `crt-bottom`, `modal-bd`, `modal`, `input-row`, `toast-saved`), con JSX propio.
  - `<canvas width={800} height={600}>` dentro de `crt-screen` (ya es 4:3), escalado por CSS al 100 % del ancho.
  - HUD React con Jugador, Puntuación, Vidas, Nivel y, mientras esté activo, el indicador `3x` con los segundos restantes, alimentado por el motor.
  - Botones PAUSA/REANUDAR, FIN y SALIR (a `/juegos/asteroides`). Teclas `P` y `Escape` alternan la pausa.
  - Overlay "EN PAUSA" como el de `PlayerScreen`.
  - Al perder la última vida o pulsar FIN se abre el modal "FIN DEL JUEGO" con la puntuación real. GUARDAR PUNTUACIÓN llama a `saveScore({ game: "asteroides", score, name })`. JUGAR DE NUEVO reinicia el motor. VOLVER AL VAULT lleva a `/juegos`.
  - Aviso "REQUIERE TECLADO" cuando el dispositivo no tiene puntero fino (`(pointer: coarse)` y sin `(any-pointer: fine)`).
- Play-page propia `app/juegos/asteroides/jugar/page.tsx` que monta `AsteroidsPlayer` con el título del juego leído de `GAMES`.
- Diseño de UI guiado por el skill `/frontend-design`, según `CLAUDE.md`.

**Out of scope (para futuras specs):**

- Cambios en `app/components/PlayerScreen.tsx` o en `app/juegos/[id]/jugar/page.tsx` (salvo el caso del riesgo de rutas en conflicto, ver Risks). Los demás juegos siguen simulados.
- Modificar o eliminar la entrada `rocas`.
- Reestilizar el juego con los colores neón de la plataforma.
- Controles táctiles en pantalla.
- Puntuaciones en Supabase, ranking real o mostrar `av_scores` en `/salon` o en el detalle del juego (siguen usando `seededScores`).
- Actualizar `best` o `plays` de la entrada con datos reales.
- Sonido.
- OVNIs, hiperespacio u otras mecánicas que no existen en `game.js`.
- Tetris y Arkanoid (`references/started-games/03-tetris`, `04-arkanoid`).
- Tests automatizados (el proyecto no tiene test runner).

---

## Data model

No hay datos persistentes nuevos. La puntuación se guarda con el `SavedScore` existente de `app/lib/scores-storage.ts` (clave `av_scores`), con `game: "asteroides"`.

Entrada nueva en `GAMES`:

```ts
// app/data/games.ts — primer elemento del array
{
  id: "asteroides",
  title: "ASTEROIDES",
  short: "…",           // texto en español, solo mecánicas reales
  long: "…",
  cat: "SHOOTER",
  cover: "cover-asteroides",
  color: "cyan",
  best: 0,
  plays: "0",
}
```

API del motor:

```ts
// app/components/games/asteroides/engine.ts — sin "use client", sin imports de React
export const ASTEROIDS_WIDTH = 800;
export const ASTEROIDS_HEIGHT = 600;

export type AsteroidsState = 'playing' | 'dead' | 'gameover';

export interface AsteroidsSnapshot {
  score: number;
  lives: number;
  level: number;
  tripleShot: number; // segundos restantes, redondeado a 0.1; 0 si inactivo
  state: AsteroidsState;
  paused: boolean;
}

export interface AsteroidsEngineOptions {
  canvas: HTMLCanvasElement;
  onChange: (snapshot: AsteroidsSnapshot) => void; // solo cuando cambia algún campo
  onGameOver: (finalScore: number) => void; // al perder la última vida o con end()
}

export interface AsteroidsEngine {
  pause(): void;
  resume(): void;
  togglePause(): void;
  restart(): void; // initGame() + reanuda el loop
  end(): void; // fuerza game over y llama a onGameOver
  destroy(): void; // cancela el rAF y quita los listeners de window
}

export function createAsteroidsEngine(opts: AsteroidsEngineOptions): AsteroidsEngine;
```

Rutas:

| Pantalla                | Ruta                       | Cambio                                                                   |
| ----------------------- | -------------------------- | ------------------------------------------------------------------------ |
| Reproductor Asteroides  | `/juegos/asteroides/jugar` | Nueva. Página propia; `AsteroidsPlayer` es cliente                       |
| Detalle                 | `/juegos/asteroides`       | Sin archivo nuevo: la sirve la ruta genérica `[id]` con la nueva entrada |
| Biblioteca, Home, Salón | `/juegos`, `/`, `/salon`   | Sin código nuevo: muestran la entrada por leer `GAMES`                   |

Convenciones:

- Todo el código del juego vive en `app/components/games/asteroides/`. Solo `AsteroidsPlayer.tsx` lleva `"use client"`.
- El motor se crea en un `useEffect` y se destruye en su limpieza; nunca a nivel de módulo (no hay `window` en el servidor).
- El motor ignora el teclado si el foco está en un `input`, `textarea` o elemento editable, si está en pausa o si el estado es `gameover`. Así el campo de iniciales del modal recibe Espacio con normalidad.
- Mientras se juega, `preventDefault()` en `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown` y `Space` para que la página no haga scroll.
- `onChange` no se dispara cada frame: el motor compara con el último snapshot emitido.
- Textos de la UI en español; los del canvas se conservan como en `game.js` (`SCORE`, `NIVEL`).

---

## Implementation plan

Antes de empezar, leer en `node_modules/next/dist/docs/01-app/`: la guía `02-guides/server-and-client-boundary.md`, `02-guides/keeping-pages-static.md` y la referencia de rutas dinámicas y `generateStaticParams` en `03-api-reference/03-file-conventions/`, para confirmar cómo conviven un segmento estático `asteroides` y `[id]` con `cacheComponents`.

1. Añadir la entrada `asteroides` al principio de `GAMES` y la clase `cover-asteroides` en `app/globals.css`. Prueba manual: `/juegos` y `/` muestran la tarjeta ASTEROIDES con su portada; `/juegos/asteroides` abre el detalle; `/salon` tiene la pestaña y aparece seleccionada por defecto.
2. Crear `app/components/games/asteroides/engine.ts` portando `game.js` a TypeScript con la API de `createAsteroidsEngine`, sin el overlay de game over ni el reinicio con Espacio. Prueba manual: `npm run build` compila sin errores de tipos.
3. Crear `app/components/games/asteroides/AsteroidsPlayer.tsx` con el canvas dentro del marco CRT, creando y destruyendo el motor en `useEffect`. Crear `app/juegos/asteroides/jugar/page.tsx` que lo monta. Prueba manual: en `/juegos/asteroides/jugar` se juega con flechas y Espacio, la página no hace scroll al pulsarlas, y el HUD del canvas muestra SCORE, NIVEL y vidas.
4. Conectar el HUD React a `onChange` (Jugador, Puntuación, Vidas, Nivel e indicador `3x`). Prueba manual: los valores de la barra coinciden con los del canvas al destruir asteroides, perder una vida, pasar de nivel y recoger el power-up.
5. Botones PAUSA/REANUDAR y FIN, teclas `P`/`Escape`, overlay "EN PAUSA". Prueba manual: en pausa nada se mueve y las teclas de juego no actúan; al reanudar no hay salto de posición.
6. Modal "FIN DEL JUEGO" con `onGameOver`, guardado con `saveScore`, JUGAR DE NUEVO y VOLVER AL VAULT. Prueba manual: perder las 3 vidas abre el modal con la puntuación real; guardar añade `{ game: "asteroides", … }` a `localStorage.av_scores`; escribir iniciales con Espacio no dispara; JUGAR DE NUEVO deja puntuación 0, 3 vidas y nivel 1.
7. Aviso "REQUIERE TECLADO" para dispositivos sin puntero fino y escalado del canvas en móvil. Prueba manual: con la emulación táctil de DevTools aparece el aviso; entre 320 y 640 px no hay scroll horizontal.
8. Comprobar limpieza al navegar: entrar y salir de `/juegos/asteroides/jugar` varias veces con SALIR y con la nav. Ejecutar `npm run lint` y `npm run build`, y revisar con `npm run dev` que `/juegos/rocas/jugar` y el resto de juegos simulados siguen igual.

---

## Acceptance criteria

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `GAMES[0]` es `asteroides` con `title: "ASTEROIDES"`, `cat: "SHOOTER"`, `color: "cyan"`, `cover: "cover-asteroides"`, `best: 0`, `plays: "0"`.
- [ ] La entrada `rocas` sigue en `GAMES` sin cambios.
- [ ] La tarjeta ASTEROIDES aparece en `/` y `/juegos` con la portada `cover-asteroides`, y su detalle `/juegos/asteroides` enlaza a `/juegos/asteroides/jugar`.
- [ ] En `/juegos/asteroides/jugar`, `←`/`→` rotan, `↑` propulsa y `Espacio` dispara; el espacio es toroidal y los asteroides se parten grande → mediano → pequeño.
- [ ] Destruir un asteroide grande, mediano y pequeño suma 20, 50 y 100 puntos.
- [ ] Antes de la 6.ª baja de un nivel aparece un power-up `3x`; al recogerlo el disparo es triple durante 5 s y la barra React muestra `3x` con la cuenta atrás.
- [ ] Puntuación, vidas y nivel de la barra React coinciden en todo momento con el HUD del canvas.
- [ ] Pulsar flechas o Espacio durante la partida no hace scroll de la página.
- [ ] PAUSA, `P` y `Escape` congelan el juego y muestran "EN PAUSA"; REANUDAR continúa sin saltos.
- [ ] Al perder la última vida se abre el modal "FIN DEL JUEGO" con la puntuación real y el canvas no muestra "ESPACIO PARA REINICIAR".
- [ ] FIN abre el mismo modal con la puntuación actual y el juego se detiene.
- [ ] GUARDAR PUNTUACIÓN añade a `localStorage.av_scores` un registro con `game: "asteroides"`, la puntuación final y las iniciales.
- [ ] En el campo de iniciales se puede escribir un espacio sin que el juego reaccione.
- [ ] JUGAR DE NUEVO reinicia a puntuación 0, 3 vidas y nivel 1.
- [ ] Tras salir y volver a entrar varias veces, una pulsación de `Espacio` crea una sola bala (no quedan listeners ni loops duplicados).
- [ ] Con emulación táctil (`pointer: coarse`) se ve el aviso "REQUIERE TECLADO".
- [ ] Entre 320 y 640 px, `/juegos/asteroides/jugar` no produce scroll horizontal (`scrollWidth === innerWidth`) y el canvas mantiene 4:3.
- [ ] `app/components/PlayerScreen.tsx` no tiene cambios y `/juegos/rocas/jugar` sigue mostrando la partida simulada.
- [ ] `engine.ts` no importa React ni accede a `window`/`document` a nivel de módulo.

---

## Decisions

- **Sí:** entrada nueva `asteroides`. Decisión del usuario.
- **No:** reutilizar o renombrar `rocas`. Se conserva como juego simulado; renombrarla rompería enlaces a `/juegos/rocas`.
- **Sí:** portar el motor a TypeScript. Decisión del usuario; permite pausar, leer la puntuación y limpiar listeners al desmontar.
- **No:** iframe con los archivos originales en `public/`. Sin forma limpia de comunicar puntuación ni pausa.
- **No:** cargar `game.js` con `next/script`. Sus globales y listeners en `window` se duplicarían al navegar.
- **Sí:** play-page propia `app/juegos/asteroides/jugar/page.tsx`. Decisión del usuario; los demás juegos siguen en la ruta genérica sin cambios.
- **No:** condicionales en `PlayerScreen` o en `[id]/jugar` para elegir entre motor real y simulación. Decisión del usuario.
- **Sí:** mismas clases CSS que `PlayerScreen` con JSX propio. Decisión del usuario; mismo aspecto sin tocar `PlayerScreen`.
- **No:** extraer `PlayerHud` / `GameOverModal` compartidos. Obligaría a refactorizar `PlayerScreen`.
- **Sí:** código del juego en `app/components/games/asteroides/`. Decisión del usuario; patrón para los próximos juegos.
- **Sí:** HUD en el canvas y en la barra React a la vez. Decisión del usuario.
- **Sí:** estilo original blanco sobre negro. Decisión del usuario; fidelidad al juego de referencia.
- **No:** reestilizar con los colores neón de la plataforma.
- **Sí:** PAUSA/FIN con botones y teclado (`P`, `Escape`) y game over en el modal de la plataforma. Decisión del usuario.
- **No:** overlay "GAME OVER" del canvas con reinicio por Espacio. Duplicaría el flujo del modal y Espacio chocaría con el campo de iniciales.
- **Sí:** guardar con `saveScore` en `localStorage`. Decisión del usuario; Supabase va en la spec de puntuaciones.
- **Sí:** solo teclado con aviso en dispositivos táctiles. Decisión del usuario; controles táctiles en otra spec.
- **Sí:** conservar el power-up de triple disparo tal cual, con indicador también en la barra React. Decisión del usuario; está en `game.js` aunque el README no lo mencione.
- **Sí:** entrada al principio de `GAMES`, portada CSS propia, `best: 0` y `plays: "0"`. Decisión del usuario; es el único juego real y no se inventan estadísticas.
- **Sí:** resolución interna fija de 800×600 escalada por CSS. `crt-screen` ya es 4:3 y la física de `game.js` depende de esas dimensiones.
- **Sí:** `onChange` solo cuando cambia el snapshot. Evita 60 renders de React por segundo.

---

## Risks

| Riesgo                                                                                                                                                       | Mitigación                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generateStaticParams` de `[id]/jugar` genera `/juegos/asteroides/jugar`, que choca con la página estática nueva y el build falla o sirve la simulada.       | El paso 3 lo comprueba con `npm run build` y abriendo la URL. Los segmentos estáticos tienen prioridad sobre los dinámicos; si aun así hay conflicto, excluir `asteroides` en `generateStaticParams` de `[id]/jugar` (único cambio permitido en esa ruta) y anotarlo en la spec. |
| La carpeta `app/juegos/asteroides/` sin `page.tsx` hace que `/juegos/asteroides` deje de resolverse por `[id]` y dé 404.                                     | El paso 1 y el 3 comprueban el detalle. Si falla, añadir `app/juegos/asteroides/page.tsx` que reexporte el detalle genérico, y anotarlo.                                                                                                                                         |
| Listeners de `window` o el `requestAnimationFrame` sobreviven al desmontar (navegación, Strict Mode en dev monta dos veces) y duplican balas o consumen CPU. | `destroy()` cancela el rAF y quita los listeners; el `useEffect` lo llama en la limpieza. Hay un criterio de aceptación específico.                                                                                                                                              |
| Flechas y Espacio hacen scroll o activan botones con foco (PAUSA) en vez de jugar.                                                                           | `preventDefault()` en esas teclas mientras se juega; los botones pierden el foco tras el clic (`blur`) para que Espacio no los pulse.                                                                                                                                            |
| El juego atrapa el teclado del modal o del resto de la página.                                                                                               | El motor ignora el teclado en `input`/`textarea`/editables, en pausa y en `gameover`.                                                                                                                                                                                            |
| Al reanudar tras pausa o cambio de pestaña el `dt` acumulado produce un salto.                                                                               | Reiniciar `lastTime` al reanudar y mantener el límite de 50 ms de `game.js`.                                                                                                                                                                                                     |
| `setState` en cada frame degrada el rendimiento.                                                                                                             | `onChange` solo emite si el snapshot cambia (con `tripleShot` redondeado a 0.1 s).                                                                                                                                                                                               |
| Poner `asteroides` el primero cambia la pestaña por defecto de `/salon` y la portada de la Home.                                                             | Es un efecto buscado; el paso 1 lo revisa visualmente.                                                                                                                                                                                                                           |
| El detalle `/juegos/asteroides` muestra un ranking inventado (`seededScores`) junto a `best: 0`.                                                             | Aceptado en esta spec; el ranking real va con la spec de puntuaciones en Supabase.                                                                                                                                                                                               |

---

## What is **not** in this spec

- Cambios en `PlayerScreen` o en los juegos simulados.
- Modificar la entrada `rocas`.
- Estilo neón dentro del canvas.
- Controles táctiles.
- Puntuaciones en Supabase o ranking real en `/salon` y en el detalle.
- Estadísticas reales de `best` y `plays`.
- Sonido.
- Mecánicas que no están en `game.js` (OVNIs, hiperespacio).
- Tetris y Arkanoid.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
