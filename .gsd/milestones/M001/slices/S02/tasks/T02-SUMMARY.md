---
id: T02
parent: S02
milestone: M001
key_files:
  - apps/web/src/lib/server/schedule.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts
  - apps/web/tests/routes/protected-routes.unit.test.ts
  - apps/web/tests/schedule/server-actions.unit.test.ts
key_decisions:
  - D012 — keep visible-week schedule loading route-scoped and re-derive calendar/shift authority on the server for every schedule mutation instead of trusting client ids.
duration: 
verification_result: passed
completed_at: 2026-04-14T22:46:35.657Z
blocker_discovered: false
---

# T02: Added trusted week-scoped schedule loading and protected calendar shift actions.

**Added trusted week-scoped schedule loading and protected calendar shift actions.**

## What Happened

Added a dedicated trusted schedule server module for the calendar route. The new server layer parses and clamps the `?start=` query to one visible week, groups bounded `public.shifts` results into day buckets, and exposes typed visible-week metadata plus named loader failures instead of guessing state. I then rewired `/calendars/[calendarId]` to preserve the existing denied branch unchanged while permitted routes now load week-scoped schedule data only for the requested calendar. On the mutation side, create/edit/move/delete actions now derive authority from the route calendar and server-side shift lookups, reject malformed ids and cross-calendar writes, validate timestamps and recurrence bounds with the shared schedule normalizers, and surface typed success/error states including timeout and malformed-response cases. I locked the contract with route tests for denied/out-of-scope behavior and deterministic week loading plus a focused server-action suite for blank titles, missing recurrence bounds, timeout handling, cross-calendar edits, oversized move ranges, and trusted delete success.

## Verification

`pnpm --dir apps/web check` passed, confirming the new schedule server module, calendar route loader/actions, and test code all type-check cleanly with zero Svelte or TypeScript diagnostics. `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/server-actions.unit.test.ts` passed with 19 assertions, proving the protected calendar route keeps the denied contract for malformed or out-of-scope ids, shapes a deterministic visible week from `?start=2026-04-20`, and that create/edit/move/delete helper paths fail closed or succeed with typed action results as designed.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web check` | 0 | ✅ pass | 2812ms |
| 2 | `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/server-actions.unit.test.ts` | 0 | ✅ pass | 1616ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/lib/server/schedule.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
- `apps/web/tests/routes/protected-routes.unit.test.ts`
- `apps/web/tests/schedule/server-actions.unit.test.ts`
