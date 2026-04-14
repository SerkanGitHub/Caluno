---
id: T01
parent: S02
milestone: M001
key_files:
  - apps/web/package.json
  - pnpm-lock.yaml
  - supabase/migrations/20260415_000002_schedule_shifts.sql
  - supabase/seed.sql
  - apps/web/src/lib/schedule/types.ts
  - apps/web/src/lib/schedule/recurrence.ts
  - apps/web/tests/schedule/recurrence.unit.test.ts
key_decisions:
  - D011 — persist recurring schedules as concrete `public.shifts` rows with bounded provenance in `public.shift_series`, keeping access derived from trusted calendar membership.
duration: 
verification_result: mixed
completed_at: 2026-04-14T22:35:31.572Z
blocker_discovered: false
---

# T01: Added bounded shift-series schema, deterministic Alpha schedule fixtures, and rrule-backed recurrence helpers.

**Added bounded shift-series schema, deterministic Alpha schedule fixtures, and rrule-backed recurrence helpers.**

## What Happened

Added the first concrete scheduling substrate for the protected calendar surface. I installed `rrule`, created `public.shift_series` and `public.shifts` with exact timestamp storage, bounded recurrence metadata, composite series/calendar linkage, and RLS helpers/policies that reuse `public.current_user_can_access_calendar(...)` instead of trusting client-supplied group ids. I extended `supabase/seed.sql` with deterministic Alpha shared-calendar fixtures: a bounded daily recurring series (`Alpha opening sweep`) materialized into four concrete shifts, two same-day one-off shifts, and an overlapping pair for later edit/move/delete and browser proofs. On the app side I added typed schedule payloads plus pure recurrence normalization/expansion helpers that emit named validation failures for blank titles, invalid ranges, unsupported cadence, and missing recurrence bounds. I locked the contract with a focused unit suite that covers normalization, visible-range clipping, multi-shift same-day behavior, and static assertions over the migration and seed files so schema/fixture regressions surface before later route and UI tasks.

## Verification

Task-level verification passed with `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec vitest run tests/schedule/recurrence.unit.test.ts`, proving the migration and seed contract execute cleanly and the recurrence helper suite passes against the reset local stack. Slice-level partial verification also passed for `pnpm --dir apps/web check`, an equivalent explicit-file Vitest run over `tests/routes/protected-routes.unit.test.ts` and `tests/schedule/recurrence.unit.test.ts`, and a standalone `npx --yes supabase db reset --local --yes`. I additionally queried the local database with `supabase db query --local` and confirmed the seeded Alpha calendar contains one bounded daily series with four concrete occurrence rows plus the expected same-day and overlapping one-off shifts. The planned Playwright schedule proof remains red at this task boundary because `tests/e2e/calendar-shifts.spec.ts` does not exist until T04.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec vitest run tests/schedule/recurrence.unit.test.ts` | 0 | ✅ pass | 26776ms |
| 2 | `pnpm --dir apps/web check` | 0 | ✅ pass | 2256ms |
| 3 | `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/recurrence.unit.test.ts` | 0 | ✅ pass | 1391ms |
| 4 | `npx --yes supabase db reset --local --yes` | 0 | ✅ pass | 26500ms |
| 5 | `npx --yes supabase db query --local -o json "with alpha_series as (...) select json_build_object(...) as summary;"` | 0 | ✅ pass | 549ms |
| 6 | `pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts` | 1 | ❌ fail | 3183ms |

## Deviations

Added static migration/seed contract assertions inside `apps/web/tests/schedule/recurrence.unit.test.ts` so schema or fixture regressions fail before UI work begins. For slice-level Vitest coverage, I used the explicit file list `tests/routes/protected-routes.unit.test.ts tests/schedule/recurrence.unit.test.ts` after observing that the planned wildcard form only matched the route test in this repo-root shell context.

## Known Issues

`pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts` still fails with `No tests found` because the browser proof for schedule flows is planned for T04, not T01.

## Files Created/Modified

- `apps/web/package.json`
- `pnpm-lock.yaml`
- `supabase/migrations/20260415_000002_schedule_shifts.sql`
- `supabase/seed.sql`
- `apps/web/src/lib/schedule/types.ts`
- `apps/web/src/lib/schedule/recurrence.ts`
- `apps/web/tests/schedule/recurrence.unit.test.ts`
