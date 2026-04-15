---
id: T02
parent: S04
milestone: M001
key_files:
  - apps/web/src/lib/offline/sync-engine.ts
  - apps/web/src/lib/offline/calendar-controller.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
  - apps/web/src/lib/schedule/board.ts
  - apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte
  - apps/web/tests/schedule/sync-engine.unit.test.ts
  - apps/web/tests/schedule/offline-queue.unit.test.ts
  - apps/web/tests/schedule/board.unit.test.ts
  - .gsd/KNOWLEDGE.md
key_decisions:
  - D024 — Drain reconnect queue mutations by replaying named route actions and deserializing their responses back into the existing `ScheduleActionState` contract instead of adding a parallel sync API.
duration: 
verification_result: passed
completed_at: 2026-04-15T16:19:08.924Z
blocker_discovered: false
---

# T02: Drained reconnect queue work through trusted calendar route actions and surfaced sync diagnostics on the live board.

**Drained reconnect queue work through trusted calendar route actions and surfaced sync diagnostics on the live board.**

## What Happened

I extended `apps/web/src/lib/offline/sync-engine.ts` with reconnect-drain orchestration that rebuilds queued mutation form posts, submits them sequentially through the existing named SvelteKit route actions, normalizes responses back into the existing `ScheduleActionState` contract, and stops on the first failure or malformed condition instead of guessing. I updated `apps/web/src/lib/offline/calendar-controller.ts` with reconnect lifecycle state (`syncPhase`, `lastSyncAttemptAt`, `lastSyncError`), explicit reconnect start/finish hooks, and stricter acknowledge handling so a trusted write is not treated as fully drained if queue acknowledgement fails. I wired the real browser flow in `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` using SvelteKit `deserialize` so online reconnect attempts post through the same named actions as enhanced forms, debounce concurrent drains, and surface state changes on the real route. I expanded `apps/web/src/lib/schedule/board.ts` and `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte` so queue counts, sync phase, last attempt, and last sync error stay visible in board metadata and diagnostics. I also extended the focused unit coverage in `tests/schedule/sync-engine.unit.test.ts`, `tests/schedule/offline-queue.unit.test.ts`, and `tests/schedule/board.unit.test.ts` to prove ordered drain behavior, stop-on-failure semantics, malformed refusal, retryable preservation, deterministic queue ordering, and queue-to-zero recovery after reconnect.

## Verification

Passed the task verification command `pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts`, the additional touched-surface proof `pnpm --dir apps/web exec vitest run tests/schedule/board.unit.test.ts`, and the broader type/integration gate `pnpm --dir apps/web check`. This confirms reconnect drain submission order, stop-on-first-failure behavior, retryable preservation, queue-to-zero success, and visible sync diagnostics on the board/runtime models. I did not run the slice’s later Supabase reset or Playwright flows in this task because those end-to-end and multi-user proofs belong to the remaining realtime/browser tasks in S04.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web check` | 0 | ✅ pass | 2619ms |
| 2 | `pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts` | 0 | ✅ pass | 1402ms |
| 3 | `pnpm --dir apps/web exec vitest run tests/schedule/board.unit.test.ts` | 0 | ✅ pass | 1230ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/lib/offline/sync-engine.ts`
- `apps/web/src/lib/offline/calendar-controller.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/schedule/board.ts`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/tests/schedule/sync-engine.unit.test.ts`
- `apps/web/tests/schedule/offline-queue.unit.test.ts`
- `apps/web/tests/schedule/board.unit.test.ts`
- `.gsd/KNOWLEDGE.md`
