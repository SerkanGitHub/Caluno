---
estimated_steps: 30
estimated_files: 3
skills_used: []
---

# T01: Reworked the offline Playwright proof to re-resolve the created shift’s rendered id across reload and reconnect so post-drain conflict assertions follow the server-confirmed shift id.

Use the installed `debug-like-expert` skill before coding. The current offline spec is red because it keeps asserting conflict state against the pre-reconnect local create id even though `reconcileSuccessfulMutation()` is designed to remap that id to the trusted server id after acknowledgement. Keep this task tightly scoped to the offline preview proof: stabilize the helper/spec so cached-offline reopen, reload continuity, reconnect drain, and post-reconnect conflict assertions all follow the remapped shift identity. Only touch runtime code if an isolated clean-db rerun proves the remap contract itself is not surfacing in the rendered board after the queue drains.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Preview-backed offline route + browser-local repository | Stop and retain the route/queue/snapshot diagnostics instead of claiming cached-offline continuity. | Fail on readiness with captured `calendar-route-state` / `calendar-local-state` evidence instead of adding longer blind waits. | Treat the run as proof-invalid and keep the failing flow diagnostics attached. |
| Local-first create → reconnect reconciliation contract | Re-read the created card from visible board state before asserting overlaps; do not trust the old local id. | Abort the reconnect assertion once queue drain or board settle stops progressing and capture the last visible sync state. | Fail closed and inspect `calendar-controller.ts` rather than guessing the server-confirmed id. |

## Load Profile

- **Shared resources**: local Supabase reset, preview build/runtime, browser-local snapshot store, reconnect queue.
- **Per-operation cost**: one isolated preview spec run with offline reload and reconnect replay.
- **10x breakpoint**: preview repository bootstrap and reconnect settle timing will fail first, so waits must stay signal-driven.

## Negative Tests

- **Malformed inputs**: missing created-card `data-testid`, stale cached scope, or unexpected shift-id remap shape.
- **Error paths**: offline reopen degrading to `offline-denied`, reconnect leaving pending/retryable entries, or remapped id never appearing after a successful create.
- **Boundary conditions**: local overlap absent before the move, visible after the move, preserved across offline reload, and still visible after reconnect drain.

## Steps

1. Re-run `tests/e2e/calendar-offline.spec.ts` against a clean local reset to confirm the final failing assertion is still the stale local-id lookup described in S06 research.
2. Add or extend a shared Playwright helper in `apps/web/tests/e2e/fixtures.ts` so the spec can re-resolve the created shift card/id from visible board state after reconnect instead of reusing the pre-reconnect `local-*` id.
3. Update `apps/web/tests/e2e/calendar-offline.spec.ts` to use that helper around the reconnect boundary and keep the queue/conflict assertions tied to visible board diagnostics.
4. If the isolated rerun proves the UI never exposes the remapped id after the queue drains, patch the minimal runtime surface in `apps/web/src/lib/offline/calendar-controller.ts` that prevents the server-confirmed id from surfacing, then rerun the spec.

## Must-Haves

- [ ] Cached-offline reopen still proves the seeded Thursday overlap and the Friday offline overlap before reconnect.
- [ ] After reconnect drains to `0 pending / 0 retryable`, the spec re-finds the created shift by rendered card state and proves the Friday conflict against the server-confirmed id.
- [ ] The task leaves behind a reusable helper so later browser proof does not rely on stale local ids.

## Verification

- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts`
- `pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts`

## Observability Impact

- Signals added/changed: offline proof can now distinguish the local create id from the server-confirmed id at reconnect time.
- How a future agent inspects this: rerun `calendar-offline.spec.ts` and inspect the retained flow diagnostics plus the resolved created-card `data-testid` after reconnect.
- Failure state exposed: queue drain may succeed while id remap proof fails, making stale-assertion regressions obvious instead of looking like conflict regressions.

## Inputs

- ``apps/web/tests/e2e/calendar-offline.spec.ts``
- ``apps/web/tests/e2e/fixtures.ts``
- ``apps/web/src/lib/offline/calendar-controller.ts``
- ``apps/web/src/lib/offline/sync-engine.ts``

## Expected Output

- ``apps/web/tests/e2e/calendar-offline.spec.ts``
- ``apps/web/tests/e2e/fixtures.ts``
- ``apps/web/src/lib/offline/calendar-controller.ts``

## Verification

npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts

## Observability Impact

Uses the existing route/queue/conflict diagnostics to make local-id vs server-id reconciliation inspectable at the reconnect boundary.
