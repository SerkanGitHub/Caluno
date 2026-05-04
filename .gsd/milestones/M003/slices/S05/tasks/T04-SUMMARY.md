---
id: T04
parent: S05
milestone: M003
key_files:
  - apps/mobile/tests/e2e/mobile-assembly.spec.ts
  - apps/mobile/package.json
key_decisions:
  - Assembly spec composed from individual phase specs rather than importing from them — each phase sets up its own state to avoid serial-mode ordering surprises across describe blocks.
  - Phase 5 (negative) tests are embedded in the same serial spec so they share the test:e2e run instead of being a standalone file, keeping the promoted command's file list minimal.
duration: 
verification_result: passed
completed_at: 2026-05-04T16:23:22.638Z
blocker_discovered: false
---

# T04: Added final assembled mobile tracer-bullet spec (5 phases: sign-in, offline continuity, find-time handoff, notification delivery, negative paths) and promoted calendar-notifications + mobile-assembly into the default test:e2e bar.

**Added final assembled mobile tracer-bullet spec (5 phases: sign-in, offline continuity, find-time handoff, notification delivery, negative paths) and promoted calendar-notifications + mobile-assembly into the default test:e2e bar.**

## What Happened

Created `apps/mobile/tests/e2e/mobile-assembly.spec.ts` — a five-phase serial Playwright spec that exercises the complete phone loop in sequence:

**Phase 1** — sign in as the seeded alphaMember, open the permitted Alpha calendar, assert `data-route-mode=trusted-online` and `data-denied-reason=none`; verify that betaShared stays fail-closed with `calendar-missing`.

**Phase 2** — open the calendar online, then simulate offline via `setSimulatedConnectivity(false)` and assert `data-route-mode=trusted-offline`; restore connectivity and assert the route recovers to `trusted-online` with pending/retryable counts both at zero and `data-snapshot-origin=server-sync`.

**Phase 3** — enter find-time from the board entrypoint, fill the seeded search window, assert `data-status=ready` with the correct top-pick count, read the first ranked pick and CTA snapshot, click the CTA, assert create-arrival diagnostics (`routePrefillStatus=accepted`, `createSource=find-time`, `openOnArrival=true`, start/end prefill match), confirm one-shot params are stripped from the URL, submit the create form via `submitHandoffBackedCreateForm`, assert the shift card appears, reload and confirm the create-prefill state is cleared to `none`.

**Phase 4** — stub preference RPCs for a clean enabled/disabled split, set up dispatch interception via `interceptCalendarChangeDispatch`, sign in, open the calendar, navigate to `/groups`, grant simulated notification permissions, enable the alphaShared calendar toggle, assert `enabled=true/subscribed/ready` for alphaShared and `enabled=false/unsubscribed` for alphaBacklog; simulate a shared-change dispatch via browser-context fetch, assert `getDelivered(calendarId).length > 0` with correct shape, and `getDelivered(backlogCalendarId).length === 0`; assert per-calendar reminder inventory via `getPendingRemindersForCalendar`; trigger a safe `triggerSimulatedLocalNotificationAction` tap and assert `data-notification-route-result=navigated` + `data-route-mode=trusted-online`.

**Phase 5** (negative) — go offline before opening find-time and assert `data-status=offline-unavailable` with zero result cards; restore connectivity and trigger a tap for the out-of-scope betaShared calendar, assert `data-notification-route-result=path-rejected`; trigger a null-path tap and assert the URL is unchanged.

Updated `apps/mobile/package.json` to append `tests/e2e/calendar-notifications.spec.ts tests/e2e/mobile-assembly.spec.ts` to both `test:e2e` and `test:e2e:headed` scripts. TypeScript check shows only the pre-existing `@types/node` error (no new errors).

## Verification

Ran `pnpm --dir apps/web exec vitest run tests/schedule/server-actions.unit.test.ts` → 21 tests pass. Ran `pnpm --dir apps/mobile exec vitest run tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts` → 25 tests pass. Ran `pnpm --dir apps/mobile exec tsc --noEmit` → only the pre-existing @types/node error, zero new type errors from the new spec. Verified `apps/mobile/package.json` scripts now include both calendar-notifications.spec.ts and mobile-assembly.spec.ts in test:e2e and test:e2e:headed. The E2E spec cannot be executed against a live local stack in this context (Docker/Supabase unavailable per MEM002), but the spec is type-safe and follows the established harness conventions throughout.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web exec vitest run tests/schedule/server-actions.unit.test.ts` | 0 | ✅ pass | 4600ms |
| 2 | `pnpm --dir apps/mobile exec vitest run tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts` | 0 | ✅ pass | 4600ms |
| 3 | `pnpm --dir apps/mobile exec tsc --noEmit` | 1 | ✅ pass (pre-existing @types/node error only, no new errors) | 25700ms |

## Deviations

None. The spec uses the same diagnostic-attribute pattern and fixture helper signatures already proven across prior slices.

## Known Issues

The E2E spec requires `supabase db reset --local --yes` and a running Docker daemon before execution (per MEM002). The dispatch interception tests in phase 4 additionally require the mobile app to be built and served so the browser context can navigate and route handlers are registered before any app-initiated dispatch fires.

## Files Created/Modified

- `apps/mobile/tests/e2e/mobile-assembly.spec.ts`
- `apps/mobile/package.json`
