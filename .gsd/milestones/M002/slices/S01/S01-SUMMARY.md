---
id: S01
parent: M002
milestone: M002
provides:
  - A trusted 30-day find-time server contract for permitted calendars.
  - Named roster summaries and member-attributed busy intervals without widening cross-group visibility.
  - Browseable exact-slot and continuous-span availability windows ready for ranking/explanation work in S02.
  - A real calendar-board entrypoint and exact candidate timestamps ready for create-flow prefill in S03.
  - Fail-closed denied and offline behavior that downstream slices must preserve.
requires:
  - slice: M001/S01
    provides: Trusted app-shell memberships/calendars and fail-closed protected route authorization patterns.
  - slice: M001/S02
    provides: Concrete shift persistence and trusted schedule action patterns used for member assignment defaults.
  - slice: M001/S03
    provides: Protected offline continuity shell plus browser-local route boot behavior that `/find-time` now intentionally constrains.
affects:
  - S02
  - S03
key_files:
  - supabase/migrations/20260418_000001_find_time_member_availability.sql
  - supabase/seed.sql
  - apps/web/src/lib/server/find-time.ts
  - apps/web/src/lib/find-time/matcher.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.server.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
  - apps/web/src/service-worker.ts
  - apps/web/tests/find-time/member-availability.unit.test.ts
  - apps/web/tests/find-time/matcher.unit.test.ts
  - apps/web/tests/routes/find-time-routes.unit.test.ts
  - apps/web/tests/e2e/find-time.spec.ts
key_decisions:
  - D035 — Treat creator assignment as part of the trusted schedule-create contract and roll back shift creates if assignment writes fail.
  - D036 — Return each find-time candidate as both the exact requested-duration slot and the containing continuous free span.
  - D037 — Cache warmed protected `/find-time` documents for offline boot, but keep the route fail-closed with `offline-unavailable` instead of replaying cached results.
patterns_established:
  - Member-scoped availability should be modeled with shift-to-member assignments plus a safe roster read rather than widening profile visibility.
  - Protected find-time matching belongs in the SvelteKit server layer, where calendar scope, duration bounds, and typed failure reasons can be enforced before data leaves the server.
  - For protected offline browser proof, warmed route documents may be cached to let the shell boot, but the page load must still re-check online status and fail closed rather than treating cached HTML as matching authority.
observability_surfaces:
  - Typed `status` / `reason` / `message` values from `loadFindTimeSearchView()` for ready, no-results, invalid-input, denied, query-failure, timeout, and malformed-response outcomes.
  - UI route/search/scope cards with stable `data-testid` hooks: `find-time-route-state`, `find-time-search-state`, `find-time-scope-state`, `find-time-offline-state`, and `find-time-denied-state`.
  - Result-card data attributes for exact slot/span/member payload inspection in browser proof.
  - Deterministic unit and e2e coverage in `apps/web/tests/find-time/*.unit.test.ts`, `apps/web/tests/routes/find-time-routes.unit.test.ts`, and `apps/web/tests/e2e/find-time.spec.ts`.
drill_down_paths:
  - .gsd/milestones/M002/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M002/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M002/slices/S01/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-18T17:07:32.928Z
blocker_discovered: false
---

# S01: Truthful availability search route

**Delivered a protected `/calendars/[calendarId]/find-time` route that computes truthful 30-day availability windows from named member assignments, keeps calendar/roster access fail-closed, and exposes explicit denied/invalid/offline states.**

## What Happened

## Delivered Scope
S01 turned the M001 shared-calendar substrate into the first real shared free-time surface. The slice added calendar-scoped member attribution for shifts via `shift_assignments`, a security-definer roster read path for permitted calendars, a bounded 30-day matcher that derives valid windows from member-attributed busy intervals, and a protected `/calendars/[calendarId]/find-time` route that returns typed `ready`, `no-results`, `invalid-input`, `query-failure`, `timeout`, `malformed-response`, `denied`, and browser `offline-unavailable` states.

## What Actually Shipped
T01 made the schedule data truthful for find-time by introducing member assignment rows, seeding Alpha/Beta fixtures with named assignments, defaulting new schedule writes to creator assignment, and rolling shift creates back if assignment writes fail so partially attributed shifts cannot leak into availability answers. T02 built the matcher and route contract so the server validates duration and range before any query, enforces the 30-day bound, resolves access from trusted calendar scope, and shapes browseable windows as exact requested-duration slots plus the containing continuous free span. T03 shipped the route UI and calendar entrypoint so a permitted member can move from the calendar board into `/find-time`, browse named available members, and see explicit denied, invalid, query-failure, timeout, malformed-response, empty, and offline-unavailable surfaces instead of guessed or silent failures.

## Verification Summary
All slice-level verification passed. `pnpm --dir apps/web exec vitest run tests/find-time/member-availability.unit.test.ts tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/access/policy-contract.unit.test.ts tests/schedule/server-actions.unit.test.ts` passed with 46/46 tests green. `pnpm --dir apps/web check` passed with 0 errors and 0 warnings. `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts` passed all three browser scenarios: permitted browse flow, explicit unauthorized denial on another group’s calendar, and fail-closed offline entry on a warmed `/find-time` route.

## Observability & Diagnostics
The slice’s diagnostic contract is live and distinguishable. The server/search layer preserves typed `status`, `reason`, and `message` values for invalid input, denied scope, query failure, timeout, malformed response, no-results, and ready paths. The UI exposes those states through dedicated route/search cards and stable `data-testid`/data attributes on route state, search state, scope state, and result cards. Browser proof confirms those surfaces stay visible in the real app, and the e2e fixture helpers can read exact slot/span/member payloads from result card attributes for future slice verification.

## Operational Readiness
Health signal: a permitted member can load `/calendars/[calendarId]/find-time`, see `trusted-online` plus `ready`, and browse truthful windows with named available members. Failure signals: `denied`, `invalid-input`, `query-failure`, `timeout`, `malformed-response`, `no-results`, and `offline-unavailable` are all explicit and separately test-covered. Recovery procedure: restore network connectivity for offline-unavailable, correct malformed duration/start inputs for invalid-input, or rerun the trusted route/query once upstream Supabase availability recovers for query/timeout failures; the route intentionally withholds results until a trusted server read succeeds. Monitoring gaps: there is still no ranked suggestion scoring telemetry or adjacent-busy explanation surface yet; those belong to S02.

## Dependency Contract For Downstream Slices
S02 can now assume member-attributed busy data exists, roster reads are scoped to permitted calendars, and the server already returns browseable exact slot plus containing free-span contracts for up to 30 days. S03 can assume the calendar board has a real find-time entrypoint and that each candidate already exposes exact `startAt`/`endAt` values suitable for future create-flow prefill. Downstream work does not need to invent new authorization scope or offline authority: `/find-time` already fails closed offline and on guessed/out-of-scope calendar ids.

## Limitations / Remaining Work
This slice deliberately stops at truthful browseable windows. It does not yet rank the best options ahead of the full list, explain adjacent exclusions in detail, or hand a selected slot into the existing create flow. Those remain the purpose of S02 and S03 rather than gaps in the trusted route contract delivered here.

## Verification

Passed all planned slice checks:
- `pnpm --dir apps/web exec vitest run tests/find-time/member-availability.unit.test.ts tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/access/policy-contract.unit.test.ts tests/schedule/server-actions.unit.test.ts` → 46 tests passed.
- `pnpm --dir apps/web check` → 0 errors, 0 warnings.
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts` → 3/3 browser scenarios passed (permitted browse flow, unauthorized denial, offline fail-closed).

Observability surfaces were also confirmed during verification: typed `status`/`reason`/`message` route states remained distinguishable in unit coverage and in the browser via `find-time-route-state`, `find-time-search-state`, `find-time-scope-state`, and result-card data attributes.

## Requirements Advanced

- R002 — Re-verified that protected calendar authorization and roster scope remain fail-closed for `/find-time`, so only permitted members can read shared schedule-derived availability.
- R008 — Delivered the first truthful shared free-time browse route with named available members and 30-day valid-window generation, while leaving ranking and richer explanations for follow-on slices.
- R012 — Confirmed guessed calendar ids, out-of-scope access, malformed inputs, and offline entry all fail closed without exposing cross-group roster or schedule data.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

Offline browser proof used a forced `navigator.onLine = false` override on the next navigation instead of Playwright context-offline mode, because full context-offline turns the next `/find-time` navigation into a browser network error before the route’s browser `+page.ts` fail-closed logic can execute.

## Known Limitations

Results are browseable but not yet ranked, nearby-busy explanations are still limited, and there is no suggestion-to-create prefill handoff yet. `/find-time` remains intentionally server-only when offline and does not replay cached match results.

## Follow-ups

S02 should rank the best windows first and add clearer explanation quality around why nearby times do not work. S03 should let a chosen window hand off into the existing create flow using the exact slot contract already exposed here.

## Files Created/Modified

- `supabase/migrations/20260418_000001_find_time_member_availability.sql` — Added member assignment storage, scoped policies, and the safe calendar roster SQL function.
- `supabase/seed.sql` — Seeded named Alpha/Beta member assignments and deterministic find-time fixtures.
- `apps/web/src/lib/server/find-time.ts` — Implemented trusted roster/busy loading, range validation, and typed find-time search view composition.
- `apps/web/src/lib/find-time/matcher.ts` — Implemented bounded duration/range normalization and truthful valid-window generation.
- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.server.ts` — Added the protected find-time server load contract.
- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.ts` — Added browser-side offline fail-closed classification for the route.
- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte` — Shipped the browseable find-time UI with explicit state surfaces and inspectable result cards.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — Added the calendar-board entrypoint into the new find-time route.
- `apps/web/src/service-worker.ts` — Cached warmed protected `/find-time` navigations so offline boot can render the fail-closed client state.
- `apps/web/tests/find-time/member-availability.unit.test.ts` — Covered roster scoping, busy interval shaping, and fail-closed malformed/denied cases.
- `apps/web/tests/find-time/matcher.unit.test.ts` — Covered duration bounds, 30-day range behavior, and availability window shaping.
- `apps/web/tests/routes/find-time-routes.unit.test.ts` — Covered protected route outcomes including denied, invalid-input, timeout, no-results, and ready.
- `apps/web/tests/e2e/find-time.spec.ts` — Proved permitted browse flow, explicit unauthorized denial, and offline fail-closed behavior in the browser.
