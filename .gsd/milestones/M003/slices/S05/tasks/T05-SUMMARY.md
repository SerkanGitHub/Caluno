---
id: T05
parent: S05
milestone: M003
key_files:
  - apps/mobile/src/lib/find-time/transport.ts
  - apps/mobile/src/lib/offline/controller.ts
  - apps/mobile/src/lib/shell/load-app-shell.ts
  - apps/mobile/src/routes/calendars/[calendarId]/+page.svelte
key_decisions:
  - (none)
duration: 
verification_result: mixed
completed_at: 2026-05-04T16:35:47.589Z
blocker_discovered: true
---

# T05: Applied fixes for trusted-offline mode and unassigned-shift skip, but tests still failing due to DB state pollution across test files and calendar-offline.spec.ts needing route-mode expectation update

**Applied fixes for trusted-offline mode and unassigned-shift skip, but tests still failing due to DB state pollution across test files and calendar-offline.spec.ts needing route-mode expectation update**

## What Happened

Applied 4 fixes via gsd_exec scripts: (1) normalizeBusyIntervals in transport.ts now skips shifts with empty shift_assignments instead of returning FIND_TIME_ASSIGNMENTS_MISSING; (2) MobileOfflineRouteMode in controller.ts now includes 'trusted-offline'; (3) setNetwork in controller.ts transitions routeMode between trusted-online/trusted-offline based on connectivity; (4) data-route-mode in the calendar page now uses runtimeState?.routeMode ?? routeMode; (5) MobileShellRouteMode in load-app-shell.ts includes 'trusted-offline'. Phase 2 of mobile-assembly.spec.ts now passes. But three other failures remain: (a) calendar-offline.spec.ts line 41 expects data-route-mode='trusted-online' after going offline — this test predates the trusted-offline concept and needs updating to expect 'trusted-offline'; (b) find-time-handoff.spec.ts and mobile-assembly.spec.ts phase 3 now fail because the find-time top pick rankings shifted — after the offline spec creates/drains the 'Offline opening backup' shift AND the find-time spec creates 'Find time handoff coverage shift' at the first top-pick slot (2026-04-16T15:00-16:00), subsequent runs find those slots occupied and the algorithm returns a different first top pick.

## Verification

Ran pnpm --dir apps/mobile exec playwright test on the full 5-file bar. Phase 2 now passes. 3 tests still fail requiring additional fixes.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts tests/e2e/find-time-handoff.spec.ts tests/e2e/calendar-notifications.spec.ts tests/e2e/mobile-assembly.spec.ts` | 1 | ❌ fail — 3 failing | 51286ms |

## Deviations

Fixes partially applied. Remaining work: (1) Update calendar-offline.spec.ts line 41 to expect 'trusted-offline' instead of 'trusted-online' when offline. (2) Fix test state pollution: find-time-handoff creates a shift at the first top-pick slot which shifts rankings on subsequent runs. Either reset DB between tests, or make the find-time verification order-agnostic for top picks that don't match seeded fixtures.

## Known Issues

3 E2E tests still failing: calendar-offline.spec.ts (route-mode expectation), find-time-handoff.spec.ts (top pick slot shifted by state from earlier runs), mobile-assembly.spec.ts phase 3 (same root cause). Root cause is cross-test DB state pollution combined with calendar-offline.spec.ts needing its route-mode expectation updated for the new trusted-offline mode.

## Files Created/Modified

- `apps/mobile/src/lib/find-time/transport.ts`
- `apps/mobile/src/lib/offline/controller.ts`
- `apps/mobile/src/lib/shell/load-app-shell.ts`
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`
