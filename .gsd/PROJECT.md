# Project

## What This Is

Caluno is an offline-first shared scheduling product for shift workers, families, partners, and small groups who need to coordinate irregular schedules without constant manual reconciliation.

## Core Value

Turn chaotic schedules into shared clarity automatically.

## Current State

The repository has moved beyond scaffold-only status for the web proof surface. Milestone M001 is active, and S01, S02, and S03 are now recorded complete. The SvelteKit web app has a trusted Supabase SSR auth boundary, group creation/join onboarding, membership-derived calendar access, and an explicit access-denied route for unauthorized calendar ids. The calendar surface now includes concrete multi-shift scheduling plus browser-local offline continuity seams: service-worker-backed protected-shell reopen, sanitized cached app-shell/session continuity, browser-local schedule repository wiring, fail-closed offline protected-route fallback, and a local-first calendar controller with pending/local diagnostics. The remaining M001 work is still ahead: deterministic reconnect/sync plus live shared propagation (S04), then baseline conflict visibility and milestone assembly proof (S05).

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
- Current offline continuity pattern: only previously synced permitted calendars may reopen from cached browser scope; unsynced, malformed, or unauthorized ids still fail closed offline
- Current browser-local continuity substrate: sanitized app-shell snapshot cache, browser-local week snapshots, persistent local mutation queue, and a local-first controller that surfaces online/offline, queue, and failure state in the board UI
- Current sqlite-wasm runtime pattern: exclude `@sqlite.org/sqlite-wasm` from Vite optimizeDeps and use the package-supported wrapped worker bootstrap for browser repository startup
- Current diagnostics pattern: schedule action states, visible-week metadata, cached/offline/local queue state, deterministic seeded ids, and centralized Playwright flow diagnostics capture phase/calendar/week context plus browser/runtime failures without leaking secrets

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [ ] M001: Shared scheduling substrate
  - [x] S01: Auth, groups, and secure shared-calendar access
  - [x] S02: Multi-shift calendar model and browser editing flows
  - [x] S03: Offline local persistence with cached-session continuity
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
- Protected calendar routes expose a real custom week board backed by trusted week-scoped schedule data.
- Shared calendar members can create, edit, move, and delete multiple same-day shifts, including bounded recurring patterns, through server-mediated browser flows.
- Previously trusted app-shell scope can be cached locally and used to reopen protected shell/calendar routes offline without minting new authority for guessed ids.
- Browser-local week snapshots and queued local mutations exist behind repository/controller seams for later reconnect and sync work.
- The calendar UI surfaces local-first state, queue counts, cached/offline mode, and failure reasons so downstream sync/reconciliation work can build on explicit diagnostics instead of hidden state.
- Preview-backed service-worker/runtime proof exists, while S04 should still harden the end-to-end reconciliation/browser proof path around the new local-first substrate as sync is added.
