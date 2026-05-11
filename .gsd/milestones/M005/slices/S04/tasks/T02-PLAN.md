---
estimated_steps: 50
estimated_files: 2
skills_used: []
---

# T02: Add live clash-advisory state and warning-only UI to the shared shift editor

---
estimated_steps: 8
estimated_files: 2
skills_used:
  - frontend-design
  - accessibility
---

# T02: Add live clash-advisory state and warning-only UI to the shared shift editor

## Why

S04’s product behavior lives inside `ShiftEditorDialog`: the component needs local draft state, self-exclusion for edit/move, helper-backed overlap derivation, and a calm warning surface that never becomes a write blocker.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| `normalizeShiftDraft()` / `previewShiftConflicts()` local derivation | Suppress the advisory and keep the form submittable. | N/A — pure in-memory helpers. | Treat the draft or candidate shift as non-previewable and fail closed to no advisory. |

## Negative Tests

- **Malformed inputs**: blank/invalid/inverted draft timestamps suppress the advisory instead of throwing or showing stale overlap data.
- **Error paths**: if local state resets after close/success, stale advisory text must not leak into the next create session.
- **Boundary conditions**: touching boundaries stay clear, and edit/move exclude the current `shift.id` so unchanged windows do not self-conflict.

## Steps

1. Replace derived-only title/start/end field values in `ShiftEditorDialog.svelte` with local state that updates on user input while still honoring create prefill and existing shift defaults.
2. Build a normalized draft from the current local values using the active calendar scope, then derive advisory conflicts reactively with `previewShiftConflicts()`.
3. Filter the comparison list to exclude the current shift during edit/move while preserving same-calendar-only behavior from the shared helper contract.
4. Render a warning-only advisory article with `data-testid="clash-advisory"`, overlap count, conflicting titles/windows, and calm explanatory copy/ARIA-friendly structure.
5. Keep the submit button enabled and explicitly reset/recompute advisory state on dialog close and successful create/edit/move paths so `update({ reset: false })` does not leave stale warnings behind.
6. Add any supporting styling in `apps/web/src/app.css` by reusing the existing warning/inline-state vocabulary rather than inventing a new tone system.

## Must-Haves

- [ ] Advisory presence is derived from current local inputs, not only from submit-time values.
- [ ] The advisory never blocks submit and never widens beyond same-calendar visible-week shifts.
- [ ] Touching-boundary and self-shift cases remain clear so the dialog matches the S02 helper contract truthfully.

## Verification

- `pnpm --dir apps/web exec svelte-check --tsconfig ./tsconfig.json`
- `pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts`

## Observability Impact

- Signals added/changed: `data-testid="clash-advisory"` plus advisory metadata/content in the shared dialog.
- How a future agent inspects this: open any shift editor in the browser or use the Playwright helper added in T03.
- Failure state exposed: overlapping versus clear drafts become visible before save instead of only after board refresh.

## Done when

The shared dialog shows truthful overlap guidance from current inputs, hides it for clear/touching/self cases, and still submits overlapping drafts normally.

## Inputs

- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte` — current shared editor implementation with recurrence suggestion state and reset effects.
- `apps/web/src/lib/schedule/recurrence.ts` — re-export of `normalizeShiftDraft()` used to validate the local draft.
- `apps/web/src/lib/schedule/conflicts.ts` — re-export of `previewShiftConflicts()` used for advisory derivation.
- `apps/web/src/app.css` — existing shift-editor and warning styles.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — upstream route context supplying the active visible-week schedule.
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte` — upstream create dialog mount.
- `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte` — upstream day-column prop threading.
- `apps/web/src/lib/components/calendar/ShiftCard.svelte` — upstream edit/move dialog mount.

## Expected Output

- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte` — local draft state, conflict derivation, self-exclusion, reset handling, and advisory rendering.
- `apps/web/src/app.css` — advisory styling aligned with existing warning surfaces.

## Inputs

- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`
- `apps/web/src/lib/schedule/recurrence.ts`
- `apps/web/src/lib/schedule/conflicts.ts`
- `apps/web/src/app.css`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte`
- `apps/web/src/lib/components/calendar/ShiftCard.svelte`

## Expected Output

- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`
- `apps/web/src/app.css`

## Verification

pnpm --dir apps/web exec svelte-check --tsconfig ./tsconfig.json && pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts

## Observability Impact

Introduces the explicit advisory UI state that later verification can assert before submit, reducing ambiguity when overlap preview wiring regresses.
