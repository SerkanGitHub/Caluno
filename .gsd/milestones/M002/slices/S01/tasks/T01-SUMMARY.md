---
id: T01
parent: S01
milestone: M002
key_files:
  - supabase/migrations/20260418_000001_find_time_member_availability.sql
  - supabase/seed.sql
  - apps/web/src/lib/server/find-time.ts
  - apps/web/src/lib/server/schedule.ts
  - apps/web/tests/find-time/member-availability.unit.test.ts
  - apps/web/tests/access/policy-contract.unit.test.ts
  - apps/web/tests/schedule/server-actions.unit.test.ts
  - .gsd/KNOWLEDGE.md
key_decisions:
  - D035: treat creator assignment as part of the trusted schedule-create contract and roll back shift creates if assignment writes fail.
duration: 
verification_result: mixed
completed_at: 2026-04-17T22:56:06.942Z
blocker_discovered: false
---

# T01: Added calendar-scoped shift assignments, a trusted roster/availability loader, and creator-assignment rollback for truthful find-time data.

**Added calendar-scoped shift assignments, a trusted roster/availability loader, and creator-assignment rollback for truthful find-time data.**

## What Happened

Added `supabase/migrations/20260418_000001_find_time_member_availability.sql` with the new `shift_assignments` table, scoped RLS, and the security-definer `list_calendar_members()` roster function so member names can be loaded for a permitted calendar without widening `profiles` RLS. Updated `supabase/seed.sql` to attribute deterministic Alpha and Beta shifts to named members, including a multi-member Alpha shift for truthful busy/future free-time fixtures. Added `apps/web/src/lib/server/find-time.ts` to validate bounded 30-day ranges, resolve trusted calendar scope, load roster summaries plus member-attributed busy intervals, and fail closed on denied, timeout, malformed-response, missing-assignment, duplicate-assignment, and unknown-member conditions. Extended `apps/web/src/lib/server/schedule.ts` so single and recurring creates bulk-insert default creator assignments and compensate with rollback when attribution writes fail after shift creation. Added/extended unit tests in `apps/web/tests/find-time/member-availability.unit.test.ts`, `apps/web/tests/access/policy-contract.unit.test.ts`, and `apps/web/tests/schedule/server-actions.unit.test.ts` to prove policy scope, roster reads, busy-interval shaping, creator-assignment writes, and rollback behavior. Recorded decision D035 for assignment-write rollback semantics and appended a Vitest missing-file verification gotcha to `.gsd/KNOWLEDGE.md`.

## Verification

Verified the T01 contract with the planned task-level Vitest suite, migration text inspection, app type-checking, and a real `supabase db reset --local --yes` that applied the new migration and seed data successfully. The broader slice-level browser proof command was also run and failed because `apps/web/tests/e2e/find-time.spec.ts` does not exist yet; that is expected until T03 and is noted explicitly rather than being treated as a blocker. I did not treat the broader slice-level Vitest command as proof of future T02/T03 tests because Vitest can ignore missing explicit file arguments in this workspace, which is now recorded in `.gsd/KNOWLEDGE.md`.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web exec vitest run tests/find-time/member-availability.unit.test.ts tests/access/policy-contract.unit.test.ts tests/schedule/server-actions.unit.test.ts` | 0 | ✅ pass | 1581ms |
| 2 | `rg -n "shift_assignments|list_calendar_member" supabase/migrations/20260418_000001_find_time_member_availability.sql` | 0 | ✅ pass | 15ms |
| 3 | `pnpm --dir apps/web check` | 0 | ✅ pass | 3390ms |
| 4 | `npx --yes supabase db reset --local --yes` | 0 | ✅ pass | 25466ms |
| 5 | `pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts` | 1 | ❌ fail | 3189ms |

## Deviations

None.

## Known Issues

`apps/web/tests/e2e/find-time.spec.ts`, `apps/web/tests/find-time/matcher.unit.test.ts`, and `apps/web/tests/routes/find-time-routes.unit.test.ts` are not present yet, so full slice verification remains incomplete until T02/T03 land. The slice-level Playwright command currently fails with `No tests found` for the missing find-time spec, which is expected for this intermediate task.

## Files Created/Modified

- `supabase/migrations/20260418_000001_find_time_member_availability.sql`
- `supabase/seed.sql`
- `apps/web/src/lib/server/find-time.ts`
- `apps/web/src/lib/server/schedule.ts`
- `apps/web/tests/find-time/member-availability.unit.test.ts`
- `apps/web/tests/access/policy-contract.unit.test.ts`
- `apps/web/tests/schedule/server-actions.unit.test.ts`
- `.gsd/KNOWLEDGE.md`
