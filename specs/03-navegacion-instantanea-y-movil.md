# SPEC 03 — Navegación instantánea en juegos y ajustes móviles

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-10-29
> **Objective:** Hacer instantánea la navegación a `/juegos/[id]` y `/juegos/[id]/jugar` con `<Suspense>` y esqueletos, y eliminar el scroll horizontal entre 320 y 640 px en el Detalle, el Reproductor y el Salón.

---

## Por qué existe esta spec

Con `cacheComponents` y `partialPrefetching` activos, `next dev` avisa en `/juegos/[id]` y `/juegos/[id]/jugar`: "`params` or `searchParams` accessed outside of `<Suspense>`" (`instant-shell-url-data`). Ambas páginas hacen `await params` en el cuerpo de la página. El App Shell es compartido entre todos los enlaces a la ruta y no puede contener datos de una URL concreta, aunque `generateStaticParams` los conozca (`node_modules/next/dist/docs/01-app/02-guides/optimizing-prefetching.md`).

Durante el paso 10 de la SPEC 02 se corrigió el desborde de la `Nav` en móvil. Al quitarlo aparecieron desbordes propios de pantallas de la SPEC 01, que la SPEC 02 dejó fuera de alcance:

| Ruta                  | 320 px | 360 px | 390 px | Causa                                                              |
| --------------------- | ------ | ------ | ------ | ------------------------------------------------------------------ |
| `/juegos/[id]`        | +50    | +10    | 0      | `.av-detail` usa `1fr` en ≤ 900 px y no encoge bajo su contenido.   |
| `/juegos/[id]/jugar`  | +12    | 0      | 0      | `.hud-actions` (PAUSA · FIN · SALIR) no cabe en una línea.          |
| `/salon`              | +73    | +33    | +3     | `.hall-table` tiene 4 columnas fijas que no caben.                  |

---

## Scope

**In:**

- `app/juegos/[id]/page.tsx`: la página deja de ser `async` y renderiza el contenido dentro de `<Suspense fallback={<GameDetailSkeleton />}>`.
- `app/juegos/[id]/jugar/page.tsx`: mismo patrón con `<Suspense fallback={<PlayerSkeleton />}>`.
- El `await params` y el `notFound()` se mueven a un componente interno de cada página, dentro del `<Suspense>`.
- Se mantienen `export const ensureStatic = "navigation"` y `generateStaticParams()` en ambas páginas.
- Nuevos `app/components/GameDetailSkeleton.tsx` y `app/components/PlayerSkeleton.tsx` (Server Components): silueta de la pantalla con las clases existentes y bloques atenuados.
- `app/globals.css`:
  - `.av-detail` en ≤ 900 px pasa a `minmax(0, 1fr)`.
  - `.hud-actions` puede partir línea en ≤ 640 px.
  - `.hall-table` oculta la columna FECHA en ≤ 480 px y queda con 3 columnas.
  - Clases nuevas para los esqueletos (prefijo `skel-`).
- Sin scroll horizontal entre 320 y 640 px en `/juegos/[id]`, `/juegos/[id]/jugar` y `/salon`.

**Out of scope (para futuras specs):**

- Tests e2e con `@next/playwright` o `instant()`: el proyecto no tiene test runner.
- `prefetch={true}` por enlace o `use cache` para resolver URL data antes del clic.
- Cambiar `next.config.ts` (`validationLevel`, `partialPrefetching`, `cacheComponents`).
- Código HTTP 404 real para ids inexistentes: solo se exige la UI de "no encontrado".
- Cambios en el Home, la Biblioteca o el Acceso.
- Rediseño de las pantallas: solo se ajusta lo necesario para el ancho.
- Datos reales, base de datos o API.

---

## Data model

Esta feature no introduce estructuras de datos nuevas. Reutiliza `GAMES` de `app/data/games.ts` (SPEC 01).

Componentes nuevos:

```ts
// app/components/GameDetailSkeleton.tsx — sin props, servidor
export default function GameDetailSkeleton(): JSX.Element;

// app/components/PlayerSkeleton.tsx — sin props, servidor
export default function PlayerSkeleton(): JSX.Element;
```

Patrón de página (ilustrativo):

```tsx
export default function GameDetail({ params }: PageProps<"/juegos/[id]">) {
  return (
    <Suspense fallback={<GameDetailSkeleton />}>
      <GameDetailContent params={params} />
    </Suspense>
  );
}
```

Convenciones:

- Los esqueletos reutilizan las clases contenedoras de su pantalla (`av-detail`, `detail-cover`, `av-player`, `player-hud`, `crt`, `crt-screen`) para que el layout no salte al llegar el contenido.
- Los bloques del esqueleto usan clases `skel-*` en `app/globals.css`, con `aria-hidden="true"`.
- La animación de los esqueletos se desactiva con `prefers-reduced-motion: reduce`.
- Los esqueletos no contienen texto de juego ni `<h1>`.

---

## Implementation plan

Antes de empezar, leer `node_modules/next/dist/docs/01-app/02-guides/adopting-partial-prefetching.md` ("Move URL data behind Suspense") y `keeping-pages-static.md` (`Suspense` con `ensureStatic`).

1. Crear `app/components/GameDetailSkeleton.tsx` y las clases `skel-*` en `app/globals.css`, sin montarlo aún. Prueba manual: `npm run build` compila.
2. En `app/juegos/[id]/page.tsx`, mover el contenido actual a `GameDetailContent` (async, con `await params` y `notFound()`), y que la página lo envuelva en `<Suspense fallback={<GameDetailSkeleton />}>`. Prueba manual: con `next dev`, `/juegos/caida` muestra el detalle sin el aviso `instant-shell-url-data`, y `/juegos/no-existe` muestra la página de no encontrado.
3. Crear `app/components/PlayerSkeleton.tsx` y aplicar el mismo patrón en `app/juegos/[id]/jugar/page.tsx` con `PlayerContent`. Prueba manual: `/juegos/caida/jugar` funciona sin el aviso y SALIR vuelve al detalle.
4. En `app/globals.css`, cambiar `.av-detail` en ≤ 900 px a `minmax(0, 1fr)` y ajustar lo que aún desborde dentro del detalle. Prueba manual: `/juegos/caida` sin scroll horizontal a 320 px.
5. En `app/globals.css`, permitir que `.hud-actions` parta línea en ≤ 640 px. Prueba manual: `/juegos/caida/jugar` sin scroll horizontal a 320 px y con PAUSA, FIN y SALIR visibles.
6. En `app/globals.css`, ocultar la columna FECHA de `.hall-table` (cabecera y `.dt`) en ≤ 480 px con 3 columnas. Prueba manual: `/salon` sin scroll horizontal a 320 px; la fecha sigue en el podio.
7. Medir el desborde (`scrollWidth - innerWidth`) a 320, 360, 390, 430 y 640 px en las tres rutas y en `/`, `/juegos` y `/acceso`, y guardar capturas en `.playwright-screenshots/`. Ejecutar `npm run lint` y `npm run build`.

---

## Acceptance criteria

- [x] `npm run lint` y `npm run build` terminan sin errores.
- [x] Con `next dev`, abrir `/juegos/caida` y `/juegos/caida/jugar` no muestra el aviso `instant-shell-url-data` en la terminal ni en el overlay.
- [x] `app/juegos/[id]/page.tsx` y `app/juegos/[id]/jugar/page.tsx` siguen exportando `ensureStatic = "navigation"` y `generateStaticParams()`.
- [x] Ninguna de las dos páginas lee `params` fuera de un `<Suspense>`.
- [x] `/juegos/caida` muestra el mismo detalle que antes: portada, etiquetas, descripción, botones y "MEJORES PUNTUACIONES".
- [x] `/juegos/caida/jugar` muestra el reproductor y SALIR lleva a `/juegos/caida`.
- [x] `/juegos/no-existe` y `/juegos/no-existe/jugar` muestran la página de no encontrado.
- [ ] Los esqueletos no contienen `<h1>` y sus bloques tienen `aria-hidden="true"`.
- [x] Con `prefers-reduced-motion: reduce`, los esqueletos no animan.
- [x] Entre 320 y 640 px, `/juegos/caida`, `/juegos/caida/jugar` y `/salon` no producen scroll horizontal (`scrollWidth === innerWidth`).
- [x] `/`, `/juegos` y `/acceso` siguen sin scroll horizontal entre 320 y 640 px.
- [x] En ≤ 480 px, la tabla de `/salon` muestra RANGO, JUGADOR y PUNTUACIÓN, y no muestra FECHA.
- [x] En > 480 px, la tabla de `/salon` sigue mostrando las 4 columnas.
- [x] A 320 px, PAUSA, FIN y SALIR del reproductor son visibles y pulsables.
- [x] A 1440 px, el Detalle, el Reproductor y el Salón se ven igual que antes de esta spec.

---

## Decisions

- **Sí:** una sola spec para navegación instantánea y desbordes móviles. Decisión del usuario; son cambios pequeños sobre las mismas pantallas de la SPEC 01.
- **No:** dos specs separadas. Más ceremonia para pocos cambios.
- **Sí:** `<Suspense>` con el contenido en un componente interno. Es el arreglo que recomienda la documentación y mantiene la navegación instantánea.
- **No:** `export const instant = false`. Quita el aviso renunciando a la navegación instantánea.
- **Sí:** aplicarlo también en `/juegos/[id]/jugar`. Tiene el mismo `await params` y el mismo aviso.
- **Sí:** mantener `ensureStatic = "navigation"` y `generateStaticParams()`. `<Suspense>` es compatible con ellos según `keeping-pages-static.md`.
- **Sí:** esqueletos como fallback. Evitan saltos de layout al llegar el contenido.
- **No:** texto "CARGANDO…" o `null` como fallback. El layout salta o la pantalla parpadea.
- **Sí:** esqueletos en componentes propios en `app/components/`. Siguen la convención de la SPEC 01 y no engordan las páginas.
- **Sí:** cobertura desde 320 px. Decisión del usuario; deja todo el sitio sin scroll horizontal.
- **Sí:** ocultar FECHA en la tabla del Salón en ≤ 480 px. Es el cambio más pequeño y la fecha sigue visible en el podio y en escritorio.
- **No:** mover la fecha bajo el nombre o hacer scroll dentro de la tabla. Cambian más la forma de la tabla o la interacción.
- **Sí:** recortar con overflow el suelo decorativo `.grid-floor`. Ya está recortado por `.crt-screen` y `.crt` (`overflow: hidden`), así que no requiere cambios; el desborde del reproductor viene de `.hud-actions`.
- **Sí:** verificación manual en dev. Sin dependencias nuevas; el proyecto no tiene test runner.
- **No:** test e2e con `@next/playwright`. Exige un test runner que las specs anteriores dejaron fuera.

---

## Risks

| Riesgo                                                                                       | Mitigación                                                                                                        |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `notFound()` dentro de `<Suspense>` puede responder HTTP 200 al hacer streaming.             | El criterio exige la UI de no encontrado; el código HTTP queda fuera de alcance y se anota si se necesita.        |
| `ensureStatic = "navigation"` rechaza el build si algo del contenido deja de ser estático.   | El contenido solo lee `GAMES` y datos sembrados; el paso 2 y el 3 ejecutan `npm run build`.                        |
| El esqueleto no coincide en tamaño con el contenido y el layout salta.                        | Reutiliza las clases contenedoras de cada pantalla (`av-detail`, `detail-cover`, `crt`, `crt-screen`).             |
| Ocultar FECHA rompe la alineación de la cabecera con las filas.                               | Se ocultan a la vez la cuarta celda de `.th` y `.dt`, y ambas usan la misma rejilla de 3 columnas.                 |
| El aviso no aparece en producción, así que un fallo no se ve en `next start`.                 | La verificación se hace con `next dev`, que es donde corre la validación.                                         |
| El `next dev` del usuario no recarga `globals.css` (visto en la SPEC 02).                     | Reiniciar `npm run dev` antes de validar los cambios de CSS.                                                      |

---

## What is **not** in this spec

- Tests e2e o test runner.
- Prefetch por enlace (`prefetch={true}`) o `use cache`.
- Cambios en `next.config.ts`.
- Código HTTP 404 real.
- Cambios en Home, Biblioteca o Acceso.
- Rediseño de pantallas.

Cada uno de estos puntos, si se aborda, va en su propia spec.
