---
estimated_steps: 4
estimated_files: 8
skills_used:
  - debug-like-expert
---

# T01: Extract the shared mobile continuity and schedule contract

**Slice:** S02 — Mobile calendar continuity and editing
**Milestone:** M003

## Description

Move the already-proven pure continuity logic out of `apps/web/src` before mobile starts reusing it. This task should create one workspace-level contract for cached shell validation, queue semantics, reconnect replay, and schedule view helpers so mobile can consume the same product rules without copying web runtime code.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Existing web offline contract helpers | Stop on the first regression and fix the shared extraction before mobile starts depending on forked logic. | Treat a hanging regression as incomplete extraction and keep mobile off the new package surface. | Fail closed on malformed cached shell, queue, or schedule payloads rather than weakening validation for portability. |
| Workspace package exports | Keep web/mobile on known-good imports until the new exports resolve cleanly. | Do not proceed to mobile runtime wiring while package resolution is ambiguous. | Reject any export shape that leaks browser, Svelte, or Capacitor runtime assumptions into the shared layer. |

## Load Profile

- **Shared resources**: shared package exports, schedule snapshot/queue serialization, and web/mobile regression suites.
- **Per-operation cost**: pure JSON validation, queue sorting/replay, and board-model shaping with no direct network or plugin calls.
- **10x breakpoint**: oversized serialized snapshots or replay helpers that accidentally depend on runtime globals will break portability first.

## Negative Tests

- **Malformed inputs**: corrupt cached shell JSON, stale continuity session metadata, invalid visible week values, malformed queue payloads.
- **Error paths**: missing exports, cross-app import regressions, and replay failures when a queued mutation targets missing trusted data.
- **Boundary conditions**: empty calendars, no queued mutations, duplicate shift ids, and a previously synced calendar id that is absent from cache.

## Steps

1. Extract the pure cached-shell validation, queue/replay, and schedule helper modules into `@repo/caluno-core`, keeping runtime adapters such as repository drivers, Svelte stores, and Supabase clients app-local.
2. Add the necessary package exports and rewire existing web imports/tests to consume the shared modules without changing current denial or replay semantics.
3. Add a mobile-local contract regression file that imports from the shared package and proves fail-closed stale-session, user-mismatch, unsynced-calendar, and replay-order behavior.
4. Keep the extracted modules free of browser, SvelteKit, and Capacitor globals so later mobile tasks can reuse them in plain unit tests.

## Must-Haves

- [ ] Mobile does not import continuity or schedule logic from `apps/web/src` after this task.
- [ ] Web offline/schedule regressions stay green against the extracted shared helpers.
- [ ] Shared helpers still fail closed on stale continuity session, user mismatch, malformed queue payloads, and missing trusted shift targets.
- [ ] A mobile-local contract test file exists before any mobile runtime adapter work starts.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/continuity-contract.unit.test.ts`
- `pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/conflicts.unit.test.ts tests/schedule/recurrence.unit.test.ts`

## Inputs

- `apps/web/src/lib/offline/app-shell-cache.ts` — current web-only trusted shell continuity contract.
- `apps/web/src/lib/offline/mutation-queue.ts` — existing queue semantics to keep shared and deterministic.
- `apps/web/src/lib/offline/sync-engine.ts` — existing reconnect replay and refresh rules to extract intact.
- `apps/web/src/lib/schedule/board.ts` — current board shaping helpers worth sharing.
- `apps/web/src/lib/schedule/conflicts.ts` — current conflict shaping helpers worth sharing.
- `apps/web/src/lib/schedule/recurrence.ts` — current recurrence validation and expansion helpers.
- `apps/web/tests/schedule/offline-queue.unit.test.ts` — regression proof for queue persistence and controller semantics.
- `apps/web/tests/schedule/sync-engine.unit.test.ts` — regression proof for replay order and drain rules.
- `apps/mobile/package.json` — mobile workspace baseline for the new shared test surface.

## Expected Output

- `packages/caluno-core/package.json` — shared package exports extended for offline and schedule helpers.
- `packages/caluno-core/src/index.ts` — shared package barrel updated for new continuity helpers.
- `packages/caluno-core/src/offline/app-shell-cache.ts` — pure cached-shell validation contract.
- `packages/caluno-core/src/offline/mutation-queue.ts` — shared queue contract and validation.
- `packages/caluno-core/src/offline/sync-engine.ts` — shared replay and reconnect drain helpers.
- `packages/caluno-core/src/schedule/board.ts` — shared board view-model shaping helpers.
- `packages/caluno-core/src/schedule/conflicts.ts` — shared conflict derivation helpers.
- `packages/caluno-core/src/schedule/recurrence.ts` — shared recurrence validation and expansion helpers.
- `apps/mobile/tests/continuity-contract.unit.test.ts` — mobile-local proof that the shared continuity contract still fails closed.
