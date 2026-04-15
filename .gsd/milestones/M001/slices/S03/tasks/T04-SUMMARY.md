---
id: T04
parent: S03
milestone: M001
key_files:
  - apps/web/src/lib/offline/mutation-queue.ts
  - apps/web/src/lib/offline/calendar-controller.ts
  - apps/web/src/lib/schedule/board.ts
  - apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte
  - apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte
  - apps/web/src/lib/components/calendar/ShiftCard.svelte
  - apps/web/src/lib/components/calendar/ShiftDayColumn.svelte
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
  - apps/web/src/lib/offline/repository.ts
  - apps/web/tests/schedule/offline-queue.unit.test.ts
  - apps/web/tests/schedule/board.unit.test.ts
  - .gsd/KNOWLEDGE.md
key_decisions:
  - D020: persist the current visible-week snapshot after each local mutation and keep the mutation queue focused on pending/retryable sync state so offline reload continuity does not depend on queue replay.
  - One-off create forms must leave recurrence interval blank unless a cadence is selected, because the shared recurrence validator treats any supplied interval as recurrence input.
duration: 
verification_result: passed
completed_at: 2026-04-15T12:55:11.417Z
blocker_discovered: false
---

# T04: Added a local-first calendar controller with persistent offline mutations and pending-state board UI.

**Added a local-first calendar controller with persistent offline mutations and pending-state board UI.**

## What Happened

I added `apps/web/src/lib/offline/mutation-queue.ts` as a persistent wrapper over the browser-local mutation store and `apps/web/src/lib/offline/calendar-controller.ts` as the local-first visible-week controller. The controller now hydrates the calendar board from browser-local state, persists the current visible-week snapshot after each local mutation, keeps a separate pending/retryable queue for server confirmation state, and updates create/edit/move/delete flows immediately without waiting for the network. I rewired `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` to own the controller lifecycle, route enhanced form submissions through the controller, keep the named server actions as the online authority, and surface local-first diagnostics for board source, network state, queue counts, and last local failure. I updated `CalendarWeekBoard.svelte`, `ShiftEditorDialog.svelte`, `ShiftCard.svelte`, and `ShiftDayColumn.svelte` so the board shows local-only, pending-sync, and retryable status in the existing calm board language rather than separate debug chrome. I extended `apps/web/src/lib/schedule/board.ts` so the board model can summarize cached-local vs server-synced source, online/offline status, queue state, failure state, and per-shift pending/local badges. I also added `apps/web/tests/schedule/offline-queue.unit.test.ts` to prove queue persistence across reload, malformed queue rejection, repository-write failure visibility, and retryable timeout handling, and updated `apps/web/tests/schedule/board.unit.test.ts` to lock the new board summaries and per-shift badges. During execution I made one targeted correction to the create form: one-off creates now leave `recurrenceInterval` blank by default so the shared recurrence validator does not misclassify non-recurring creates as malformed recurrence input. I also extended the repository seam with `deleteLocalMutation()` so queue acknowledgements do not require clearing and rebuilding the entire scoped queue.

## Verification

`pnpm --dir apps/web check` passed after the local-first controller, board helpers, and Svelte component rewiring landed. The task verification command `pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/board.unit.test.ts` passed and proved local mutation persistence, reload continuity, malformed queue handling, local-write failure visibility, retryable timeout handling, and visible pending/local board state. I also ran the broader slice unit surface `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/routes/protected-routes.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/offline-store.unit.test.ts tests/schedule/offline-queue.unit.test.ts`, which passed and confirmed the new local-first work did not regress the earlier cached-session, protected-route, and offline-store contracts. Full browser/UAT proof for offline reopen and end-to-end local editing remains the explicit responsibility of T05 in this slice.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web check` | 0 | ✅ pass | 3681ms |
| 2 | `pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/board.unit.test.ts` | 0 | ✅ pass | 2221ms |
| 3 | `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/routes/protected-routes.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/offline-store.unit.test.ts tests/schedule/offline-queue.unit.test.ts` | 0 | ✅ pass | 2364ms |

## Deviations

I added `deleteLocalMutation()` to `apps/web/src/lib/offline/repository.ts` even though it was not called out in the written task plan, because acknowledging individual queue entries precisely is cleaner and safer than clearing and rebuilding the entire scoped queue on every successful reconciliation. I also corrected the create form’s default recurrence interval to blank so the shared recurrence validator preserves one-off create semantics for both local-first and server-backed submissions.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/lib/offline/mutation-queue.ts`
- `apps/web/src/lib/offline/calendar-controller.ts`
- `apps/web/src/lib/schedule/board.ts`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`
- `apps/web/src/lib/components/calendar/ShiftCard.svelte`
- `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/offline/repository.ts`
- `apps/web/tests/schedule/offline-queue.unit.test.ts`
- `apps/web/tests/schedule/board.unit.test.ts`
- `.gsd/KNOWLEDGE.md`
