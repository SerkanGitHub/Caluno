---
estimated_steps: 4
estimated_files: 5
skills_used:
  - debug-like-expert
---

# T01: Build deterministic queue replay and protect trusted refreshes from clobbering local state

## Description

Create the safe-refresh substrate before any reconnect or realtime wiring lands. This task directly advances **R005** by ensuring a trusted server week can be ingested without erasing pending local mutations or local-only shifts, and it protects the existing **R004** offline continuity from the current `server-sync` overwrite path.

Load the installed `debug-like-expert` skill before coding so replay semantics and clobber scenarios are proven against real evidence instead of guessed from the happy path.

## Steps

1. Add a pure replay/rebase helper in `apps/web/src/lib/offline/sync-engine.ts` (or an equivalent extracted module) that reapplies ordered queue entries onto a trusted server schedule and returns either a merged local-first week or a named failure reason.
2. Extend `apps/web/src/lib/offline/calendar-controller.ts` with the smallest public seam needed to inspect pending queue state and ingest a refreshed trusted schedule through the replay helper instead of relying on initialize order.
3. Guard `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts` so trusted online loads do not overwrite a `local-write` snapshot while pending or retryable queue entries still exist for the same scope.
4. Add unit coverage for create/edit/move/delete replay order, local-only shift preservation, malformed replay refusal, and the snapshot-write guard.

## Must-Haves

- [ ] A refreshed trusted week merges with pending queue entries deterministically instead of erasing them.
- [ ] Online route loads cannot replace a `local-write` snapshot for the same scope while queue state is non-empty.
- [ ] Replay failures surface named reasons instead of silently dropping local changes.

## Inputs

- `apps/web/src/lib/offline/calendar-controller.ts`
- `apps/web/src/lib/offline/mutation-queue.ts`
- `apps/web/src/lib/offline/repository.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts`
- `apps/web/tests/schedule/offline-queue.unit.test.ts`

## Expected Output

- `apps/web/src/lib/offline/sync-engine.ts`
- `apps/web/src/lib/offline/calendar-controller.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts`
- `apps/web/tests/schedule/offline-queue.unit.test.ts`
- `apps/web/tests/schedule/sync-engine.unit.test.ts`

## Verification

`pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts`

## Observability Impact

- Add named replay/rebase failure reasons that flow into the controller's visible failure surface instead of disappearing behind a refresh.
- Keep queue counts and board source inspectable after a trusted refresh so a future agent can tell whether the board is replayed local state or a pure server snapshot.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Pending queue entries from `mutation-queue.ts` | Refuse replay, keep the existing local board intact, and surface a named replay failure. | Treat refresh as incomplete and preserve the current cached board until queue state can be read. | Fail closed and withhold guessed merged state. |
| Trusted refreshed week from `+page.ts` / server schedule load | Preserve the current local-write snapshot and do not overwrite it. | Keep the board on the current local snapshot and leave reconnect for a later retry. | Reject the refresh as unreplayable and surface a named failure reason. |

## Load Profile

- **Shared resources**: browser-local repository reads, current visible-week schedule payload, and ordered queue traversal.
- **Per-operation cost**: one refreshed week plus replay of each pending mutation in `createdAt` order.
- **10x breakpoint**: large pending queues will stress replay time first, so the helper must stay deterministic, week-scoped, and avoid repeated full-board reconstruction beyond what the week view requires.

## Negative Tests

- **Malformed inputs**: corrupt queue entry payloads, missing affected shift ids, and refreshed schedules that omit currently pending shifts.
- **Error paths**: repository/queue unavailable during refresh, replay helper returning failure, and snapshot-write guard deciding not to replace a `local-write` cache.
- **Boundary conditions**: zero pending mutations, multiple mutations against the same shift, create→edit chains on a local-only id, and delete after move within one visible week.
