---
estimated_steps: 5
estimated_files: 7
skills_used: []
---

# T01: Model concrete shifts, bounded recurrence, and deterministic schedule fixtures

**Slice:** S02 — Multi-shift calendar model and browser editing flows
**Milestone:** M001

## Description

Create the authoritative scheduling substrate before any route or UI work lands. This task advances **R003** by introducing concrete editable shift rows, bounded recurring-series metadata, and deterministic local fixtures that later browser editing, offline continuity, and conflict visibility can all target without re-inventing the model.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Local Supabase migration/reset | Stop the task on `db reset`, fix the SQL or seed contract, and do not let later tasks plan against an un-runnable schema. | Treat the reset as incomplete and rerun only after confirming the local stack is healthy. | Reject the seed/migration change and keep the old schema rather than leaving partial scheduling tables in place. |
| `rrule` recurrence library | Keep recurrence generation disabled until the dependency is installed and imported cleanly. | N/A | Treat malformed rule serialization/expansion as a test failure and do not generate rows from guessed recurrence math. |

## Load Profile

- **Shared resources**: Postgres rows in `public.shift_series` and `public.shifts`, recurrence expansion helpers, and local seed fixtures reused by unit and e2e tests.
- **Per-operation cost**: one bounded recurrence expansion plus a small number of inserted occurrence rows per created series.
- **10x breakpoint**: unbounded recurrence or wide date windows would explode row counts first, so M001 must require an explicit `repeat_until` or repeat count and keep expansion bounded to a requested visible range.

## Negative Tests

- **Malformed inputs**: blank titles, `end_at <= start_at`, unsupported recurrence cadence, and missing recurrence bound when repeat is enabled.
- **Error paths**: duplicate/invalid seed ids, migration constraint failures, and recurrence helper inputs that cannot be normalized.
- **Boundary conditions**: multiple same-day shifts, overlapping shifts, one-off shifts with no series, and recurring shifts that clip correctly to the visible week.

## Steps

1. Add the recurrence dependency to `apps/web/package.json` and create a new SQL migration, `supabase/migrations/20260415_000002_schedule_shifts.sql`, that introduces `shift_series` and `shifts` tables with concrete `start_at` / `end_at` timestamps, optional `series_id`, membership-derived RLS, and helper SQL that reuses the S01 calendar-access boundary.
2. Extend `supabase/seed.sql` with stable Alpha-calendar shift and series fixtures covering multiple same-day shifts, an overlapping pair, and at least one bounded recurring series with deterministic ids and dates for later browser proof.
3. Add `apps/web/src/lib/schedule/types.ts` and `apps/web/src/lib/schedule/recurrence.ts` so the app has typed editor payloads plus pure helpers for validating recurrence inputs and expanding bounded visible-range occurrences with `rrule`.
4. Lock the model with `apps/web/tests/schedule/recurrence.unit.test.ts`, covering normalization, bounded expansion, same-day grouping inputs, and rejection of invalid recurrence/date ranges.
5. Keep the first-cut model concrete and deterministic: no day-only fields, no virtual-only recurrence, and no forever rules in M001.

## Must-Haves

- [ ] The scheduling schema stores exact timestamps and allows more than one shift on the same day.
- [ ] Recurring creation is bounded by `repeat_until` or count so visible-range expansion stays deterministic.
- [ ] Access to schedule rows derives from permitted calendar membership, not from client-supplied group ids.
- [ ] Seed data gives later tasks real same-day, overlapping, and recurring fixtures to prove against.

## Verification

- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec vitest run tests/schedule/recurrence.unit.test.ts`
- Confirm the seeded Alpha calendar now has deterministic one-off and recurring schedule fixtures available for later route/e2e work.

## Observability Impact

- Signals added/changed: SQL constraint errors and recurrence-validation failures become explicit during `db reset` and unit runs.
- How a future agent inspects this: rerun `npx --yes supabase db reset --local --yes` and `pnpm --dir apps/web exec vitest run tests/schedule/recurrence.unit.test.ts`, then inspect seeded rows in `public.shift_series` / `public.shifts` if needed.
- Failure state exposed: invalid recurrence bounds, malformed timestamps, and broken seed ids surface before any browser UI work begins.

## Inputs

- `apps/web/package.json` — current web dependencies and scripts.
- `supabase/migrations/20260414_000001_auth_groups_access.sql` — S01 auth/group/calendar authority that schedule access must extend without rewriting.
- `supabase/seed.sql` — deterministic local fixtures to extend with schedule rows.
- `apps/web/src/lib/access/contract.ts` — shared access rules that schedule helpers must respect.

## Expected Output

- `apps/web/package.json` — includes the `rrule` dependency for bounded recurrence support.
- `pnpm-lock.yaml` — lockfile updated for the new dependency.
- `supabase/migrations/20260415_000002_schedule_shifts.sql` — scheduling schema, constraints, RLS, and helper SQL.
- `supabase/seed.sql` — seeded same-day, overlapping, and recurring Alpha shifts with stable ids.
- `apps/web/src/lib/schedule/types.ts` — typed schedule/domain payloads.
- `apps/web/src/lib/schedule/recurrence.ts` — pure bounded recurrence helpers.
- `apps/web/tests/schedule/recurrence.unit.test.ts` — unit proof for normalization and expansion.
