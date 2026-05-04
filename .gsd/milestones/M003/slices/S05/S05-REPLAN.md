# S05 Replan

**Milestone:** M003
**Slice:** S05
**Blocker Task:** T04
**Created:** 2026-05-04T16:32:10.105Z

## Blocker Description

Two E2E tests in the final verification bar are failing due to bugs introduced or exposed during S05 implementation:

1. **`find-time-handoff.spec.ts`** — `FIND_TIME_ASSIGNMENTS_MISSING` malformed-response: `normalizeBusyIntervals` in `apps/mobile/src/lib/find-time/transport.ts` returns an error when `row.shift_assignments.length === 0`. The `calendar-offline.spec.ts` test (which runs before it in the same bar) creates a shift via the offline drain that has no `shift_assignments` rows. The find-time query then finds this unassigned shift and returns `malformed-response` with reason `FIND_TIME_ASSIGNMENTS_MISSING`.

2. **`mobile-assembly.spec.ts` phase 2** — `data-route-mode` stays `trusted-online` instead of transitioning to `trusted-offline` when connectivity is lost. The shell-level `routeMode` used in `data-route-mode={routeMode}` never changes dynamically; and the controller's `setNetwork` only updates `state.network`, not `state.routeMode`. The new value `'trusted-offline'` doesn't exist in the type system yet.

Required fixes:
- `apps/mobile/src/lib/find-time/transport.ts`: In `normalizeBusyIntervals`, skip shifts with empty `shift_assignments` (continue) instead of returning `FIND_TIME_ASSIGNMENTS_MISSING`.
- `apps/mobile/src/lib/offline/controller.ts`: Add `'trusted-offline'` to `MobileOfflineRouteMode` type; in `setNetwork`, transition `routeMode` from `trusted-online` ↔ `trusted-offline` based on connectivity.
- `apps/mobile/src/lib/shell/load-app-shell.ts`: Add `'trusted-offline'` to `MobileShellRouteMode` type.
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`: Change `data-route-mode={routeMode}` to `data-route-mode={runtimeState?.routeMode ?? routeMode}` so the runtime's dynamic route mode is reflected.

## What Changed

Added T05 to apply two targeted bug fixes: (1) skip unassigned shifts in find-time normalizeBusyIntervals instead of erroring, and (2) add trusted-offline mode to the controller and calendar page so data-route-mode reflects connectivity loss dynamically.
