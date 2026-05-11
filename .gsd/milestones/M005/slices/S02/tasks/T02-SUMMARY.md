---
id: T02
parent: S02
milestone: M005
key_files:
  - packages/caluno-core/src/schedule/conflicts.ts
  - apps/web/tests/schedule/conflicts.unit.test.ts
key_decisions:
  - Reused the existing ISO-string overlap predicate and start/end/title/id sort order for advisory preview results so downstream preview ordering cannot drift from visible-week conflict ordering.
  - Kept `previewShiftConflicts` advisory-only by filtering to valid same-calendar existing shifts and returning overlapping `CalendarShift[]` rows without introducing duplicate-id policy or any blocking/write behavior.
duration: 
verification_result: passed
completed_at: 2026-05-11T09:02:19.178Z
blocker_discovered: false
---

# T02: Added shared advisory conflict previewing in caluno-core and covered overlap, boundary, cross-calendar, malformed, and regression behavior with passing Vitest contracts.

**Added shared advisory conflict previewing in caluno-core and covered overlap, boundary, cross-calendar, malformed, and regression behavior with passing Vitest contracts.**

## What Happened

Extended `packages/caluno-core/src/schedule/conflicts.ts` with `previewShiftConflicts(draft, existingShifts)` so downstream editors can ask the core package for overlapping existing shifts without turning previewing into save policy. The helper reuses the same deterministic sort order and overlap predicate already trusted by visible-week conflict derivation, normalizes the draft into an ISO time range, filters existing rows to the same calendar, drops malformed or inverted ranges, and returns only overlapping `CalendarShift` rows in stable order. I also factored the time-range normalization just far enough to keep visible-week conflict semantics and preview semantics aligned without changing board-facing outputs. In `apps/web/tests/schedule/conflicts.unit.test.ts`, I kept the existing visible-week coverage and added focused preview tests that prove true overlaps are returned in sorted order while touching-boundary, cross-calendar, malformed, inverted, and clear-schedule inputs all fail closed to an empty preview.

## Verification

Ran the task’s required Vitest checks through the web harness. The shared contract suite passed for both `tests/schedule/conflicts.unit.test.ts` and `tests/schedule/recurrence.unit.test.ts`, confirming the new preview helper returns only same-calendar overlapping shifts and keeps touching-boundary or invalid rows out of the preview. A second regression sweep passed for `tests/schedule/board.unit.test.ts` and `tests/schedule/server-actions.unit.test.ts`, confirming existing visible-week conflict consumers remained stable after the core helper refactor.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd /Users/serkanyeniay/dev/Caluno && pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts tests/schedule/recurrence.unit.test.ts` | 0 | ✅ pass | 1816ms |
| 2 | `cd /Users/serkanyeniay/dev/Caluno && pnpm --dir apps/web exec vitest run tests/schedule/board.unit.test.ts tests/schedule/server-actions.unit.test.ts` | 0 | ✅ pass | 1863ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `packages/caluno-core/src/schedule/conflicts.ts`
- `apps/web/tests/schedule/conflicts.unit.test.ts`
