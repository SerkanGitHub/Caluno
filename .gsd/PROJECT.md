# Project

## What This Is

Caluno is an offline-first shared scheduling product for shift workers, families, partners, and small groups who need to coordinate irregular schedules without constant manual reconciliation.

## Core Value

Turn chaotic schedules into shared clarity automatically.

## Current State

M001 and M002 are complete.

The shared scheduling substrate remains validated end to end on the web proof surface:
- trusted sign-in, group onboarding, permitted calendar access, and fail-closed denied routes work
- shared calendars support multi-shift create/edit/move/delete with bounded recurrence
- previously synced calendars reopen offline with cached-session continuity and local-first edits that survive reload
- reconnect drains queued writes back through trusted server actions deterministically
- collaborator updates propagate live through browser-session-aware realtime refresh
- board/day/shift conflict warnings remain visible across online, offline, reconnect, and collaborator-refresh flows

M002 now completes the first full shared free-time planning flow on top of that substrate:
- shifts carry calendar-scoped member assignments so free/busy answers stay attributed to named permitted members rather than guessed from calendar scope alone
- the server can load an authorized calendar roster plus member-attributed busy intervals for a bounded 30-day range without widening `profiles` access
- `/calendars/[calendarId]/find-time` validates calendar scope, duration, and range before querying and returns explicit `ready`, `no-results`, `invalid-input`, `query-failure`, `timeout`, `malformed-response`, `denied`, and `offline-unavailable` states
- truthful candidates are ranked before truncation, and the ready payload separates `topPicks` from `browseWindows` while preserving a compatibility `windows` array
- the route renders a distinct Top picks surface with richer free/blocked/nearby-edge explanations and a lighter browse inventory for scanning the remaining truthful windows
- warmed protected `/find-time` documents can boot offline, but the browser load still fails closed with `offline-unavailable` instead of replaying cached authority or stale match results
- a member can now choose a Top-pick or browse suggestion and land in the existing calendar create flow with the exact slot prefilled, the correct visible week derived from the chosen slot, and a visible `From Find time` cue
- the suggestion handoff is one-shot: the destination URL keeps only `start=` week context after arrival, and reloads or later create/edit/move/delete submissions do not reopen stale handoff state

Strongest current verification evidence:
- `pnpm --dir apps/web exec vitest run tests/find-time/member-availability.unit.test.ts tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts`
- `pnpm --dir apps/web exec vitest run tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts`
- `pnpm --dir apps/web check`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts tests/e2e/calendar-shifts.spec.ts`
- `pnpm --dir apps/web exec playwright test tests/e2e/auth-groups-access.spec.ts`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts`

The next milestone focus is M003: extending the trusted substrate across mobile/continuity surfaces and adding reminder/notification-oriented continuity features without regressing the proven scheduling and free-time web flows.

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
- Find-time matching pattern: bounded 30-day availability search lives in the SvelteKit server layer and returns exact requested-duration slots plus the containing continuous availability span for the same member set
- Find-time recommendation pattern: rank truthful candidates before truncation using shared-member count, span slack, nearby-edge pressure, and earlier-start tie-breaks; expose `topPicks` as the richer explanation surface and `browseWindows` as the lighter truthful inventory
- Suggestion-to-create handoff pattern: represent transient route-to-route prefills as a timing-only query contract, validate them inside the trusted destination route, and consume them in both client and server paths so they are observable on arrival but not sticky afterward
- Offline continuity pattern: only previously synced permitted calendars reopen offline from cached trusted scope and browser-local snapshots
- Sync/reconnect pattern: trusted refreshes are rebased through the sync engine before replacing visible board state, and reconnect drains reuse existing named route actions
- Realtime pattern: Supabase Realtime is change detection only; shared events trigger trusted refresh plus replay rather than direct client-authoritative mutation
- Conflict-visibility pattern: derive overlap warnings from the visible effective week only and keep them separate from local/sync/realtime transport diagnostics
- Browser-proof pattern: when multiple preview-backed specs mutate shared seeded fixtures, derive assertions from current visible state or reset between files; for mutable seeded `/find-time` flows, assert stable handoff surfaces such as CTA hrefs, slot timestamps, visible week targeting, and URL cleanup
- Protected find-time offline rule: cache warmed protected documents if needed for route boot, but keep `/find-time` results server-only and fail closed offline

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and validation mapping.

Current validated requirements:
- R001 — cached-session offline continuity for previously synced calendars
- R003 — multi-shift and recurring browser scheduling CRUD
- R004 — offline local read/edit continuity
- R005 — deterministic reconnect sync and live collaborator refresh
- R006 — visible baseline conflict warnings
- R007 — calm, clear browser scheduling UX
- R008 — shared free-time matching now computes truthful ranked windows, explains why suggested windows work, and hands chosen suggestions into the real create flow with exact timing preserved
- R012 — fail-closed auth/RLS/sharing boundaries

Active requirements now in focus:
- R002 — explicit user-facing role-assignment proof remains active even though membership-derived sharing, permitted calendar access, and suggestion-driven creation are implemented

## Milestone Sequence

- [x] M001: Shared scheduling substrate
  - [x] S01: Auth, groups, and secure shared-calendar access
  - [x] S02: Multi-shift calendar model and browser editing flows
  - [x] S03: Offline local persistence with cached-session continuity
  - [x] S04: Sync engine and realtime shared updates
  - [x] S05: Baseline conflict detection and milestone assembly proof
  - [x] S06: Offline/realtime validation hardening and assessment closure
- [x] M002: Shared free-time matching — Compute and explain group availability windows on top of the scheduling substrate.
  - [x] S01: Truthful availability search route
  - [x] S02: Ranked suggestions and explanation quality
  - [x] S03: Suggestion-to-create handoff
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
- The find-time route returns ranked truthful windows with a dedicated `topPicks` shortlist, a `browseWindows` inventory, exact requested-duration slots, containing continuous availability spans, blocked-member summaries, and nearby busy-edge explanations.
- The Top picks UI is the high-density explanation surface, while browse cards stay compact and scan-friendly with stable DOM hooks for proof.
- Suggestion CTAs on both Top picks and browse cards generate the same strict timing-only handoff contract and expose only source, target week, start, and end as inspection surfaces.
- The existing calendar create dialog can now open from a valid `/find-time` suggestion with exact datetime-local start/end values prefilled and a visible `From Find time` cue.
- The calendar destination route consumes suggestion-prefill params once, preserves only the slot-derived `start=` week context, and does not re-open the same handoff after reload or later writes.
- Offline boot for warmed `/find-time` navigations is allowed only so the route can render an explicit fail-closed `offline-unavailable` state; cached match results are not authoritative.
- Previously trusted app-shell scope can be cached locally and used to reopen protected shell/calendar routes offline without minting new authority.
- Browser-local week snapshots and queued local mutations exist behind repository/controller seams and survive reload while offline.
- Reconnect drain sends queued create/edit/move/delete work through the existing trusted calendar route actions and returns the board to `0 pending / 0 retryable` when successful.
- Shared shift realtime subscriptions rely on browser-session hydration plus trusted refresh/replay, and collaborator refresh proof is green in the combined clean-reset run.
- Conflict warnings remain visible at board/day/shift level across online, offline, reconnect, and collaborator refresh flows.
- M002 is fully complete, validated at milestone closeout, and available as a stable dependency for M003 work rather than an open implementation thread.
