---
id: S01
parent: M001
milestone: M001
provides:
  - A trusted authenticated app shell with typed session, membership, and permitted-calendar data for all downstream browser work.
  - Deterministic local Supabase schema/seed fixtures for auth, groups, memberships, calendars, and join codes.
  - A repeatable browser-proof harness that verifies both allowed and denied access paths before later slices add editing, offline, and sync complexity.
requires:
  []
affects:
  - S02
  - S03
  - S04
  - S05
key_files:
  - apps/web/src/hooks.server.ts
  - apps/web/src/lib/supabase/server.ts
  - apps/web/src/routes/+layout.server.ts
  - apps/web/src/routes/(app)/+layout.server.ts
  - apps/web/src/routes/(app)/groups/+page.server.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts
  - supabase/migrations/20260414_000001_auth_groups_access.sql
  - supabase/seed.sql
  - apps/web/tests/auth/session.unit.test.ts
  - apps/web/tests/access/policy-contract.unit.test.ts
  - apps/web/tests/e2e/auth-groups-access.spec.ts
  - packages/db/src/tenant.ts
key_decisions:
  - D006: keep `supabase/migrations` and `supabase/seed.sql` as the authoritative schema/RLS source for S01 while `packages/db` remains compile-safe only.
  - D007: derive permitted calendars from trusted `(app)` layout scope and make out-of-scope `/calendars/[calendarId]` requests fail closed with an explicit denied surface.
  - D008: treat cookie-backed Supabase sessions as untrusted until `getUser()` revalidates them and expose only minimal trusted auth state downstream.
  - Use typed join/create/auth reason codes instead of blank states or raw provider/database errors so failures stay visible without leaking secrets.
patterns_established:
  - Request-scoped Supabase SSR client + `safeGetSession()` is the standard auth boundary for server work in the web app.
  - Protected route data should be loaded once in `(app)` layout and reused downstream instead of re-querying authorization ad hoc per page.
  - Supabase SQL migrations/RLS are the temporary source of truth for auth/group/calendar access until a later slice explicitly takes shared DB package ownership.
  - Browser proof for secure access should run against a reset local Supabase seed with explicit denial assertions and retained trace diagnostics.
observability_surfaces:
  - `apps/web/tests/auth/session.unit.test.ts` verifies anonymous, authenticated, and invalid-session handling for the trusted auth boundary.
  - `apps/web/tests/access/policy-contract.unit.test.ts` locks guessed-calendar denial, multi-group boundaries, and SQL source-of-truth markers.
  - `apps/web/tests/e2e/auth-groups-access.spec.ts` captures flow-phase diagnostics and retains trace/video/screenshot artifacts on failure.
  - UI/server states expose high-level reasons such as join-code errors and denied-route phases without logging raw tokens or cookies.
drill_down_paths:
  - .gsd/milestones/M001/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T03-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T04-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-14T22:12:50.380Z
blocker_discovered: false
---

# S01: Auth, groups, and secure shared-calendar access

**Established the web app’s trusted auth, group-membership, and calendar-access boundary so users can sign in, create or join a group, and open only calendars permitted by authenticated membership.**

## What Happened

S01 turned the starter web app into the first real Caluno product surface. The slice introduced a request-scoped Supabase SSR auth boundary in SvelteKit, typed trusted auth data on `event.locals` and root layout data, and a fail-closed `safeGetSession()` flow that revalidates cookie-backed sessions with `getUser()` before protected routes trust them. In parallel, the slice made `supabase/migrations` and `supabase/seed.sql` the temporary schema authority for S01, defining profiles, groups, memberships, calendars, join codes, helper RPCs, and row-level policies that derive calendar access from authenticated membership instead of client-supplied IDs. On top of that contract, the web app now ships a session-aware entrypoint, sign-in/callback/logout handlers, a protected app shell, group creation and join onboarding, permitted calendar listing, and an explicit access-denied surface for unauthorized or guessed calendar URLs. The route model intentionally loads memberships and permitted calendars once in `(app)/+layout.server.ts` and resolves `/calendars/[calendarId]` only from that trusted parent scope, so out-of-scope ids fail closed with visible reason and phase data instead of silent empty states. The slice also hardened the local proof loop with deterministic seed data, join-code reason codes, compile-safe `packages/db` helpers, route/unit coverage, and a Playwright harness that proves both the permitted-calendar path and the denied path against a reset local Supabase runtime. Downstream slices now inherit a working authenticated shell, stable local fixtures, and a concrete authorization contract instead of needing to rediscover auth and access rules.

## Verification

All slice-level verification checks passed. `pnpm --dir apps/web check` completed with 0 errors / 0 warnings. `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/access/policy-contract.unit.test.ts` passed 22/22 tests covering trusted-session handling and access-policy contracts. `pnpm exec tsc --pretty false --noEmit packages/db/src/tenant.ts` passed, confirming the shared DB helper surface stays compile-safe without pretending to own schema authority. `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/auth-groups-access.spec.ts` passed both browser scenarios, proving sign-in, valid and invalid join-code handling, permitted calendar access, explicit denial for an unauthorized existing calendar URL, reload continuity for the active session, and redirect-to-sign-in after logout. Observability/diagnostic surfaces were also confirmed: route and RPC failures surface as typed reason codes and failure phases in the UI, unit tests lock the auth and policy contract, and the Playwright harness retains trace-friendly diagnostics for auth, onboarding, and access-control failures.

## Requirements Advanced

- R001 — Established the trusted SSR sign-in/session boundary and active-session reload behavior that downstream offline continuity will extend in S03.
- R002 — Implemented groups, memberships, join onboarding, permitted calendar listing, and membership-derived access scope in the web app and Supabase SQL.
- R012 — Proved row-level, membership-derived access control with explicit denied handling for unauthorized calendar URLs and no client-authoritative tenant ids.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

Verification used `pnpm --dir apps/web exec ...` instead of the plan’s `pnpm -C apps/web ...` form because this workspace resolves direct app-local CLIs correctly through `--dir`. No slice replan was required.

## Known Limitations

S01 establishes the secure authenticated entrypoint and access boundary only; it does not yet deliver multi-shift editing, browser-local offline persistence, realtime sync, or conflict visibility. Join onboarding is seeded/local-proof oriented and role assignment is modeled in SQL but not yet exposed as a richer management UI. The local dev loop still emits Supabase’s advisory `getSession()` warning even though the server contract revalidates with `getUser()` before trusting the session.

## Follow-ups

S02 should build shift editing strictly on top of the trusted `(app)` layout scope and preserve the fail-closed denied-route contract. S03 should extend the typed session contract into the cached-session/offline continuity story without weakening server revalidation. Future slices should decide whether the Supabase advisory warning can be suppressed or replaced with a cleaner auth-resolution path in development logs.

## Files Created/Modified

- `apps/web/src/hooks.server.ts` — Installs the request-scoped Supabase SSR client and typed auth locals for every request.
- `apps/web/src/lib/supabase/server.ts` — Defines the fail-closed trusted session contract via `safeGetSession()`.
- `apps/web/src/routes/(app)/+layout.server.ts` — Loads memberships, groups, and permitted calendars once for the protected app shell.
- `apps/web/src/routes/(app)/groups/+page.server.ts` — Implements create-group and join-group server actions with typed outcomes.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` — Resolves calendars only from trusted permitted scope and returns explicit denied states.
- `supabase/migrations/20260414_000001_auth_groups_access.sql` — Creates the S01 auth/group/calendar schema, helper functions, and RLS contract.
- `supabase/seed.sql` — Seeds deterministic local users, groups, memberships, calendars, and join-code fixtures for proof.
- `apps/web/tests/e2e/auth-groups-access.spec.ts` — Proves sign-in, join onboarding, permitted access, denied access, reload, and logout in the browser.
