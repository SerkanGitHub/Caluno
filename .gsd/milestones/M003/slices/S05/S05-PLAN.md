# S05: S05

**Goal:** Close the remaining notification-delivery gap by wiring shared-change dispatch into both trusted write authorities and proving, through the normal mobile verification bar, that enabled calendars notify, disabled calendars stay quiet, duplicates are suppressed, taps land in the right protected mobile context, and the assembled phone loop feels real.
**Demo:** Enabled calendars notify, disabled calendars stay quiet, duplicate notifications are suppressed, taps land in the right mobile context, and the assembled app proves it doesn’t feel fake.

## Must-Haves

- ## Must-Haves
- Successful schedule mutations on both trusted write authorities (`apps/web/src/lib/server/schedule.ts` and `apps/mobile/src/lib/offline/transport.ts`) attempt a best-effort `notify-calendar-change` dispatch only after canonical writes succeed, and dispatch failure never rolls back or falsifies the write result.
- Automated proof distinguishes enabled and disabled per-calendar notification behavior under actual delivery flow: the enabled calendar records the expected shared-change effect, the disabled calendar stays quiet, and reload/resume does not create duplicate reminder inventory.
- Notification-open proof still routes through the existing fail-closed mobile contract so delivered reminder/change taps land in the intended permitted calendar context and unsafe targets remain rejected.
- The default mobile E2E bar includes notification correctness plus one final assembled mobile tracer bullet covering sign-in, calendar continuity, reconnect, Find time handoff, and notification landing from the real mobile shell.
- ## Threat Surface
- **Abuse**: forged or replayed change-dispatch payloads, widened target paths, and schedule writes that accidentally notify calendars outside the trusted member scope.
- **Data exposure**: notification payloads must stay limited to calendar/shift ids, sanitized internal paths, and short user-facing copy; no tokens or extra calendar data should leak into dispatch logs or Playwright artifacts.
- **Input trust**: `calendarId`, `shiftId`, change type, and notification target path all cross runtime boundaries and must remain validated/sanitized before dispatch or navigation.
- ## Requirement Impact
- **Requirements touched**: R023 directly, with compatibility re-verification for R010, R022, and the already-validated mobile reality bar in R009.
- **Re-verify**: web schedule mutation contract, mobile direct/offline write and reconnect drain paths, calendar notification Playwright proof, notification-open routing, and the packaged mobile `test:e2e` command.
- **Decisions revisited**: D047, D048, D061 remain locked; S05 must reuse their combined-toggle, server-backed Find time, and provider-neutral best-effort delivery model rather than inventing a second notification truth path.

## Proof Level

- This slice proves: ## Proof Level
- This slice proves: final-assembly
- Real runtime required: yes
- Human/UAT required: no

## Integration Closure

## Integration Closure
- Upstream surfaces consumed: `apps/mobile/src/lib/offline/transport.ts`, `apps/mobile/src/lib/notifications/runtime.ts`, `apps/mobile/src/lib/notifications/router.ts`, `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`, `apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte`, `apps/web/src/lib/server/schedule.ts`, and `supabase/functions/notify-calendar-change/index.ts`.
- New wiring introduced in this slice: post-write shared-change dispatch from both trusted mutation authorities, Playwright harness capture for edge-function delivery + pending reminder inventory, and the final assembled mobile tracer-bullet wired into the default mobile E2E command.
- What remains before the milestone is truly usable end-to-end: nothing inside M003 once this slice passes the planned automated bar and slice UAT is generated.

## Verification

- ## Observability / Diagnostics
- Runtime signals: best-effort dispatch result shape from `notify-calendar-change`, existing `data-notification-*` and notification-route attributes, pending reminder inventory, and captured shared-change delivery inbox entries in the Playwright harness.
- Inspection surfaces: `apps/web/tests/schedule/server-actions.unit.test.ts`, `apps/mobile/tests/mobile-notification-contract.unit.test.ts`, `apps/mobile/tests/mobile-notification-runtime.unit.test.ts`, `apps/mobile/tests/e2e/calendar-notifications.spec.ts`, `apps/mobile/tests/e2e/mobile-assembly.spec.ts`, and `pnpm --dir apps/mobile test:e2e`.
- Failure visibility: explicit dispatch/degraded reason codes, harness-visible per-calendar pending/delivered counts, and existing fail-closed navigation result attributes.
- Redaction constraints: keep payload assertions limited to ids, sanitized internal paths, and short copy; do not expose auth tokens or raw provider secrets in logs or harness snapshots.

## Tasks

- [x] **T01: Added best-effort shared-change dispatch to all four trusted web schedule mutations via a new calendar-change-notifier helper, with 12 new unit tests proving success-path dispatch, skip-on-failure, and degraded-dispatch semantics.** `est:90m`
  Add a reusable post-write notifier seam for the trusted web schedule helpers and call it only after canonical create/edit/move/delete success is already known. Keep the edge-function invoke best-effort and scope-safe: sanitize the target calendar path, send only minimal shift/calendar metadata, and leave schedule results authoritative even when dispatch times out or degrades.
  - Files: `apps/web/src/lib/server/schedule.ts`, `apps/web/src/lib/server/calendar-change-notifier.ts`, `apps/web/tests/schedule/server-actions.unit.test.ts`
  - Verify: pnpm --dir apps/web exec vitest run tests/schedule/server-actions.unit.test.ts

- [x] **T02: Wired best-effort shared-change dispatch into all four mobile schedule mutations (create/edit/move/delete including reconnect-drained replays) via a new calendar-change-dispatch helper, with 17 new unit tests proving payload shape, degraded dispatch safety, and replay-safe semantics.** `est:90m`
  Extend the mobile trusted schedule transport so phone-originated create/edit/move/delete and reconnect-drained writes participate in the same best-effort shared-change notification contract as web. Keep mobile write authority unchanged: if dispatch is unavailable, the queued mutation still resolves truthfully and reconnect continues to use the canonical local-first flow.
  - Files: `apps/mobile/src/lib/supabase/client.ts`, `apps/mobile/src/lib/offline/transport.ts`, `apps/mobile/src/lib/notifications/calendar-change-dispatch.ts`, `apps/mobile/tests/mobile-notification-contract.unit.test.ts`, `apps/mobile/tests/mobile-notification-runtime.unit.test.ts`
  - Verify: pnpm --dir apps/mobile exec vitest run tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts

- [x] **T03: Upgraded the Playwright notification harness with dispatch interception, per-calendar reminder inventory, and delivery-proof specs covering enabled delivery, disabled quietness, duplicate suppression, and fail-closed routing.** `est:2h`
  Upgrade the mobile Playwright harness from toggle-state inspection to delivery-state inspection. The harness should be able to stub or capture `functions/v1/notify-calendar-change`, expose per-calendar pending reminder and delivered shared-change inventory, and let `calendar-notifications.spec.ts` prove that the enabled calendar records the expected notification effect while the disabled calendar stays quiet and reload/resume does not duplicate scheduled reminders.
  - Files: `apps/mobile/tests/e2e/fixtures.ts`, `apps/mobile/tests/e2e/calendar-notifications.spec.ts`
  - Verify: npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/calendar-notifications.spec.ts

- [x] **T04: Added final assembled mobile tracer-bullet spec (5 phases: sign-in, offline continuity, find-time handoff, notification delivery, negative paths) and promoted calendar-notifications + mobile-assembly into the default test:e2e bar.** `est:90m`
  Close M003 with one final mobile assembly proof that exercises the real core loop in sequence: sign in, open a permitted calendar, survive continuity/reconnect, hand a Find time slot into create, and land a notification back inside the protected calendar context. Update the normal mobile E2E scripts so notification correctness and final assembly are part of the everyday verification bar instead of optional extra commands.
  - Files: `apps/mobile/tests/e2e/mobile-assembly.spec.ts`, `apps/mobile/package.json`, `apps/mobile/tests/e2e/fixtures.ts`
  - Verify: npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts tests/e2e/find-time-handoff.spec.ts tests/e2e/calendar-notifications.spec.ts tests/e2e/mobile-assembly.spec.ts && pnpm --dir apps/mobile test:e2e

- [x] **T05: Fix find-time unassigned-shift error and add trusted-offline route-mode tracking** `est:30m`
  Apply two targeted bug fixes to unblock the final E2E bar:
  - Files: `apps/mobile/src/lib/find-time/transport.ts`, `apps/mobile/src/lib/offline/controller.ts`, `apps/mobile/src/lib/shell/load-app-shell.ts`, `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`
  - Verify: pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts tests/e2e/find-time-handoff.spec.ts tests/e2e/calendar-notifications.spec.ts tests/e2e/mobile-assembly.spec.ts && pnpm --dir apps/mobile test:e2e

## Files Likely Touched

- apps/web/src/lib/server/schedule.ts
- apps/web/src/lib/server/calendar-change-notifier.ts
- apps/web/tests/schedule/server-actions.unit.test.ts
- apps/mobile/src/lib/supabase/client.ts
- apps/mobile/src/lib/offline/transport.ts
- apps/mobile/src/lib/notifications/calendar-change-dispatch.ts
- apps/mobile/tests/mobile-notification-contract.unit.test.ts
- apps/mobile/tests/mobile-notification-runtime.unit.test.ts
- apps/mobile/tests/e2e/fixtures.ts
- apps/mobile/tests/e2e/calendar-notifications.spec.ts
- apps/mobile/tests/e2e/mobile-assembly.spec.ts
- apps/mobile/package.json
- apps/mobile/src/lib/find-time/transport.ts
- apps/mobile/src/lib/offline/controller.ts
- apps/mobile/src/lib/shell/load-app-shell.ts
- apps/mobile/src/routes/calendars/[calendarId]/+page.svelte
