---
id: T02
parent: S04
milestone: M003
key_files:
  - apps/mobile/package.json
  - apps/mobile/src/lib/offline/repository.ts
  - apps/mobile/src/lib/offline/app-lifecycle.ts
  - apps/mobile/src/lib/notifications/types.ts
  - apps/mobile/src/lib/notifications/transport.ts
  - apps/mobile/src/lib/notifications/local-notifications.ts
  - apps/mobile/src/lib/notifications/push-notifications.ts
  - apps/mobile/src/lib/notifications/scheduler.ts
  - apps/mobile/src/lib/notifications/runtime.ts
  - apps/mobile/tests/mobile-notification-runtime.unit.test.ts
key_decisions:
  - Wrap Capacitor local and push plugins behind typed app-local adapters so later UI/runtime code can use fakes and never parse raw plugin payloads directly.
  - Persist `desiredEnabled=true` before reconciling native permission/registration so the toggle intent survives degraded local or remote runtime state.
  - Treat malformed trusted week metadata/snapshots as an explicit `schedule-unavailable` degradation instead of silently interpreting them as a healthy empty reminder set.
  - Use deterministic reminder ids derived from installation id + calendar id + shift id + trigger time, with the default trigger set to the trusted shift start timestamp until product defines a different lead time.
duration: 
verification_result: passed
completed_at: 2026-05-04T11:22:40.872Z
blocker_discovered: false
---

# T02: Added Capacitor-backed notification adapters and a deterministic mobile reminder resync runtime with explicit degraded states.

**Added Capacitor-backed notification adapters and a deterministic mobile reminder resync runtime with explicit degraded states.**

## What Happened

Implemented the mobile notification runtime seams promised by S04. Added real typed adapters for `@capacitor/local-notifications` and `@capacitor/push-notifications` in `apps/mobile/src/lib/notifications/local-notifications.ts` and `push-notifications.ts`, keeping plugin parsing, permission checks, registration, pending-queue inspection, and action-event normalization outside UI code so later routes can use fakes instead of touching native plugins directly. Extended `apps/mobile/src/lib/offline/repository.ts` with trusted week enumeration that walks only stored per-calendar metadata/snapshots and carries discarded malformed week evidence forward instead of silently treating bad storage as an empty healthy reminder set. Added `apps/mobile/src/lib/notifications/scheduler.ts` to compute deterministic reminder ids from installation id + calendar id + shift id + trigger time, dedupe reminder plans across trusted weeks, and diff desired reminders against pending device notifications so reopen/resume updates known ids rather than duplicating them.

Built `apps/mobile/src/lib/notifications/runtime.ts` to compose persisted desired preference rows with native permission/registration truth and bounded local reminder resync. The runtime now loads persisted per-calendar preference intent, keeps desired intent separate from local reminder readiness and remote subscription health, persists `desiredEnabled=true` before reconciling native state, resyncs on resume/reconnect, cancels only the target calendar’s reminders on disable, and degrades explicitly for permission denial, registration failure, pending-queue failures, and malformed trusted storage. I also lightly extended `apps/mobile/src/lib/offline/app-lifecycle.ts` with a no-op non-DOM fallback so this runtime remains testable/SSR-safe without accidentally invoking Capacitor’s browser shim. Added `apps/mobile/tests/mobile-notification-runtime.unit.test.ts` to prove deterministic resume resync, permission denial, registration failure with local reminders still armed, single-calendar disable without sibling cancellation, and malformed trusted-week degradation. Finally, updated `apps/mobile/package.json` to add the native notification plugins and tightened `apps/mobile/src/lib/notifications/transport.ts` so preference writes are discriminated by `ok`, which keeps `svelte-check` honest about success vs failure paths.

## Verification

Ran the task verification commands from the plan after the final fixes landed. `pnpm --dir apps/mobile exec vitest run tests/mobile-continuity.unit.test.ts tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts` passed all 15 continuity/notification contract/runtime tests, covering the new adapters and deterministic reminder runtime alongside the earlier T01 contract proof. `pnpm --dir apps/mobile check` then passed with zero Svelte/TypeScript errors, confirming the new runtime, repository enumeration, adapter types, and fake transport discrimination compile cleanly. Slice-level browser, Playwright, and native `cap:sync` proof remain for later tasks in this slice; for T02 the required unit/runtime and check surfaces are green.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/mobile exec vitest run tests/mobile-continuity.unit.test.ts tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts` | 0 | ✅ pass | 1365ms |
| 2 | `pnpm --dir apps/mobile check` | 0 | ✅ pass | 2842ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/package.json`
- `apps/mobile/src/lib/offline/repository.ts`
- `apps/mobile/src/lib/offline/app-lifecycle.ts`
- `apps/mobile/src/lib/notifications/types.ts`
- `apps/mobile/src/lib/notifications/transport.ts`
- `apps/mobile/src/lib/notifications/local-notifications.ts`
- `apps/mobile/src/lib/notifications/push-notifications.ts`
- `apps/mobile/src/lib/notifications/scheduler.ts`
- `apps/mobile/src/lib/notifications/runtime.ts`
- `apps/mobile/tests/mobile-notification-runtime.unit.test.ts`
