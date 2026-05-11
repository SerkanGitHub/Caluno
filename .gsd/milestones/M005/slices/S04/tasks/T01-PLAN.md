---
estimated_steps: 37
estimated_files: 4
skills_used: []
---

# T01: Thread visible-week shift context into all web shift-editor entrypoints

---
estimated_steps: 5
estimated_files: 4
skills_used:
  - frontend-design
---

# T01: Thread visible-week shift context into all web shift-editor entrypoints

## Why

`ShiftEditorDialog` currently has no access to the already-authorized visible-week shifts that `previewShiftConflicts()` needs. This task closes the data-flow seam by deriving one truthful same-calendar shift list at the page boundary and threading it through create, edit, and move entrypoints without introducing new fetches.

## Negative Tests

- **Malformed inputs**: an empty or shift-free visible week still passes an empty array into downstream components without crashing the board.
- **Error paths**: no new network/service dependency is introduced; the advisory path must continue to work from the existing loaded schedule only.
- **Boundary conditions**: create, edit, and move dialogs all receive the same visible-week list, while scope stays limited to the currently rendered calendar/week payload.

## Steps

1. In `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`, derive a flat `existingShifts` list from `effectiveSchedule.days` only when a trusted schedule is present.
2. Extend `CalendarWeekBoard.svelte`, `ShiftDayColumn.svelte`, and `ShiftCard.svelte` prop contracts to accept/pass that list into each mounted `ShiftEditorDialog`.
3. Keep the prop threading shared across create/edit/move entrypoints so the advisory implementation can live in one dialog component.
4. Preserve current board rendering and permission boundaries; do not add cross-calendar queries or alternate data sources.

## Must-Haves

- [ ] The only advisory input source is the already-loaded `effectiveSchedule` for the active calendar route.
- [ ] Create, edit, and move dialogs all receive the same visible-week shift context needed for a shared advisory implementation.
- [ ] Prop threading does not disturb existing board/day/card conflict rendering or action wiring.

## Verification

- `pnpm --dir apps/web exec svelte-check --tsconfig ./tsconfig.json`
- `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/board.unit.test.ts`

## Done when

The page can hand a same-calendar visible-week shift array into every `ShiftEditorDialog` instance, compilation stays clean, and the existing route/board tests still pass.

## Inputs

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — owns `effectiveSchedule` and the `CalendarWeekBoard` mount.
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte` — owns the create dialog mount.
- `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte` — nests shift cards inside each day column.
- `apps/web/src/lib/components/calendar/ShiftCard.svelte` — owns the edit/move dialog mounts.

## Expected Output

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — derives and passes the visible-week shift list.
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte` — accepts/passes existing shifts into the create dialog and day columns.
- `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte` — accepts/passes existing shifts into child shift cards.
- `apps/web/src/lib/components/calendar/ShiftCard.svelte` — forwards existing shifts into shared edit/move dialogs.

## Inputs

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte`
- `apps/web/src/lib/components/calendar/ShiftCard.svelte`

## Expected Output

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte`
- `apps/web/src/lib/components/calendar/ShiftCard.svelte`

## Verification

pnpm --dir apps/web exec svelte-check --tsconfig ./tsconfig.json && pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/board.unit.test.ts

## Observability Impact

No new runtime log is required; this task creates the deterministic prop path that later exposes advisory state through the shared dialog UI.
