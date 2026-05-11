---
id: T01
parent: S02
milestone: M005
key_files:
  - packages/caluno-core/src/schedule/recurrence.ts
  - apps/web/tests/schedule/recurrence.unit.test.ts
key_decisions:
  - Anchored recurrence lookback to the latest valid shift in the provided array instead of Date.now() so suggestions stay deterministic across surfaces and test runs.
  - Qualified weekly suggestions by weekday plus exact UTC start/end time, while dropping malformed, inverted, and duplicate-id rows before threshold evaluation.
duration: 
verification_result: passed
completed_at: 2026-05-11T08:59:52.115Z
blocker_discovered: false
---

# T01: Added a deterministic shared weekly recurrence detector in caluno-core with contract tests for threshold, anchor, and fail-closed behavior.

**Added a deterministic shared weekly recurrence detector in caluno-core with contract tests for threshold, anchor, and fail-closed behavior.**

## What Happened

Added detectRecurrencePattern to @repo/caluno-core/schedule/recurrence with a shared exported suggestion type. The helper now sorts input shifts deterministically, drops duplicate-id rows, rejects malformed or inverted ranges, anchors its 30-day evidence window to the latest valid shift in the provided array, groups candidate evidence by UTC weekday plus exact start/end time window, and returns a weekly suggestion only when at least three matching shifts remain. I also expanded the web Vitest recurrence contract to cover the historical positive case, under-threshold and out-of-window negatives, same-weekday-but-different-window rejection, and fail-closed behavior for malformed, inverted, duplicate, and empty inputs.

## Verification

Ran the required recurrence Vitest file through the web harness. The import path @repo/caluno-core/schedule/recurrence resolved successfully, and the passing suite confirmed the new helper returns a weekly suggestion for exactly three same-weekday same-time shifts within the anchored 30-day window while returning null for under-threshold, out-of-window, split-window, malformed, inverted, duplicate, and empty inputs.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd /Users/serkanyeniay/dev/Caluno && pnpm --dir apps/web exec vitest run tests/schedule/recurrence.unit.test.ts` | 0 | ✅ pass | 1950ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `packages/caluno-core/src/schedule/recurrence.ts`
- `apps/web/tests/schedule/recurrence.unit.test.ts`
