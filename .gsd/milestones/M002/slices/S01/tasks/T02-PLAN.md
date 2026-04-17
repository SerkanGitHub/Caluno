---
estimated_steps: 5
estimated_files: 5
skills_used:
  - debug-like-expert
---

# T02: Build the 30-day availability matcher and protected server route contract

**Slice:** S01 — Truthful availability search route
**Milestone:** M002

## Description

Once member attribution is truthful, prove the core product logic in server code before adding Svelte UI complexity. This task should produce a deterministic matcher plus a protected route load contract for `/calendars/[calendarId]/find-time`. Keep the matcher pure and bounded so failures can be understood from tests and typed route states.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Trusted roster + busy loader from `find-time.ts` | Return a typed query failure and keep the route from inventing availability. | Surface a timeout reason; do not silently fall back to empty results. | Reject malformed rows and fail closed before matcher execution. |
| Matcher range/duration normalization | Reject invalid duration or horizon inputs before any DB read. | N/A | Reject values outside supported bounds rather than coercing them silently. |

## Load Profile

- **Shared resources**: one roster read, one bounded busy-interval read, in-memory matcher over a 30-day horizon.
- **Per-operation cost**: linear in roster size plus busy interval count inside the bounded window.
- **10x breakpoint**: interval expansion and candidate-window generation will fail first if the matcher scans the full horizon inefficiently or repeats per-member work unnecessarily.

## Negative Tests

- **Malformed inputs**: missing duration, non-numeric duration, duration below minimum, duration above maximum, malformed range anchor.
- **Error paths**: denied calendar access, roster lookup timeout, busy-interval query timeout, malformed assignment rows, empty-result search.
- **Boundary conditions**: exactly one valid window, no valid windows, overlapping member busy intervals, and horizon edges at day 0/day 30.

## Steps

1. Add `apps/web/src/lib/find-time/matcher.ts` with bounded duration/range normalization and pure valid-window generation from member-attributed busy intervals.
2. Extend `apps/web/src/lib/server/find-time.ts` so the route can compose the trusted roster/busy loader with the matcher and shape typed success/failure payloads.
3. Implement `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.server.ts` as a sibling protected route that mirrors current calendar authorization behavior and emits ready/no-results/error states.
4. Add `apps/web/tests/find-time/matcher.unit.test.ts` for deterministic matching behavior and `apps/web/tests/routes/find-time-routes.unit.test.ts` for denied, invalid-input, timeout, and ready-path route coverage.
5. Reuse `apps/web/tests/find-time/member-availability.unit.test.ts` as a contract anchor so the matcher never drifts from the trusted data shape introduced in T01.

## Must-Haves

- [ ] Duration and horizon inputs are bounded and typed before data loading.
- [ ] Valid windows are derived from named member availability instead of calendar-level gaps.
- [ ] Out-of-scope and malformed calendar ids are denied before any roster/busy query runs.
- [ ] No-results, timeout, query-failure, and malformed-response branches stay explicit in the server payload.

## Verification

- `pnpm --dir apps/web exec vitest run tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/find-time/member-availability.unit.test.ts`
- `rg -n "find-time|duration|no-results|timeout" apps/web/src/routes/'(app)'/calendars/'[calendarId]'/find-time/+page.server.ts apps/web/src/lib/find-time/matcher.ts`

## Observability Impact

- Signals added/changed: typed `find-time` route reasons for invalid duration, denied scope, query failures, and empty results.
- How a future agent inspects this: run matcher and route-contract tests or inspect the returned `reason` / `message` payloads in server load results.
- Failure state exposed: matcher misses, query timeouts, and malformed roster/busy rows are distinguishable.

## Inputs

- `apps/web/src/lib/server/find-time.ts` — trusted roster + busy-interval loader from T01.
- `apps/web/src/lib/server/app-shell.ts` — protected calendar scope helpers and denied-state conventions.
- `apps/web/src/lib/server/schedule.ts` — existing protected calendar route style and typed load patterns.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` — sibling protected route pattern to mirror.
- `apps/web/tests/routes/protected-routes.unit.test.ts` — authorization and denied-state test style.

## Expected Output

- `apps/web/src/lib/find-time/matcher.ts` — bounded 30-day availability matcher.
- `apps/web/src/lib/server/find-time.ts` — route-facing composition helpers for roster, busy intervals, and matcher output.
- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.server.ts` — protected server load for `/find-time`.
- `apps/web/tests/find-time/matcher.unit.test.ts` — deterministic matcher coverage.
- `apps/web/tests/routes/find-time-routes.unit.test.ts` — protected route contract coverage.
