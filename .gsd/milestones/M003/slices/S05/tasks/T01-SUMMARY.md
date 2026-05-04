---
id: T01
parent: S05
milestone: M003
key_files:
  - apps/web/src/lib/server/calendar-change-notifier.ts
  - apps/web/src/lib/server/schedule.ts
  - apps/web/tests/schedule/server-actions.unit.test.ts
key_decisions:
  - Dispatch wired at call sites (not inside finalizeSingleShiftMutation) to keep the sync helper clean and avoid adding supabase param to a utility function.
  - vi.mock path uses relative path (../../src/lib/server/calendar-change-notifier) to match the $lib alias resolved by the SvelteKit vite plugin in the test environment.
  - void-dispatch pattern chosen over Promise.race at the schedule.ts level — the notifier helper itself handles the timeout internally, keeping schedule.ts free of async dispatch coupling.
duration: 
verification_result: passed
completed_at: 2026-05-04T16:01:29.973Z
blocker_discovered: false
---

# T01: Added best-effort shared-change dispatch to all four trusted web schedule mutations via a new calendar-change-notifier helper, with 12 new unit tests proving success-path dispatch, skip-on-failure, and degraded-dispatch semantics.

**Added best-effort shared-change dispatch to all four trusted web schedule mutations via a new calendar-change-notifier helper, with 12 new unit tests proving success-path dispatch, skip-on-failure, and degraded-dispatch semantics.**

## What Happened

Created `apps/web/src/lib/server/calendar-change-notifier.ts` — a reusable best-effort notifier helper that accepts calendarId, changeType, shiftId, and targetPath, sanitizes the payload (UUID checks for calendarId/shiftId, scope-bound path validation), races the dispatch promise against a 5 000 ms timeout, and returns a typed `NotifierDispatchResult` without ever throwing to the caller. Dispatch errors, timeouts, and malformed responses all degrade gracefully to a typed failure reason rather than affecting the canonical schedule write.

Wired the helper into `apps/web/src/lib/server/schedule.ts` at the four success-return points — single-shift create, recurring create, and both paths that go through `finalizeSingleShiftMutation` (edit, move, delete). In each case dispatch is invoked with `void` after the canonical `actionSuccess` return value is constructed, so even a synchronous throw inside dispatch can never reach the schedule write caller. Failed, forbidden, timeout, or malformed canonical writes have no code path that reaches the dispatch call.

Extended `apps/web/tests/schedule/server-actions.unit.test.ts` with a `vi.mock` factory for the notifier module and 12 new tests in a `schedule server helpers — dispatch wiring` describe block: four success-path dispatch calls (create/edit/move/delete), three skip-on-failure cases (write-error, forbidden, invalid calendar id), two degraded-dispatch best-effort cases (edge function rejects, dispatch times out), and one recurring-create dispatch correctness case. All 21 tests (9 pre-existing + 12 new) pass.

## Verification

Ran `pnpm --dir apps/web exec vitest run tests/schedule/server-actions.unit.test.ts` — 21 tests, 1 file, all passed in 402 ms. Tests cover: success-path dispatch for create/edit/move/delete, no-dispatch on write-error, no-dispatch on forbidden, no-dispatch on invalid calendarId, canonical success preserved when dispatch degrades (error), canonical success preserved when dispatch times out, and recurring-create dispatch with correct calendarId/changeType.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web exec vitest run tests/schedule/server-actions.unit.test.ts` | 0 | ✅ pass | 4200ms |

## Deviations

None. The plan called for three steps (notifier helper, wire into mutations, extend tests) — all three were completed as specified. The `finalizeSingleShiftMutation` helper remained synchronous; dispatch was wired at the call sites in edit/move/delete rather than inside the helper, which is cleaner and avoids threading supabase into a utility function.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/lib/server/calendar-change-notifier.ts`
- `apps/web/src/lib/server/schedule.ts`
- `apps/web/tests/schedule/server-actions.unit.test.ts`
