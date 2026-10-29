# SPEC 02 — Home (landing)

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-10-29
> **Objective:** Implementar en Next.js la pantalla Home de `references/templates/home-about/` en la ruta `/`, mover la Biblioteca a `/juegos` y añadir "Inicio" a la navegación, solo en su parte visual y con datos ficticios.

---

## Por qué existe esta spec

La SPEC 01 dejó la Biblioteca en `/` porque el MVP no tenía landing. La plantilla `references/templates/home-about/` sí trae una pantalla de inicio (`home.jsx`) separada de la Biblioteca. Esta spec la añade, libera `/` para ella y reubica la Biblioteca en `/juegos`, que ya es el prefijo del detalle (`/juegos/[id]`). La pantalla "Acerca de" (`about.jsx`) de la misma carpeta queda fuera.

---

## Scope

**In:**

- Ruta `/` con la pantalla **Home**, con las seis secciones de `home.jsx`:
  - **Hero**: eyebrow "INSERTA UNA MONEDA", título de tres líneas, subtítulo, dos CTAs, indicador "DESLIZA" y las 8 siluetas pixel flotantes.
  - **¿POR QUÉ ARCADE VAULT?** (`// 01`): 4 `feature-card` con icono pixel.
  - **JUEGOS DISPONIBLES AHORA** (`// 02`): `mini-rail` con los 6 primeros juegos de `GAMES` y botón "VER TODOS LOS JUEGOS →".
  - **Stats**: tira de 3 cifras (`12+ JUEGOS`, `MILES DE PARTIDAS`, `GLOBAL RANKING`).
  - **ACTIVIDAD EN VIVO** (`// 03`): "ÚLTIMAS PUNTUACIONES" (7 filas) y "TOP JUGADORES · HOY" (5 filas con barra) con enlace "VER SALÓN →".
  - **PRECIOS** (`// 04`): tarjeta "JUGADOR VAULT $0 / SIEMPRE" y 3 preguntas frecuentes.
  - **CTA final**: "¿LISTO PARA JUGAR?" con botón "INSERTAR MONEDA →".
- Mover la Biblioteca de `app/page.tsx` a `app/juegos/page.tsx` (ruta `/juegos`), sin cambiar su contenido.
- Actualizar los enlaces que apuntaban a la Biblioteca en `/` para que apunten a `/juegos`.
- `Nav`: añadir el enlace "Inicio" (`/`) antes de "Biblioteca", en la barra y en el panel móvil, con enlace activo propio.
- Revelado al scroll de las secciones `.reveal` mediante un componente cliente pequeño con `IntersectionObserver`.
- Archivo `app/data/home.ts` con los datos ficticios tipados de las secciones (características, cifras, últimas puntuaciones, top, plan y preguntas frecuentes).
- Portar a `app/globals.css` las clases de `references/templates/home-about/styles.css` que usa el Home y que aún no existen (`home-*`, `silo`, `feature-*`, `mini-*`, `stat-*`, `activity-*`, `tick-*`, `top-*`, `price-*`, `pc-*`, `faq-*`, `final-*`, `section-*`, `kicker`, `reveal`, animaciones asociadas).
- Diseño de UI guiado por el skill `/frontend-design`, según `CLAUDE.md`.

**Out of scope (para futuras specs):**

- Pantalla "Acerca de" y su enlace en la navegación.
- Autenticación o sesión: el botón "Iniciar Sesión" de la nav no cambia.
- Datos reales: "ÚLTIMAS PUNTUACIONES", "TOP JUGADORES" y las cifras son mock estático; no leen `av_scores` ni ninguna base de datos.
- Actualización en vivo de la actividad (polling, websockets).
- Base de datos, API o Route Handlers.
- Tests automatizados (el proyecto no tiene test runner).
- Internacionalización: la UI queda solo en español.
- Cambios de diseño en Biblioteca, Detalle, Reproductor, Acceso o Salón, más allá de los enlaces.

---

## Data model

Los datos nuevos viven en `app/data/home.ts` y son mock tipado. Los juegos del mini-rail salen de `GAMES` (SPEC 01).

```ts
// app/data/home.ts
import type { GameColor } from "./games";

export type FeatureIconKind = "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";

export interface Feature {
  icon: FeatureIconKind;
  title: string;   // "JUEGOS CLÁSICOS"
  desc: string;
  color: GameColor; // clase de color de la tarjeta
}

export interface HomeStat {
  n: string; // "12+"
  u: string; // "JUEGOS"
  s: string; // "Y CONTANDO"
}

export interface RecentScore {
  player: string;
  game: string;     // nombre visible, no id
  score: number;
  ago: string;      // "hace 2 min"
  color: GameColor;
}

export interface TopPlayer {
  rank: number;
  player: string;
  score: number;
}

export interface FaqItem {
  q: string;
  a: string;
}

export const FEATURES: Feature[];            // 4
export const HOME_STATS: HomeStat[];         // 3
export const RECENT_SCORES: RecentScore[];   // 7
export const TOP_PLAYERS: TopPlayer[];       // 5
export const PLAN_FEATURES: string[];        // 6 ítems de la lista de precios
export const FAQ: FaqItem[];                 // 3
```

Rutas:

| Pantalla   | Ruta            | Cambio                                                  |
| ---------- | --------------- | ------------------------------------------------------- |
| Home       | `/`             | Nueva. Server; solo el revelado al scroll es cliente    |
| Biblioteca | `/juegos`       | Movida desde `/`. Mismo componente `LibraryBrowser`     |
| Detalle    | `/juegos/[id]`  | Sin cambios de ruta; "VOLVER AL VAULT" apunta a `/juegos` |

Mapa de enlaces del Home:

| Elemento                               | Destino          |
| -------------------------------------- | ---------------- |
| Logo de la nav, enlace "Inicio"        | `/`              |
| EXPLORAR JUEGOS, VER TODOS LOS JUEGOS, INSERTAR MONEDA | `/juegos` |
| CREAR CUENTA, EMPEZAR GRATIS           | `/acceso`        |
| `mini-card`                            | `/juegos/[id]`   |
| VER SALÓN                              | `/salon`         |

Convenciones:

- Los números se formatean con `toLocaleString("es-ES")`, igual que la plantilla.
- Los componentes viven en `app/components/home/`. Solo el de revelado lleva `"use client"`.
- Las siluetas y los iconos pixel son SVG de `<rect>` copiados de `home.jsx`, con `aria-hidden="true"` en los decorativos.

---

## Implementation plan

Antes de empezar, leer `node_modules/next/dist/docs/` (`01-app`) sobre `cacheComponents` y `Link`.

1. Mover `app/page.tsx` a `app/juegos/page.tsx` sin cambiar su contenido y crear un `app/page.tsx` provisional con un `<h1>`. Actualizar los enlaces que apuntan a la Biblioteca: `app/salon/page.tsx`, `app/components/PlayerScreen.tsx`, `app/components/AuthForm.tsx` (dos `router.push`) y `app/juegos/[id]/page.tsx` (VOLVER AL VAULT). Prueba manual: `/juegos` muestra la Biblioteca y los botones que antes iban a `/` llevan a `/juegos`.
2. Actualizar `app/components/Nav.tsx`: añadir "Inicio" (`/`) en barra y panel móvil; "Inicio" está activo solo con `pathname === "/"`; "Biblioteca" apunta a `/juegos` y está activa en `/juegos` y `/juegos/*`. Prueba manual: el activo cambia según la ruta y el menú móvil muestra "Inicio".
3. Crear `app/data/home.ts` con los tipos y los datos de `home.jsx`. Prueba manual: `npm run build` compila sin errores de tipos.
4. Portar a `app/globals.css` las clases del Home que falten de `references/templates/home-about/styles.css`, sin duplicar las existentes ni cambiar sus valores. Prueba manual: `npm run dev` sigue renderizando las pantallas de la SPEC 01 sin cambios visuales.
5. Crear `app/components/home/FloatingSilhouettes.tsx` y `app/components/home/FeatureIcon.tsx` (servidor, SVG). Crear el Hero en `app/page.tsx` con ambos CTAs como `Link`. Prueba manual: `/` muestra el hero con siluetas y los CTAs navegan a `/juegos` y `/acceso`.
6. Crear `app/components/home/WhySection.tsx` y `GamesPreview.tsx` (con `MiniCard` como `Link`) y montarlas en `app/page.tsx`. Prueba manual: 4 tarjetas de característica y 6 mini-cards; pulsar una mini-card abre su detalle.
7. Crear `app/components/home/StatsStrip.tsx` y `ActivitySection.tsx` y montarlas. Prueba manual: 3 cifras, 7 filas de últimas puntuaciones y 5 filas de top con la barra decreciente; "VER SALÓN →" lleva a `/salon`.
8. Crear `app/components/home/PricingSection.tsx` y `FinalCta.tsx` y montarlas. Prueba manual: tarjeta de precio con 6 ítems, 3 preguntas y CTA final que navega a `/juegos`.
9. Crear `app/components/home/RevealOnScroll.tsx` (cliente): al montar, observa los `.reveal` y les añade `in` al entrar en pantalla, y desconecta al desmontar. Montarlo en `app/page.tsx`. Respeta `prefers-reduced-motion` mostrando todo de inmediato. Prueba manual: las secciones aparecen al hacer scroll y todo es visible con la animación reducida.
10. Revisar contra `references/templates/home-about/arcade-vault-standalone.html` en móvil (≤ 640 px) y escritorio, y ajustar `app/globals.css` en lo que difiera. Ejecutar `npm run lint` y `npm run build`.

---

## Acceptance criteria

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/` muestra las seis secciones del Home y el título "EL ARCADE / CLÁSICO ESTÁ / DE VUELTA".
- [ ] `/` no contiene el hero "ARCADE VAULT" ni el buscador de la Biblioteca.
- [ ] `/juegos` muestra el hero "ARCADE VAULT", el buscador y 8 tarjetas de juego.
- [ ] `/juegos/caida` sigue mostrando el detalle de CAÍDA.
- [ ] EXPLORAR JUEGOS, VER TODOS LOS JUEGOS e INSERTAR MONEDA llevan a `/juegos`.
- [ ] CREAR CUENTA y EMPEZAR GRATIS llevan a `/acceso`.
- [ ] El mini-rail muestra exactamente 6 mini-cards y pulsar una navega a `/juegos/[id]` de ese juego.
- [ ] "VER SALÓN →" lleva a `/salon`.
- [ ] La sección de actividad muestra 7 filas de últimas puntuaciones y 5 de top; la primera, segunda y tercera fila del top tienen las clases `top1`, `top2` y `top3`.
- [ ] Las puntuaciones se muestran con separador de miles en español (p. ej. `312.840`).
- [ ] La sección de precios muestra "$0 / SIEMPRE", 6 ítems con ✔ y 3 preguntas frecuentes.
- [ ] El enlace activo de la nav es "Inicio" en `/` y "Biblioteca" en `/juegos` y `/juegos/*`; "Salón de la Fama" sigue activo en `/salon`.
- [ ] La nav muestra "Inicio" antes de "Biblioteca" en la barra y en el panel móvil, y no muestra "Acerca de".
- [ ] El logo de la nav lleva a `/`.
- [ ] "VOLVER AL VAULT" del detalle, el botón del Salón, SALIR/volver del reproductor y el envío de `/acceso` más "JUGAR COMO INVITADO" llevan a `/juegos`.
- [ ] Al hacer scroll, las secciones `.reveal` reciben la clase `in`; con `prefers-reduced-motion: reduce` están visibles sin animar.
- [ ] Con ancho ≤ 640 px el Home no produce scroll horizontal.
- [ ] Las siluetas decorativas tienen `aria-hidden="true"` y el Home tiene un único `<h1>`.
- [ ] El Home no hace peticiones de red de datos ni lee `localStorage`.

---

## Decisions

- **Sí:** Home en `/` y Biblioteca en `/juegos`. Decisión del usuario; `/juegos` ya es el prefijo del detalle y refleja la separación Inicio / Biblioteca de la plantilla.
- **No:** Home en `/home` con la Biblioteca en `/`. Dejaba la landing en una ruta poco natural.
- **Sí:** el envío de `/acceso` y "JUGAR COMO INVITADO" ahora van a `/juegos` en vez de `/`. Conserva el efecto de la SPEC 01 (llegar a la Biblioteca); ir al Home no aporta tras acceder.
- **Sí:** añadir solo "Inicio" a la nav. "Acerca de" no existe aún y apuntaría a un 404.
- **No:** incluir "Acerca de" ni su enlace. El usuario pidió únicamente el Home.
- **Sí:** las seis secciones del `home.jsx`. Decisión del usuario; el Home es una unidad y recortarlo cambia el diseño de referencia.
- **Sí:** `Link` a rutas reales en vez del `navigate({ name })` del prototipo. Igual que en la SPEC 01.
- **Sí:** mock en `app/data/home.ts`. Misma frontera que `app/data/games.ts`: se sustituirá por la base de datos sin tocar los componentes.
- **No:** leer `av_scores` para la actividad. Mantiene la decisión de la SPEC 01 y evita lecturas de `localStorage` durante el render.
- **Sí:** el mini-rail usa `GAMES.slice(0, 6)`, como la plantilla.
- **Sí:** secciones como Server Components; solo `RevealOnScroll` es cliente, porque necesita `IntersectionObserver`.
- **Sí:** mantener el copy en español y los textos exactos de la plantilla.
- **Sí:** reutilizar el CSS de la plantilla portándolo a `app/globals.css`, como en la SPEC 01, en lugar de reescribir con utilidades Tailwind.

---

## Risks

| Riesgo                                                                                       | Mitigación                                                                                                    |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Quedan enlaces a `/` que querían decir "Biblioteca" y mandan al Home.                         | El paso 1 los lista y los cambia; el criterio de aceptación los verifica uno por uno.                         |
| Marcadores externos o enlaces guardados a `/` esperan la Biblioteca.                          | Aceptado: es un MVP sin usuarios; no se añade redirección.                                                    |
| Contenido `.reveal` oculto si el JavaScript falla o `IntersectionObserver` no existe.         | Mostrar todo si no existe `IntersectionObserver` y con `prefers-reduced-motion`.                              |
| Clases portadas colisionan con las existentes de la SPEC 01 (`section-title`, `btn`, etc.).   | El paso 4 comprueba nombres antes de portar y no sobrescribe; el paso 4 verifica que las pantallas no cambian. |
| Animaciones de las siluetas flotantes pesan en móvil.                                         | Usar solo `transform`/`opacity` como en la plantilla y ocultar siluetas sobrantes en ≤ 640 px si hay jank.     |
| Hidratación: `toLocaleString("es-ES")` difiere entre servidor y cliente.                      | Todo el Home se renderiza en servidor; los números no se recalculan en cliente.                               |

---

## What is **not** in this spec

- Pantalla "Acerca de".
- Autenticación o sesión.
- Datos reales o en vivo para actividad, top y cifras.
- Base de datos o API.
- Tests automatizados.
- Internacionalización.

Cada uno de estos puntos, si se aborda, va en su propia spec.
