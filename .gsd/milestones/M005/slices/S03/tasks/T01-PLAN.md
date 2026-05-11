---
estimated_steps: 40
estimated_files: 6
skills_used: []
---

# T01: Add a bounded recurrence-suggestion route contract and truthful weekly fixture baseline

---
estimated_steps: 7
estimated_files: 6
skills_used:
  - test
  - verify-before-complete
---

## Why

The create dialog cannot truthfully surface a recurrence hint until the protected route loads one from bounded same-calendar history, and the browser suite needs seeded weekly evidence that actually satisfies the shared helper contract.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Supabase `shifts` history query | Return `null` suggestion and keep the visible-week schedule renderable. | Return `null` suggestion and avoid blocking the route. | Return `null` suggestion, skip logging, and keep the board on one-off defaults. |

## Load Profile

- **Shared resources**: one extra same-calendar `shifts` read during protected calendar page load.
- **Per-operation cost**: one bounded trailing-30-day query plus pure in-memory pattern detection.
- **10x breakpoint**: oversized or unbounded history scans; keep the query fixed to the trailing window ending at `visibleWeek.endAt`.

## Negative Tests

- **Malformed inputs**: invalid week params still fall back to the bounded visible week while the suggestion remains nullable.
- **Error paths**: history query timeout/error/malformed rows produce `null` suggestion without widening access.
- **Boundary conditions**: under-threshold history, cross-calendar rows, and out-of-window rows do not produce a suggestion.

## Steps

1. Add a server helper near `loadCalendarScheduleView()` that queries same-calendar shifts in the trailing 30-day window ending at `visibleWeek.endAt` and runs `detectRecurrencePattern` on the result.
2. Thread the nullable suggestion through `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` without changing denied-route behavior.
3. Emit a minimal positive-path `console.info` payload when a suggestion is computed, keeping it to ids/counts and visible-week context.
4. Expand protected-route unit coverage to assert bounded query filters, positive/negative suggestion payloads, and fail-closed null behavior.
5. Replace the current daily Alpha recurrence seed with a qualifying weekly pattern and align recurrence seed-contract assertions plus E2E fixture constants with the updated ids, dates, and labels.

## Must-Haves

- [ ] The suggestion query stays scoped to the current `calendarId` and the trailing 30-day window ending at the visible week boundary.
- [ ] Loader failures for the suggestion path never block the schedule board or denied-route contract.
- [ ] Seeded Alpha data contains at least three same-weekday same-time shifts inside the helper window so browser proof can trigger the chip deterministically.

## Verification

- `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/recurrence.unit.test.ts`
- Inspect the updated route tests to confirm they assert bounded query capture plus nullable fallback behavior.

## Observability Impact

- Signals added/changed: server `console.info` when a recurrence suggestion is computed.
- How a future agent inspects this: rerun the protected-route tests or watch server output while opening the seeded week.
- Failure state exposed: missing/failed suggestion resolves to `null` without corrupting schedule load.

## Done when

- Route load exposes a nullable recurrence suggestion only for qualifying same-calendar history, bounded-query assertions pass, and the Alpha seed/fixture contract now represents a truthful weekly pattern for downstream browser proof.

## Inputs

- `packages/caluno-core/src/schedule/recurrence.ts`
- `apps/web/src/lib/server/schedule.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
- `apps/web/tests/routes/protected-routes.unit.test.ts`
- `apps/web/tests/schedule/recurrence.unit.test.ts`
- `supabase/seed.sql`
- `apps/web/tests/e2e/fixtures.ts`

## Expected Output

- `apps/web/src/lib/server/schedule.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
- `apps/web/tests/routes/protected-routes.unit.test.ts`
- `apps/web/tests/schedule/recurrence.unit.test.ts`
- `supabase/seed.sql`
- `apps/web/tests/e2e/fixtures.ts`

## Verification

pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/recurrence.unit.test.ts

## Observability Impact

Adds a positive-path server log plus unit-test-covered loader diagnostics for when recurrence detection is computed or intentionally suppressed.
