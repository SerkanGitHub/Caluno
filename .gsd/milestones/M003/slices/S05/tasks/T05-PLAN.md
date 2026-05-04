---
estimated_steps: 5
estimated_files: 4
skills_used: []
---

# T05: Fix find-time unassigned-shift error and add trusted-offline route-mode tracking

Apply two targeted bug fixes to unblock the final E2E bar:

**Fix 1 — find-time/transport.ts:** In `normalizeBusyIntervals`, change the `row.shift_assignments.length === 0` early-return error to a `continue` (skip) so unassigned shifts contribute zero busy intervals instead of aborting with FIND_TIME_ASSIGNMENTS_MISSING.

**Fix 2a — offline/controller.ts:** Add `'trusted-offline'` to `MobileOfflineRouteMode` type (`'trusted-online' | 'trusted-offline' | 'cached-offline'`). In `setNetwork(isOnline)`, also update `state.routeMode` from `trusted-online` → `trusted-offline` when going offline and back when going online (leave `cached-offline` untouched).

**Fix 2b — shell/load-app-shell.ts:** Add `'trusted-offline'` to `MobileShellRouteMode` type.

**Fix 2c — routes/calendars/[calendarId]/+page.svelte:** Change `data-route-mode={routeMode}` to `data-route-mode={runtimeState?.routeMode ?? routeMode}` so the runtime's dynamic routeMode (trusted-offline) is reflected in the diagnostic attribute.

## Inputs

- `apps/mobile/src/lib/find-time/transport.ts`
- `apps/mobile/src/lib/offline/controller.ts`
- `apps/mobile/src/lib/shell/load-app-shell.ts`
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`

## Expected Output

- `apps/mobile/src/lib/find-time/transport.ts — normalizeBusyIntervals skips empty shift_assignments instead of erroring`
- `apps/mobile/src/lib/offline/controller.ts — trusted-offline added to MobileOfflineRouteMode; setNetwork transitions routeMode`
- `apps/mobile/src/lib/shell/load-app-shell.ts — trusted-offline added to MobileShellRouteMode`
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte — data-route-mode uses runtimeState.routeMode when available`

## Verification

pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts tests/e2e/find-time-handoff.spec.ts tests/e2e/calendar-notifications.spec.ts tests/e2e/mobile-assembly.spec.ts && pnpm --dir apps/mobile test:e2e
