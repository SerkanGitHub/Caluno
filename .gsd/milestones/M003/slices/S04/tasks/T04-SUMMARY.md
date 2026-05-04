---
id: T04
parent: S04
milestone: M003
key_files:
  - supabase/functions/notify-calendar-change/index.ts
  - apps/mobile/src/lib/components/notifications/CalendarNotificationToggle.svelte
  - apps/mobile/src/lib/notifications/transport.ts
  - apps/mobile/src/lib/notifications/local-notifications.ts
  - apps/mobile/src/lib/notifications/push-notifications.ts
  - apps/mobile/src/lib/notifications/device-installation.ts
  - apps/mobile/src/lib/notifications/router.ts
  - apps/mobile/src/lib/offline/repository.ts
  - apps/mobile/tests/e2e/fixtures.ts
  - apps/mobile/tests/e2e/calendar-notifications.spec.ts
  - apps/mobile/ios/App/CapApp-SPM/Package.swift
  - apps/mobile/ios/App/App/capacitor.config.json
key_decisions:
  - Keep the shared-change dispatch seam provider-neutral and degrade targeted subscriptions to `provider-unconfigured` when server provider config is absent, rather than fabricating success.
  - Use a Playwright-only in-browser notification plugin harness so browser proof can exercise the real mobile runtime and route diagnostics without claiming real push delivery.
  - Wrap timeout inputs with `Promise.resolve(...)` across notification/offline helpers so Supabase/PostgREST thenables behave correctly in browser verification.
duration: 
verification_result: mixed
completed_at: 2026-05-04T11:59:35.803Z
blocker_discovered: false
---

# T04: Added the shared-change dispatch seam, Playwright notification harness, and native notification plugin sync, but the new toggle E2E still needs follow-up.

**Added the shared-change dispatch seam, Playwright notification harness, and native notification plugin sync, but the new toggle E2E still needs follow-up.**

## What Happened

Implemented the missing server-side shared-change seam at `supabase/functions/notify-calendar-change/index.ts`. The function now requires an authenticated calendar member context, sanitizes internal target paths, looks up enabled per-installation calendar preferences, and degrades targeted subscriptions to `provider-unconfigured` when no provider is configured instead of pretending delivery succeeded.

On mobile, I extended the notification stack so Playwright can simulate local/push notification plugins in-browser, added deterministic helpers in `apps/mobile/tests/e2e/fixtures.ts`, and wrote `apps/mobile/tests/e2e/calendar-notifications.spec.ts` to cover toggle visibility, persistence, degraded states, and safe tap routing. I also hardened the notification/offline timeout helpers to wrap Promise-like thenables with `Promise.resolve(...)`, which fixed the browser-only `promise.finally is not a function` failure that unit tests had masked.

To make the shipped control more semantically honest and easier to automate, I converted `CalendarNotificationToggle.svelte` from a hidden-checkbox switch to a button-based `role="switch"` surface. I then ran the full non-notification verification stack successfully and synced Capacitor so iOS packaging now includes local and push notification plugins in `Package.swift` and `capacitor.config.json`.

The remaining unresolved issue is isolated to the new notification Playwright proof: the shared-calendar toggle still settles back to `data-notification-enabled=false` after the simulated interaction, even though the surface briefly reports `data-notification-phase=syncing-preference`. Existing auth/offline browser proof, notification unit suites, `check`, `build`, and `cap:sync` all pass; only the new notification E2E remains red.

## Verification

Verified the updated notification/runtime code with `pnpm --dir apps/mobile check` and the four mobile unit suites; all passed. Re-ran the existing browser contracts with `pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts`; all six tests passed after the final code changes. Re-ran the new notification browser proof with `pnpm --dir apps/mobile exec playwright test tests/e2e/calendar-notifications.spec.ts`; it still fails on the shared-calendar toggle staying `data-notification-enabled=false`. Finished with `pnpm --dir apps/mobile build && ... cap:sync`, which passed and updated the iOS plugin packaging.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/mobile check` | 0 | ✅ pass | 3001ms |
| 2 | `pnpm --dir apps/mobile exec vitest run tests/mobile-continuity.unit.test.ts tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts tests/mobile-notification-router.unit.test.ts` | 0 | ✅ pass | 716ms |
| 3 | `npx --yes supabase db reset --local --yes` | 0 | ✅ pass | 25400ms |
| 4 | `pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts` | 0 | ✅ pass | 12200ms |
| 5 | `pnpm --dir apps/mobile exec playwright test tests/e2e/calendar-notifications.spec.ts` | 1 | ❌ fail | 12600ms |
| 6 | `pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'` | 0 | ✅ pass | 5300ms |

## Deviations

Converted the notification switch implementation from a hidden checkbox to a button-based `role="switch"` control while debugging the browser interaction path. The new Playwright proof currently relies on the simulated notification-plugin harness and deterministic RPC stubs rather than a fully green real toggle write path, because the direct browser interaction still regresses in the new notification spec.

## Known Issues

`pnpm --dir apps/mobile exec playwright test tests/e2e/calendar-notifications.spec.ts` still fails. The shared-calendar toggle briefly enters `data-notification-phase=syncing-preference` but settles back to `data-notification-enabled=false` / `data-remote-subscription=unsubscribed`, so the new notification persistence/degraded/tap suite is not yet green. Existing auth/offline E2E remains green.

## Files Created/Modified

- `supabase/functions/notify-calendar-change/index.ts`
- `apps/mobile/src/lib/components/notifications/CalendarNotificationToggle.svelte`
- `apps/mobile/src/lib/notifications/transport.ts`
- `apps/mobile/src/lib/notifications/local-notifications.ts`
- `apps/mobile/src/lib/notifications/push-notifications.ts`
- `apps/mobile/src/lib/notifications/device-installation.ts`
- `apps/mobile/src/lib/notifications/router.ts`
- `apps/mobile/src/lib/offline/repository.ts`
- `apps/mobile/tests/e2e/fixtures.ts`
- `apps/mobile/tests/e2e/calendar-notifications.spec.ts`
- `apps/mobile/ios/App/CapApp-SPM/Package.swift`
- `apps/mobile/ios/App/App/capacitor.config.json`
