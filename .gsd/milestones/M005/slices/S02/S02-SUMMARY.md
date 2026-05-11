---
id: S02
parent: M005
milestone: M005
provides:
  - A shared `detectRecurrencePattern` contract for recurrence-suggestion UI slices.
  - A shared `previewShiftConflicts` contract for draft overlap advisories in shift editors.
  - Regression-proven conflict semantics that downstream web/mobile surfaces can consume without redefining schedule math.
requires:
  []
affects:
  - S03
  - S04
  - S05
key_files:
  - packages/caluno-core/src/schedule/recurrence.ts
  - packages/caluno-core/src/schedule/conflicts.ts
  - apps/web/tests/schedule/recurrence.unit.test.ts
  - apps/web/tests/schedule/conflicts.unit.test.ts
  - apps/web/tests/schedule/board.unit.test.ts
  - apps/web/tests/schedule/server-actions.unit.test.ts
key_decisions:
  - Anchored recurrence detection to the latest valid shift in the provided dataset instead of wall-clock time so the helper remains deterministic across tests and surfaces.
  - Qualified recurrence suggestions strictly by same UTC weekday plus exact start/end time window and fail-closed filtering of malformed, inverted, or duplicate rows.
  - Reused the existing overlap predicate and stable start/end/title/id sort order for advisory conflict previews so preview ordering stays aligned with visible-week conflict semantics.
  - Kept conflict previews advisory-only by returning overlapping same-calendar `CalendarShift[]` rows without adding blocking write policy.
patterns_established:
  - Pure predictive helpers should derive their evidence window from provided data rather than `Date.now()` to stay deterministic.
  - Advisory preview logic should reuse the same normalization, overlap math, and stable ordering as established conflict rendering paths.
  - Caller-provided schedule rows are treated as untrusted and filtered fail-closed before any suggestion or advisory result is produced.
observability_surfaces:
  - None; this slice is covered by deterministic unit-contract verification only.
drill_down_paths:
  - .gsd/milestones/M005/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M005/slices/S02/tasks/T02-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-05-11T09:06:26.577Z
blocker_discovered: false
---

# S02: Implement detectRecurrencePattern and previewShiftConflicts in @repo/caluno-core

**Shipped deterministic shared recurrence-suggestion and advisory conflict-preview helpers in @repo/caluno-core with passing contract and regression coverage for downstream web/mobile wiring.**

## What Happened

S02 completed the shared schedule-core contracts that M005’s predictive UI slices depend on. T01 added `detectRecurrencePattern` to the recurrence module and exported the shared suggestion shape so consumers can derive a weekly suggestion from historical shifts without relying on wall-clock time. The helper sorts inputs deterministically, anchors its 30-day lookback window to the latest valid shift in the provided array, groups evidence by UTC weekday plus exact start/end window, and fails closed for malformed, inverted, duplicate, or otherwise unusable rows. The recurrence contract tests now prove the positive path plus under-threshold, out-of-window, split-window, malformed, inverted, duplicate, and empty-input negatives. T02 added `previewShiftConflicts` to the conflicts module as an advisory-only helper for draft-vs-existing overlap preview. It normalizes the draft range, filters existing shifts to the same calendar, rejects malformed or inverted rows, and returns overlapping `CalendarShift[]` rows in the same stable start/end/title/id order already used by visible-week conflict derivation. The conflicts test suite now covers overlapping previews, touching-boundary negatives, cross-calendar exclusion, malformed and inverted rows, and clear-state behavior, while board and server-action regressions confirmed the refactor did not change baseline visible conflict semantics. A reviewer and a security/parsing pass both found the slice ready to close; only non-blocking follow-up ideas were noted for future hardening.

## Verification

Re-ran all slice-level verification commands through the closeout-safe `gsd_exec` surface and both passed. `pnpm --dir apps/web exec vitest run tests/schedule/recurrence.unit.test.ts tests/schedule/conflicts.unit.test.ts` passed with 2/2 test files and 16/16 tests green. `pnpm --dir apps/web exec vitest run tests/schedule/board.unit.test.ts tests/schedule/server-actions.unit.test.ts` passed with 2/2 test files and 24/24 tests green. Fresh review also reported no slice-blocking correctness issues, and a security/parsing review found the timestamp/range helpers fail closed sufficiently for this slice’s in-memory contract surface.

## Requirements Advanced

- R011 — Established and verified the shared predictive recurrence-suggestion and advisory conflict-preview helper contracts that downstream web/mobile slices will wire into the product experience.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

None.

## Known Limitations

This slice proves shared helper contracts only; no web/mobile UI integration or end-to-end runtime proof is included yet. Downstream slices S03-S05 must consume these helpers in the actual shift editors.

## Follow-ups

Consider a small hardening follow-up to add explicit recurrence tests for additional recurrence-shape permutations if future product use depends on them, and review `resolveVisibleWeekConflictState()` messaging before repurposing it beyond its current board-facing use.

## Files Created/Modified

- `packages/caluno-core/src/schedule/recurrence.ts` — Added deterministic recurrence-pattern detection helpers, validation, lookback anchoring, and exported suggestion behavior.
- `packages/caluno-core/src/schedule/conflicts.ts` — Added advisory `previewShiftConflicts` and aligned preview normalization/ordering with visible-week conflict derivation.
- `apps/web/tests/schedule/recurrence.unit.test.ts` — Expanded recurrence contract coverage for threshold, anchored window, split-window, malformed, inverted, duplicate, and empty-input behavior.
- `apps/web/tests/schedule/conflicts.unit.test.ts` — Added focused preview-conflict coverage for overlap, touching-boundary, cross-calendar, malformed, inverted, and clear-state cases.
- `apps/web/tests/schedule/board.unit.test.ts` — Re-verified existing board conflict behavior remained stable after the shared conflict-helper refactor.
- `apps/web/tests/schedule/server-actions.unit.test.ts` — Re-verified server-facing schedule actions remained stable after the shared conflict-helper refactor.
