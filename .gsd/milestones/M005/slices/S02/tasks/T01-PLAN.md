---
estimated_steps: 40
estimated_files: 3
skills_used: []
---

# T01: Add deterministic recurrence-pattern detection to the shared schedule core

---
estimated_steps: 7
estimated_files: 2
skills_used:
  - tdd
  - test
  - verify-before-complete
---

# T01: Add deterministic recurrence-pattern detection to the shared schedule core

**Slice:** S02 — Implement detectRecurrencePattern and previewShiftConflicts in `@repo/caluno-core`
**Milestone:** M005

## Description

Lock the recurrence-suggestion contract in the shared core before any UI wiring lands. Add `detectRecurrencePattern(shifts: CalendarShift[])` to `packages/caluno-core/src/schedule/recurrence.ts` and keep it deterministic by anchoring the 30-day lookback to the latest valid shift in the provided array rather than `Date.now()`. Group evidence by weekday plus exact start/end time window, ignore malformed/inverted/duplicate rows, and return `null` unless at least 3 valid matches remain. Prefer a structured weekly suggestion shape that downstream slices can use directly for recurrence prefill without re-deriving history.

## Load Profile

- **Shared resources**: none; pure in-memory helper only.
- **Per-operation cost**: bounded scan/sort over the provided shift array; no DB, network, or recurrence expansion.
- **10x breakpoint**: large imported shift lists should still stay cheap enough for client-side use; avoid quadratic grouping logic where a single pass or sorted pass works.

## Negative Tests

- **Malformed inputs**: invalid timestamps, inverted ranges, duplicate shift ids, and empty arrays must not produce a suggestion.
- **Error paths**: evidence older than the anchored 30-day window or fewer than 3 valid matches must return `null`.
- **Boundary conditions**: same weekday but different duration/time window must not be collapsed into one pattern; exactly 3 valid matches should produce the first positive suggestion.

## Steps

1. Extend `packages/caluno-core/src/schedule/recurrence.ts` with the new exported helper and any local exported suggestion type needed by downstream consumers.
2. Reuse the codebase's existing ISO parsing/deterministic date handling conventions instead of introducing local-time or live-clock behavior.
3. Add targeted Vitest coverage in `apps/web/tests/schedule/recurrence.unit.test.ts` for the positive threshold case and the required negative cases.
4. Keep the public contract data-first: cadence/interval plus exemplar timing and match evidence, but no UI text or app-specific formatting.

## Must-Haves

- [ ] The helper is callable from `@repo/caluno-core/schedule/recurrence` without adding a new package entrypoint.
- [ ] Tests prove the helper stays deterministic and fail-closed on malformed or weak evidence.

## Verification

- `pnpm --dir apps/web exec vitest run tests/schedule/recurrence.unit.test.ts`
- The recurrence tests include both the >=3-match positive case and null-return negatives for under-threshold/out-of-window/malformed evidence.

## Inputs

- `.gsd/milestones/M005/slices/S02/S02-RESEARCH.md` — research constraints for anchor, grouping, and fail-closed behavior.
- `packages/caluno-core/src/schedule/recurrence.ts` — existing normalization and recurrence helpers to extend.
- `packages/caluno-core/src/schedule/types.ts` — `CalendarShift` contract consumed by the new helper.
- `apps/web/tests/schedule/recurrence.unit.test.ts` — existing Vitest harness for schedule recurrence behavior.

## Expected Output

- `packages/caluno-core/src/schedule/recurrence.ts` — exported deterministic recurrence-pattern helper and supporting type/logic.
- `apps/web/tests/schedule/recurrence.unit.test.ts` — focused contract coverage for positive and negative recurrence detection behavior.

## Inputs

- `.gsd/milestones/M005/slices/S02/S02-RESEARCH.md`
- `packages/caluno-core/src/schedule/recurrence.ts`
- `packages/caluno-core/src/schedule/types.ts`
- `apps/web/tests/schedule/recurrence.unit.test.ts`

## Expected Output

- `packages/caluno-core/src/schedule/recurrence.ts`
- `apps/web/tests/schedule/recurrence.unit.test.ts`

## Verification

pnpm --dir apps/web exec vitest run tests/schedule/recurrence.unit.test.ts
