---
id: S04
parent: M003
milestone: M003
provides:
  - Per-device/per-calendar preference persistence keyed by stable installation id.
  - Deterministic local reminder scheduling and cancellation bounded to trusted synced weeks.
  - Truthful notification toggle state mirrored across the groups route and active calendar route.
  - Safe notification tap routing through normalized internal paths and trusted calendar scope.
  - Provider-neutral shared-change dispatch seam with explicit degraded subscription states.
requires:
  - slice: S02
    provides: Trusted synced-week repository data, reconnect/lifecycle seams, and mobile calendar context used for deterministic reminder scheduling and resync.
affects:
  - S05
key_files:
  - supabase/migrations/20260422_000001_device_notifications.sql
  - supabase/functions/notify-calendar-change/index.ts
  - apps/mobile/src/lib/notifications/device-installation.ts
  - apps/mobile/src/lib/notifications/transport.ts
  - apps/mobile/src/lib/notifications/runtime.ts
  - apps/mobile/src/lib/notifications/router.ts
  - apps/mobile/src/lib/components/notifications/CalendarNotificationToggle.svelte
  - apps/mobile/tests/e2e/fixtures.ts
  - apps/mobile/tests/e2e/calendar-notifications.spec.ts
key_decisions:
  - Use an app-generated stable installation UUID as the durable mobile notification identity instead of treating the push token as the primary key.
  - Persist desiredEnabled intent before native permission and registration reconciliation so the toggle remains truthful under degraded local or remote conditions.
  - Normalize notification-open targets through trusted internal-path routing plus permitted calendar scope before navigation.
  - Keep the shared-change dispatch seam provider-neutral and surface missing provider configuration as an explicit degraded state rather than fabricated success.
patterns_established:
  - Typed mobile notification adapters isolate Capacitor plugin parsing from UI/runtime code.
  - Per-calendar notification UI should project desired intent, local readiness, remote health, phase, and reason separately.
  - Playwright notification verification should use a persistent in-browser harness for stable installation identity, frozen seeded time, and cross-navigation notification state.
observability_surfaces:
  - `data-notification-enabled`, `data-notification-permission`, `data-local-reminders`, `data-remote-subscription`, `data-notification-phase`, and `data-notification-reason` on `/groups` and `/calendars/[calendarId]`.
  - Notification-route diagnostics for `idle`, `navigated`, `path-rejected`, and `navigation-timeout`.
  - Unit suites covering contract, runtime, router, and continuity interactions plus Playwright notification scenarios.
drill_down_paths:
  - .gsd/milestones/M003/slices/S04/tasks/T01-SUMMARY.md
  - .gsd/milestones/M003/slices/S04/tasks/T02-SUMMARY.md
  - .gsd/milestones/M003/slices/S04/tasks/T03-SUMMARY.md
  - .gsd/milestones/M003/slices/S04/tasks/T04-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-05-04T12:18:20.586Z
blocker_discovered: false
---

# S04: Device notification controls and delivery wiring

**S04 made mobile notifications real: each permitted calendar now has one per-device toggle backed by a stable installation identity, truthful reminder/subscription state, deterministic reminder resync, and fail-closed notification routing.**

## What Happened

## Delivered
- Added a stable mobile notification control plane rooted in an app-generated installation UUID, with Supabase-backed per-installation/per-calendar preference rows and scoped RPC helpers.
- Wrapped local and push notification plugins behind typed mobile adapters, then composed them into a runtime that preserves desired toggle intent while separately reporting permission state, local reminder readiness, remote subscription health, and degraded reason codes.
- Scheduled reminders only from trusted synced mobile weeks already stored on-device, using deterministic reminder ids so reopen/reconnect resync updates or cancels known reminders instead of duplicating them.
- Shipped one reusable calendar notification toggle that appears exactly once per permitted calendar on `/groups` and mirrors the same state on `/calendars/[calendarId]`.
- Added notification tap routing through normalized internal paths plus trusted calendar scope, so unsafe payloads and stale calendar targets fail closed as `path-rejected` instead of navigating optimistically.
- Added the provider-neutral shared-change dispatch seam and honest degraded states such as `permission-denied`, `registration-failed`, `provider-unconfigured`, and `path-rejected`.
- Hardened the Playwright browser harness so notification verification is deterministic: it now seeds a stable installation id, freezes time around seeded shifts, persists simulated permission/registration state across navigations, and buffers action events until listeners are attached.

## Integration Closure
S04 consumed S02's trusted synced-week repository, reconnect/lifecycle seams, and mobile calendar context, then added the notification substrate S05 needs: installation-backed preference persistence, deterministic local reminder scheduling, truthful per-calendar runtime diagnostics, and sanitized notification-open routing. The slice stayed within the existing shared scheduling substrate; notification runtime and browser/native seams remained app-local inside `apps/mobile`.

## Observability And Failure Readiness
Route and toggle surfaces now expose `data-notification-enabled`, `data-notification-permission`, `data-local-reminders`, `data-remote-subscription`, `data-notification-phase`, `data-notification-reason`, and notification-route diagnostics. Future agents can inspect `/groups`, `/calendars/[calendarId]`, the notification unit suites, and the Playwright harness to distinguish disabled intent from degraded delivery instead of inferring from a single boolean. The recovery path for notification issues is explicit: refresh trusted scope, inspect per-calendar diagnostics, verify installation/preference rows after `supabase db reset`, and then re-run the mobile notification Playwright suite.

## Requirement And Boundary Outcome
R010 is now validated: one per-device/per-calendar control governs both reminders and shared-calendar change notification intent, persists across reload, and mirrors consistently across the mobile groups and calendar routes. R023 advanced materially but is not fully closed here: S04 established deterministic ids, provider-neutral dispatch, honest degraded states, and safe tap routing, while S05 still needs to prove final cross-surface delivery correctness, duplicate suppression, and real delivered-notification behavior against the assembled app.

## Remaining Gap
Real provider delivery remains intentionally degraded to `provider-unconfigured` when remote infrastructure is absent. S05 should use the substrate delivered here to prove enabled calendars notify, disabled calendars stay quiet, duplicates are suppressed, and delivered taps land in the right mobile context end to end.

## Verification

## Commands Run
1. `pnpm --dir apps/mobile exec vitest run tests/mobile-continuity.unit.test.ts tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts tests/mobile-notification-router.unit.test.ts`
2. `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-notifications.spec.ts`
3. `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'`

## Result
- 22 mobile unit tests passed across continuity, notification contract, runtime, and router coverage.
- 10 Playwright tests passed across auth scope, offline continuity, and calendar notification verification.
- `svelte-check` passed with 0 errors / 0 warnings.
- Production build passed.
- Capacitor sync passed and confirmed iOS plugin packaging for local notifications, push notifications, network, preferences, and app runtime.

## Operational Readiness
- Health signals: per-calendar notification data attributes on `/groups` and `/calendars/[calendarId]`, router diagnostics, unit suites, and the Playwright notification harness.
- Failure signals: explicit degraded reasons including `permission-denied`, `registration-failed`, `provider-unconfigured`, `schedule-unavailable`, and `path-rejected`.
- Recovery procedure: verify trusted installation/preference storage, rerun `supabase db reset --local --yes`, inspect route/toggle diagnostics, then rerun the S04 unit + Playwright suites.
- Monitoring gap: real provider-backed delivery is still intentionally unconfigured and must be proven in S05.

## Requirements Advanced

- R023 — Established deterministic reminder ids, provider-neutral shared-change dispatch, explicit degraded reason codes, and fail-closed notification routing so S05 can prove quiet disabled calendars, duplicate suppression, and end-to-end delivery without re-architecting the substrate.

## Requirements Validated

- R010 — Unit, Playwright, check, build, and Capacitor sync verification proved one per-device/per-calendar toggle now governs both reminders and shared-calendar change intent, mirrors across `/groups` and `/calendars/[calendarId]`, and persists truthful state across reload.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

None.

## Known Limitations

Real provider-backed remote delivery is intentionally still surfaced as `provider-unconfigured` when notification infrastructure is absent. S05 must prove final cross-surface delivery correctness, duplicate suppression, and delivered tap behavior end to end.

## Follow-ups

Use the S04 substrate in S05 to prove quiet disabled calendars, duplicate suppression, and real delivered notification landing across the fully assembled mobile experience.

## Files Created/Modified

- `supabase/migrations/20260422_000001_device_notifications.sql` — Added installation-backed notification tables, scoped RPC helpers, constraints, and RLS for per-device/per-calendar notification preferences.
- `supabase/functions/notify-calendar-change/index.ts` — Added the provider-neutral shared-change dispatch seam with sanitized internal target paths and explicit degraded responses.
- `apps/mobile/src/lib/notifications/runtime.ts` — Composed transport, permission, reminder scheduling, reconnect/resume resync, and per-calendar notification truth into one mobile runtime.
- `apps/mobile/src/lib/notifications/router.ts` — Added safe notification-open normalization, trusted-scope enforcement, and route diagnostics.
- `apps/mobile/src/lib/components/notifications/CalendarNotificationToggle.svelte` — Added the reusable per-calendar notification toggle surface with stable diagnostics.
- `apps/mobile/tests/e2e/fixtures.ts` — Hardened the notification Playwright harness with stable installation seeding, fixed-time replay, persisted permission state, and queued action delivery.
- `apps/mobile/tests/e2e/calendar-notifications.spec.ts` — Verified toggle persistence, degraded permission/provider states, and safe notification routing end to end.
