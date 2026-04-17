# Project

## What This Is

Caluno is an offline-first shared scheduling product for shift workers, families, partners, and small groups who need to coordinate irregular schedules without constant manual reconciliation.

## Core Value

Turn chaotic schedules into shared clarity automatically.

## Current State

M001 is complete.

The shared scheduling substrate is now validated end to end on the web proof surface:
- trusted sign-in, group onboarding, permitted calendar access, and fail-closed denied routes work
- shared calendars support multi-shift create/edit/move/delete with bounded recurrence
- previously synced calendars reopen offline with cached-session continuity and local-first edits that survive reload
- reconnect drains queued writes back through trusted server actions deterministically
- collaborator updates propagate live through browser-session-aware realtime refresh
- board/day/shift conflict warnings remain visible across online, offline, reconnect, and collaborator-refresh flows

Strongest current verification evidence:
- `pnpm --dir apps/web check`
- `pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts tests/schedule/server-actions.unit.test.ts`
- `pnpm --dir apps/web exec playwright test tests/e2e/auth-groups-access.spec.ts`
- `pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts`

The next milestone can now build on a validated substrate instead of carrying milestone-close verification debt.

## Architecture / Key Patterns

- Monorepo with pnpm workspaces and Turborepo
- Web app in `apps/web` using SvelteKit with `adapter-node`
- Mobile shell in `apps/mobile` using SvelteKit + Capacitor
- Shared packages in `packages/`
- M001 is a web-first proof surface
- Backend direction: Supabase for auth, Postgres, RLS, and realtime, with a thin SvelteKit server layer for privileged/composed operations only
- Client direction: local-first data flow with server-canonical reconciliation after reconnect
- Offline storage direction for M001 web: browser SQLite/WASM behind repository boundaries
- Auth/access pattern: request-scoped Supabase SSR client, `safeGetSession()` revalidation with `getUser()`, and minimal trusted auth state passed through SvelteKit locals/layout data
- Protected-route pattern: `(app)` layout loads trusted shell scope once; calendar routes resolve only from permitted inventory so guessed ids fail closed
- Schedule model: concrete `public.shifts` rows are authoritative editable occurrences, with optional bounded provenance in `public.shift_series`
- Offline continuity pattern: only previously synced permitted calendars reopen offline from cached trusted scope and browser-local snapshots
- Sync/reconnect pattern: trusted refreshes are rebased through the sync engine before replacing visible board state, and reconnect drains reuse existing named route actions
- Realtime pattern: Supabase Realtime is change detection only; shared events trigger trusted refresh plus replay rather than direct client-authoritative mutation
- Conflict-visibility pattern: derive overlap warnings from the visible effective week only and keep them separate from local/sync/realtime transport diagnostics
- Browser-proof pattern: when multiple preview-backed specs mutate shared seeded fixtures, derive assertions from current visible state or reset between files

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and validation mapping.

Current validated M001 requirements:
- R001 — cached-session offline continuity for previously synced calendars
- R003 — multi-shift and recurring browser scheduling CRUD
- R004 — offline local read/edit continuity
- R005 — deterministic reconnect sync and live collaborator refresh
- R006 — visible baseline conflict warnings
- R007 — calm, clear browser scheduling UX
- R012 — fail-closed auth/RLS/sharing boundaries

Still active from the substrate milestone:
- R002 — explicit user-facing role-assignment proof remains active even though membership-derived sharing and permitted access are implemented

## Milestone Sequence

- [x] M001: Shared scheduling substrate
  - [x] S01: Auth, groups, and secure shared-calendar access
  - [x] S02: Multi-shift calendar model and browser editing flows
  - [x] S03: Offline local persistence with cached-session continuity
  - [x] S04: Sync engine and realtime shared updates
  - [x] S05: Baseline conflict detection and milestone assembly proof
  - [x] S06: Offline/realtime validation hardening and assessment closure
- [ ] M002: Shared free-time matching — Compute and explain group availability windows on top of the scheduling substrate.
- [ ] M003: Cross-platform continuity and reminders — Extend the substrate cleanly across mobile and add continuity features such as reminders and change notifications.
- [ ] M004: Predictive assistance and release hardening — Add predictive scheduling help, refine the UX, and harden the product for a more complete launch.

## What Downstream Work Can Assume Now

- Authenticated browser requests resolve trusted user state through the SvelteKit/Supabase SSR boundary.
- Local Supabase fixtures exist for profiles, groups, memberships, calendars, join codes, bounded recurring series, and concrete shift rows.
- Protected shared-calendar routes support trusted sign-in, join/create-group flows, permitted access, and explicit denial for out-of-scope calendars.
- Shared calendar members can create, edit, move, and delete multiple same-day and recurring shifts through trusted route actions.
- Previously trusted app-shell scope can be cached locally and used to reopen protected shell/calendar routes offline without minting new authority.
- Browser-local week snapshots and queued local mutations exist behind repository/controller seams and survive reload while offline.
- Reconnect drain sends queued create/edit/move/delete work through the existing trusted calendar route actions and returns the board to `0 pending / 0 retryable` when successful.
- Shared shift realtime subscriptions rely on browser-session hydration plus trusted refresh/replay, and collaborator refresh proof is green in the combined clean-reset run.
- Conflict warnings remain visible at board/day/shift level across online, offline, reconnect, and collaborator refresh flows.
- M002 can plan against a validated scheduling substrate instead of carrying M001 verification remediation forward.