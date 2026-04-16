# Project

## What This Is

Caluno is an offline-first shared scheduling product for shift workers, families, partners, and small groups who need to coordinate irregular schedules without constant manual reconciliation.

## Core Value

Turn chaotic schedules into shared clarity automatically.

## Current State

The repository has moved beyond scaffold-only status for the web proof surface. Milestone M001 is active, and S01, S02, S03, and S04 are now recorded complete. The SvelteKit web app has a trusted Supabase SSR auth boundary, group creation/join onboarding, membership-derived calendar access, an explicit access-denied route for unauthorized calendar ids, concrete multi-shift scheduling flows, browser-local offline continuity seams, and now a deterministic sync/replay layer for reconnect plus shared-update refreshes. Shared calendars can preserve pending local mutations across trusted refreshes, drain queued create/edit/move/delete work back through the existing trusted route actions, and react to Supabase Realtime signals by invalidating the trusted route and replaying pending local work on top of refreshed server data.

The main remaining M001 work is S05: baseline conflict visibility and milestone assembly proof. One important caveat remains from S04 closeout: preview-backed Playwright proof for the offline/realtime browser flows is still fragile around browser-local repository bootstrap and realtime readiness, so S05 should treat that as hardening debt rather than assume the preview proof is fully green.

## Architecture / Key Patterns

- Monorepo with pnpm workspaces and Turborepo
- Web app in `apps/web` using SvelteKit with `adapter-node`
- Mobile shell in `apps/mobile` using SvelteKit + Capacitor
- Shared packages in `packages/`
- M001 is a web-first proof surface
- Backend direction: Supabase for auth, Postgres, RLS, and realtime, with a thin SvelteKit server layer for privileged/composed operations only
- Client direction: local-first data flow with server-canonical reconciliation after reconnect
- Offline storage direction for M001 web: browser SQLite/WASM behind repository boundaries
- Current auth/access pattern: request-scoped Supabase SSR client, `safeGetSession()` revalidation with `getUser()`, and minimal trusted auth state passed through SvelteKit locals/layout data
- Current access pattern: protected route scope is loaded once in `(app)/+layout.server.ts`, and calendar routes resolve only from the trusted permitted inventory so guessed ids fail closed
- Current schema authority: `supabase/migrations` and `supabase/seed.sql`; `packages/db` remains compile-safe but non-authoritative for schema ownership
- Current schedule model: concrete `public.shifts` rows are the authoritative editable occurrences, with optional bounded provenance in `public.shift_series`
- Current schedule route pattern: `/calendars/[calendarId]` loads one validated visible week at a time and re-derives calendar/shift authority on every schedule mutation
- Current offline continuity pattern: only previously synced permitted calendars may reopen from cached browser scope; unsynced, malformed, or unauthorized ids still fail closed offline
- Current browser-local continuity substrate: sanitized app-shell snapshot cache, browser-local week snapshots, persistent local mutation queue, and a local-first controller that surfaces online/offline, queue, and failure state in the board UI
- Current sync/reconnect pattern: trusted week refreshes are replayed through a deterministic rebase helper before replacing the visible board, and reconnect drain reuses the existing named route actions instead of introducing a second write API
- Current realtime pattern: Supabase Realtime is change detection only; shared events trigger trusted refresh plus local replay rather than direct board mutation
- Current sqlite-wasm runtime pattern: exclude `@sqlite.org/sqlite-wasm` from Vite optimizeDeps and use the package-supported wrapped worker bootstrap for browser repository startup
- Current diagnostics pattern: schedule action states, visible-week metadata, cached/offline/local queue state, sync phase, last sync error, realtime channel state, remote refresh state, deterministic seeded ids, and centralized Playwright flow diagnostics capture phase/calendar/week context plus browser/runtime failures without leaking secrets

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [ ] M001: Shared scheduling substrate
  - [x] S01: Auth, groups, and secure shared-calendar access
  - [x] S02: Multi-shift calendar model and browser editing flows
  - [x] S03: Offline local persistence with cached-session continuity
  - [x] S04: Sync engine and realtime shared updates
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
- Browser-local week snapshots and queued local mutations exist behind repository/controller seams for reconnect and replay work.
- Trusted week refreshes no longer blindly overwrite same-scope pending local work; they rebase queued mutations back onto the refreshed server snapshot.
- Reconnect drain sends queued create/edit/move/delete work through the existing trusted calendar route actions and surfaces queue counts, sync phase, last attempt, and last error in the route and board diagnostics.
- Shared shift Realtime subscriptions exist as change-detection-only signals that trigger trusted refresh plus replay instead of direct client-authoritative state mutation.
- The calendar UI surfaces local-first state, queue counts, sync diagnostics, realtime diagnostics, board source, and failure reasons so downstream conflict and milestone-assembly work can build on explicit observability instead of hidden state.
- S05 should still harden the preview-backed offline/realtime browser proof, because S04 closeout recorded remaining instability around browser-local repository bootstrap and realtime readiness under preview-mode Playwright.
