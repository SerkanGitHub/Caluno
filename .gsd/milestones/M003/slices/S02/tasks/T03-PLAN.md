---
estimated_steps: 4
estimated_files: 7
skills_used:
  - debug-like-expert
---

# T03: Wire mobile local-first schedule storage, trusted writes, and reconnect drain

**Slice:** S02 — Mobile calendar continuity and editing
**Milestone:** M003

## Description

Once mobile can reopen permitted scope offline, it still needs the real local-first runtime that makes edits survive and reconcile. This task should add the app-local repository, trusted Supabase transport, and connectivity/lifecycle orchestration that reuse the shared queue/controller semantics while staying honest about retryable failures.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Mobile storage repository | Keep the controller in an explicit local-write-failed or queue-unavailable state instead of pretending persistence succeeded. | Pause reconnect drain and preserve queue order rather than dropping entries. | Reject malformed stored queue or snapshot records and expose the queue state as malformed. |
| Trusted schedule transport | Mark the current mutation retryable, stop the drain at the first failure, and preserve later entries in order. | Convert timed-out writes into retryable queue entries with visible reason/detail. | Treat malformed trusted action responses as hard failures and do not clear the queued entry. |
| `@capacitor/network` / `@capacitor/app` listeners | Keep manual refresh/retry available and avoid duplicate drains or controller instances. | Fall back to the last known status rather than oscillating route mode. | Ignore malformed lifecycle/network payloads instead of mutating sync state from guessed values. |

## Load Profile

- **Shared resources**: Preferences-backed snapshot/queue storage, Supabase writes, reconnect drain ordering, and network/app listeners.
- **Per-operation cost**: one local snapshot write plus one queue write per mutation, then one trusted write per queued entry during drain.
- **10x breakpoint**: bursty reconnects or duplicate lifecycle events will create duplicate drains first if the runtime is not singleton-safe.

## Negative Tests

- **Malformed inputs**: invalid create/edit payloads, malformed queue entries, mismatched visible-week scope, and invalid trusted responses.
- **Error paths**: repository write failure, network timeout, forbidden write, retryable drain stop, and duplicate network/app resume events.
- **Boundary conditions**: empty queue drain, local-only created shift, reconnect after multiple pending entries, and retryable queue recovery after a later successful drain.

## Steps

1. Implement the mobile repository/runtime adapters that persist week snapshots and queue entries with the shared controller/queue semantics from T01.
2. Add a trusted mobile schedule transport that maps create/edit/move/delete through the same reason/message contract the web already uses, but without relying on SvelteKit server actions.
3. Hook Capacitor Network and App lifecycle signals into one reconnect/drain authority so mobile refreshes on resume and drains only when online.
4. Add runtime-focused unit coverage for queue persistence, malformed-state fail-close behavior, and stop-on-first-error reconnect drain ordering.

## Must-Haves

- [ ] Offline create/edit/move/delete all stage local state before any server round-trip succeeds.
- [ ] Reconnect drain replays queued work in created-at order and stops on the first trusted failure with later entries preserved.
- [ ] Timed-out or rejected writes become visible retryable state instead of silently disappearing.
- [ ] Network and app lifecycle listeners do not spawn duplicate controllers or duplicate drains.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/mobile-sync-runtime.unit.test.ts tests/mobile-continuity.unit.test.ts`
- `pnpm --dir apps/mobile check`

## Observability Impact

- Signals added/changed: queue state, pending/retryable counts, sync phase, last sync attempt, and last retryable failure detail.
- How a future agent inspects this: run `pnpm --dir apps/mobile exec vitest run tests/mobile-sync-runtime.unit.test.ts` and inspect controller state surfaced by the mobile calendar route.
- Failure state exposed: queue parse failures, local persistence errors, timed-out writes, and stopped reconnect drains become attributable to named controller phases.

## Inputs

- `packages/caluno-core/src/offline/mutation-queue.ts` — shared queue semantics to reuse without drift.
- `packages/caluno-core/src/offline/sync-engine.ts` — shared replay and reconnect drain helpers.
- `packages/caluno-core/src/schedule/board.ts` — shared board shaping and diagnostic helpers used by the controller.
- `apps/web/src/lib/server/schedule.ts` — source of truth for action reason and message semantics.
- `apps/mobile/src/lib/offline/repository.ts` — mobile persistence substrate from T02.
- `apps/mobile/src/lib/supabase/client.ts` — mobile Supabase client boundary for trusted reads and writes.

## Expected Output

- `apps/mobile/src/lib/offline/repository.ts` — queue-capable mobile repository implementation finalized for runtime use.
- `apps/mobile/src/lib/offline/runtime.ts` — controller bootstrap and scope-level runtime coordinator.
- `apps/mobile/src/lib/offline/transport.ts` — trusted mobile schedule transport preserving web action semantics.
- `apps/mobile/src/lib/offline/network.ts` — Capacitor Network adapter for truthful online/offline state.
- `apps/mobile/src/lib/offline/app-lifecycle.ts` — Capacitor App lifecycle adapter for resume/pause refresh behavior.
- `apps/mobile/src/lib/offline/controller.ts` — mobile-local controller/store wrapper around the shared queue and replay rules.
- `apps/mobile/tests/mobile-sync-runtime.unit.test.ts` — unit proof for queue persistence, retryable stop-on-error, and reconnect drain ordering.
