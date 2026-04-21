---
id: T03
parent: S02
milestone: M003
key_files:
  - apps/mobile/src/lib/offline/controller.ts
  - apps/mobile/src/lib/offline/transport.ts
  - apps/mobile/tests/mobile-sync-runtime.unit.test.ts
key_decisions:
  - (none)
duration: 
verification_result: mixed
completed_at: 2026-04-21T10:54:26.799Z
blocker_discovered: false
---

# T03: Stabilized the mobile local-first sync runtime by fixing the trusted transport/controller build break and adding deterministic reconnect-drain failure coverage.

**Stabilized the mobile local-first sync runtime by fixing the trusted transport/controller build break and adding deterministic reconnect-drain failure coverage.**

## What Happened

The expected T03 runtime files were already present from a partial implementation, so I verified them against the shared offline contracts before changing code. I confirmed the mobile local-first repository, controller, runtime, network, app-lifecycle, and trusted transport adapters were implemented, then fixed the actual blockers preventing T03 from being shippable: `apps/mobile/src/lib/offline/controller.ts` was missing the `ReconnectDrainActionRequest` type import used by `createImmediateSubmitRequest`, and `apps/mobile/src/lib/offline/transport.ts` was missing the `NormalizedScheduleRecurrence` import while also containing a corrupted duplicated tail that left the file syntactically invalid for `svelte-check`. After repairing those build breakers, I extended `apps/mobile/tests/mobile-sync-runtime.unit.test.ts` with a deterministic reconnect-drain case that proves queued mutations drain in created-at order, stop on the first retryable failure, and preserve later entries as pending work instead of draining past the failure. No slice-blocking architectural mismatch was discovered; this task closed by finishing and validating the intended runtime layer rather than replanning the slice.

## Verification

Task-local verification passed with `pnpm --dir apps/mobile exec vitest run tests/mobile-sync-runtime.unit.test.ts tests/mobile-continuity.unit.test.ts` and `pnpm --dir apps/mobile check`. I also ran the broader slice regressions: the shared mobile contract suite passed, the web offline regression suite passed, and `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'` passed, confirming the Capacitor plugin wiring for `@capacitor/app`, `@capacitor/network`, and `@capacitor/preferences`. The combined Playwright slice command did not fully pass: local Supabase reset succeeded and `tests/e2e/auth-scope.spec.ts` started, but the existing "reload keeps a valid trusted session working and sign-out closes protected routes again" check failed because the protected calendar route remained open after sign-out instead of redirecting to `/signin?flow=auth-required`; `apps/mobile/tests/e2e/calendar-offline.spec.ts` is also not present yet, which matches later T05 scope rather than this T03 runtime task.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/mobile exec vitest run tests/mobile-sync-runtime.unit.test.ts tests/mobile-continuity.unit.test.ts` | 0 | ✅ pass | 1332ms |
| 2 | `pnpm --dir apps/mobile check` | 0 | ✅ pass | 2571ms |
| 3 | `pnpm --dir apps/mobile exec vitest run tests/continuity-contract.unit.test.ts tests/mobile-continuity.unit.test.ts tests/mobile-sync-runtime.unit.test.ts` | 0 | ✅ pass | 1902ms |
| 4 | `pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/conflicts.unit.test.ts tests/schedule/recurrence.unit.test.ts` | 0 | ✅ pass | 1988ms |
| 5 | `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'` | 0 | ✅ pass | 6946ms |
| 6 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts` | 1 | ❌ fail | 42991ms |

## Deviations

The planned runtime files and unit test file already existed from a prior partial implementation, so execution completed by repairing the real compile-time/runtime blockers and strengthening the missing drain-order proof instead of creating those files from scratch.

## Known Issues

The slice-level Playwright command still fails in `apps/mobile/tests/e2e/auth-scope.spec.ts` because a signed-out session can remain on the protected calendar URL instead of being redirected back to sign-in. Also, `apps/mobile/tests/e2e/calendar-offline.spec.ts` does not exist yet, which aligns with later T05 work rather than a T03 blocker.

## Files Created/Modified

- `apps/mobile/src/lib/offline/controller.ts`
- `apps/mobile/src/lib/offline/transport.ts`
- `apps/mobile/tests/mobile-sync-runtime.unit.test.ts`
