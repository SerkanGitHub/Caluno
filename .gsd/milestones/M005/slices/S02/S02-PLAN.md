# S02: Implement detectRecurrencePattern and previewShiftConflicts in @repo/caluno-core

**Goal:** Implement deterministic shared recurrence-suggestion and conflict-preview helpers in `@repo/caluno-core` so downstream web and mobile slices can consume one cross-surface contract.
**Demo:** Unit tests pass for both helpers. detectRecurrencePattern returns a suggestion for ≥3 same-weekday-same-hour shifts in 30 days and null otherwise. previewShiftConflicts returns overlapping shifts for a draft against existing shifts and empty array when clear.

## Must-Haves

- # S02: Implement detectRecurrencePattern and previewShiftConflicts in `@repo/caluno-core`
- **Goal:** Ship the shared helper contracts for predictive recurrence suggestion and draft conflict preview inside `@repo/caluno-core`.
- **Demo:** The core package exposes deterministic pure helpers that unit tests can call directly through the existing web Vitest harness.
- ## Must-Haves
- `detectRecurrencePattern` lives in `packages/caluno-core/src/schedule/recurrence.ts`, is exported through the existing `@repo/caluno-core/schedule/recurrence` surface, and returns a weekly suggestion only when at least 3 valid same-weekday + exact-time shifts exist within the anchored 30-day lookback window.
- `previewShiftConflicts` lives in `packages/caluno-core/src/schedule/conflicts.ts`, is exported through the existing `@repo/caluno-core/schedule/conflicts` surface, and returns sorted overlapping same-calendar `CalendarShift[]` rows for a normalized draft while staying advisory/non-blocking.
- `apps/web/tests/schedule/recurrence.unit.test.ts` and `apps/web/tests/schedule/conflicts.unit.test.ts` prove the positive path plus under-threshold, malformed, duplicate, touching-boundary, cross-calendar, and clear-state negatives.
- ## Threat Surface
- **Abuse**: Crafted malformed timestamps, inverted ranges, or duplicate rows could cause false recurrence suggestions or false conflict warnings if helpers do not fail closed.
- **Data exposure**: None beyond in-memory schedule metadata already loaded by the app.
- **Input trust**: Shift arrays and draft timestamps are caller-provided and must be treated as untrusted.
- ## Requirement Impact
- **Requirements touched**: `R011` directly; `R006` must remain behaviorally consistent because overlap math is being reused for predictive preview.
- **Re-verify**: Shared recurrence/conflict unit coverage plus lightweight regression on board/server schedule tests.
- **Decisions revisited**: `D063` only as a guardrail; no decision change is expected.
- ## Proof Level
- This slice proves: `contract`
- Real runtime required: `no`
- Human/UAT required: `no`
- ## Verification
- `pnpm --dir apps/web exec vitest run tests/schedule/recurrence.unit.test.ts tests/schedule/conflicts.unit.test.ts`
- `pnpm --dir apps/web exec vitest run tests/schedule/board.unit.test.ts tests/schedule/server-actions.unit.test.ts`
- ## Integration Closure
- Upstream surfaces consumed: `packages/caluno-core/src/schedule/types.ts`, `packages/caluno-core/src/schedule/recurrence.ts`, `packages/caluno-core/src/schedule/conflicts.ts`, and the existing web Vitest harness.
- New wiring introduced in this slice: none beyond new shared exports on already-exposed schedule modules.
- What remains before the milestone is truly usable end-to-end: S03-S05 must wire the helpers into web/mobile shift editors, and S06 must finish hardening plus requirement validation.

## Proof Level

- This slice proves: Contract proof through deterministic pure helper behavior and targeted regression coverage in the existing web Vitest harness; no UI/runtime composition is introduced in this slice.

## Integration Closure

This slice only lands shared core behavior. Existing `@repo/caluno-core` exports and thin web shims should remain the integration seam so S03-S05 can consume the new helpers without redefining schedule logic per surface.

## Verification

- No new runtime observability is expected. Failure diagnosis for this slice should come from deterministic helper return values asserted in `apps/web/tests/schedule/recurrence.unit.test.ts` and `apps/web/tests/schedule/conflicts.unit.test.ts`.

## Tasks

- [x] **T01: Add deterministic recurrence-pattern detection to the shared schedule core** `est:35m`
  ---
  estimated_steps: 7
  estimated_files: 2
  skills_used:
    - tdd
    - test
    - verify-before-complete
  ---
  - Files: `packages/caluno-core/src/schedule/recurrence.ts`, `packages/caluno-core/src/schedule/types.ts`, `apps/web/tests/schedule/recurrence.unit.test.ts`
  - Verify: pnpm --dir apps/web exec vitest run tests/schedule/recurrence.unit.test.ts

- [x] **T02: Add advisory conflict-preview helper with overlap regression coverage** `est:35m`
  ---
  estimated_steps: 7
  estimated_files: 2
  skills_used:
    - test
    - verify-before-complete
  ---
  - Files: `packages/caluno-core/src/schedule/conflicts.ts`, `packages/caluno-core/src/schedule/types.ts`, `apps/web/tests/schedule/conflicts.unit.test.ts`, `apps/web/tests/schedule/board.unit.test.ts`, `apps/web/tests/schedule/server-actions.unit.test.ts`
  - Verify: pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts tests/schedule/recurrence.unit.test.ts && pnpm --dir apps/web exec vitest run tests/schedule/board.unit.test.ts tests/schedule/server-actions.unit.test.ts

## Files Likely Touched

- packages/caluno-core/src/schedule/recurrence.ts
- packages/caluno-core/src/schedule/types.ts
- apps/web/tests/schedule/recurrence.unit.test.ts
- packages/caluno-core/src/schedule/conflicts.ts
- apps/web/tests/schedule/conflicts.unit.test.ts
- apps/web/tests/schedule/board.unit.test.ts
- apps/web/tests/schedule/server-actions.unit.test.ts
