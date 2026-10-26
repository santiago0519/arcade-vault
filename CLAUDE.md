# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: an online platform to play games and compete for the highest score. The README (in Spanish) says the project follows spec-driven development (`/spec` and `/spec-impl` workflows, using skills from `Klerith/fernando-skills`, installed via `npx skills@latest add Klerith/fernando-skills`). No `spec/` directory or app logic exists yet; `app/` is still the Create Next App scaffold.

## Commands

- `npm run dev` — dev server (Turbopack)
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)

No test runner is configured.

## Next.js version caveat

This uses Next.js 16.4.3 with React 19.3, which differs from older Next.js conventions. Per `AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`) before writing Next.js code, and heed deprecation notices. This project uses the App Router (`app/`).

## Architecture notes

- `next.config.ts` enables `cacheComponents: true`, `partialPrefetching: true` and `experimental.agentFeedback`. `cacheComponents` changes data-fetching/caching semantics, so check the docs before adding dynamic data access.
- Tailwind CSS v4 is wired through a custom Turbopack rule (`@tailwindcss/turbopack` loader for `*.css`) rather than PostCSS. Styles are in `app/globals.css` (`@import "tailwindcss"` plus `@theme inline` tokens for light/dark colors and Geist fonts).
- `app/layout.tsx` uses the globally-typed `LayoutProps<"/">` helper (no import) and loads Geist fonts via `next/font/google`.
