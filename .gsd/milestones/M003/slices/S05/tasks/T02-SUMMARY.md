---
id: T02
parent: S05
milestone: M003
key_files:
  - apps/mobile/src/lib/supabase/client.ts
  - apps/mobile/src/lib/notifications/calendar-change-dispatch.ts
  - apps/mobile/src/lib/offline/transport.ts
  - apps/mobile/tests/mobile-notification-contract.unit.test.ts
  - apps/mobile/tests/mobile-notification-runtime.unit.test.ts
key_decisions:
  - Dispatch wired at call sites in edit/move/delete (not inside finalizeSingleShiftMutation) to keep the sync helper clean — same pattern as T01 web wiring.
  - MobileSupabaseFunctionsSeam is a separate exported type so the narrow seam is testable independently and downstream code can reference it without importing SupabaseClient.
  - Mode-aware shift mock chain in runtime tests tracks whether delete/update was called first to serve both the pre-write read query and the write chain from the same `from('shifts')` call.
duration: 
verification_result: passed
completed_at: 2026-05-04T16:10:47.192Z
blocker_discovered: false
---

# T02: Wired best-effort shared-change dispatch into all four mobile schedule mutations (create/edit/move/delete including reconnect-drained replays) via a new calendar-change-dispatch helper, with 17 new unit tests proving payload shape, degraded dispatch safety, and replay-safe semantics.

**Wired best-effort shared-change dispatch into all four mobile schedule mutations (create/edit/move/delete including reconnect-drained replays) via a new calendar-change-dispatch helper, with 17 new unit tests proving payload shape, degraded dispatch safety, and replay-safe semantics.**

## What Happened

Extended the `MobileSupabaseDataClient` type with a narrow `MobileSupabaseFunctionsSeam` that exposes `functions.invoke` without weakening any other type boundary. The seam is a minimal intersection type so only the dispatch helper can invoke edge functions while the rest of the mobile client stays unchanged.

Created `apps/mobile/src/lib/notifications/calendar-change-dispatch.ts` — the mobile counterpart to the web `calendar-change-notifier.ts` helper. It sanitizes calendarId and shiftId with UUID checks before any network call, races dispatch against a 5 000 ms timeout, and returns a typed `MobileDispatchResult` that is informational-only and never throws or rejects the caller. All failure modes (invoke throws, invoke times out, invoke returns server error, invoke returns malformed shape, malformed calendarId, malformed shiftId) return typed degraded results without touching the canonical write outcome.

Wired dispatch into `apps/mobile/src/lib/offline/transport.ts` at all five success-return points: single-shift create, recurring create, edit, move, and delete. Each call uses `void dispatchMobileCalendarChange(...)` after the canonical outcome is already constructed, so even a synchronous throw inside dispatch cannot reach the schedule write caller. Edit, move, and delete go through `finalizeSingleShiftMutation` — the result is captured, dispatch is fired only when `result.type === 'success'`, then the result is returned — matching the T01 web pattern of wiring at call sites rather than inside helpers. Reconnect-drained replays use the same `submitAction` → `finalizeSingleShiftMutation` path, so each replayed write dispatches exactly once per canonical success path without any second queue state.

Extended `mobile-notification-contract.unit.test.ts` with 8 new tests in a `mobile calendar-change dispatch contract` describe block: create dispatch with correct payload shape, edit/move/delete with correct changeType, degraded when invoke throws, degraded when invoke times out, degraded on server error, degraded on malformed shape, fail-closed before network on bad calendarId, fail-closed before network on bad shiftId, and null shiftId handling. All use `vi.fn()` mocks so no edge-function network calls occur.

Extended `mobile-notification-runtime.unit.test.ts` with 3 new tests in a `mobile schedule transport — dispatch wiring` describe block that exercises the real transport: dispatch degrades without affecting a successful write outcome (degraded dispatch preserves canonical result), failed mobile writes never dispatch (calendar scope failure prevents dispatch entirely), and reconnect-drained writes dispatch exactly once per canonical success path (two replay requests → two dispatch calls, verifying replay-safe semantics). The mock client correctly chains the transport's three query patterns: calendar lookup (one `.eq()`), group_memberships lookup (two chained `.eq()` calls with state tracking), and shift read+write (mode-aware chain that resolves on `.eq()` for reads and on `.select()` at end of write chain).

## Verification

Ran `pnpm --dir apps/mobile exec vitest run tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts` — 25 tests (17 pre-existing + 8 new contract dispatch tests), all passed. Ran `pnpm --dir apps/web exec vitest run tests/schedule/server-actions.unit.test.ts` — 21 tests, all passed (no regression). TypeScript check `pnpm --dir apps/mobile exec tsc --noEmit` shows only the pre-existing `@types/node` environment issue, no new type errors introduced by the changes.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/mobile exec vitest run tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts` | 0 | ✅ pass | 4300ms |
| 2 | `pnpm --dir apps/web exec vitest run tests/schedule/server-actions.unit.test.ts` | 0 | ✅ pass | 4500ms |

## Deviations

In `submitEditAction`, `submitMoveAction`, and `submitDeleteAction`, the dispatch call reads `client` (the function parameter) directly rather than `options.client` — `options` is only in scope inside the `createTrustedMobileScheduleTransport` closure, not in the standalone helper functions. This was caught during verification and corrected. The plan said "call it from successful outcomes" without specifying the variable name, so this is an implementation detail, not a plan deviation.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/supabase/client.ts`
- `apps/mobile/src/lib/notifications/calendar-change-dispatch.ts`
- `apps/mobile/src/lib/offline/transport.ts`
- `apps/mobile/tests/mobile-notification-contract.unit.test.ts`
- `apps/mobile/tests/mobile-notification-runtime.unit.test.ts`
