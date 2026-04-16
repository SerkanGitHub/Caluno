---
estimated_steps: 26
estimated_files: 4
skills_used:
  - debug-like-expert
---

# T02: Prove conflict visibility through trusted, offline reconnect, and realtime collaborator flows

## Description

Turn the new warning layer into milestone-closing proof. Use the existing seeded fixtures plus the S03/S04 local-first substrate to show that conflicts are visible online, appear immediately for offline local overlaps, survive reload and reconnect replay, and propagate to another online session through realtime-triggered trusted refreshes.

Load the installed `debug-like-expert` skill before changing browser proof so the known preview-backed repository/realtime fragility stays observable and every failure retains enough flow context to tell whether the problem came from conflict rendering, offline continuity, reconnect drain, or channel readiness.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Preview-backed runtime, browser-local repository, and reconnect surface | Stop the scenario with retained diagnostics instead of claiming offline conflict continuity on an untrusted runtime. | Keep the failure localized to readiness/wait helpers and preserve queue/realtime state in the flow attachment. | Fail closed and treat the route as proof-invalid rather than guessing conflict state. |
| Multi-session realtime proof and trusted refresh pipeline | Keep the primary session assertions explicit and capture collaborator diagnostics before rerun. | Abort the collaborator wait with channel/refresh metadata attached instead of hiding flake behind long sleeps. | Treat the remote refresh as failed and preserve the last signal / channel reason in retained diagnostics. |

## Load Profile

- **Shared resources**: local Supabase stack, preview build/runtime, browser-local repository, reconnect queue, and two Playwright pages/contexts.
- **Per-operation cost**: one local stack reset, trusted-online seeded assertions, offline reload/reconnect scenario, and a multi-session collaborator propagation scenario.
- **10x breakpoint**: slower preview repository bootstrap and realtime readiness will fail first, so the specs must prefer explicit readiness/conflict assertions over fixed delays.

## Negative Tests

- **Malformed inputs**: unsynced or unauthorized calendar ids, stale cached scope, and mismatched collaborator week scope.
- **Error paths**: repository-unavailable preview boots, reconnect leaving retryable entries, realtime channel never reaching `ready`, and remote refresh failing after a signal.
- **Boundary conditions**: seeded touch boundary staying clean, local overlap created while offline, reload before reconnect, reconnect draining multiple pending writes, and collaborator viewing the next week while the writer changes the current week.

## Steps

1. Extend `apps/web/tests/e2e/fixtures.ts` with conflict-specific readers/waits so browser proof can inspect board/day/shift warnings alongside the already-existing route, queue, sync, and realtime diagnostics.
2. Expand `apps/web/tests/e2e/calendar-shifts.spec.ts` to assert the seeded Thursday overlap warning, the clean Wednesday touch boundary, and unchanged denied-route behavior in the trusted-online path.
3. Expand `apps/web/tests/e2e/calendar-offline.spec.ts` to create or move an overlapping shift while offline, prove the warning appears immediately, survives reload, and remains visible after reconnect drains the queue.
4. Expand `apps/web/tests/e2e/calendar-sync.spec.ts` so one session creates a visible-week overlap and the collaborator session refreshes to the same warning without manual reload, while next-week scope guards still prevent out-of-scope refreshes.
5. Keep retained diagnostics rich enough to localize preview-backed failures by conflict state, queue summary, sync phase, channel state, remote refresh state, and denied/offline-denied metadata.

## Must-Haves

- [ ] Trusted-online browser proof shows the seeded Thursday overlap warning and the clean Wednesday touch boundary in the same visible week.
- [ ] Offline browser proof shows a locally created or moved overlap warning immediately, keeps it across reload, and still shows it after reconnect drains to `0 pending / 0 retryable`.
- [ ] Realtime browser proof shows a collaborator-triggered overlap warning appear without manual reload while out-of-scope next-week views stay untouched.

## Inputs

- `apps/web/src/lib/schedule/conflicts.ts`
- `apps/web/src/lib/schedule/board.ts`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte`
- `apps/web/src/lib/components/calendar/ShiftCard.svelte`
- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`
- `apps/web/tests/e2e/calendar-offline.spec.ts`
- `apps/web/tests/e2e/calendar-sync.spec.ts`

## Expected Output

- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`
- `apps/web/tests/e2e/calendar-offline.spec.ts`
- `apps/web/tests/e2e/calendar-sync.spec.ts`

## Verification

npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts && pnpm --dir apps/web build && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts

## Observability Impact

- Signals added/changed: retained browser diagnostics now include conflict-summary state together with queue, sync, realtime, and denial metadata.
- How a future agent inspects this: run the named Playwright specs and inspect the attached flow-diagnostics payloads when overlap visibility or preview readiness regresses.
- Failure state exposed: a broken warning layer can be localized to trusted-online render, offline repository bootstrap, reconnect replay, or realtime refresh without guessing from screenshots alone.
