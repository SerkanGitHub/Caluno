---
id: T01
parent: S04
milestone: M005
key_files:
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
  - apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte
  - apps/web/src/lib/components/calendar/ShiftDayColumn.svelte
  - apps/web/src/lib/components/calendar/ShiftCard.svelte
  - apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte
  - apps/web/tests/routes/protected-routes.unit.test.ts
  - apps/web/tests/schedule/conflicts.unit.test.ts
key_decisions:
  - Derived the advisory source once at the route boundary from `effectiveSchedule.days` only when the schedule status is `ready`, otherwise falling back to an empty same-calendar shift list.
  - Extended `CalendarWeekBoard`, `ShiftDayColumn`, `ShiftCard`, and `ShiftEditorDialog` prop contracts so create, edit, and move entrypoints all receive the same `existingShifts` context without adding fetches or alternate data sources.
duration: 
verification_result: passed
completed_at: 2026-05-11T10:36:29.378Z
blocker_discovered: false
---

# T01: Threaded one route-derived visible-week `existingShifts` list into every web shift-editor entrypoint for create, edit, and move flows.

**Threaded one route-derived visible-week `existingShifts` list into every web shift-editor entrypoint for create, edit, and move flows.**

## What Happened

Added a single route-boundary `existingShifts` derivation in the calendar page by flattening the currently loaded visible-week `effectiveSchedule.days` when the schedule is ready, with an empty-array fallback for empty or non-ready states. Threaded that same prop through `CalendarWeekBoard`, `ShiftDayColumn`, and `ShiftCard`, and extended `ShiftEditorDialog` to accept the shared visible-week shift list so the later advisory implementation can plug into one dialog surface for create, edit, and move flows. Also strengthened the route tests with explicit flat visible-week shift assertions and repaired an unrelated duplicate object-key pattern in the conflicts unit test so the required `svelte-check` gate could pass cleanly.

## Verification

Confirmed the page now derives a same-calendar visible-week shift array from the already-loaded `effectiveSchedule` and passes it through board/day/card/dialog prop contracts without adding fetches. `svelte-check` passed with 0 errors after removing a pre-existing duplicate-key test fixture pattern, the exact slice-plan Vitest command passed, and the touched conflicts test also passed.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd /Users/serkanyeniay/dev/Caluno && pnpm --dir apps/web exec svelte-check --tsconfig ./tsconfig.json` | 0 | ✅ pass (0 errors, 9 pre-existing warnings) | 3227ms |
| 2 | `cd /Users/serkanyeniay/dev/Caluno && pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts tests/routes/protected-routes.unit.test.ts tests/schedule/board.unit.test.ts` | 0 | ✅ pass (3 files, 29 tests) | 1821ms |
| 3 | `cd /Users/serkanyeniay/dev/Caluno && pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/board.unit.test.ts` | 0 | ✅ pass (2 files, 24 tests) | 1548ms |

## Deviations

Updated `apps/web/tests/routes/protected-routes.unit.test.ts` with explicit flat visible-week shift assertions and made a minimal cleanup in `apps/web/tests/schedule/conflicts.unit.test.ts` to remove a pre-existing duplicate object-key pattern that was failing `svelte-check`.

## Known Issues

`pnpm --dir apps/web exec svelte-check --tsconfig ./tsconfig.json` still reports 9 pre-existing Svelte 5 event-directive deprecation warnings in `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`, but it now passes with 0 errors.

## Files Created/Modified

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte`
- `apps/web/src/lib/components/calendar/ShiftCard.svelte`
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`
- `apps/web/tests/routes/protected-routes.unit.test.ts`
- `apps/web/tests/schedule/conflicts.unit.test.ts`
