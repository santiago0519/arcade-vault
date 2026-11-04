# SPEC 05 — Conexión con Supabase (plomería)

> **Status:** Implementado
> **Depends on:** —
> **Date:** 2026-11-03
> **Objective:** Dejar instalados y configurados en `app/lib/supabase/` los clientes de Supabase para navegador y servidor (`@supabase/ssr`), con sus variables de entorno, sin que ninguna pantalla los use todavía.

---

## Por qué existe esta spec

El commit `b649dd1` añadió el servidor MCP de Supabase (`.mcp.json`, proyecto `imvsthhqtrwbffpzriuz`) y `SUPABASE_DB_PASSWORD` a `.env.example`, pero la app aún no habla con Supabase: no hay paquetes `@supabase/*` instalados, ni clientes, ni variables públicas. El esquema `public` del proyecto está vacío.

Las próximas features (acceso real en `/acceso`, puntuaciones persistentes en lugar de `localStorage`) necesitan una base común. Esta spec solo pone esa base, para que cada feature posterior se limite a usar `createClient()` sin decidir otra vez cómo se conecta.

---

## Scope

**In:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr` como dependencias.
- `app/lib/supabase/env.ts`: lee y valida `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Si falta alguna, lanza un `Error` en español que nombra la variable.
- `app/lib/supabase/client.ts`: `createClient()` para Client Components con `createBrowserClient`.
- `app/lib/supabase/server.ts`: `createClient()` async para Server Components, Route Handlers y Server Actions con `createServerClient` y `cookies()` de `next/headers`.
- Variables de entorno:
  - `.env.example`: añadir `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` vacías.
  - `.env.local`: añadir la URL del proyecto y la publishable key reales, obtenidas con el MCP de Supabase (`get_project_url`, `get_publishable_keys`).
- Verificación con `npm run lint` y `npm run build` y revisión manual de que las pantallas existentes no cambian.

**Out of scope (para futuras specs):**

- `proxy.ts` para refrescar la cookie de sesión: va con la spec de autenticación.
- Autenticación: conectar `/acceso` (`AuthForm`) a Supabase Auth.
- Tablas, migraciones, RLS y semillas.
- Migrar `app/lib/scores-storage.ts` o `app/data/scores.ts` a Supabase.
- Tipos generados de la base de datos (`Database`): se añaden con la primera tabla.
- Cliente admin con secret key / service role.
- Endpoint de salud (`/api/health`), script de comprobación o tabla de prueba.
- Supabase CLI, stack local o carpeta `supabase/`.
- Cambios en `SUPABASE_DB_PASSWORD`, `.mcp.json` o `next.config.ts`.
- Cambios en cualquier pantalla, componente o estilo existente.
- Tests automatizados (el proyecto no tiene test runner).

---

## Data model

Esta feature no introduce estructuras de datos persistentes ni tablas. Solo módulos y variables de entorno.

Archivos nuevos:

```ts
// app/lib/supabase/env.ts — sin "use client"; se importa desde client.ts y server.ts
export function getSupabaseEnv(): {
  url: string; // NEXT_PUBLIC_SUPABASE_URL
  publishableKey: string; // NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
};
// Lanza: new Error("Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL")
// (o la que corresponda) si está vacía o no definida.

// app/lib/supabase/client.ts — para Client Components
import type { SupabaseClient } from '@supabase/supabase-js';
export function createClient(): SupabaseClient;

// app/lib/supabase/server.ts — para Server Components, Route Handlers y Server Actions
import type { SupabaseClient } from '@supabase/supabase-js';
export async function createClient(): Promise<SupabaseClient>;
```

Variables de entorno:

| Variable                               | Obligatoria | Expuesta al cliente | Valor                                                     |
| -------------------------------------- | ----------- | ------------------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Sí          | Sí                  | `https://imvsthhqtrwbffpzriuz.supabase.co`                |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí          | Sí                  | Publishable key (`sb_publishable_…`) obtenida con el MCP. |

Convenciones:

- Los dos módulos exportan la misma función `createClient`; se distinguen por la ruta de import (`@/app/lib/supabase/client` o `@/app/lib/supabase/server`, o la ruta relativa que use el proyecto).
- El cliente de servidor sigue el patrón de `@supabase/ssr` para `cookies()`: `getAll` y `setAll`, con `setAll` envuelto en `try/catch` porque un Server Component no puede escribir cookies.
- Los clientes no se crean a nivel de módulo: se crean en cada llamada a `createClient()`, para no compartir estado entre peticiones en el servidor.
- `env.ts` accede a las variables con `process.env.NEXT_PUBLIC_SUPABASE_URL` y `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` escritas literalmente, para que Next.js las inyecte en el bundle del cliente.
- Ninguna clave secreta (`SUPABASE_DB_PASSWORD`, secret key) se lee desde la app.

---

## Implementation plan

Antes de empezar, leer en `node_modules/next/dist/docs/01-app/`: `02-guides/environment-variables.md`, `02-guides/authentication-with-cache-components.md` (uso de `cookies()` con `cacheComponents`) y la referencia de `cookies` en `03-api-reference/04-functions/`. Consultar la documentación actual de `@supabase/ssr` para Next.js App Router (MCP `search_docs`).

1. Instalar `@supabase/supabase-js` y `@supabase/ssr` (`npm install`). Prueba manual: aparecen en `dependencies` de `package.json` y `npm run build` compila.
2. Añadir `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` a `.env.example`. Obtener la URL y la publishable key con el MCP de Supabase y escribirlas en `.env.local`. Prueba manual: `git status` muestra `.env.example` modificado y no muestra `.env.local`.
3. Crear `app/lib/supabase/env.ts` con `getSupabaseEnv()`. Prueba manual: `npm run build` compila sin errores de tipos.
4. Crear `app/lib/supabase/client.ts` con `createClient()` sobre `createBrowserClient`. Prueba manual: `npm run build` compila.
5. Crear `app/lib/supabase/server.ts` con `createClient()` async sobre `createServerClient` y `cookies()`. Prueba manual: `npm run build` compila.
6. Ejecutar `npm run lint` y `npm run build`. Con `npm run dev`, abrir `/`, `/juegos`, `/juegos/caida`, `/juegos/caida/jugar`, `/salon`, `/acceso` y `/acerca-de` y comprobar que se ven y funcionan como antes, sin errores nuevos en la terminal ni en la consola.

---

## Acceptance criteria

- [ ] `@supabase/supabase-js` y `@supabase/ssr` están en `dependencies` de `package.json`.
- [ ] Existen `app/lib/supabase/env.ts`, `app/lib/supabase/client.ts` y `app/lib/supabase/server.ts` con las firmas del Data model.
- [ ] `client.ts` usa `createBrowserClient` y `server.ts` usa `createServerClient` con `cookies()` de `next/headers` (`getAll` / `setAll`).
- [ ] `getSupabaseEnv()` lanza un `Error` que nombra la variable cuando `NEXT_PUBLIC_SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` faltan o están vacías.
- [ ] Ningún `createClient()` se invoca a nivel de módulo.
- [ ] `.env.example` contiene `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` sin valores, y conserva las variables previas sin cambios.
- [ ] `.env.local` contiene la URL y la publishable key del proyecto `imvsthhqtrwbffpzriuz` y no aparece en `git status`.
- [ ] Ningún archivo de `app/` lee `SUPABASE_DB_PASSWORD` ni una secret key de Supabase.
- [ ] No existe `proxy.ts` ni `middleware.ts` nuevo.
- [ ] Ninguna página ni componente existente importa los clientes de Supabase.
- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/`, `/juegos`, `/juegos/caida`, `/juegos/caida/jugar`, `/salon`, `/acceso` y `/acerca-de` se ven y funcionan igual que antes de esta spec.

---

## Decisions

- **Sí:** spec solo de plomería. Decisión del usuario; auth y puntuaciones van en specs propias.
- **No:** incluir auth o la tabla de puntuaciones aquí. Abrirían decisiones de UI, sesión, esquema y RLS.
- **Sí:** `@supabase/ssr` además de `@supabase/supabase-js`. Es el paquete oficial para App Router y deja las cookies listas para la spec de auth.
- **No:** un único cliente `supabase-js` sin `@supabase/ssr`. Habría que rehacerlo al llegar la autenticación con cookies.
- **Sí:** clientes browser y server. Decisión del usuario.
- **No:** cliente admin con secret key. Nadie lo necesita aún y aumenta el riesgo de fuga.
- **Sí:** `app/lib/supabase/`. Decisión del usuario; sigue la convención de `app/lib/contact.ts` y `app/lib/scores-storage.ts`.
- **No:** `lib/supabase/` en la raíz. Es la convención de los ejemplos de Supabase, pero rompe la del proyecto.
- **Sí:** publishable key con `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Decisión del usuario; es el formato actual de Supabase.
- **No:** anon key legacy (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- **Sí:** error claro al crear el cliente si falta configuración. Decisión del usuario; como nadie llama a los clientes aún, el build no se rompe.
- **No:** devolver `null`. Reparte comprobaciones en cada llamador.
- **No:** `proxy.ts` de refresco de sesión. Decisión del usuario; sin sesión no hay nada que refrescar y va con la spec de auth.
- **No:** tipos generados (`Database`). Decisión del usuario; el esquema está vacío y se añaden con la primera tabla.
- **Sí:** verificación solo con `npm run lint`, `npm run build` y revisión de pantallas existentes. Decisión del usuario.
- **No:** endpoint `/api/health`, script de prueba o tabla de prueba. Decisión del usuario; la conexión real se probará con la primera feature que use Supabase.
- **Sí:** escribir los valores reales en `.env.local` obtenidos con el MCP. La URL y la publishable key son públicas por diseño y `.env.local` está ignorado por git.

---

## Risks

| Riesgo                                                                                                        | Mitigación                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| La verificación no prueba una conexión real: una URL o clave incorrecta pasa el build sin detectarse.         | Los valores se obtienen del MCP del propio proyecto. La primera feature que use Supabase verifica la conexión de extremo a extremo.                  |
| `cookies()` en `server.ts` con `cacheComponents` vuelve dinámica una página o rompe `ensureStatic`.           | Ninguna página importa el cliente en esta spec. La spec que lo use debe leer `authentication-with-cache-components.md` y envolverlo en `<Suspense>`. |
| Acceder a `process.env` de forma dinámica deja las variables `NEXT_PUBLIC_*` sin inyectar en el cliente.      | `env.ts` las lee con nombre literal (`process.env.NEXT_PUBLIC_SUPABASE_URL`).                                                                        |
| Las versiones de `@supabase/ssr` cambian la API de cookies (`get`/`set`/`remove` frente a `getAll`/`setAll`). | Consultar la documentación actual antes del paso 5 y usar `getAll`/`setAll`.                                                                         |
| `setAll` lanza error al llamarse desde un Server Component.                                                   | Envolverlo en `try/catch`, como indica la documentación de `@supabase/ssr`; el refresco real llegará con `proxy.ts` en la spec de auth.              |
| Una clave secreta acaba con prefijo `NEXT_PUBLIC_` o en el repositorio.                                       | Solo se usa la publishable key; `.env.local` está ignorado; el criterio prohíbe leer secretos desde `app/`.                                          |

---

## What is **not** in this spec

- `proxy.ts` y refresco de sesión.
- Autenticación en `/acceso`.
- Tablas, migraciones, RLS o semillas.
- Migración de puntuaciones desde `localStorage`.
- Tipos generados de la base de datos.
- Cliente admin con secret key.
- Endpoint de salud o script de comprobación.
- Supabase CLI o stack local.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
