---
id: T02
parent: S01
milestone: M002
key_files:
  - apps/web/src/lib/find-time/matcher.ts
  - apps/web/src/lib/server/find-time.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.server.ts
  - apps/web/tests/find-time/matcher.unit.test.ts
  - apps/web/tests/routes/find-time-routes.unit.test.ts
key_decisions:
  - D036: represent each find-time candidate as an exact requested-duration slot plus the containing continuous availability span so the browse contract stays truthful now and prefillable later.
duration: 
verification_result: mixed
completed_at: 2026-04-17T23:05:26.489Z
blocker_discovered: false
---

# T02: Added the 30-day availability matcher and protected `/find-time` server route contract with typed ready/no-results/error states.

**Added the 30-day availability matcher and protected `/find-time` server route contract with typed ready/no-results/error states.**

## What Happened

Added `apps/web/src/lib/find-time/matcher.ts` as the bounded pure matcher layer for M002/S01: it now normalizes required duration input, validates the optional 30-day `start` anchor, and turns member-attributed busy intervals into deterministic valid windows with both exact requested-duration slot bounds and the containing continuous free span. I extended `apps/web/src/lib/server/find-time.ts` with `loadFindTimeSearchView()`, which validates duration/range before any Supabase read, reuses the trusted roster/busy loader from T01, preserves typed `invalid-input`, `denied`, `query-failure`, `timeout`, and `malformed-response` branches, and adds an explicit `no-results` branch when the matcher finds nothing truthful. I then added `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.server.ts` as a sibling protected route contract that mirrors the existing calendar authorization behavior: malformed or out-of-scope calendar ids are denied from app-shell scope before the find-time loader runs, while permitted calendars receive a typed search payload. To lock the contract down, I created `apps/web/tests/find-time/matcher.unit.test.ts` for duration bounds, malformed anchor rejection, merged-span generation, overlap handling, and day-30 edge behavior, plus `apps/web/tests/routes/find-time-routes.unit.test.ts` for denied scope, invalid duration, malformed anchor, timeout, no-results, and ready-path route coverage. During verification, `pnpm --dir apps/web check` surfaced one implicit-`any` callback in the new route test; I fixed that and reran the check to green. Diagnostics for future agents are the typed `findTimeView.search.status`, `reason`, and `message` payloads returned by the route, together with the new matcher and route unit tests.

## Verification

Verified the T02 contract with the planned task-level Vitest suite, the task-plan `rg` inspection, and a full app type-check. I also ran the broader slice-level verification set: the expanded Vitest suite passed with the new matcher and route coverage included, while the slice-level `supabase db reset --local --yes && playwright test tests/e2e/find-time.spec.ts` command still fails at this intermediate task because the T03 browser spec does not exist yet. That missing E2E artifact is expected and is recorded explicitly rather than treated as a blocker.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web exec vitest run tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/find-time/member-availability.unit.test.ts` | 0 | ✅ pass | 416ms |
| 2 | `rg -n "find-time|duration|no-results|timeout" apps/web/src/routes/'(app)'/calendars/'[calendarId]'/find-time/+page.server.ts apps/web/src/lib/find-time/matcher.ts` | 0 | ✅ pass | 24ms |
| 3 | `pnpm --dir apps/web check` | 0 | ✅ pass | 3100ms |
| 4 | `pnpm --dir apps/web exec vitest run tests/find-time/member-availability.unit.test.ts tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/access/policy-contract.unit.test.ts tests/schedule/server-actions.unit.test.ts` | 0 | ✅ pass | 488ms |
| 5 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts` | 1 | ❌ fail | 28900ms |

## Deviations

None.

## Known Issues

`apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.ts`, `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte`, and `apps/web/tests/e2e/find-time.spec.ts` are still T03 work, so the slice-level `supabase db reset && playwright test tests/e2e/find-time.spec.ts` command still ends with `No tests found` even though the server contract and unit/integration coverage for T02 are complete.

## Files Created/Modified

- `apps/web/src/lib/find-time/matcher.ts`
- `apps/web/src/lib/server/find-time.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.server.ts`
- `apps/web/tests/find-time/matcher.unit.test.ts`
- `apps/web/tests/routes/find-time-routes.unit.test.ts`
