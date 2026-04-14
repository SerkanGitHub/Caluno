# Project

## What This Is

Caluno is an offline-first shared scheduling product for shift workers, families, partners, and small groups who need to coordinate irregular schedules without constant manual reconciliation.

## Core Value

Turn chaotic schedules into shared clarity automatically.

## Current State

The repository has moved past scaffold-only status for the web proof surface. Milestone M001 is active, and Slice S01 is complete: the SvelteKit web app now has a trusted Supabase SSR auth boundary, group creation/join onboarding, membership-derived calendar access, an explicit access-denied route for unauthorized calendar ids, deterministic local Supabase seed data, and repeatable unit/E2E proof for the auth and secure-access flow. The remaining milestone work is still ahead: multi-shift editing (S02), offline local persistence (S03), sync/realtime propagation (S04), and baseline conflict visibility plus end-to-end assembly proof (S05).

## Architecture / Key Patterns

- Monorepo with pnpm workspaces and Turborepo
- Web app in `apps/web` using SvelteKit with `adapter-node`
- Mobile shell in `apps/mobile` using SvelteKit + Capacitor
- Shared packages in `packages/`
- M001 is a web-first proof surface
- Backend direction: Supabase for auth, Postgres, RLS, and later realtime, with a thin SvelteKit server layer for privileged/composed operations only
- Client direction: local-first data flow with server-canonical reconciliation after reconnect
- Offline storage direction for M001 web: browser SQLite/WASM behind repository boundaries
- Current auth/access pattern: request-scoped Supabase SSR client, `safeGetSession()` revalidation with `getUser()`, and minimal trusted auth state passed through SvelteKit locals/layout data
- Current access pattern: protected route scope is loaded once in `(app)/+layout.server.ts`, and calendar routes resolve only from the trusted permitted inventory so guessed ids fail closed
- Current schema authority for S01: `supabase/migrations` and `supabase/seed.sql`; `packages/db` remains compile-safe but non-authoritative for schema ownership

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [ ] M001: Shared scheduling substrate
  - [x] S01: Auth, groups, and secure shared-calendar access
  - [ ] S02: Multi-shift calendar model and browser editing flows
  - [ ] S03: Offline local persistence with cached-session continuity
  - [ ] S04: Sync engine and realtime shared updates
  - [ ] S05: Baseline conflict detection and milestone assembly proof
- [ ] M002: Shared free-time matching — Compute and explain group availability windows on top of the scheduling substrate.
- [ ] M003: Cross-platform continuity and reminders — Extend the substrate cleanly across mobile and add continuity features such as reminders and change notifications.
- [ ] M004: Predictive assistance and release hardening — Add predictive scheduling help, refine the UX, and harden the product for a more complete launch.

## What Downstream Work Can Assume Now

- Authenticated browser requests can resolve trusted user state through the SvelteKit/Supabase SSR boundary.
- Local Supabase fixtures exist for profiles, groups, memberships, calendars, and join codes.
- The web app has protected sign-in, sign-out, create-group, join-group, and permitted-calendar flows.
- Unauthorized calendar URLs produce an explicit denied surface instead of silent empty data.
- Browser verification exists for both allowed and denied access paths and can be extended by later slices.