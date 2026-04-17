---
estimated_steps: 6
estimated_files: 7
skills_used:
  - debug-like-expert
---

# T01: Add member-attributed busy scope and a safe calendar roster contract

**Slice:** S01 — Truthful availability search route
**Milestone:** M002

## Description

Retire the main architectural blocker before any matcher or UI work. The existing schedule model can answer “what busy blocks exist on this calendar?” but not “who is free?”. Add member attribution for busy intervals and a safe roster lookup that stays inside existing calendar authorization boundaries. Keep this task focused on truthful data access: do not build the route UI here.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Supabase migration + RLS policies | Fail closed and keep the new roster/assignment surfaces inaccessible rather than widening access. | Treat the task as incomplete; do not assume policy behavior without deterministic tests. | Reject the row shape in server helpers and return typed failure reasons instead of guessing member identity. |
| Existing schedule create flow in `schedule.ts` | Preserve the current shift write contract and add creator assignment as a narrow extension. | Surface a typed write failure and keep the create action from claiming success. | Refuse to build availability rows from partially written assignment data. |

## Load Profile

- **Shared resources**: Postgres tables, RLS policies, recurring shift insert path, seeded local Supabase data.
- **Per-operation cost**: one roster read plus one bounded shift/assignment read for future matcher work; recurring create now writes assignment rows for each concrete occurrence.
- **10x breakpoint**: assignment fan-out on recurring creates and range-bounded availability reads will fail first if the query shape is careless.

## Negative Tests

- **Malformed inputs**: invalid `calendarId`, invalid range bounds, empty or duplicate assignment rows.
- **Error paths**: denied calendar access, policy rejection, query timeout, malformed roster rows, assignment insert failure after shift insert.
- **Boundary conditions**: zero assignments, multi-member assignments on one shift, recurring shift fan-out, and out-of-group roster reads.

## Steps

1. Add `supabase/migrations/20260418_000001_find_time_member_availability.sql` with a shift-assignment table, appropriate foreign keys/cascades, calendar-safe policies, and a security-definer roster read for permitted calendars.
2. Update `supabase/seed.sql` so Alpha and Beta shifts are attributed to named members, giving deterministic member-level availability fixtures for route and browser proof.
3. Add `apps/web/src/lib/server/find-time.ts` server helpers that read roster summaries plus member-attributed busy intervals for a bounded range and shape typed failure results.
4. Extend `apps/web/src/lib/server/schedule.ts` so newly created single and recurring shifts default to creator assignment without changing the existing protected write contract.
5. Add coverage in `apps/web/tests/find-time/member-availability.unit.test.ts`, `apps/web/tests/access/policy-contract.unit.test.ts`, and `apps/web/tests/schedule/server-actions.unit.test.ts` for policy scope, roster reads, busy-interval shaping, and creator-assignment writes.

## Must-Haves

- [ ] Member roster reads stay calendar-scoped and do not require loosening `profiles` RLS.
- [ ] Busy intervals are attributable to named calendar members for a bounded search range.
- [ ] New single and recurring shift creates default to the acting member so post-slice data stays truthful.
- [ ] Policy and server-action tests prove denied, timeout, and malformed-response behavior stays explicit.

## Verification

- `pnpm --dir apps/web exec vitest run tests/find-time/member-availability.unit.test.ts tests/access/policy-contract.unit.test.ts tests/schedule/server-actions.unit.test.ts`
- `rg -n "shift_assignments|list_calendar_member" supabase/migrations/20260418_000001_find_time_member_availability.sql`

## Observability Impact

- Signals added/changed: typed roster/availability load reasons and assignment-aware create behavior.
- How a future agent inspects this: run the member-availability and policy/server-action tests.
- Failure state exposed: denied roster reads, malformed roster rows, missing assignments, and creator-write fan-out failures become explicit.

## Inputs

- `supabase/migrations/20260414_000001_auth_groups_access.sql` — existing group/calendar authorization functions and policies.
- `supabase/migrations/20260415_000002_schedule_shifts.sql` — current shift schema and write policy contract.
- `supabase/seed.sql` — deterministic seeded users, groups, calendars, and shifts.
- `apps/web/src/lib/server/schedule.ts` — current protected shift load/create helpers.
- `apps/web/tests/access/policy-contract.unit.test.ts` — current policy regression style.
- `apps/web/tests/schedule/server-actions.unit.test.ts` — current server-action verification surface.

## Expected Output

- `supabase/migrations/20260418_000001_find_time_member_availability.sql` — member-attribution storage plus safe roster read path.
- `supabase/seed.sql` — named member assignments for deterministic fixtures.
- `apps/web/src/lib/server/find-time.ts` — trusted roster + busy-interval loader.
- `apps/web/src/lib/server/schedule.ts` — creator-assignment writes for new shifts.
- `apps/web/tests/find-time/member-availability.unit.test.ts` — new truthfulness contract coverage.
- `apps/web/tests/access/policy-contract.unit.test.ts` — policy regressions for roster/assignment scope.
- `apps/web/tests/schedule/server-actions.unit.test.ts` — write-path coverage for creator assignment.
