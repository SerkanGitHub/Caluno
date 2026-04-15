---
estimated_steps: 4
estimated_files: 6
skills_used:
  - debug-like-expert
---

# T02: Drain reconnect work through trusted route actions and surface sync diagnostics

## Description

Close the reconnect half of **R005** without bypassing the S02 server-authority decisions. When connectivity returns, the browser must flush pending create/edit/move/delete work sequentially through the existing named route actions, preserve retryable failures, and leave the board/status surfaces clear about what happened.

Load the installed `debug-like-expert` skill before coding so timeout, malformed-response, and partial-drain cases are instrumented and verified rather than patched ad hoc.

## Steps

1. Extend `apps/web/src/lib/offline/sync-engine.ts` to drain queue entries sequentially when the browser comes back online, posting each mutation through the existing `/calendars/[calendarId]` route actions and normalizing responses with the same `ScheduleActionState` contract used by enhanced forms.
2. Add the controller hooks needed to finalize queued reconnect outcomes, keep failed entries retryable, and mark the board `server-sync` again only after the queue really drains to zero.
3. Wire the reconnect lifecycle into `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` and the board/status surfaces so sync phase, last attempt, and last error remain visible on the real calendar route.
4. Extend unit coverage to prove sequential drain order, stop-on-failure behavior, retryable preservation, and queue-to-zero success after reconnect.

## Must-Haves

- [ ] Reconnect drains pending queue entries through trusted route actions only.
- [ ] Timeout, forbidden, and malformed outcomes stay queued as retryable work with visible diagnostics.
- [ ] A successful reconnect ends with `0 pending / 0 retryable` and a server-synced board.

## Inputs

- `apps/web/src/lib/offline/sync-engine.ts`
- `apps/web/src/lib/offline/calendar-controller.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/schedule/board.ts`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/tests/schedule/sync-engine.unit.test.ts`

## Expected Output

- `apps/web/src/lib/offline/sync-engine.ts`
- `apps/web/src/lib/offline/calendar-controller.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/schedule/board.ts`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/tests/schedule/sync-engine.unit.test.ts`

## Verification

`pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts`

## Observability Impact

- Add visible sync-phase and last-sync-error diagnostics to the calendar route so reconnect failures can be localized without devtools.
- Keep retryable queue state, last attempt timing, and drain completion visible in both board metadata and test diagnostics.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| `/calendars/[calendarId]` named route actions | Mark the current entry retryable, stop the drain, and keep later entries queued in order. | Preserve retryable state with the timeout reason and leave the board in cached-local mode. | Refuse to acknowledge the queue entry and surface a malformed-response sync failure. |
| Controller finalize/acknowledge path | Keep queue state unchanged and visible so no pending work is lost. | Abort the drain and surface an explicit sync-engine failure. | Reject the outcome and keep the entry retryable. |

## Load Profile

- **Shared resources**: SvelteKit action endpoints, Supabase-backed schedule writes, browser fetch slots, and the local mutation queue.
- **Per-operation cost**: one route-action POST plus one local finalize/acknowledge per queued mutation.
- **10x breakpoint**: many pending mutations or repeated online/offline flaps will stress sequential drain latency first, so the engine must debounce concurrent runs and stop on first failure rather than piling on duplicate requests.

## Negative Tests

- **Malformed inputs**: unknown action keys, missing form fields when rebuilding a queued request, and queue entries for a different visible week scope.
- **Error paths**: 401/403 trusted-route rejection, timeout, network failure during reconnect, and malformed `ScheduleActionState` payloads.
- **Boundary conditions**: empty queue on reconnect, one success followed by one failure in the same drain, retrying a previously retryable entry, and reconnect firing multiple times while a drain is already in progress.
