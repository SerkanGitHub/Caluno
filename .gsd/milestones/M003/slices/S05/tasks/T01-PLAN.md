---
estimated_steps: 3
estimated_files: 3
skills_used:
  - verify-before-complete
  - test
  - observability
---

# T01: Wire best-effort shared-change dispatch into trusted web schedule mutations

**Slice:** S05 — Cross-surface notification correctness and final mobile assembly proof
**Milestone:** M003

## Description

Add a reusable post-write notifier seam for the trusted web schedule helpers and call it only after canonical create/edit/move/delete success is already known. Keep `notify-calendar-change` best-effort and scope-safe: sanitize the target calendar path, send only minimal shift/calendar metadata, and leave schedule results authoritative even when dispatch times out or degrades.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| `supabase/functions/notify-calendar-change/index.ts` via the authenticated web Supabase client | Keep the schedule write result as success and record/return the unchanged canonical schedule outcome for tests | Treat dispatch as degraded, not failed; do not roll back the write | Fail closed inside the notifier helper and surface the degraded result only to tests/logging, never as a false schedule failure |
| `apps/web/src/lib/server/schedule.ts` write path | Skip dispatch entirely when canonical write fails | Skip dispatch entirely when canonical write times out | Skip dispatch entirely when canonical write returns malformed data |

## Load Profile

- **Shared resources**: Supabase write path plus one extra edge-function invocation per successful schedule mutation.
- **Per-operation cost**: one additional authenticated function call after each successful create/edit/move/delete.
- **10x breakpoint**: excess dispatch latency or provider degradation must never back up or reclassify canonical schedule writes.

## Negative Tests

- **Malformed inputs**: invalid `calendarId`, missing `shiftId` where expected, and unsafe/non-calendar `targetPath` values are sanitized or rejected before dispatch.
- **Error paths**: edge function invoke rejection, timeout, and malformed response all preserve canonical schedule success.
- **Boundary conditions**: failed writes, forbidden writes, and recurring creates with multiple affected shift ids never dispatch incorrectly or duplicate the call.

## Steps

1. Add a small web-side notifier helper that accepts calendar id, change type, shift id, and target path, sanitizes the payload, and invokes `notify-calendar-change` with the current trusted member context.
2. Wire successful `createScheduleShift()`, `editScheduleShift()`, `moveScheduleShift()`, and `deleteScheduleShift()` outcomes through that helper without changing existing write authority or failure semantics.
3. Extend `apps/web/tests/schedule/server-actions.unit.test.ts` to prove success-path dispatch, failed-write skip behavior, and best-effort degradation semantics.

## Must-Haves

- [ ] Successful web create/edit/move/delete paths attempt one sanitized shared-change dispatch after canonical success is known.
- [ ] Failed, forbidden, timeout, or malformed canonical writes never trigger dispatch.
- [ ] Dispatch errors or malformed dispatch results never roll back or relabel the canonical schedule outcome.

## Verification

- `pnpm --dir apps/web exec vitest run tests/schedule/server-actions.unit.test.ts`
- Confirm the tests cover at least one success-path dispatch and one degraded-dispatch success-path case.

## Observability Impact

- Signals added/changed: unit-test-visible dispatch invocation outcome alongside existing schedule action result assertions.
- How a future agent inspects this: run `pnpm --dir apps/web exec vitest run tests/schedule/server-actions.unit.test.ts` and inspect the notifier helper payload assertions.
- Failure state exposed: missing dispatch on success, dispatch on failed writes, or dispatch degradation mutating canonical write semantics.

## Inputs

- `apps/web/src/lib/server/schedule.ts` — canonical web schedule mutation authority.
- `supabase/functions/notify-calendar-change/index.ts` — existing shared-change dispatch seam and payload constraints.
- `apps/web/tests/schedule/server-actions.unit.test.ts` — current schedule mutation proof surface.

## Expected Output

- `apps/web/src/lib/server/calendar-change-notifier.ts` — reusable best-effort notifier helper for web schedule writes.
- `apps/web/src/lib/server/schedule.ts` — schedule mutations wired to dispatch only after canonical success.
- `apps/web/tests/schedule/server-actions.unit.test.ts` — unit proof for success-path dispatch, skip-on-failure, and degraded-dispatch semantics.
