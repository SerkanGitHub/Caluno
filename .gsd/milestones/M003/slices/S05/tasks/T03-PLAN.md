---
estimated_steps: 5
estimated_files: 2
skills_used: []
---

# T03: Upgraded the Playwright notification harness with dispatch interception, per-calendar reminder inventory, and delivery-proof specs covering enabled delivery, disabled quietness, duplicate suppression, and fail-closed routing.

Upgrade the mobile Playwright harness from toggle-state inspection to delivery-state inspection. The harness should be able to stub or capture `functions/v1/notify-calendar-change`, expose per-calendar pending reminder and delivered shared-change inventory, and let `calendar-notifications.spec.ts` prove that the enabled calendar records the expected notification effect while the disabled calendar stays quiet and reload/resume does not duplicate scheduled reminders.

Steps:
1. Add fixture helpers to intercept edge-function calls and read/reset harness delivery state.
2. Extend the in-browser notification harness to expose delivered shared-change inbox entries and richer pending reminder inspection.
3. Rewrite the notification E2E spec around those helpers so it proves enabled delivery, disabled quietness, duplicate suppression, and safe landing through the existing route diagnostics.

## Inputs

- ``apps/mobile/tests/e2e/fixtures.ts``
- ``apps/mobile/tests/e2e/calendar-notifications.spec.ts``
- ``apps/mobile/src/lib/notifications/runtime.ts``
- ``apps/mobile/src/lib/notifications/router.ts``

## Expected Output

- ``apps/mobile/tests/e2e/fixtures.ts``
- ``apps/mobile/tests/e2e/calendar-notifications.spec.ts``

## Verification

npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/calendar-notifications.spec.ts

## Observability Impact

This task adds the durable proof surfaces for notification correctness: future agents can inspect captured delivery inbox entries and per-calendar pending reminder state instead of inferring duplicates from UI copy or timing alone.
