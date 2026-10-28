# SPEC 01 — Pantallas visuales del MVP

> **Status:** Implementado
> **Depends on:** Ninguna
> **Date:** 2026-10-26
> **Objective:** Implementar en Next.js (App Router) las cinco pantallas de `references/templates/` (biblioteca, detalle, reproductor, acceso y salón de la fama) con su navegación y pie de página, solo en su parte visual y con datos ficticios.

---

## Por qué existe esta spec

`references/templates/` contiene un prototipo en React UMD + Babel con un router por hash. Esta spec lo traslada al proyecto real (Next.js 16, App Router, Tailwind v4) sin cambiar el diseño. El tema CSS (`app/globals.css`) y las fuentes (`app/layout.tsx`) ya fueron portados en commits anteriores; esta spec añade las pantallas, los componentes y los datos.

---

## Scope

**In:**

- Rutas App Router para las cinco pantallas (ver tabla en Modelo de datos).
- Componentes `Nav` (con menú móvil) y `Footer`, compartidos en `app/layout.tsx`.
- Pantalla **Biblioteca**: hero, buscador por nombre, chips de categoría, grilla de tarjetas con efecto tilt, estado vacío "NO HAY RESULTADOS".
- Pantalla **Detalle**: portada, etiquetas, descripción, `stat-strip`, botones, ranking lateral (top 10).
- Pantalla **Reproductor**: HUD, marco CRT con arena decorativa, pausa, botón FIN, modal "FIN DEL JUEGO". El puntaje sube por intervalo, igual que `reproductor.jsx`. No hay juego real.
- Guardado de puntuaciones en `localStorage` (clave `av_scores`), igual que `handleSaveScore` en `app.jsx`: al pulsar GUARDAR PUNTUACIÓN se añade una entrada al arreglo. Solo se escribe; ninguna pantalla lee ese arreglo.
- Pantalla **Acceso**: tabs "Iniciar sesión" / "Crear cuenta", formulario, "Jugar como invitado", botones sociales decorativos.
- Pantalla **Salón de la Fama**: tabs por juego, podio top 3, tabla de 12 filas.
- Archivo `app/data/` con la información ficticia tipada (juegos, categorías, generador de puntajes determinista). Está pensado para sustituirse luego por una base de datos.
- Uso de los estilos ya presentes en `app/globals.css`. Si falta alguna clase de `references/templates/styles.css`, se porta.
- Diseño de UI guiado por el skill `/frontend-design`, según `CLAUDE.md`.

**Out of scope (para futuras specs):**

- Cualquier juego real (lógica, canvas, controles, colisiones).
- Autenticación real, sesión o cookies. La UI nunca muestra un usuario logueado ni guarda `av_user`.
- Leer las puntuaciones guardadas: no se mezclan con los rankings del detalle ni del Salón (siguen siendo mock).
- Guardado de puntuaciones en servidor o base de datos.
- Base de datos, API o Route Handlers.
- Fila "TU MEJOR MARCA" del Salón (depende de la sesión).
- Tests automatizados (el proyecto no tiene test runner).
- Internacionalización: la UI queda solo en español.

---

## Data model

Los datos viven en `app/data/` y son mock tipado. No hay base de datos.

```ts
// app/data/games.ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;        // slug de la URL: "bloque-buster"
  title: string;     // "BLOQUE BUSTER"
  short: string;     // descripción de la tarjeta
  long: string;      // descripción del detalle
  cat: Category;
  cover: string;     // clase CSS: "cover-bricks", "cover-tetro", ...
  color: GameColor;  // color del botón JUGAR en la tarjeta
  best: number;      // mejor puntuación global
  plays: string;     // "12.4K"
}

export const GAMES: Game[];                       // los 8 juegos de data.jsx
export const CATS: ("TODOS" | Category)[];        // filtros de la biblioteca
export const PLAYERS: string[];                   // nombres para el generador
```

```ts
// app/data/scores.ts
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/2026"
}

export function seededScores(seed: number, count?: number): ScoreRow[]; // determinista, ordenado por score desc
```

```ts
// app/lib/scores-storage.ts — única escritura a localStorage
export interface SavedScore {
  game: string;  // Game["id"]
  score: number;
  name: string;  // iniciales, máx. 10 caracteres, en mayúsculas
  at: number;    // Date.now()
}

export const SCORES_KEY = "av_scores"; // valor: JSON de SavedScore[]
export function saveScore(entry: Omit<SavedScore, "at">): void; // lee, añade y reescribe; try/catch silencioso
```

Rutas:

| Pantalla    | Ruta                 | Tipo de componente de página                                  |
| ----------- | -------------------- | ------------------------------------------------------------- |
| Biblioteca  | `/`                  | Server; el filtro es un componente cliente hijo               |
| Detalle     | `/juegos/[id]`       | Server; `notFound()` si el id no existe                       |
| Reproductor | `/juegos/[id]/jugar` | Server; el HUD y el modal son un componente cliente hijo      |
| Acceso      | `/acceso`            | Server; el formulario es un componente cliente hijo           |
| Salón       | `/salon`             | Server; las tabs son un componente cliente hijo               |

Convenciones:

- Los números se formatean con `toLocaleString("es-ES")`, igual que la plantilla.
- `seededScores` conserva el algoritmo de la plantilla (mismos seeds: `id.length * 17 + 3` en detalle, `id.length * 23 + 7` en salón) para que los datos sean estables entre renders y entre servidor y cliente.
- Los componentes viven en `app/components/`. Los de cliente llevan `"use client"` y solo se usan cuando hay estado o eventos.

---

## Implementation plan

Antes de empezar, leer `node_modules/next/dist/docs/` (`01-app`) sobre `cacheComponents`, `params` asíncronos y `generateStaticParams`.

1. Crear `app/data/games.ts` y `app/data/scores.ts` con los tipos y los datos de `data.jsx`. Prueba manual: `npm run build` compila sin errores de tipos.
2. Crear `app/components/Nav.tsx` (cliente, menú móvil con estado) y `app/components/Footer.tsx`. Montarlos en `app/layout.tsx` dentro de `av-root`, con `<main className="av-main">`. El enlace activo se calcula con `usePathname()`. Prueba manual: `npm run dev`, los enlaces cambian de ruta y el menú hamburguesa abre y cierra el panel.
3. Crear `app/components/GameCard.tsx` (cliente, efecto tilt) y `app/components/LibraryBrowser.tsx` (cliente, buscador y chips). Reemplazar `app/page.tsx` por la biblioteca con el hero. Prueba manual: filtrar por texto y por categoría; buscar "zzz" muestra "NO HAY RESULTADOS".
4. Crear `app/juegos/[id]/page.tsx` (detalle) con ranking lateral y `generateStaticParams` desde `GAMES`. Enlazar desde la tarjeta. Prueba manual: `/juegos/caida` muestra el detalle y `/juegos/xyz` devuelve 404.
5. Crear `app/salon/page.tsx` y `app/components/HallTabs.tsx` (cliente, tabs, podio y tabla). Prueba manual: cambiar de tab cambia podio y tabla, y el botón vuelve a `/`.
6. Crear `app/acceso/page.tsx` y `app/components/AuthForm.tsx` (cliente, tabs, campos controlados). El submit y "Jugar como invitado" navegan a `/` con `useRouter` sin guardar nada. Prueba manual: la pestaña "Crear cuenta" muestra el campo de correo.
7. Crear `app/lib/scores-storage.ts` con `saveScore`. Prueba manual: llamarla desde la consola del navegador o desde el paso 8 y ver `av_scores` en DevTools.
8. Crear `app/juegos/[id]/jugar/page.tsx` y `app/components/PlayerScreen.tsx` (cliente): HUD, CRT, pausa, FIN, modal de fin de juego; GUARDAR PUNTUACIÓN llama a `saveScore` y muestra el toast "PUNTUACIÓN GUARDADA". El nombre por defecto es `INVITADO`. Prueba manual: el puntaje sube, PAUSA lo detiene, FIN abre el modal, guardar crea una entrada en `av_scores`, JUGAR DE NUEVO reinicia.
9. Revisar contra `references/templates/Arcade Vault.html` en móvil (≤ 640 px) y escritorio, portando a `app/globals.css` cualquier clase faltante. Ejecutar `npm run lint` y `npm run build`.

---

## Acceptance criteria

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/` muestra el hero "ARCADE VAULT" y 8 tarjetas de juego.
- [ ] Escribir "caí" en el buscador deja solo la tarjeta CAÍDA; escribir "zzz" muestra "NO HAY RESULTADOS".
- [ ] Pulsar el chip "SHOOTER" muestra exactamente INVASORES y ROCAS; "TODOS" vuelve a mostrar las 8.
- [ ] Pulsar una tarjeta o su botón JUGAR navega a `/juegos/[id]` del juego correspondiente.
- [ ] `/juegos/[id]` muestra título, 4 etiquetas, descripción, 3 estadísticas y 10 filas de ranking con las 3 primeras destacadas.
- [ ] `/juegos/inexistente` devuelve 404.
- [ ] "JUGAR AHORA" lleva a `/juegos/[id]/jugar` y "VOLVER AL VAULT" lleva a `/`.
- [ ] En `/juegos/[id]/jugar` la puntuación aumenta sola, PAUSA la detiene y muestra "EN PAUSA", y REANUDAR la continúa.
- [ ] FIN abre el modal "FIN DEL JUEGO" con la puntuación final; GUARDAR PUNTUACIÓN muestra "PUNTUACIÓN GUARDADA" y añade a `localStorage["av_scores"]` una entrada `{ game, score, name, at }`.
- [ ] Guardar dos puntuaciones seguidas deja dos entradas en `av_scores` y las conserva tras recargar la página.
- [ ] Si `localStorage` lanza una excepción, guardar no rompe la pantalla y el toast se muestra igual.
- [ ] "JUGAR DE NUEVO" pone puntuación en 0, vidas en 3 y nivel en 01; SALIR vuelve al detalle.
- [ ] `/acceso` alterna entre "INICIAR SESIÓN" y "CREAR CUENTA"; solo la segunda muestra el campo de correo.
- [ ] Enviar el formulario de `/acceso` y "JUGAR COMO INVITADO" navegan a `/`; la nav sigue mostrando "Iniciar Sesión".
- [ ] `/salon` muestra podio (02, 01, 03) y tabla de 12 filas; cambiar de tab de juego cambia los datos.
- [ ] El enlace activo de la nav es "Biblioteca" en `/`, `/juegos/*` y `/juegos/*/jugar`, y "Salón de la Fama" en `/salon`.
- [ ] Con ancho ≤ 640 px el botón `≡` abre el panel móvil y pulsar el fondo lo cierra.
- [ ] El pie "© 2026 ARCADE VAULT · …" aparece en todas las pantallas.
- [ ] La aplicación no hace peticiones de red de datos y su único uso de `localStorage` es la clave `av_scores`.
- [ ] No quedan referencias al scaffold de Create Next App en `app/page.tsx`.

---

## Decisions

- **Sí:** rutas reales del App Router. URLs compartibles y encaja con Server Components y `cacheComponents`.
- **No:** réplica del router por hash con `useState`. Era una solución del prototipo UMD, no del proyecto real.
- **Sí:** datos en `app/data/` como TypeScript tipado. Es la frontera que se sustituirá por la base de datos, y los componentes solo dependen de los tipos `Game` y `ScoreRow`.
- **No:** Route Handlers o API interna para los mocks. Añade complejidad sin valor en un MVP visual.
- **Sí:** sin sesión (`av_user`). Decisión del usuario; la nav no depende de estado del navegador y se evitan problemas de hidratación.
- **Sí:** `localStorage` solo para `av_scores`, con el mismo formato que la plantilla. Se escribe únicamente al pulsar guardar, así no hay lecturas durante el render.
- **No:** leer `av_scores` para mezclarlo con los rankings. La plantilla tampoco lo hace; se deja para la spec que introduzca la base de datos.
- **No:** versionar la clave (`av_scores:v1`). Se mantiene `av_scores` tal como funciona hoy.
- **Sí:** reproductor con simulación de puntaje igual que la plantilla, como placeholder visual. Permite validar el HUD y el modal que usarán los juegos reales.
- **Sí:** reutilizar las clases ya portadas en `app/globals.css` en vez de reescribir con utilidades Tailwind. Evita divergencias con el diseño de referencia. Las utilidades Tailwind se pueden usar para ajustes puntuales.
- **Sí:** componentes de cliente solo donde hay estado o eventos (`Nav`, `GameCard`, `LibraryBrowser`, `HallTabs`, `AuthForm`, `PlayerScreen`); las páginas son Server Components.
- **No:** fila "TU MEJOR MARCA" en el Salón, porque depende de una sesión que no existe.
- **Sí:** mantener el copy en español y los textos exactos de la plantilla.

---

## Risks

| Riesgo                                                                                   | Mitigación                                                                                                  |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `cacheComponents: true` rompe páginas con `params` o datos dinámicos sin `Suspense`.      | Usar `generateStaticParams` en `/juegos/[id]` y leer la guía de Next 16 antes del paso 4.                   |
| `Math.random` en el reproductor genera diferencias entre servidor y cliente al hidratar. | La puntuación empieza en 0 y solo cambia dentro de `useEffect`; nada aleatorio se renderiza en el servidor. |
| `localStorage` bloqueado, lleno o con JSON corrupto en `av_scores`.                      | `saveScore` envuelve lectura y escritura en `try/catch`; si el JSON es inválido, parte de un arreglo vacío. |
| Faltan clases de `styles.css` en `app/globals.css`.                                      | El paso 8 compara contra la plantilla y porta lo que falte.                                                 |
| Las fuentes `next/font` cambian los nombres de variable respecto al prototipo.           | Verificar visualmente que `--pixel` y `--mono` resuelven a las fuentes de `layout.tsx`.                      |

---

## What is **not** in this spec

- Ningún juego jugable.
- Autenticación o sesión.
- Leer `av_scores` o mostrarlo en pantalla; persistencia en servidor.
- Base de datos o API.
- Tests automatizados.
- Internacionalización.

Cada uno de estos puntos, si se aborda, va en su propia spec.
