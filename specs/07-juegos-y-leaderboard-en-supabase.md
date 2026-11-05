# SPEC 07 — Catálogo de juegos y leaderboard en Supabase

> **Status:** Implementado
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-11-04
> **Objective:** Crear en Supabase las tablas `games` (con semilla de `asteroides`) y `scores`, y hacer que el catálogo, el detalle, la Home y `/salon` las lean en cada petición, y que Asteroides guarde ahí sus puntuaciones en lugar de `localStorage`.

---

## Por qué existe esta spec

Hoy todo es local o inventado. El catálogo es el array `GAMES` de `app/data/games.ts`: un juego real (`asteroides`) y 8 simulados. Los rankings de `/salon` y del detalle salen de `seededScores()`, un generador pseudoaleatorio. `saveScore()` escribe en `localStorage.av_scores`, y nadie lo lee. "Mejor global" y "Partidas" son números fijos.

SPEC 05 dejó listos los clientes de Supabase, pero el esquema `public` sigue vacío (sin tablas ni migraciones). Esta spec usa esos clientes por primera vez. El catálogo pasa a ser solo lo que hay en la base: el juego real. Además, las puntuaciones dejan de ser decorativas.

---

## Scope

**In:**

- Migración SQL versionada en `supabase/migrations/<YYYYMMDDHHMMSS>_games_scores.sql`, aplicada al proyecto `imvsthhqtrwbffpzriuz` con `apply_migration` del MCP:
  - Tabla `public.games` y tabla `public.scores` (ver Data model).
  - Semilla: una sola fila en `games`, la de `asteroides`, con los textos actuales de `GAMES`.
  - RLS activada en las dos tablas, con políticas abiertas: SELECT público en `games` y `scores` e INSERT público solo en `scores`. No hay políticas de UPDATE ni DELETE.
- Tipos generados con `generate_typescript_types` en `app/lib/supabase/database.types.ts`. `client.ts` y `server.ts` pasan a devolver `SupabaseClient<Database>`.
- Capa de lectura en servidor, `app/lib/games.ts`, con `getGames`, `getGame`, `getLeaderboard` y `getGameStats`. Usa el `createClient()` de servidor y no tiene caché, así que los datos son frescos en cada petición.
- Capa de escritura en cliente:
  - `app/lib/scores.ts` con `insertScore`, que usa el `createClient()` de navegador con `user_id` nulo.
  - `app/lib/player-name.ts` con `normalizePlayerName`, `loadPlayerName` y `savePlayerName` (clave `av_player_name`).
- Eliminar el array `GAMES` y los 8 juegos simulados (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`). No se migran a Supabase y desaparecen de la UI. En `app/data/games.ts` solo quedan los tipos `Category`, `GameColor` y `Game` (sin `best` ni `plays`) y `CATS`. Se elimina también `PLAYERS`.
- Pantallas migradas a Supabase:
  - `/juegos`: la página lee `getGames()` dentro de `<Suspense>` y pasa la lista a `LibraryBrowser` como prop. Búsqueda y filtros siguen en el cliente.
  - `GameCard`: se quita el bloque que muestra `best`.
  - Home (`/`): `GamesPreview` pasa a ser un Server Component async con `getGames()`, primeros 6, dentro de `<Suspense>`.
  - `/juegos/[id]`:
    - Lee `getGame(id)`. Si no existe, responde `notFound()`.
    - "Partidas" y "Mejor global" salen de `getGameStats(id)`.
    - El panel "MEJORES PUNTUACIONES" muestra el top 10 de `getLeaderboard(id, 10)`.
    - Se eliminan `generateStaticParams` y `ensureStatic = 'navigation'`.
  - `/juegos/asteroides/jugar`: el título se lee con `getGame('asteroides')` dentro de `<Suspense>`, usando `PlayerSkeleton` como fallback.
  - `/salon`:
    - Las pestañas son `<Link>` a `/salon?juego=<id>`, una por juego de `getGames()`.
    - Podio y tabla muestran el top 12 de `getLeaderboard(id, 12)`, leídos en el servidor dentro de `<Suspense>`.
    - Sin `?juego=`, o con un valor que no existe, se usa el primer juego.
- Modal "FIN DEL JUEGO" de `AsteroidsPlayer`:
  - Guarda con `insertScore`.
  - Estados del botón: "GUARDANDO…" (deshabilitado), "▸ PUNTUACIÓN GUARDADA_" o "NO SE PUDO GUARDAR" con el botón reactivado para reintentar.
  - Placeholder "TU NOMBRE".
  - Al abrir el modal, el campo se rellena con `localStorage.av_player_name` si existe.
  - Tras un insert correcto se guarda el nombre normalizado, salvo que sea "INVITADO".
- Estados vacíos y de error en línea:
  - Sin puntuaciones: "SÉ EL PRIMERO EN ENTRAR AL SALÓN DE LA FAMA". Los huecos vacíos del podio se ocultan.
  - Si falla una lectura: "NO SE PUDO CARGAR" en esa sección, sin romper la página.
- Eliminar el código que queda sin uso:
  - `app/juegos/[id]/jugar/page.tsx`.
  - `app/components/PlayerScreen.tsx`.
  - `app/data/scores.ts` (`seededScores`, `ScoreRow`).
  - `app/lib/scores-storage.ts` (`saveScore`, `av_scores`).
- Diseño de los estados nuevos (carga, vacío, error, guardando) guiado por el skill `/frontend-design`, según `CLAUDE.md`.

**Out of scope (para futuras specs):**

- Seguridad real del leaderboard: validar en RLS (`score >= 0`, longitud de `player_name`, `user_id is null`), limitar la frecuencia de envíos o evitar trampas.
- Autenticación y rellenar `user_id`.
- Migrar `localStorage.av_scores` a Supabase. Las puntuaciones locales existentes se ignoran.
- Migrar o recrear los 8 juegos simulados, y portar Tetris o Arkanoid.
- Borrar las portadas CSS de los juegos simulados (`cover-bricks`, `cover-tetro`, etc.). Se quedan en `globals.css`.
- Renombrar rutas (`/games`, `/hall-of-fame`).
- Mejor partida por jugador (ranking deduplicado), paginación o rankings por periodo.
- `ActivitySection` de la Home (`RECENT_SCORES`, `TOP_PLAYERS` de `app/data/home.ts`), que sigue con datos fijos.
- Mostrar el puesto obtenido en el modal tras guardar.
- Realtime (refresco automático del ranking).
- Supabase CLI o stack local.
- Tests automatizados (el proyecto no tiene test runner).

---

## Data model

### Tablas (SQL de la migración)

```sql
create table public.games (
  id                text primary key,            -- slug: 'asteroides'
  title             text not null,
  short_description text not null,
  long_description  text not null,
  category          text not null,               -- 'ARCADE' | 'PUZZLE' | 'SHOOTER' | 'VERSUS'
  cover             text not null,               -- clase CSS: 'cover-asteroides'
  color             text not null,               -- 'cyan' | 'magenta' | 'yellow' | 'green'
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now()
);

create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games(id) on delete cascade,
  player_name text not null,
  score       integer not null,
  user_id     uuid null references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index scores_leaderboard_idx on public.scores (game_id, score desc, created_at asc);

alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy "games_select_public"  on public.games  for select to anon, authenticated using (true);
create policy "scores_select_public" on public.scores for select to anon, authenticated using (true);
create policy "scores_insert_public" on public.scores for insert to anon, authenticated with check (true);
```

Semilla: un `insert into public.games` con `id = 'asteroides'`, `title = 'ASTEROIDES'`, `category = 'SHOOTER'`, `cover = 'cover-asteroides'`, `color = 'cyan'` y `sort_order = 0`. `short_description` y `long_description` copian literalmente `short` y `long` de la entrada actual de `GAMES`.

### Tipos de la app

```ts
// app/data/games.ts — sin datos, solo tipos y filtros
export type Category = 'ARCADE' | 'PUZZLE' | 'SHOOTER' | 'VERSUS';
export type GameColor = 'cyan' | 'magenta' | 'yellow' | 'green';
export interface Game {
  id: string;
  title: string;
  short: string; // ← short_description
  long: string; // ← long_description
  cat: Category; // ← category
  cover: string;
  color: GameColor;
}
export const CATS: ('TODOS' | Category)[] = ['TODOS', 'ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS'];
```

```ts
// app/lib/games.ts — solo servidor (usa @/app/lib/supabase/server)
export interface LeaderboardRow {
  rank: number; // 1..N, calculado en la app
  name: string; // ← player_name
  score: number;
  date: string; // created_at como 'dd/mm/aaaa', es-ES, timeZone 'UTC'
}
export interface GameStats {
  plays: number; // count(*) de scores del juego
  best: number | null; // max(score); null si no hay partidas
}
export async function getGames(): Promise<Game[]>; // order by sort_order, title
export async function getGame(id: string): Promise<Game | null>; // null si no existe
export async function getLeaderboard(gameId: string, limit: number): Promise<LeaderboardRow[]>;
export async function getGameStats(gameId: string): Promise<GameStats>;
// Todas lanzan Error si Supabase devuelve error. "No encontrado" no es error.
```

```ts
// app/lib/scores.ts — cliente (usa @/app/lib/supabase/client)
export async function insertScore(entry: {
  gameId: string;
  playerName: string; // ya normalizado
  score: number;
}): Promise<void>; // lanza Error si el insert falla; no envía user_id

// app/lib/player-name.ts — cliente
export const PLAYER_NAME_KEY = 'av_player_name';
export const DEFAULT_PLAYER_NAME = 'INVITADO';
export function normalizePlayerName(raw: string): string; // trim + toUpperCase + slice(0, 10); '' → 'INVITADO'
export function loadPlayerName(): string | null; // try/catch; null si no hay o falla
export function savePlayerName(name: string): void; // no guarda 'INVITADO'; try/catch silencioso
```

### Rutas

| Pantalla               | Ruta                       | Cambio                                                                    |
| ---------------------- | -------------------------- | ------------------------------------------------------------------------- |
| Home                   | `/`                        | `GamesPreview` lee de Supabase dentro de `<Suspense>`                     |
| Biblioteca             | `/juegos`                  | Lista de Supabase dentro de `<Suspense>`; `LibraryBrowser` recibe `games` |
| Detalle                | `/juegos/[id]`             | Juego, estadísticas y top 10 de Supabase; sin `generateStaticParams`      |
| Reproductor Asteroides | `/juegos/asteroides/jugar` | Título de Supabase; guardado con `insertScore`                            |
| Reproductor genérico   | `/juegos/[id]/jugar`       | **Se elimina**; `/juegos/rocas/jugar` y similares dan 404                 |
| Salón de la fama       | `/salon?juego=<id>`        | Pestañas como enlaces; top 12 de Supabase dentro de `<Suspense>`          |

Convenciones:

- Las columnas de la base van en `snake_case`. `app/lib/games.ts` las mapea a `Game` y `LeaderboardRow` para que los componentes no cambien de forma.
- Ningún componente importa `@/app/lib/supabase/*` directamente. Las lecturas pasan por `app/lib/games.ts` y las escrituras por `app/lib/scores.ts`.
- Orden del ranking: `score desc, created_at asc`, para que en un empate gane la partida más antigua. Un mismo jugador puede aparecer varias veces.
- Cualquier lectura con `createClient()` de servidor vive en un componente async envuelto en `<Suspense>`, porque `cookies()` vuelve dinámico el render con `cacheComponents`.
- Sin `'use cache'` en `app/lib/games.ts`: los datos son frescos en cada petición.
- Si `best` es `null` (sin partidas), "Mejor global" muestra `—`. `plays` se formatea con `toLocaleString('es-ES')`.
- No se añaden `check` en la base. La normalización del nombre solo vive en la UI.

---

## Implementation plan

Antes de empezar, leer en `node_modules/next/dist/docs/01-app/`:

- `02-guides/keeping-pages-static.md` y `02-guides/migrating-to-cache-components.md`.
- La referencia de `ensureStatic` y `generateStaticParams` en `03-api-reference/`.
- La referencia de `notFound`, para confirmar su comportamiento dentro de `<Suspense>`.

Consultar también la documentación de Supabase sobre RLS y tipos generados (MCP `search_docs`).

1. Escribir `supabase/migrations/<YYYYMMDDHHMMSS>_games_scores.sql` con tablas, índice, RLS, políticas y semilla, y aplicarlo con `apply_migration`. Prueba manual: `list_tables` muestra `games` y `scores` con RLS activada; `execute_sql` devuelve una fila en `games`; `get_advisors` (security) no marca tablas sin RLS.
2. Generar `app/lib/supabase/database.types.ts` con `generate_typescript_types` y tipar `client.ts` y `server.ts` con `SupabaseClient<Database>`. Prueba manual: `npm run build` compila.
3. Crear `app/lib/games.ts` con `getGames`, `getGame`, `getLeaderboard` y `getGameStats`, sin usarlas todavía. En `app/data/games.ts`, `Game` toma su forma final (sin `best` ni `plays`) y el array temporal se tipa como `(Game & { best: number; plays: string })[]` hasta el paso 10. Quitar `best` de `GameCard`. Prueba manual: `npm run build` compila y las tarjetas de `/juegos` ya no muestran el récord.
4. Migrar `/juegos`: la página monta un componente async con `getGames()` en `<Suspense>` y `LibraryBrowser` recibe `games` por props. Añadir los estados de carga y "NO SE PUDO CARGAR". Prueba manual: `/juegos` muestra solo ASTEROIDES; la búsqueda y los filtros siguen funcionando; con una URL de Supabase inválida en `.env.local` aparece "NO SE PUDO CARGAR" y el resto de la página se ve.
5. Migrar `GamesPreview` de la Home a Server Component async dentro de `<Suspense>`. Prueba manual: `/` muestra la mini-tarjeta de ASTEROIDES y la animación `reveal` sigue funcionando.
6. Migrar `/juegos/[id]`: quitar `generateStaticParams` y `ensureStatic`; usar `getGame`, `getGameStats` y `getLeaderboard(id, 10)`; añadir los estados vacío y de error del panel. Prueba manual: `/juegos/asteroides` muestra Partidas `0`, Mejor global `—` y "SÉ EL PRIMERO EN ENTRAR AL SALÓN DE LA FAMA"; `/juegos/rocas` muestra la página 404.
7. Migrar `/juegos/asteroides/jugar` para leer el título con `getGame('asteroides')` dentro de `<Suspense>` con `PlayerSkeleton`. Prueba manual: el reproductor carga y se juega igual que antes.
8. Migrar `/salon`: componente async que lee `searchParams.juego`, `getGames()` y `getLeaderboard(id, 12)`; pestañas como `<Link>`; podio que oculta los huecos sin fila; estados vacío y de error. Prueba manual: `/salon`, `/salon?juego=asteroides` y `/salon?juego=nada` muestran el ranking de ASTEROIDES con la pestaña activa.
9. Crear `app/lib/player-name.ts` y `app/lib/scores.ts` y conectar el modal de `AsteroidsPlayer` (guardando, guardado, error con reintento; precarga de `av_player_name`). Prueba manual:
   - Guardar una partida crea una fila en `scores` (`execute_sql`) con `user_id` nulo.
   - Con la red cortada en DevTools aparece "NO SE PUDO GUARDAR" y reintentar funciona.
   - `/salon` y `/juegos/asteroides` muestran la nueva puntuación al recargar.
10. Eliminar `GAMES`, `PLAYERS`, `app/data/scores.ts`, `app/lib/scores-storage.ts`, `app/components/PlayerScreen.tsx` y `app/juegos/[id]/jugar/page.tsx`. Prueba manual: `grep` no encuentra `GAMES`, `seededScores`, `saveScore` ni `av_scores` en `app/`, y `npm run lint` y `npm run build` terminan sin errores.

---

## Acceptance criteria

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] Existe `supabase/migrations/<timestamp>_games_scores.sql` y su contenido es el mismo que se aplicó (aparece en `list_migrations`).
- [ ] `public.games` y `public.scores` existen con las columnas del Data model y RLS activada.
- [ ] `public.games` contiene exactamente una fila, `asteroides`.
- [ ] Con la publishable key, SELECT en `games` y `scores` funciona; INSERT en `scores` funciona; UPDATE o DELETE en `scores` no modifican ninguna fila; INSERT en `games` falla.
- [ ] `app/lib/supabase/database.types.ts` existe y `createClient()` (cliente y servidor) devuelve `SupabaseClient<Database>`.
- [ ] `app/` no contiene `GAMES`, `PLAYERS`, `seededScores`, `saveScore` ni `av_scores`.
- [ ] No existen `app/juegos/[id]/jugar/page.tsx`, `app/components/PlayerScreen.tsx`, `app/data/scores.ts` ni `app/lib/scores-storage.ts`.
- [ ] Ningún componente de `app/components/` ni página de `app/` importa `@/app/lib/supabase/*` directamente.
- [ ] `/juegos` y la Home muestran solo ASTEROIDES, y la tarjeta no muestra `best`.
- [ ] Un juego insertado a mano en `games` con `execute_sql` aparece en `/juegos` al recargar, sin reconstruir la app.
- [ ] `/juegos/asteroides` muestra en "Partidas" el número de filas de `scores` del juego y en "Mejor global" su máximo, o `—` si no hay ninguna.
- [ ] El panel del detalle muestra como máximo 10 filas, ordenadas por `score` desc y, en empate, por la más antigua.
- [ ] `/juegos/rocas` y `/juegos/no-existe` muestran la página 404.
- [ ] `/juegos/rocas/jugar` muestra la página 404.
- [ ] `/salon` sin parámetro, con `?juego=asteroides` y con `?juego=nada` muestra el ranking de ASTEROIDES con su pestaña activa.
- [ ] Las pestañas de `/salon` son enlaces a `/salon?juego=<id>`.
- [ ] `/salon` muestra como máximo 12 filas y el podio solo pinta los puestos que tienen puntuación.
- [ ] Sin puntuaciones, el detalle y `/salon` muestran "SÉ EL PRIMERO EN ENTRAR AL SALÓN DE LA FAMA".
- [ ] Con Supabase inaccesible, cada sección afectada muestra "NO SE PUDO CARGAR" y la nav y el footer siguen visibles.
- [ ] GUARDAR PUNTUACIÓN inserta una fila en `scores` con `game_id = 'asteroides'`, la puntuación final, el nombre normalizado y `user_id` nulo.
- [ ] Mientras se guarda, el botón muestra "GUARDANDO…" y está deshabilitado; un doble clic crea una sola fila.
- [ ] Si el insert falla, aparece "NO SE PUDO GUARDAR" y el botón permite reintentar.
- [ ] Un nombre " ana " se guarda como `ANA`; un nombre vacío o solo con espacios se guarda como `INVITADO`; el campo no admite más de 10 caracteres.
- [ ] Tras guardar con éxito como `ANA`, la siguiente partida abre el modal con `ANA` en el campo; guardar como `INVITADO` no escribe `av_player_name`.
- [ ] El placeholder del campo es "TU NOMBRE".
- [ ] Tras guardar, recargar `/salon` o `/juegos/asteroides` muestra la nueva puntuación.

---

## Decisions

- **Sí:** tabla `games` en Supabase con semilla solo de `asteroides` y sin el array `GAMES`. Decisión del usuario; el catálogo muestra solo juegos reales.
- **No:** migrar los 8 juegos simulados. Decisión del usuario; no tienen motor real.
- **Sí:** eliminar `[id]/jugar` y `PlayerScreen`. Decisión del usuario; sin juegos simulados quedan sin uso.
- **No:** conservarlos para futuros juegos. SPEC 06 fijó el patrón de play-page propia por juego.
- **Sí:** conservar `PlayerSkeleton` como fallback de `/juegos/asteroides/jugar`, que ahora lee de Supabase.
- **Sí:** conservar las portadas CSS de los simulados. Decisión del usuario; borrar CSS no aporta a esta spec.
- **Sí:** mantener las rutas `/juegos`, `/juegos/[id]` y `/salon`, y migrar también la Home. Decisión del usuario; sin `GAMES`, la Home no puede quedarse como está.
- **No:** renombrar rutas a inglés. Rompería enlaces.
- **Sí:** datos frescos en cada petición, sin `'use cache'`. Decisión del usuario.
- **Sí:** quitar `generateStaticParams` y `ensureStatic = 'navigation'` del detalle. `'navigation'` exige que toda la ruta sea estática, lo que es incompatible con leer Supabase por petición. La lista de ids ya no se conoce en el build.
- **Sí:** RLS activada con políticas abiertas (SELECT público en ambas, INSERT público en `scores`, sin UPDATE ni DELETE). Decisión del usuario.
- **No:** RLS desactivada. `anon` podría borrar o editar el ranking.
- **No:** validaciones de contenido en RLS o `check`. Decisión del usuario; la seguridad real va en una spec futura.
- **Sí:** insert desde el navegador con el `createClient()` de cliente y `user_id` nulo. Decisión del usuario.
- **No:** Server Action intermedia. Sin validaciones no añade seguridad.
- **Sí:** `user_id` nullable con FK a `auth.users`. Deja la columna lista para la spec de auth sin migración nueva.
- **Sí:** ranking con todas las partidas: top 10 en el detalle y top 12 en `/salon`, con desempate por `created_at` ascendente. Decisión del usuario; no necesita vistas ni RPC.
- **No:** mejor partida por jugador. Con nombre libre, "ana" y "ANA" serían jugadores distintos; exige SQL adicional.
- **Sí:** `best` y `plays` calculados desde `scores` en el detalle. Decisión del usuario.
- **Sí:** quitar `best` de `GameCard`. Decisión del usuario; el listado hace una sola consulta.
- **No:** columnas `best` y `plays` en `games`, o una vista `game_stats`. Serían datos duplicados o SQL extra sin necesidad.
- **Sí:** `player_name` en mayúsculas, máximo 10 caracteres, con `trim()` y `INVITADO` si queda vacío; precarga desde `av_player_name`, escrito solo tras un insert correcto y nunca con `INVITADO`. Decisión del usuario.
- **Sí:** modal con estados guardando, guardado y error con reintento. Decisión del usuario; el botón deshabilitado evita inserts duplicados.
- **No:** guardado optimista. Ocultaría fallos reales.
- **Sí:** ignorar `localStorage.av_scores`. Decisión del usuario; eran datos de prueba.
- **Sí:** pestañas de `/salon` con `?juego=` leído en el servidor. Decisión del usuario; los rankings son enlazables y sigue el patrón del detalle.
- **No:** fetch en cliente por pestaña, ni precargar todos los rankings.
- **Sí:** migración en SQL versionado aplicada con el MCP. Decisión del usuario; deja historial en git sin la Supabase CLI.
- **Sí:** tipos generados en `database.types.ts`. Decisión del usuario.
- **Sí:** mensajes de vacío y de error en línea, `?juego=` inválido → primer juego, id inexistente en el detalle → `notFound()`. Decisión del usuario.
- **No:** `error.tsx` de página completa. Un fallo de Supabase no debe tapar la nav.
- **Sí:** mapeo `snake_case` → `Game` en `app/lib/games.ts`. Los componentes conservan sus props (`short`, `long`, `cat`).
- **Sí:** fechas del ranking en `dd/mm/aaaa` con `timeZone: 'UTC'`. Mismo formato que `seededScores` y render determinista en el servidor.

---

## Risks

| Riesgo                                                                                                                                   | Mitigación                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cualquiera puede insertar puntuaciones falsas o nombres ofensivos con la publishable key.                                                | Riesgo asumido por el usuario. Sin UPDATE ni DELETE, nadie puede borrar el ranking. La validación va en la spec de seguridad.                                                                     |
| La política de INSERT con `with check (true)` permite enviar un `user_id` arbitrario.                                                    | Riesgo asumido. La spec de seguridad debe añadir `user_id is null` (o `= auth.uid()` con auth).                                                                                                   |
| `notFound()` dentro de `<Suspense>`, tras enviar el shell, puede responder 200 con la UI de 404 en lugar del código 404.                 | Leer la referencia de `notFound` antes del paso 6. El criterio comprueba que se ve la página 404. Si se exige el código HTTP, resolver `params` y `getGame` antes de la frontera de `<Suspense>`. |
| Leer Supabase fuera de `<Suspense>` rompe el build con `cacheComponents` ("uncached data accessed outside of Suspense").                 | Toda lectura vive en un componente async envuelto en `<Suspense>`, y cada paso se valida con `npm run build`.                                                                                     |
| `GamesPreview` en streaming no recibe la animación de `RevealOnScroll` porque el observer se registró antes de que llegara el contenido. | El paso 5 lo comprueba. Si falla, el `<Suspense>` envuelve solo el `mini-rail` y no la `section.reveal`.                                                                                          |
| La caché del router cliente muestra un ranking viejo al volver a `/salon` tras guardar.                                                  | El criterio usa recarga. Si la navegación cliente muestra datos viejos, documentarlo para la spec de realtime y no añadir `router.refresh()` aquí.                                                |
| Un juego nuevo en `games` sin play-page propia tiene un botón JUGAR AHORA que lleva a 404.                                               | Aceptado: solo `asteroides` está en la semilla. Cada juego nuevo trae su play-page (patrón de SPEC 06).                                                                                           |
| `database.types.ts` queda desactualizado si el esquema cambia fuera de esta spec.                                                        | Se regenera en cada spec que cambie el esquema. El archivo indica en un comentario cómo se generó.                                                                                                |
| La semilla en la migración choca si se vuelve a aplicar.                                                                                 | La migración se aplica una sola vez con el MCP; no se reejecuta a mano.                                                                                                                           |

---

## What is **not** in this spec

- Validación o seguridad real del leaderboard (RLS estricta, límite de envíos, anti-trampas).
- Autenticación y `user_id` real.
- Migración de `localStorage.av_scores`.
- Los 8 juegos simulados, Tetris o Arkanoid.
- Borrar portadas CSS de los simulados.
- Renombrar rutas.
- Ranking por jugador, paginación o por periodo.
- `ActivitySection` de la Home con datos reales.
- Puesto obtenido en el modal.
- Realtime.
- Supabase CLI o stack local.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
