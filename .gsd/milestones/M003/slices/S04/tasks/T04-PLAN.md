---
estimated_steps: 41
estimated_files: 7
skills_used: []
---

# T04: Wire shared-change dispatch and prove notification state end to end

---
estimated_steps: 20
estimated_files: 7
skills_used:
  - verify-before-complete
  - debug-like-expert
---

# T04: Wire shared-change dispatch and prove notification state end to end

Close the slice with real integration evidence. Add the provider-neutral server dispatch seam that can consume calendar-change events and target enabled device subscriptions, then extend the mobile Playwright harness so it proves toggle visibility, persistence, degraded states, and safe tap landing without over-claiming actual delivered notification correctness that belongs to S05.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Supabase function / shared-change dispatch seam | Surface remote delivery as degraded/provider-unconfigured and keep persisted subscription intent truthful. | Treat dispatch verification as incomplete and block slice closure. | Reject malformed change payloads or unsafe target paths before any delivery attempt is recorded. |
| Mobile Playwright harness | Stop on the first failing explicit diagnostic rather than inferring success from UI prose. | Treat long-running toggle/tap assertions as incomplete evidence and debug against named `data-*` surfaces. | Fail the spec if toggle, degraded state, or tap-routing metadata is missing or malformed. |
| Mobile build / Capacitor sync | Block completion until the new notification plugins and iOS wiring are synced into the native project. | Keep the slice open until native packaging succeeds. | Do not accept partial plugin sync or missing AppDelegate/package updates. |

## Load Profile

- **Shared resources**: seeded Supabase data, notification preference tables, Edge Function dispatch seam, Playwright browser harness, and Capacitor native project generation.
- **Per-operation cost**: local DB reset, sign-in, groups/calendar navigation, toggle save cycles, simulated tap action, browser assertions, and native sync/build.
- **10x breakpoint**: flaky async save/tap waits and missing plugin sync will break proof before the feature logic should.

## Negative Tests

- **Malformed inputs**: unsafe notification target path, malformed dispatch payload, missing provider config, and duplicate toggle actions across reload.
- **Error paths**: explicit permission denial/degraded remote subscription state, save failure, rejected tap route, and provider-unconfigured dispatch attempt.
- **Boundary conditions**: one enabled and one disabled calendar on the same device, reload after toggling, reopening the active calendar route, and simulated notification tap into a permitted calendar from another screen.

## Steps

1. Add a provider-neutral Supabase Edge Function dispatch seam that reads enabled device subscriptions for a calendar change, shapes sanitized payloads, and records explicit degraded/provider-unconfigured outcomes instead of pretending live push delivery succeeded.
2. Extend `apps/mobile/tests/e2e/fixtures.ts` with a notification harness that can simulate permission state, registration state, and notification-action events in the browser so Playwright can verify honest UI state and tap routing.
3. Add `apps/mobile/tests/e2e/calendar-notifications.spec.ts` covering one-toggle-per-calendar visibility, enable/disable persistence across reload, degraded permission/remote states, and notification tap landing in the intended mobile calendar context.
4. Re-run auth/scope and calendar-offline proof plus mobile unit suites, then finish with `check`, `build`, and `cap:sync` so notification plugins and any AppDelegate wiring are packaged into the native shell.

## Must-Haves

- [ ] A provider-neutral shared-change dispatch seam exists and exposes explicit degraded/provider-unconfigured outcomes instead of a fake subscribed state.
- [ ] Playwright proves one toggle per permitted calendar, state persistence across reload, explicit degraded states, and safe tap landing into the intended mobile context.
- [ ] Existing auth/scope and offline continuity proof stay green alongside the new notification flow.
- [ ] `cap:sync` updates native iOS/plugin wiring so the feature is not browser-only scaffolding.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/mobile-continuity.unit.test.ts tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts tests/mobile-notification-router.unit.test.ts`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-notifications.spec.ts`
- `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'`

## Observability Impact

- Signals added/changed: remote dispatch result code, toggle persistence across reload, simulated notification action result, and native plugin sync evidence.
- How a future agent inspects this: Edge Function source, Playwright notification fixtures/spec, and generated iOS package/AppDelegate files after sync.
- Failure state exposed: `provider-unconfigured`, `tap-route-rejected`, and plugin-sync regressions remain explicit and reproducible.

## Inputs

- ``supabase/migrations/20260422_000001_device_notifications.sql` — notification schema and access rules from T01.`
- ``apps/mobile/src/lib/notifications/runtime.ts` — runtime state and toggle behavior from T02.`
- ``apps/mobile/src/lib/notifications/router.ts` — safe tap-routing helper from T03.`
- ``apps/mobile/tests/e2e/fixtures.ts` — existing mobile Playwright seed and connectivity harness.`
- ``apps/mobile/ios/App/App/AppDelegate.swift` — current iOS app delegate that may need push registration forwarding.`
- ``apps/mobile/ios/App/CapApp-SPM/Package.swift` — current Capacitor SPM package list before notification plugins sync.`

## Expected Output

- ``supabase/functions/notify-calendar-change/index.ts` — provider-neutral dispatch seam for shared-calendar change notifications.`
- ``apps/mobile/tests/e2e/fixtures.ts` — Playwright notification simulation helpers and assertions.`
- ``apps/mobile/tests/e2e/calendar-notifications.spec.ts` — end-to-end proof for toggle visibility, persistence, degraded states, and safe tap landing.`
- ``apps/mobile/playwright.config.ts` — notification spec coverage kept inside the mobile harness if path/config updates are needed.`
- ``apps/mobile/ios/App/App/AppDelegate.swift` — native push registration/action bridge updated by implementation or sync.`
- ``apps/mobile/ios/App/CapApp-SPM/Package.swift` — synced notification plugin package references.`
- ``apps/mobile/ios/App/App/capacitor.config.json` — synced native plugin configuration state.`

## Verification

pnpm --dir apps/mobile exec vitest run tests/mobile-continuity.unit.test.ts tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts tests/mobile-notification-router.unit.test.ts && npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-notifications.spec.ts && pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'

## Observability Impact

This task touches server dispatch, browser proof, and native packaging boundaries, so explicit function result codes, Playwright diagnostics, and synced iOS files are required to localize failures quickly.
