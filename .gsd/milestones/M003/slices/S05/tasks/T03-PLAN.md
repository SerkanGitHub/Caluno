---
estimated_steps: 3
estimated_files: 4
skills_used:
  - verify-before-complete
  - test
  - observability
---

# T03: Extend the Playwright notification harness to prove enabled delivery, quiet disabled calendars, and duplicate suppression

**Slice:** S05 — Cross-surface notification correctness and final mobile assembly proof
**Milestone:** M003

## Description

Upgrade the mobile Playwright harness from toggle-state inspection to delivery-state inspection. The harness should be able to stub or capture `functions/v1/notify-calendar-change`, expose per-calendar pending reminder and delivered shared-change inventory, and let `calendar-notifications.spec.ts` prove that the enabled calendar records the expected shared-change effect while the disabled calendar stays quiet and reload/resume does not duplicate scheduled reminders.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| `apps/mobile/tests/e2e/fixtures.ts` route interception and in-browser harness | Fail the spec with an attributable missing-intercept or missing-harness-state assertion | Fail the spec instead of silently falling back to an unobserved network call | Fail the spec with explicit malformed payload assertions |
| `functions/v1/notify-calendar-change` request capture | Surface the failed dispatch request as missing delivery evidence while keeping the test deterministic | Fail explicitly on timeout rather than waiting for generic page timeouts | Fail explicitly if payload shape or sanitized target path is wrong |
| notification runtime / router surfaces | Keep using existing `data-notification-*` and notification-route attributes to localize failure | Fail on missing route-state updates instead of inferring from page copy | Fail on impossible state combinations (for example, delivered event with rejected route reason) |

## Load Profile

- **Shared resources**: Playwright network routing, in-browser notification harness state, and local Supabase reset.
- **Per-operation cost**: one route interception per dispatch plus notification inventory reads during assertions.
- **10x breakpoint**: flaky harness state or unbounded queued events would make duplicate-suppression proof ambiguous, so inventory reads must stay deterministic and resettable.

## Negative Tests

- **Malformed inputs**: unsafe target paths, missing calendar ids, and malformed dispatch bodies are rejected or surfaced as explicit failures.
- **Error paths**: no dispatch for disabled calendars, dispatch capture missing, and repeated resume/reload cycles that would otherwise duplicate local reminders.
- **Boundary conditions**: one enabled + one disabled calendar, repeated reload/resume after warm sync, and notification landing against both safe and unsafe targets.

## Steps

1. Add fixture helpers that intercept `functions/v1/notify-calendar-change`, capture request bodies, and expose/reset delivered shared-change inbox state plus pending reminder inventory.
2. Extend the in-browser notification harness so Playwright can inspect reminders per calendar/shift and compare before/after delivery state.
3. Rewrite `apps/mobile/tests/e2e/calendar-notifications.spec.ts` around those helpers to prove enabled delivery, disabled quietness, duplicate suppression, and safe landing through the existing route diagnostics.

## Must-Haves

- [ ] Playwright can inspect captured shared-change dispatch requests and pending reminder inventory without reaching into untracked files or hidden state.
- [ ] Notification E2E proof explicitly asserts enabled delivery and disabled quietness for different calendars in the same seeded environment.
- [ ] Reload/resume coverage proves reminder inventory does not duplicate, and notification taps still use the existing fail-closed routing contract.

## Verification

- `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/calendar-notifications.spec.ts`
- Confirm the spec fails specifically when delivery is missing, duplicated, or routed unsafely.

## Observability Impact

- Signals added/changed: captured shared-change inbox entries and per-calendar pending reminder inventory inside the Playwright harness.
- How a future agent inspects this: run the notification Playwright spec and inspect fixture helper assertions / harness snapshots.
- Failure state exposed: missing dispatch, unexpected dispatch for disabled calendars, duplicate reminder inventory, or route-result mismatch on notification open.

## Inputs

- `apps/mobile/tests/e2e/fixtures.ts` — current Playwright harness and simulated notification runtime.
- `apps/mobile/tests/e2e/calendar-notifications.spec.ts` — current toggle/truth/routing proof that must become delivery proof.
- `apps/mobile/src/lib/notifications/runtime.ts` — notification scheduling/runtime behavior that drives pending reminder state.
- `apps/mobile/src/lib/notifications/router.ts` — existing fail-closed landing contract.

## Expected Output

- `apps/mobile/tests/e2e/fixtures.ts` — fixture helpers for dispatch interception and notification inventory inspection.
- `apps/mobile/tests/e2e/calendar-notifications.spec.ts` — end-to-end proof for enabled delivery, disabled quietness, duplicate suppression, and safe landing.
