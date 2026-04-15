---
id: T04
parent: S02
milestone: M001
key_files:
  - apps/web/tests/e2e/fixtures.ts
  - apps/web/tests/e2e/calendar-shifts.spec.ts
  - .gsd/KNOWLEDGE.md
key_decisions:
  - Capture schedule-proof diagnostics centrally in the shared Playwright fixture so every failing phase retains calendar/week/shift context and failed-request metadata without ad-hoc per-test logging.
duration: 
verification_result: passed
completed_at: 2026-04-15T07:24:54.498Z
blocker_discovered: false
---

# T04: Added deterministic Playwright proof for multi-shift calendar editing flows and preserved the denied calendar surface with attached diagnostics.

**Added deterministic Playwright proof for multi-shift calendar editing flows and preserved the denied calendar surface with attached diagnostics.**

## What Happened

I expanded `apps/web/tests/e2e/fixtures.ts` with deterministic schedule fixtures for the seeded visible week, seeded shift ids, recurring-create expectations, and richer `FlowDiagnostics` context so retained JSON artifacts now capture the current calendar id, visible week, focused shift ids, page errors, console warnings/errors, and failed responses without leaking secrets. I added `apps/web/tests/e2e/calendar-shifts.spec.ts` as a serial end-to-end proof that signs in through the real UI, opens the seeded Alpha calendar week, proves multiple same-day shifts are visible on load, intentionally triggers a bounded recurring-create validation error, successfully creates recurring concrete occurrences across the visible week, edits a seeded shift in place, moves a seeded shift into a new day column, deletes a seeded shift, reloads to prove continuity through a fresh server load, and separately verifies that navigating to the seeded Beta calendar id still renders the explicit denied surface. I preserved the earlier cold-start stabilization by continuing to wait briefly after the sign-in shell becomes visible before typing credentials, and I did not need to change `apps/web/playwright.config.ts` because the existing local Supabase/Vite harness was already deterministic enough once the spec used the seeded week explicitly. During verification I also captured a reusable repo-specific gotcha in `.gsd/KNOWLEDGE.md`: shell globs can be resolved before `pnpm --dir apps/web` changes directories, so explicit schedule test paths are safer for slice verification evidence.

## Verification

Verified the browser proof against a clean local Supabase reset with `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`, which passed both the multi-shift lifecycle scenario and the unauthorized calendar denial scenario. Verified static/type correctness with `pnpm --dir apps/web check`. Verified the protected-route and schedule unit surfaces together with `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/recurrence.unit.test.ts tests/schedule/server-actions.unit.test.ts`. The passing browser proof confirmed same-day multi-shift visibility on load, recurring create rendering multiple visible occurrences, edit/move/delete rerenders, reload continuity, preserved denied-route behavior, and retained phase/calendar/week diagnostics for future failures.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web check` | 0 | ✅ pass | 2511ms |
| 2 | `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/recurrence.unit.test.ts tests/schedule/server-actions.unit.test.ts` | 0 | ✅ pass | 1385ms |
| 3 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts` | 0 | ✅ pass | 35600ms |

## Deviations

`apps/web/playwright.config.ts` did not require changes after local verification. For unit-test evidence, I used explicit `tests/schedule/*.unit.test.ts` file paths instead of the slice plan's shell glob because root-shell expansion before `pnpm --dir apps/web` can silently skip the intended schedule files.

## Known Issues

None.

## Files Created/Modified

- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`
- `.gsd/KNOWLEDGE.md`
