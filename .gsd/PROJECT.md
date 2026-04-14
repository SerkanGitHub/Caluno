# Project

## What This Is

Caluno is an offline-first shared scheduling product for shift workers, families, partners, and small groups who need to coordinate irregular schedules without constant manual reconciliation.

## Core Value

Turn chaotic schedules into shared clarity automatically.

## Current State

The repository is still at scaffold stage. It contains starter web and mobile apps, placeholder shared packages, and user-provided product reference documents, but none of the core scheduling substrate has been implemented yet.

## Architecture / Key Patterns

- Monorepo with pnpm workspaces and Turborepo
- Web app in `apps/web` using SvelteKit with `adapter-node`
- Mobile shell in `apps/mobile` using SvelteKit + Capacitor
- Shared packages in `packages/`
- M001 is planned as a web-first proof surface
- Backend direction: Supabase plus a thin SvelteKit server layer
- Client direction: local-first data flow with server-canonical reconciliation after reconnect
- Offline storage direction for M001 web: browser SQLite/WASM behind repository boundaries

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [ ] M001: Shared scheduling substrate — Prove secure shared calendars, multi-shift scheduling, offline continuity, sync, realtime updates, and baseline conflict detection in the browser.
- [ ] M002: Shared free-time matching — Compute and explain group availability windows on top of the scheduling substrate.
- [ ] M003: Cross-platform continuity and reminders — Extend the substrate cleanly across mobile and add continuity features such as reminders and change notifications.
- [ ] M004: Predictive assistance and release hardening — Add predictive scheduling help, refine the UX, and harden the product for a more complete launch.
