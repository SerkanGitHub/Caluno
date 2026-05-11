---
estimated_steps: 40
estimated_files: 5
skills_used: []
---

# T02: Add advisory conflict-preview helper with overlap regression coverage

---
estimated_steps: 7
estimated_files: 2
skills_used:
  - test
  - verify-before-complete
---

# T02: Add advisory conflict-preview helper with overlap regression coverage

**Slice:** S02 — Implement detectRecurrencePattern and previewShiftConflicts in `@repo/caluno-core`
**Milestone:** M005

## Description

Implement `previewShiftConflicts(draft: NormalizedScheduleShiftDraft, existingShifts: CalendarShift[])` in `packages/caluno-core/src/schedule/conflicts.ts` so downstream editors can preview overlaps without turning conflicts into write policy. Reuse the current overlap rule and sort semantics already used by visible-week conflicts, filter to valid same-calendar rows, and return only the overlapping `CalendarShift[]` items in deterministic order. Close the slice by adding focused unit coverage plus a small regression sweep that confirms existing board/server schedule tests still pass after the shared helper changes.

## Load Profile

- **Shared resources**: none; pure in-memory overlap detection only.
- **Per-operation cost**: sort/filter over the provided shift list and overlap comparisons against one normalized draft.
- **10x breakpoint**: very large shift arrays would stress sort/comparison work first, so keep the helper data-local and avoid any expansion or cross-day bucketing that is unnecessary for preview.

## Negative Tests

- **Malformed inputs**: malformed existing shifts and inverted ranges must be ignored instead of poisoning the result set.
- **Error paths**: cross-calendar rows and boundary-touching non-overlaps must return an empty preview when nothing truly overlaps.
- **Boundary conditions**: overlapping shifts must be returned in stable sort order; a clear schedule must return `[]`.

## Steps

1. Extend `packages/caluno-core/src/schedule/conflicts.ts` with the new exported preview helper using the same overlap predicate already trusted by `deriveVisibleWeekConflicts`.
2. Factor shared normalization/sort helpers only as far as needed to avoid semantic drift between visible-week conflicts and preview conflicts.
3. Add targeted Vitest coverage in `apps/web/tests/schedule/conflicts.unit.test.ts` for overlap, touching-boundary, cross-calendar, malformed, and clear-schedule behavior.
4. Run the recurrence/conflict contract tests together, then run `board.unit` and `server-actions.unit` as a light regression sweep before closing the slice.

## Must-Haves

- [ ] The helper stays advisory-only and returns overlapping `CalendarShift[]` rows without blocking or mutating any caller state.
- [ ] Verification proves both the new preview contract and the continued stability of existing schedule conflict consumers.

## Verification

- `pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts tests/schedule/recurrence.unit.test.ts`
- `pnpm --dir apps/web exec vitest run tests/schedule/board.unit.test.ts tests/schedule/server-actions.unit.test.ts`

## Inputs

- `.gsd/milestones/M005/slices/S02/S02-RESEARCH.md` — research constraints for advisory-only preview behavior.
- `packages/caluno-core/src/schedule/conflicts.ts` — existing overlap derivation logic to extend without drift.
- `packages/caluno-core/src/schedule/types.ts` — `NormalizedScheduleShiftDraft` and `CalendarShift` contracts for the preview helper.
- `apps/web/tests/schedule/conflicts.unit.test.ts` — existing conflict unit harness to expand.
- `apps/web/tests/schedule/recurrence.unit.test.ts` — updated recurrence contract used in combined slice verification.

## Expected Output

- `packages/caluno-core/src/schedule/conflicts.ts` — exported preview helper and any shared overlap utilities needed to keep semantics aligned.
- `apps/web/tests/schedule/conflicts.unit.test.ts` — preview conflict coverage plus negative-path assertions.

## Inputs

- `.gsd/milestones/M005/slices/S02/S02-RESEARCH.md`
- `packages/caluno-core/src/schedule/conflicts.ts`
- `packages/caluno-core/src/schedule/types.ts`
- `apps/web/tests/schedule/conflicts.unit.test.ts`
- `apps/web/tests/schedule/recurrence.unit.test.ts`

## Expected Output

- `packages/caluno-core/src/schedule/conflicts.ts`
- `apps/web/tests/schedule/conflicts.unit.test.ts`

## Verification

pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts tests/schedule/recurrence.unit.test.ts && pnpm --dir apps/web exec vitest run tests/schedule/board.unit.test.ts tests/schedule/server-actions.unit.test.ts
