---
id: T01
parent: S04
milestone: M001
key_files:
  - apps/web/src/lib/offline/sync-engine.ts
  - apps/web/src/lib/offline/calendar-controller.ts
  - apps/web/src/lib/offline/mutation-queue.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts
  - apps/web/tests/schedule/offline-queue.unit.test.ts
  - apps/web/tests/schedule/sync-engine.unit.test.ts
key_decisions:
  - Centralized trusted refresh replay and snapshot guard policy in `apps/web/src/lib/offline/sync-engine.ts` so route persistence and controller refresh ingestion share one deterministic contract.
duration: 
verification_result: passed
completed_at: 2026-04-15T15:22:40.218Z
blocker_discovered: false
---

# T01: Added deterministic trusted-week replay plus snapshot overwrite guards for queued local calendar mutations.

**Added deterministic trusted-week replay plus snapshot overwrite guards for queued local calendar mutations.**

## What Happened

I added a pure sync engine at `apps/web/src/lib/offline/sync-engine.ts` that rebases ordered offline queue entries onto a trusted ready week, returns explicit replay failure reasons, and exposes the snapshot-write policy used to protect `local-write` cache state. I extended `apps/web/src/lib/offline/calendar-controller.ts` with `inspectQueue()` and `ingestTrustedSchedule()` seams, changed trusted-online initialization to load snapshot + queue first and then replay the fresh trusted week through the sync engine, and kept replay failures on the visible `lastFailure` surface while preserving the existing local board. I updated `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts` so online loads inspect the current snapshot and queue before persisting a trusted week, skipping the overwrite when a `local-write` snapshot still has pending or retryable mutations. I also tightened the mutation queue contract so edit/move/delete payloads require `shiftId`, which makes malformed replay refusal explicit instead of permissive. Finally, I added unit coverage for deterministic create/edit/move/delete order, local-only shift preservation, malformed replay refusal, controller refresh rebasing, replay failure preservation, and snapshot-write guard decisions.

## Verification

Passed `pnpm --dir apps/web check`, the task verification suite for `tests/schedule/offline-queue.unit.test.ts` and `tests/schedule/sync-engine.unit.test.ts`, and the slice’s broader unit suite covering protected routes and server actions. The verified surfaces include queue counts, board source, queue inspection, and named replay failures remaining visible after trusted refresh ingestion. I did not run the slice’s later DB reset or Playwright flows in this task because this is the first implementation task in S04 and those end-to-end gates depend on subsequent reconnect/realtime work.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web check` | 0 | ✅ pass | 3622ms |
| 2 | `pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts` | 0 | ✅ pass | 2206ms |
| 3 | `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/server-actions.unit.test.ts tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts` | 0 | ✅ pass | 2276ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/lib/offline/sync-engine.ts`
- `apps/web/src/lib/offline/calendar-controller.ts`
- `apps/web/src/lib/offline/mutation-queue.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts`
- `apps/web/tests/schedule/offline-queue.unit.test.ts`
- `apps/web/tests/schedule/sync-engine.unit.test.ts`
