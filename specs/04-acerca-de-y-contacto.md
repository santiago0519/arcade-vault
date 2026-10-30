# SPEC 04 — Acerca de y formulario de contacto con Resend

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-10-29
> **Objective:** Implementar en Next.js la pantalla "Acerca de" de `references/templates/home-about/about.jsx` en `/acerca-de`, con un formulario de contacto que envía el mensaje por correo con Resend a través de `POST /api/contact`.

---

## Por qué existe esta spec

La SPEC 02 dejó fuera la pantalla "Acerca de" y su enlace en la navegación. La plantilla `references/templates/home-about/about.jsx` la trae junto con un formulario de contacto que en el prototipo solo simula el envío (`setSent(name)`). Esta spec la añade y hace que el envío sea real: es la primera feature del proyecto con un backend y con secretos, así que fija cómo se configuran las variables de entorno y qué se valida en el servidor.

---

## Scope

**In:**

- Ruta `/acerca-de` con la pantalla **Acerca de** exactamente como `about.jsx`:
  - **Hero** (`about-hero`): kicker "▸ ACERCA DE", `<h1>` "ACERCA DE ARCADE VAULT", párrafo de misión y 3 `highlight` con icono pixel (HEART, BROWSER, PLANT).
  - **Divisor** (`about-divider`): barras y 24 píxeles animados, con `aria-hidden="true"`.
  - **Contacto** (`about-contact`): intro "CONTÁCTANOS" con los 3 `tip` (RESPUESTA EN 24-48H, SUGERENCIAS BIENVENIDAS, SIN SPAM, JAMÁS) y el formulario NOMBRE, CORREO ELECTRÓNICO, MENSAJE y botón "▶ ENVIAR MENSAJE".
  - **Éxito**: la terminal `terminal-success` con "MENSAJE RECIBIDO… GRACIAS, {NOMBRE}." y el botón "ENVIAR OTRO MENSAJE".
  - Vibración (`shake`) del formulario cuando falta algún campo.
- Route Handler `app/api/contact/route.ts` con `POST`:
  - Lee el JSON, valida en servidor y envía el correo con el SDK `resend`.
  - Responde `200 { ok: true }`, `400 { ok: false, error }` si la validación falla y `502 { ok: false, error }` si Resend falla o falta configuración.
- Validación compartida en `app/lib/contact.ts` (cliente y servidor): nombre, correo con formato válido y mensaje, con límites de longitud.
- Honeypot: campo oculto `website` que un humano no rellena. Si llega con valor, el servidor responde `200 { ok: true }` sin enviar nada.
- Componente cliente `ContactForm` que hace `fetch("/api/contact")`, con estado de envío (botón deshabilitado y "ENVIANDO…"), de éxito y de error visible.
- Variables de entorno: `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`. Archivo `.env.example` con las tres vacías o con su valor por defecto, y `.env.local` local (ignorado por git) con `CONTACT_TO_EMAIL=edissoncode@gmail.com` y `RESEND_API_KEY` vacía para que el usuario la complete.
- `.gitignore`: excepción `!.env.example` para que el archivo de ejemplo sí se versione.
- `Nav`: enlace "Acerca de" (`/acerca-de`) tras "Salón de la Fama", en la barra y en el panel móvil, con enlace activo propio.
- `Footer`: enlace "ACERCA DE" a `/acerca-de`.
- Revelado al scroll de los `.reveal` reutilizando `app/components/home/RevealOnScroll.tsx` (SPEC 02).
- Portar a `app/globals.css` las clases de `references/templates/home-about/styles.css` que usa la pantalla y que aún no existen (`about-*`, `highlight*`, `hl-*`, `contact-*`, `tip*`, `terminal-success`, `term-*`, `dot`, `line`, `prompt`, `caret`, `shake`, y las de `field` que falten).
- Diseño de UI guiado por el skill `/frontend-design`, según `CLAUDE.md`.

**Out of scope (para futuras specs):**

- Autorrespuesta de confirmación al remitente.
- Rate limit por IP o CAPTCHA (requiere un store externo).
- Guardar los mensajes en base de datos o mostrarlos en un panel.
- Dominio propio verificado en Resend: se deja `CONTACT_FROM_EMAIL` configurable, pero verificar el dominio no forma parte de esta spec.
- Plantilla de correo en HTML con React Email: el correo sale como texto plano.
- Autenticación: el formulario es público y no lee la sesión.
- Internacionalización: la UI queda solo en español.
- Tests automatizados (el proyecto no tiene test runner).
- Cambios en Home, Biblioteca, Detalle, Reproductor, Salón o Acceso, más allá del Nav y el Footer.

---

## Data model

Esta feature no introduce estructuras de datos persistentes. Los tipos viven en `app/lib/contact.ts`.

```ts
// app/lib/contact.ts — compartido entre ContactForm y la ruta
export const CONTACT_LIMITS = {
  name: 80,
  email: 254,
  message: 2000,
} as const;

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
  website?: string; // honeypot, debe llegar vacío
}

export type ContactErrors = Partial<Record<"name" | "email" | "message", string>>;

export function validateContact(input: unknown): {
  ok: boolean;
  data?: ContactPayload;
  errors: ContactErrors;
};

// Respuesta de POST /api/contact
export type ContactResponse =
  | { ok: true }
  | { ok: false; error: string; fields?: ContactErrors };
```

Variables de entorno:

| Variable             | Obligatoria | Valor                                                             |
| -------------------- | ----------- | ----------------------------------------------------------------- |
| `RESEND_API_KEY`     | Sí          | La asigna el usuario después. Sin ella la ruta responde `502`.    |
| `CONTACT_TO_EMAIL`   | Sí          | `edissoncode@gmail.com`                                           |
| `CONTACT_FROM_EMAIL` | No          | Por defecto `ARCADE VAULT <onboarding@resend.dev>` (sandbox).     |

Correo enviado:

- `from`: `CONTACT_FROM_EMAIL`.
- `to`: `CONTACT_TO_EMAIL`.
- `replyTo`: el correo del remitente, para responder directo desde el buzón.
- `subject`: `[ARCADE VAULT] Mensaje de {nombre}`.
- `text`: nombre, correo y mensaje en texto plano.

Rutas:

| Pantalla  | Ruta            | Cambio                                                       |
| --------- | --------------- | ------------------------------------------------------------ |
| Acerca de | `/acerca-de`    | Nueva. Server; `ContactForm` y `RevealOnScroll` son clientes |
| Contacto  | `/api/contact`  | Nueva. Route Handler `POST`                                  |

Convenciones:

- Los componentes viven en `app/components/about/`. Solo `ContactForm` y el `RevealOnScroll` reutilizado llevan `"use client"`.
- Los iconos pixel son SVG de `<rect>` copiados de `HighlightIcon` en `about.jsx`, con `aria-hidden="true"`.
- El texto en español y los textos exactos de la plantilla se mantienen sin cambios.
- La clave de Resend solo se lee en `app/api/contact/route.ts`; nunca con prefijo `NEXT_PUBLIC_`.
- El servidor no confía en la validación del cliente: `validateContact` se ejecuta siempre en la ruta.

---

## Implementation plan

Antes de empezar, leer en `node_modules/next/dist/docs/01-app/`: `route.md` (Route Handlers, `03-api-reference/03-file-conventions/`) y la guía de variables de entorno, y comprobar cómo interactúa un `POST` con `cacheComponents`. Revisar también la documentación actual del SDK `resend` (`resend.emails.send` devuelve `{ data, error }`).

1. Instalar `resend` (`npm install resend`). Crear `.env.example`, añadir `!.env.example` a `.gitignore` y crear `.env.local` con `CONTACT_TO_EMAIL` y `RESEND_API_KEY` vacía. Prueba manual: `git status` muestra `.env.example` y no muestra `.env.local`; `npm run build` compila.
2. Crear `app/lib/contact.ts` con `CONTACT_LIMITS`, los tipos y `validateContact`. Prueba manual: `npm run build` compila sin errores de tipos.
3. Crear `app/api/contact/route.ts` con `POST`: parsea el JSON, aplica el honeypot, valida, envía con Resend y mapea los errores a `400`/`502`. Prueba manual: `curl -X POST /api/contact` con cuerpo vacío devuelve `400`; con datos válidos y sin `RESEND_API_KEY` devuelve `502`; con `website` relleno devuelve `200` sin enviar.
4. Portar a `app/globals.css` las clases de Acerca de que falten de `references/templates/home-about/styles.css`, sin duplicar las existentes ni cambiar sus valores. Prueba manual: `npm run dev` sigue renderizando las pantallas de las SPEC 01 a 03 sin cambios visuales.
5. Crear `app/components/about/HighlightIcon.tsx` (servidor, SVG) y `app/acerca-de/page.tsx` con el Hero y el divisor, más `RevealOnScroll`. Prueba manual: `/acerca-de` muestra el hero con 3 highlights y el divisor.
6. Crear `app/components/about/ContactForm.tsx` (cliente) con la intro, los campos y el botón, y montar la sección Contacto en la página. Prueba manual: `/acerca-de` muestra la sección con los 3 `tip` y el formulario; enviarlo vacío hace vibrar el formulario.
7. Conectar `ContactForm` a `POST /api/contact`: estados enviando, éxito (terminal con el nombre en mayúsculas y "ENVIAR OTRO MENSAJE") y error (mensaje visible sin perder lo escrito). Incluir el campo honeypot oculto. Prueba manual: con `RESEND_API_KEY` válida llega el correo a `edissoncode@gmail.com` con `Reply-To` del remitente; sin clave se ve el error.
8. Actualizar `app/components/Nav.tsx` (barra y panel móvil, `isAbout = pathname.startsWith("/acerca-de")`) y `app/components/Footer.tsx`. Prueba manual: "Acerca de" aparece tras "Salón de la Fama", queda activo en `/acerca-de` y el enlace del footer navega.
9. Revisar contra `references/templates/home-about/arcade-vault-standalone.html` en móvil (≤ 640 px) y escritorio, y ajustar `app/globals.css` en lo que difiera. Medir el desborde horizontal a 320, 360, 390, 430 y 640 px. Ejecutar `npm run lint` y `npm run build`.

---

## Acceptance criteria

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/acerca-de` muestra el hero "ACERCA DE ARCADE VAULT", los 3 highlights, el divisor y la sección "CONTÁCTANOS" con 3 `tip`.
- [ ] `/acerca-de` tiene un único `<h1>` y el divisor y los iconos pixel tienen `aria-hidden="true"`.
- [ ] La nav muestra "Acerca de" tras "Salón de la Fama" en la barra y en el panel móvil, y está activo solo en `/acerca-de`.
- [ ] El Footer contiene un enlace "ACERCA DE" que lleva a `/acerca-de`.
- [ ] Enviar el formulario con algún campo vacío no hace ninguna petición y hace vibrar el formulario.
- [ ] Un correo sin formato válido se rechaza en el cliente y en el servidor (`400`).
- [ ] `POST /api/contact` con nombre, correo o mensaje que superan `CONTACT_LIMITS` responde `400`.
- [ ] `POST /api/contact` con el campo `website` relleno responde `200` y no llama a Resend.
- [ ] Con `RESEND_API_KEY` válida, enviar el formulario entrega un correo a `edissoncode@gmail.com` con asunto `[ARCADE VAULT] Mensaje de {nombre}` y `Reply-To` igual al correo del remitente.
- [ ] Tras un envío correcto se ve la terminal con "MENSAJE RECIBIDO… GRACIAS, {NOMBRE EN MAYÚSCULAS}." y "ENVIAR OTRO MENSAJE" restablece el formulario vacío.
- [ ] Sin `RESEND_API_KEY`, la ruta responde `502` y el formulario muestra un error sin vaciar los campos.
- [ ] Mientras se envía, el botón está deshabilitado y no admite un segundo envío.
- [ ] `RESEND_API_KEY` no aparece en el HTML, en los bundles del cliente ni en ninguna variable `NEXT_PUBLIC_*`.
- [ ] `.env.example` está versionado y `.env.local` no aparece en `git status`.
- [ ] Las secciones `.reveal` reciben la clase `in` al hacer scroll; con `prefers-reduced-motion: reduce` están visibles sin animar.
- [ ] Entre 320 y 640 px, `/acerca-de` no produce scroll horizontal (`scrollWidth === innerWidth`).
- [ ] `/`, `/juegos`, `/salon` y `/acceso` se ven igual que antes de esta spec, salvo el nuevo enlace de la nav y del footer.

---

## Decisions

- **Sí:** Route Handler `POST /api/contact`. Decisión del usuario; deja un endpoint reutilizable y desacopla el envío de la UI.
- **No:** Server Action. Es lo más idiomático en App Router, pero el usuario eligió explícitamente la API route.
- **Sí:** `/acerca-de`, en español como `/salon` y `/juegos`, con enlace en Nav y Footer.
- **No:** `/about`. Rompe la convención en español de las demás rutas.
- **Sí:** Resend con su SDK oficial (`resend`). Decisión del usuario.
- **Sí:** destinatario `edissoncode@gmail.com` en `CONTACT_TO_EMAIL`. Decisión del usuario; va en `.env.local` y no en código ni en el archivo versionado.
- **Sí:** la clave de Resend la aporta el usuario después. La spec solo prepara `.env.example` y `.env.local` con la variable vacía.
- **Sí:** remitente `onboarding@resend.dev` por defecto y configurable con `CONTACT_FROM_EMAIL`. Funciona sin dominio verificado y se cambia sin tocar código.
- **No:** exigir un dominio verificado ahora. El usuario no mencionó ninguno.
- **Sí:** validación en el servidor más honeypot. Decisión del usuario; protege la cuota de Resend sin dependencias nuevas.
- **No:** rate limit o CAPTCHA. En serverless exigen un servicio externo; si el spam aparece, va en otra spec.
- **Sí:** el honeypot responde `200` sin enviar. Un bot no recibe señal de que fue detectado.
- **Sí:** `Reply-To` con el correo del remitente. Permite responder desde el buzón sin copiar la dirección.
- **No:** autorrespuesta al remitente. No se pidió y duplicaría el consumo de envíos.
- **Sí:** correo en texto plano. Es suficiente para un buzón interno y evita añadir React Email.
- **Sí:** mismo copy, mismas clases y misma terminal de éxito que la plantilla. Decisión del usuario: seguir el template exactamente.
- **Sí:** mantener la vibración (`shake`) para campos vacíos, como en el prototipo, pero con el error del servidor mostrado aparte.
- **Sí:** reutilizar `RevealOnScroll` de la SPEC 02 en lugar de duplicar el `IntersectionObserver`.
- **Sí:** reutilizar el CSS de la plantilla portándolo a `app/globals.css`, como en las SPEC 01 y 02.

---

## Risks

| Riesgo                                                                                                   | Mitigación                                                                                                                                |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| El remitente sandbox `onboarding@resend.dev` solo entrega al correo dueño de la cuenta de Resend.         | Si `edissoncode@gmail.com` no es el correo de la cuenta, Resend rechaza el envío y el formulario muestra el error. Solución: verificar un dominio y fijar `CONTACT_FROM_EMAIL`. |
| `.env*` está ignorado en `.gitignore` y `.env.example` no se versionaría.                                  | El paso 1 añade `!.env.example` y comprueba con `git status`.                                                                             |
| La clave de Resend se filtra al cliente o al repositorio.                                                 | Solo se lee en `route.ts`, sin prefijo `NEXT_PUBLIC_`; `.env.local` está ignorado; el criterio exige comprobarlo.                          |
| El usuario no ha asignado `RESEND_API_KEY` al terminar la implementación.                                  | La ruta responde `502` con mensaje claro y el formulario lo muestra. La prueba de entrega real queda pendiente hasta que exista la clave. |
| Bots rellenan el formulario y gastan la cuota de Resend.                                                   | Honeypot y límites de longitud. El rate limit queda fuera de alcance y se anota para otra spec.                                           |
| `POST` en una ruta con `cacheComponents` activo se comporta distinto a lo esperado.                        | El paso 3 lo comprueba con `next dev` y `next build`; los Route Handlers `POST` no se cachean.                                            |
| Clases portadas colisionan con las existentes (`field`, `shake`, `dot`, `line`, `prompt`).                | El paso 4 comprueba nombres antes de portar y no sobrescribe; verifica que las pantallas anteriores no cambian.                            |
| Inyección de cabeceras o contenido por el nombre o el mensaje.                                             | El SDK recibe `subject` y `text` como campos, no como cabeceras en bruto; el nombre se recorta y no admite saltos de línea.                |

---

## What is **not** in this spec

- Autorrespuesta al remitente.
- Rate limit o CAPTCHA.
- Base de datos o panel de mensajes.
- Verificación de dominio propio en Resend.
- Correo en HTML o React Email.
- Autenticación o sesión.
- Internacionalización.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
