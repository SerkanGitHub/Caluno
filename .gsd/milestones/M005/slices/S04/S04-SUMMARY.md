---
id: S04
parent: M005
milestone: M005
provides:
  - Web shift editor now exposes truthful same-calendar overlap advisories before save while preserving non-blocking creation behavior.
  - Stable browser coverage for overlap and clear create flows in `apps/web/tests/e2e/calendar-shifts.spec.ts`, ready for mobile parity and hardening slices.
requires:
  - slice: S02
    provides: Shared `previewShiftConflicts()` overlap contract and unit-proven overlap semantics reused by the web editor advisory helper.
affects:
  - S05
  - S06
key_files:
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
  - apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte
  - apps/web/src/lib/components/calendar/ShiftDayColumn.svelte
  - apps/web/src/lib/components/calendar/ShiftCard.svelte
  - apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte
  - apps/web/src/lib/schedule/shift-editor-advisory.ts
  - apps/web/src/app.css
  - apps/web/tests/e2e/calendar-shifts.spec.ts
  - apps/web/tests/e2e/fixtures.ts
key_decisions:
  - Derive the visible-week advisory source once at the protected route boundary and thread it through all dialog entrypoints so overlap previews stay within already-authorized calendar/week data.
  - Keep clash detection advisory-only in the web editor: warn before submit, exclude the current shift during edit/move, and explicitly reset local advisory state on close or success to avoid stale warnings.
patterns_established:
  - Route-derived, scope-preserving week context can be reused by downstream editor surfaces instead of introducing new fetch paths for client-side guidance.
  - Draft-driven UI advisories work best as pure helpers wrapped around shared domain contracts so unit tests can prove malformed-input suppression, boundary behavior, and self-exclusion without component harness overhead.
observability_surfaces:
  - `data-testid="clash-advisory"` provides an explicit pre-submit inspection surface for browser automation and future regression diagnosis.
drill_down_paths:
  - .gsd/milestones/M005/slices/S04/tasks/T01-SUMMARY.md
  - .gsd/milestones/M005/slices/S04/tasks/T02-SUMMARY.md
  - .gsd/milestones/M005/slices/S04/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-05-11T13:56:15.764Z
blocker_discovered: false
---

# S04: S04

**Web shift creation now surfaces a non-blocking clash advisory from the shared overlap helper while still allowing save, with browser proof for overlap and clear drafts.**

## What Happened

S04 closed the web pre-submit conflict-advisory loop on top of the shared overlap contract from S02. T01 derived a same-calendar visible-week `existingShifts` list once from the protected calendar route’s ready `effectiveSchedule` payload and threaded it through `CalendarWeekBoard`, `ShiftDayColumn`, `ShiftCard`, and the shared `ShiftEditorDialog` so create, edit, and move entrypoints all see the same authorized week context without widening data scope or adding fetches. T02 then added live advisory state in `ShiftEditorDialog` via a pure `deriveShiftEditorClashes()` helper that normalizes the draft, reuses `previewShiftConflicts()`, excludes the current shift during edit/move flows, suppresses malformed or touching-boundary drafts, and renders a calm warning-only `data-testid="clash-advisory"` surface while keeping submit enabled. The dialog now explicitly clears advisory-bearing local draft state on close and successful submit so SvelteKit `update({ reset: false })` does not leak stale warnings into later sessions. T03 finished the browser proof by stabilizing `calendar-shifts.spec.ts` against mutable shared seed state, self-healing missing Thursday anchors when necessary, asserting advisory content against the currently rendered conflict IDs, and covering both overlapping-save and clear-create scenarios. A reviewer subagent found no closeout-blocking issues.

## Verification

Fresh slice-level verification passed on the closeout-safe surface: `pnpm --dir apps/web exec svelte-check --tsconfig ./tsconfig.json` exited 0 with 0 errors and 0 warnings; `pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts` exited 0 with 1 file / 5 tests passing; and `pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts` exited 0 with all 6 browser scenarios passing, including the new overlap-advisory-save and clear-state create coverage. Task summaries also record focused helper/unit verification for the new advisory derivation logic, and a reviewer subagent reran targeted advisory/unit plus Playwright checks without finding blockers.

## Requirements Advanced

- R011 — Advanced predictive scheduling assistance by adding a truthful pre-submit clash advisory surface on web shift creation, extending the predictive/helpful guidance loop beyond recurrence suggestions while staying within trusted schedule scope.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

T03 also corrected a stale recurrence-suggestion assertion in the shared Playwright file because the required end-to-end verification command runs the entire `calendar-shifts.spec.ts` suite against mutable seed history.

## Known Limitations

This slice proves only the web advisory surface; mobile parity remains for S05, and overall predictive-assistance validation plus broader hardening remain for S06.

## Follow-ups

Carry the same warning-only clash advisory semantics into mobile `ShiftEditorSheet` in S05 and use S06 to validate R011 alongside accessibility/build/deployment hardening.

## Files Created/Modified

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — Derived the ready visible-week `existingShifts` list from the protected route payload and passed it into the board/editor tree.
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte` — Accepted and forwarded shared visible-week shift context into child entrypoints.
- `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte` — Threaded `existingShifts` into create-dialog entrypoints for day-column creation flows.
- `apps/web/src/lib/components/calendar/ShiftCard.svelte` — Threaded `existingShifts` into edit and move entrypoints so advisory semantics stay consistent.
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte` — Added live draft-driven clash advisory rendering, submit-preserving warning UX, and stale-state resets.
- `apps/web/src/lib/schedule/shift-editor-advisory.ts` — Added the pure advisory derivation helper that normalizes drafts, excludes the current shift, and reuses the shared conflict-preview contract.
- `apps/web/src/app.css` — Styled the warning-only clash advisory surface.
- `apps/web/tests/e2e/calendar-shifts.spec.ts` — Stabilized and extended browser coverage for overlap-advisory-save and clear-state create scenarios.
- `apps/web/tests/e2e/fixtures.ts` — Supported deterministic advisory coverage for seeded calendar browser tests.
