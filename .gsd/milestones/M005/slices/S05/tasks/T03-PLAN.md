---
estimated_steps: 46
estimated_files: 4
skills_used: []
---

# T03: Wire suggestion and clash-advisory UI into all mobile `ShiftEditorSheet` entrypoints

---
estimated_steps: 9
estimated_files: 4
skills_used:
  - frontend-design
  - accessibility
---

# T03: Wire suggestion and clash-advisory UI into all mobile `ShiftEditorSheet` entrypoints

## Description

With the data seam in place, thread `recurrenceSuggestion` and `existingShifts` through the mobile calendar tree and make `ShiftEditorSheet` behave like the web dialog: stable suggestion chip, accept/dismiss lifecycle, recurrence field-state diagnostics, advisory-only overlap preview, and reset rules that do not clobber find-time create-prefill values.

## Negative Tests

- **Malformed inputs**: invalid or inverted draft times suppress the advisory rather than leaving stale overlap warnings in the sheet.
- **Error paths**: dismissing a suggestion, closing the sheet, and reopening on the same page instance must keep it hidden until fresh route data arrives.
- **Boundary conditions**: touching-boundary drafts stay clear, edit/move exclude the current `shift.id`, and accepting the suggestion leaves `draftStartAt`/`draftEndAt` unchanged.

## Steps

1. Derive `existingShifts` from `runtimeState.schedule.days.flatMap((day) => day.shifts)` in `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` and pass it into the board.
2. Extend `apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte` so the create-sheet entrypoint accepts `recurrenceSuggestion` and `existingShifts`.
3. Extend `apps/mobile/src/lib/components/calendar/ShiftCard.svelte` so edit and move sheets receive `existingShifts` for self-excluding advisory behavior.
4. Update `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte` to import the shared core advisory helper and to maintain create-mode suggestion lifecycle state (`idle`, `accepted`, `dismissed`, `absent`).
5. Render the calm mobile recurrence suggestion surface with the same test vocabulary as web: `recurrence-suggestion`, `recurrence-suggestion-accept`, `recurrence-suggestion-dismiss`, and `recurrence-field-state`.
6. Ensure `acceptSuggestion()` only sets weekly cadence/interval, never overwrites create-prefill or manually edited start/end values, and resets cleanly after successful create.
7. Render advisory-only overlap warnings with `data-testid="clash-advisory"`, conflict ids/count metadata, and explanatory copy while leaving submit enabled for create/edit/move.
8. Preserve dismissal across close/reopen on the same page instance, but clear suggestion feedback after a successful create or when fresh suggestion data arrives.
9. Keep delete mode unchanged except for avoiding accidental advisory/suggestion rendering.

## Must-Haves

- [ ] Mobile create flow exposes the same stable predictive hooks as web for Playwright and debugging.
- [ ] Suggestion acceptance never overwrites find-time arrival start/end values or other draft timing fields.
- [ ] Create, edit, and move all reuse the shared same-calendar advisory rule while keeping save enabled.

## Verification

- `pnpm --dir apps/mobile check`

## Observability Impact

- Signals added/changed: mobile sheet-level predictive hooks for suggestion state, recurrence field state, and clash advisory content.
- How a future agent inspects this: open any mobile create/edit/move sheet and read the `data-testid` surfaces directly.
- Failure state exposed: dismissed versus accepted suggestion state and overlap versus clear draft state become explicit before save.

## Inputs

- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` — route state and runtime-derived schedule context from T02.
- `apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte` — create entrypoint wiring.
- `apps/mobile/src/lib/components/calendar/ShiftCard.svelte` — edit/move entrypoint wiring.
- `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte` — current mobile sheet implementation.
- `packages/caluno-core/src/schedule/shift-editor-advisory.ts` — shared clash helper from T01.
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte` — web reference for suggestion/advisory DOM contract and reset semantics.

## Expected Output

- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` — runtime-derived `existingShifts` and predictive prop threading.
- `apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte` — create entrypoint predictive props.
- `apps/mobile/src/lib/components/calendar/ShiftCard.svelte` — edit/move predictive props.
- `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte` — mobile predictive UI, lifecycle state, and advisory rendering.

## Inputs

- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`
- `apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte`
- `apps/mobile/src/lib/components/calendar/ShiftCard.svelte`
- `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte`
- `packages/caluno-core/src/schedule/shift-editor-advisory.ts`
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`

## Expected Output

- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`
- `apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte`
- `apps/mobile/src/lib/components/calendar/ShiftCard.svelte`
- `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte`

## Verification

pnpm --dir apps/mobile check

## Observability Impact

Introduces stable mobile sheet hooks for predictive state so later Playwright and manual inspection can localize recurrence versus clash regressions quickly.
