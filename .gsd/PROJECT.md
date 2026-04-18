# Project

## What This Is

Caluno is an offline-first shared scheduling product for shift workers, families, partners, and small groups who need to coordinate irregular schedules without constant manual reconciliation.

## Core Value

Turn chaotic schedules into shared clarity automatically.

## Current State

M001 is complete.

M002 is in progress, and S01 is now complete.

The shared scheduling substrate remains validated end to end on the web proof surface:
- trusted sign-in, group onboarding, permitted calendar access, and fail-closed denied routes work
- shared calendars support multi-shift create/edit/move/delete with bounded recurrence
- previously synced calendars reopen offline with cached-session continuity and local-first edits that survive reload
- reconnect drains queued writes back through trusted server actions deterministically
- collaborator updates propagate live through browser-session-aware realtime refresh
- board/day/shift conflict warnings remain visible across online, offline, reconnect, and collaborator-refresh flows

M002/S01 adds the first truthful shared free-time route on top of that substrate:
- shifts now carry calendar-scoped member assignments so free/busy answers are attributed to named permitted members rather than guessed from calendar scope alone
- the server can load an authorized calendar roster plus member-attributed busy intervals for a bounded 30-day range without widening `profiles` access
- `/calendars/[calendarId]/find-time` now validates calendar scope, duration, and range before querying and returns explicit `ready`, `no-results`, `invalid-input`, `query-failure`, `timeout`, `malformed-response`, `denied`, and `offline-unavailable` states
- the calendar board now exposes a real find-time entrypoint, and the route renders browseable exact-duration windows plus the wider continuous span that remains free for the same member set
- warmed protected `/find-time` documents can boot offline, but the browser load still fails closed with `offline-unavailable` instead of replaying cached authority or stale match results

Strongest current verification evidence:
- `pnpm --dir apps/web check`
- `pnpm --dir apps/web exec vitest run tests/find-time/member-availability.unit.test.ts tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/access/policy-contract.unit.test.ts tests/schedule/server-actions.unit.test.ts`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts`
- `pnpm --dir apps/web exec playwright test tests/e2e/auth-groups-access.spec.ts`
- `pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts`

The next slices can now optimize suggestion quality and create-flow handoff on top of a route that already proves truthful member-scoped availability and fail-closed offline/authorization behavior.

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
- Availability attribution pattern: member-scoped find-time reads come from `shift_assignments` plus a security-definer calendar roster function, and new schedule writes default to creator assignment with rollback on attribution failure
- Find-time matcher pattern: bounded 30-day availability search lives in the SvelteKit server layer and returns exact requested-duration slots plus the containing continuous availability span for the same member set
- Offline continuity pattern: only previously synced permitted calendars reopen offline from cached trusted scope and browser-local snapshots
- Sync/reconnect pattern: trusted refreshes are rebased through the sync engine before replacing visible board state, and reconnect drains reuse existing named route actions
- Realtime pattern: Supabase Realtime is change detection only; shared events trigger trusted refresh plus replay rather than direct client-authoritative mutation
- Conflict-visibility pattern: derive overlap warnings from the visible effective week only and keep them separate from local/sync/realtime transport diagnostics
- Browser-proof pattern: when multiple preview-backed specs mutate shared seeded fixtures, derive assertions from current visible state or reset between files
- Protected find-time offline rule: cache warmed protected documents if needed for route boot, but keep `/find-time` results server-only and fail closed offline

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

Active requirements now in focus for M002:
- R002 — explicit user-facing role-assignment proof remains active even though membership-derived sharing and permitted access are implemented
- R008 — shared free-time matching is now partially delivered through truthful browseable windows, but ranking/explanation quality and suggestion handoff remain for S02/S03

## Milestone Sequence

- [x] M001: Shared scheduling substrate
  - [x] S01: Auth, groups, and secure shared-calendar access
  - [x] S02: Multi-shift calendar model and browser editing flows
  - [x] S03: Offline local persistence with cached-session continuity
  - [x] S04: Sync engine and realtime shared updates
  - [x] S05: Baseline conflict detection and milestone assembly proof
  - [x] S06: Offline/realtime validation hardening and assessment closure
- [ ] M002: Shared free-time matching — Compute and explain group availability windows on top of the scheduling substrate.
  - [x] S01: Truthful availability search route
  - [ ] S02: Ranked suggestions and explanation quality
  - [ ] S03: Suggestion-to-create handoff
- [ ] M003: Cross-platform continuity and reminders — Extend the substrate cleanly across mobile and add continuity features such as reminders and change notifications.
- [ ] M004: Predictive assistance and release hardening — Add predictive scheduling help, refine the UX, and harden the product for a more complete launch.

## What Downstream Work Can Assume Now

- Authenticated browser requests resolve trusted user state through the SvelteKit/Supabase SSR boundary.
- Local Supabase fixtures exist for profiles, groups, memberships, calendars, join codes, bounded recurring series, and concrete shift rows.
- Protected shared-calendar routes support trusted sign-in, join/create-group flows, permitted access, and explicit denial for out-of-scope calendars.
- Shared calendar members can create, edit, move, and delete multiple same-day and recurring shifts through trusted route actions.
- Newly created shifts default to creator assignment, and find-time data can treat those assignments as truthful member-attributed busy intervals.
- A trusted server helper can load an authorized calendar roster plus member-attributed busy intervals for a bounded 30-day range without widening profile visibility.
- `/calendars/[calendarId]/find-time` exists as a protected route with typed ready/no-results/error/denied/offline-unavailable states.
- The find-time route currently returns browseable valid windows with named available members, exact requested-duration slots, and containing continuous availability spans.
- Offline boot for warmed `/find-time` navigations is allowed only so the route can render an explicit fail-closed `offline-unavailable` state; cached match results are not authoritative.
- Previously trusted app-shell scope can be cached locally and used to reopen protected shell/calendar routes offline without minting new authority.
- Browser-local week snapshots and queued local mutations exist behind repository/controller seams and survive reload while offline.
- Reconnect drain sends queued create/edit/move/delete work through the existing trusted calendar route actions and returns the board to `0 pending / 0 retryable` when successful.
- Shared shift realtime subscriptions rely on browser-session hydration plus trusted refresh/replay, and collaborator refresh proof is green in the combined clean-reset run.
- Conflict warnings remain visible at board/day/shift level across online, offline, reconnect, and collaborator refresh flows.
- S02 can focus on ranking and explanation quality rather than inventing member attribution or permission scope, and S03 can build prefill handoff on top of the exact slot/span contract already exposed by S01.
