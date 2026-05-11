# S04 Research — Wire clash advisory into web shift editor

## Summary
Targeted research. The shared advisory contract already exists and is well-specified, so the slice is mostly a UI/data-flow problem: `ShiftEditorDialog` currently has neither reactive draft state nor access to the calendar’s existing shifts, so it cannot compute a truthful pre-submit advisory yet.

## Requirement Focus
- **R011 support:** this is the first web surface for predictive clash preview.
- **R006 constraint:** the advisory must stay warning-only, not become a write blocker.
- **R007 constraint:** copy and styling should reuse the calm warning vocabulary already used for board/day/card conflict surfaces.
- **R002 constraint:** preview only against the currently permitted calendar’s shifts.

## Key Findings
1. **The helper contract is already done.** `packages/caluno-core/src/schedule/conflicts.ts:95-114` exposes `previewShiftConflicts(draft, existingShifts)` and the tests in `apps/web/tests/schedule/conflicts.unit.test.ts:260-348` prove the rules that matter for UI wiring: same-calendar only, deterministic sort order, malformed rows ignored, and touching boundaries remain non-conflicting.
2. **The current dialog cannot compute a live draft.** In `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`, start/end/title fields are rendered from derived values only; there is no local state or `on:input`-driven draft model. Without that, the UI can only warn after submit, which misses the slice goal.
3. **The current dialog also lacks schedule context.** `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte:97-102` passes `createPrefill` into the create dialog, and `apps/web/src/lib/components/calendar/ShiftCard.svelte:103-115` mounts edit/move dialogs, but none of those props include the existing calendar shifts needed by `previewShiftConflicts()`.
4. **The page already has the raw schedule available at the top.** `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte:824-833` renders `CalendarWeekBoard` while still holding `effectiveSchedule`. That is the cleanest place to derive `effectiveSchedule.days.flatMap((day) => day.shifts)` and pass a truthful same-calendar shift list downward.
5. **Existing warning UI can be reused.** The current conflict surfaces use `inline-state tone-warning` on day and shift cards (`apps/web/src/lib/components/calendar/ShiftDayColumn.svelte:65-71`, `apps/web/src/lib/components/calendar/ShiftCard.svelte:78-83`). S04’s advisory should look like a sibling pattern instead of inventing a new tone system.
6. **The component is shared across create/edit/move.** `ShiftCard.svelte` mounts `ShiftEditorDialog` for both edit and move, while `CalendarWeekBoard.svelte` mounts it for create. If S04 wires the advisory at the shared component level, it can cover more than the acceptance minimum — but edit/move flows must exclude the current `shift.id` from the comparison set to avoid self-overlap.
7. **Current browser coverage stops at post-save visible conflicts.** `apps/web/tests/e2e/calendar-shifts.spec.ts:30-122` proves board/day/card overlap warnings after load, and `:125-198` proves the create dialog save path. There is no pre-submit advisory assertion yet, but the existing fixture helpers already know how to open and submit `create-shift-editor`.
8. **Form reset behavior is again a real watch-out.** `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte:534-554` uses `update({ reset: false })`, so advisory state derived from local inputs must be intentionally reset after successful save or dialog close.

## Recommendation
- Treat this as a **shared dialog-state refactor** rather than a server feature.
- In `+page.svelte`, pass the raw visible-week shifts into `CalendarWeekBoard`; from there pass them to `ShiftEditorDialog` for create, and through `ShiftCard` for edit/move.
- In `ShiftEditorDialog.svelte`, introduce local state for at least `title`, `startAt`, and `endAt`, then derive a normalized draft with `normalizeShiftDraft()` and run `previewShiftConflicts()` against the passed-in shift list.
- Render the result as a non-blocking warning article with `data-testid="clash-advisory"`. Good minimum payload: overlap count plus conflicting titles/time windows. Keep the submit button enabled even when conflicts exist.
- Exclude the subject shift from the comparison set when `shift` is present so edit/move dialogs do not flag themselves.
- Reuse the existing warning vocabulary/copy style and add ARIA-friendly text; this should feel like “heads up” guidance, not policy enforcement.

## Files and Purpose
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — derive/pass raw visible-week shifts into the board.
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte` — accept/pass the existing-shifts prop into the create dialog.
- `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte` — likely no logic change unless prop threading goes through the day layer.
- `apps/web/src/lib/components/calendar/ShiftCard.svelte` — pass the existing-shifts prop into edit/move dialogs and handle self-exclusion context.
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte` — reactive draft state, helper invocation, advisory rendering, and reset behavior.
- `apps/web/src/app.css` — style the advisory next to existing `inline-state` conflict surfaces.
- `apps/web/tests/e2e/calendar-shifts.spec.ts` — add conflict + clear pre-submit advisory scenarios while preserving save behavior.
- `apps/web/tests/e2e/fixtures.ts` — add helper(s) to read the advisory surface and maybe inspect draft editor state.

## Natural Seams
1. **Data propagation seam:** get `effectiveSchedule` shifts from page → board → card/dialog props.
2. **Dialog logic seam:** local draft state + helper call + self-exclusion + advisory rendering.
3. **Verification seam:** Playwright assertions for conflict and clear states, optionally a tiny component/unit seam if desired.

## First Proof
1. Open the seeded create dialog with an overlapping time (Kitchen prep / Supplier call window already exists in `supabase/seed.sql:320-348` and `apps/web/tests/e2e/fixtures.ts:195-249`) and prove `data-testid="clash-advisory"` appears **before** submit.
2. Submit anyway and prove the shift still saves, so the feature remains advisory-only.
3. Add a clear-state case using a touching-boundary or separated window and assert the advisory is absent, matching `previewShiftConflicts()` contract tests.

## Verification
- `pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts`
- `pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`

## Watch-outs / Forward Intelligence
- The helper intentionally treats touching boundaries as clear; do not regress this in the UI copy or tests.
- If you implement the advisory in the shared dialog, edit/move must filter out the current shift id.
- Keep submit enabled and do not map advisory presence to validation-error state; that would violate both S02’s contract and R006’s “warning, not blocker” behavior.
- Because board/day/card conflicts already exist after save, the new advisory should complement those surfaces rather than duplicate their exact copy.
- Since local form reset is disabled, successful create/edit/move flows should clear or recalculate advisory state explicitly.

## Skill Discovery
Already-installed project skills relevant here: `accessibility`, `test`, `verify-before-complete`, `frontend-design`.

Promising external skills discovered (not installed):
- `npx skills add currents-dev/playwright-best-practices-skill@playwright-best-practices` — strongest Playwright-specific hit (37.3K installs).
- `npx skills add spences10/svelte-skills-kit@sveltekit-structure` — strongest SvelteKit-specific hit (483 installs).
- `npx skills add supabase/agent-skills@supabase` — strongest Supabase general hit (60.9K installs), though S04 itself should stay client-side if possible.
