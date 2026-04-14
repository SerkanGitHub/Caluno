---
estimated_steps: 5
estimated_files: 5
skills_used: []
---

# T02: Add page-scoped schedule loading and trusted server actions on the calendar route

**Slice:** S02 — Multi-shift calendar model and browser editing flows
**Milestone:** M001

## Description

Build the trusted schedule server layer on top of S01 instead of widening the parent app shell. This task advances **R003** while supporting **R001**, **R002**, and **R012** by making `/calendars/[calendarId]` load one bounded visible week at a time and expose create/edit/move/delete actions that validate every id and timestamp server-side.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Parent `(app)` layout data | Fail closed back into the existing denied route contract rather than querying calendars ad hoc. | Reuse the last trustworthy route state only after a full reload; do not guess permissions. | Treat malformed parent scope as unauthorized and refuse to load or mutate schedule data. |
| Supabase schedule queries/writes | Return typed action errors and leave the current board state unchanged rather than partially mutating rows. | Surface a retryable timeout state in the route action result and avoid duplicate writes. | Reject the result, report a named failure reason, and keep the user on the current visible week. |

## Load Profile

- **Shared resources**: protected route loads, `public.shift_series` / `public.shifts`, and the existing app-shell membership/calendar scope.
- **Per-operation cost**: one bounded 7-day schedule query per page load plus a single create/edit/move/delete transaction per action.
- **10x breakpoint**: wide or unvalidated date ranges would fan out queries and rendered rows first, so the loader must clamp to a single visible week driven by a validated `?start=` query param.

## Negative Tests

- **Malformed inputs**: invalid `calendarId`, invalid `?start=` date, blank shift title, `end_at <= start_at`, unknown recurrence bound, and malformed `shiftId` in action payloads.
- **Error paths**: unauthorized calendar access, cross-calendar update/delete attempts, and Supabase write failures.
- **Boundary conditions**: empty visible week, same-day multi-shift week, move across day boundaries, and editing one occurrence without widening scope.

## Steps

1. Add `apps/web/src/lib/server/schedule.ts` with typed helpers for visible-week parsing, bounded schedule reads, and create/edit/move/delete operations that validate the requested calendar against trusted parent scope before writing.
2. Extend `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` so a permitted calendar route returns `calendarView` data for one visible week, including grouped shifts and typed action/result state, while preserving the denied branch unchanged.
3. Keep browser writes server-mediated: accept only form fields for the visible calendar route, derive the actual calendar/group authority on the server, and reject cross-calendar or out-of-scope `shiftId` mutations.
4. Expand `apps/web/tests/routes/protected-routes.unit.test.ts` with schedule-loader denial/validation coverage and add `apps/web/tests/schedule/server-actions.unit.test.ts` for action normalization and failure-path behavior.
5. Make the route deterministic for later e2e proof by supporting a validated week-start query such as `?start=2026-04-20`.

## Must-Haves

- [ ] Schedule data loads only for the requested permitted calendar and one validated visible week.
- [ ] Create, edit, move, and delete all run through trusted server actions; no client-authoritative tenant/group ids are accepted.
- [ ] Denied-route behavior from S01 stays intact for malformed or unauthorized calendar ids.
- [ ] Loader/action tests cover both happy-path shaping and fail-closed behavior.

## Verification

- `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/server-actions.unit.test.ts`
- Confirm the protected calendar route can shape a deterministic visible week without loading schedule data for any out-of-scope calendar.

## Observability Impact

- Signals added/changed: named create/edit/move/delete action results and visible-week metadata become part of the calendar route state.
- How a future agent inspects this: run `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/server-actions.unit.test.ts` and inspect returned page/action data for the protected route.
- Failure state exposed: malformed week params, unauthorized `shiftId` writes, and Supabase write errors stay visible as typed route/action failures instead of silent no-ops.

## Inputs

- `apps/web/src/routes/(app)/+layout.server.ts` — trusted parent scope for memberships and visible calendars.
- `apps/web/src/lib/server/app-shell.ts` — current calendar route resolution and denied-state contract.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` — placeholder protected calendar loader to extend.
- `apps/web/src/lib/access/contract.ts` — shared access helpers to keep fail-closed behavior aligned.
- `supabase/migrations/20260415_000002_schedule_shifts.sql` — new schedule schema and SQL helper surface from T01.
- `apps/web/src/lib/schedule/types.ts` — typed schedule payloads from T01.
- `apps/web/tests/routes/protected-routes.unit.test.ts` — existing denial-route contract coverage to extend.

## Expected Output

- `apps/web/src/lib/server/schedule.ts` — trusted schedule range/query/write helpers.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` — visible-week loader plus create/edit/move/delete actions.
- `apps/web/src/lib/access/contract.ts` — extended pure helpers only if the schedule route needs additional contract logic.
- `apps/web/tests/routes/protected-routes.unit.test.ts` — expanded route denial and week-parameter coverage.
- `apps/web/tests/schedule/server-actions.unit.test.ts` — unit tests for schedule action normalization and failure handling.
