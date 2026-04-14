# Caluno

**Slim monorepo starter for web and mobile**

## Current State

Monorepo foundation is in place and intentionally lightweight. Caluno now contains minimal starter apps for web and mobile plus placeholder shared packages, without carrying over CUTTIME feature code.

## Architecture

- **Monorepo**: pnpm workspaces + Turborepo
- **Mobile App**: minimal SvelteKit + Capacitor starter
- **Web App**: minimal SvelteKit starter
- **Shared Packages**: `@repo/ui`, `@repo/db`, `@repo/typescript-config`, `@repo/eslint-config`

## Key Components

- `apps/mobile`: browser-first mobile shell with Capacitor configuration for later native setup
- `apps/web`: web starter for admin UI and server routes
- `packages/ui`: lightweight shared UI package placeholder
- `packages/db`: lightweight shared DB package placeholder

## Intent

- Keep Caluno ready for GSD planning and incremental implementation
- Use `/Users/serkanyeniay/dev/references` only as external reference material, not as app source code
- Add real features only as they are intentionally implemented in Caluno