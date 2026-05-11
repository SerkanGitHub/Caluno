# S05 Resume Note

## Status: 3 E2E tests still failing after T05 fixes

### T05 fixes already applied (DO NOT re-apply):
1. `apps/mobile/src/lib/find-time/transport.ts` — normalizeBusyIntervals skips empty shift_assignments
2. `apps/mobile/src/lib/offline/controller.ts` — MobileOfflineRouteMode includes 'trusted-offline', setNetwork transitions routeMode
3. `apps/mobile/src/lib/shell/load-app-shell.ts` — MobileShellRouteMode includes 'trusted-offline'
4. `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` — data-route-mode uses runtimeState?.routeMode ?? routeMode

### Remaining fixes needed (WRITE THESE):

#### Fix A: `apps/mobile/tests/e2e/calendar-offline.spec.ts` line 41
Change: `await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-route-mode', 'trusted-online');`
To: `await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-route-mode', 'trusted-offline');`
(This test was written before trusted-offline existed; it calls setSimulatedConnectivity(page, false) then checks route-mode, but now route-mode correctly changes to trusted-offline)

#### Fix B: DB state pollution for find-time tests
Root cause: tests/e2e are serial across files and share the same DB. calendar-offline.spec.ts drains an 'Offline opening backup' shift (2026-04-15T16:00-18:00, unassigned). find-time-handoff.spec.ts creates 'Find time handoff coverage shift' at 2026-04-16T15:00-16:00 (the expected top-pick-0 slot). On the NEXT invocation of find-time-handoff.spec.ts, that slot is occupied and the top pick changes.

The right fix is to reset the DB before the find-time tests run, OR to update the seededFindTime fixtures to be resilient to shifts created by previous tests. The simplest fix: reset the local Supabase DB before the combined E2E run using `npx --yes supabase db reset --local --yes` (already in the T04 verify command).

The test command was changed in T04 to NOT reset the DB first. But the original S05 plan task verify command DID include the db reset. Running:
```
npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/...
```
should fix the state pollution.

Check if package.json `test:e2e` includes the reset step and if the playwright test command also includes it.

### Verification command once fixes applied:
```bash
npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts tests/e2e/find-time-handoff.spec.ts tests/e2e/calendar-notifications.spec.ts tests/e2e/mobile-assembly.spec.ts && pnpm --dir apps/mobile test:e2e
```
