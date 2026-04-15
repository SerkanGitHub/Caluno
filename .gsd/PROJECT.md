# Project

## What This Is

Caluno is an offline-first shared scheduling product for shift workers, families, partners, and small groups who need to coordinate irregular schedules without constant manual reconciliation.

## Core Value

Turn chaotic schedules into shared clarity automatically.

## Current State

The repository has moved beyond scaffold-only status for the web proof surface. Milestone M001 is active, and S01 plus S02 are now complete. The SvelteKit web app has a trusted Supabase SSR auth boundary, group creation/join onboarding, membership-derived calendar access, an explicit access-denied route for unauthorized calendar ids, and now a real protected scheduling surface for shared calendars: bounded recurrence persisted through `shift_series` + concrete `shifts` rows, week-scoped schedule loading, server-mediated create/edit/move/delete actions, a custom multi-shift week board, deterministic local Supabase fixtures, and repeatable unit/E2E proof for same-day multi-shift rendering, recurring creation, edit/move/delete flows, reload continuity, and denied-calendar behavior. The remaining M001 work is still ahead: offline local persistence and cached-session continuity (S03), sync/realtime shared propagation (S04), and baseline conflict visibility plus final assembly proof (S05).

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
- Current schema authority: `supabase/migrations` and `supabase/seed.sql`; `packages/db` remains compile-safe but non-authoritative for schema ownership
- Current schedule model: concrete `public.shifts` rows are the authoritative editable occurrences, with optional bounded provenance in `public.shift_series`
- Current schedule route pattern: `/calendars/[calendarId]` loads one validated visible week at a time and re-derives calendar/shift authority on every schedule mutation
- Current browser schedule UX: custom Svelte week board with explicit create/edit/move/delete flows and bounded recurring creation instead of drag-and-drop or a heavy stock calendar dependency
- Current diagnostics pattern: schedule action states, visible-week metadata, deterministic seeded ids, and centralized Playwright flow diagnostics capture phase/calendar/week context plus browser/runtime failures without leaking secrets

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [ ] M001: Shared scheduling substrate
  - [x] S01: Auth, groups, and secure shared-calendar access
  - [x] S02: Multi-shift calendar model and browser editing flows
  - [ ] S03: Offline local persistence with cached-session continuity
  - [ ] S04: Sync engine and realtime shared updates
  - [ ] S05: Baseline conflict detection and milestone assembly proof
- [ ] M002: Shared free-time matching — Compute and explain group availability windows on top of the scheduling substrate.
- [ ] M003: Cross-platform continuity and reminders — Extend the substrate cleanly across mobile and add continuity features such as reminders and change notifications.
- [ ] M004: Predictive assistance and release hardening — Add predictive scheduling help, refine the UX, and harden the product for a more complete launch.

## What Downstream Work Can Assume Now

- Authenticated browser requests can resolve trusted user state through the SvelteKit/Supabase SSR boundary.
- Local Supabase fixtures exist for profiles, groups, memberships, calendars, join codes, bounded recurring series, and concrete shift rows.
- The web app has protected sign-in, sign-out, create-group, join-group, and permitted-calendar flows.
- Unauthorized calendar URLs still produce an explicit denied surface instead of silent empty data.
- Protected calendar routes now expose a real custom week board backed by trusted week-scoped schedule data.
- Shared calendar members can create, edit, move, and delete multiple same-day shifts, including bounded recurring patterns, through server-mediated browser flows.
- Schedule writes return typed action states and keep visible-week metadata available for UI/tests.
- Browser verification exists for allowed multi-shift editing flows, reload continuity, and denied access, and later slices can build on the deterministic seeded schedule week and retained diagnostics.
