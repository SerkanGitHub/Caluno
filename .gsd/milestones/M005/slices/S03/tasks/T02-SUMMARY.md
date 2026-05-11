---
id: T02
parent: S03
milestone: M005
key_files:
  - apps/web/src/lib/offline/calendar-controller.ts
  - apps/web/tests/schedule/offline-queue.unit.test.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
  - apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte
  - apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte
  - apps/web/src/app.css
  - apps/web/tests/e2e/fixtures.ts
  - apps/web/tests/e2e/calendar-shifts.spec.ts
key_decisions:
  - Allowed create reconciliation to accept extra server recurrence ids for off-screen occurrences while still failing closed if the server returns fewer ids than the visible local staged shifts.
duration: 
verification_result: passed
completed_at: 2026-05-11T10:24:45.363Z
blocker_discovered: false
---

# T02: Fixed recurring create reconciliation so accepted recurrence suggestions reset cleanly after submit, and added unit/browser proof for accept and dismiss flows.

**Fixed recurring create reconciliation so accepted recurrence suggestions reset cleanly after submit, and added unit/browser proof for accept and dismiss flows.**

## What Happened

Verified the create-dialog recurrence suggestion wiring that was already present across the protected calendar route, week board, dialog UI, styling, and Playwright helpers. Fresh browser verification exposed the remaining failure from the handoff note: accepting the weekly suggestion and submitting a bounded recurring create left the dialog in a retryable malformed-response state instead of resetting. Tracing the local-first controller showed why: visible-week staging only creates local occurrences inside the current board window, but the trusted server returns affectedShiftIds for the full recurring series. The controller had required an exact id-count match, so a weekly repeatCount=2 create staged one visible local shift but received two server ids and failed closed with SCHEDULE_RESPONSE_INVALID. Updated create reconciliation to accept extra server ids for off-screen occurrences by mapping only the visible local staged shifts to the leading server ids while still failing if the server returns too few ids. Added a targeted offline queue unit test that reproduces this recurring create case and proves the queue drains, local ids are replaced, and off-screen ids do not pollute the visible board. Re-ran the full Supabase reset plus Playwright suite to confirm the accept and dismiss browser proofs now pass end to end.

## Verification

Ran targeted controller unit coverage for recurring create reconciliation, then reset the local Supabase stack and ran the calendar shifts Playwright suite. The unit test proved extra off-screen recurrence ids no longer force SCHEDULE_RESPONSE_INVALID, and the browser suite passed all five flows including suggestion accept reset, dismiss persistence, reload behavior, and denied-route coverage.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts` | 0 | ✅ pass | 1616ms |
| 2 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts` | 0 | ✅ pass | 41171ms |

## Deviations

Added a focused offline queue unit test in addition to the planned browser proof to lock in the visible-week recurring create reconciliation behavior.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/lib/offline/calendar-controller.ts`
- `apps/web/tests/schedule/offline-queue.unit.test.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`
- `apps/web/src/app.css`
- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`
