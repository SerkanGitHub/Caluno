---
estimated_steps: 3
estimated_files: 5
skills_used:
  - verify-before-complete
  - test
  - observability
---

# T02: Wire shared-change dispatch into mobile direct writes and reconnect drain

**Slice:** S05 — Cross-surface notification correctness and final mobile assembly proof
**Milestone:** M003

## Description

Extend the mobile trusted schedule transport so phone-originated create/edit/move/delete and reconnect-drained writes participate in the same best-effort shared-change notification contract as web. Keep mobile write authority unchanged: if dispatch is unavailable, the queued mutation still resolves truthfully and reconnect continues to use the canonical local-first flow.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| `apps/mobile/src/lib/supabase/client.ts` client seam for function invocation | Fail closed inside the dispatch helper and keep the mutation outcome unchanged | Treat dispatch as degraded and preserve the successful write outcome | Treat dispatch as degraded and preserve the successful write outcome |
| `apps/mobile/src/lib/offline/transport.ts` canonical write path | Return the existing write error and skip dispatch entirely | Return the existing timeout and skip dispatch entirely | Return the existing malformed-response outcome and skip dispatch entirely |
| reconnect replay through `@repo/caluno-core/offline/sync-engine` outcomes | Preserve queue semantics and stop/retry based on the existing replay contract, not dispatch status | Preserve replay timeout semantics and avoid inventing a second queue state | Preserve replay safety and surface dispatch as degraded only in tests/runtime state |

## Load Profile

- **Shared resources**: mobile direct Supabase writes, reconnect replay loop, and one additional edge-function invoke per successful mutation.
- **Per-operation cost**: one extra function invocation after each successful direct or replayed write.
- **10x breakpoint**: reconnect replay must not stall or duplicate because notification dispatch is slow or degraded.

## Negative Tests

- **Malformed inputs**: out-of-scope `calendarId`, malformed `shiftId`, and invalid function payload fields fail closed before dispatch.
- **Error paths**: function invoke rejects, times out, or returns malformed data after a successful write without mutating the canonical schedule outcome.
- **Boundary conditions**: replayed writes, single-shift creates, and recurring creates all dispatch exactly once per canonical success path.

## Steps

1. Widen or adapt the mobile Supabase client seam so trusted schedule transport code can invoke `notify-calendar-change` without weakening existing type boundaries.
2. Add a mobile dispatch helper and call it from successful create/edit/move/delete outcomes in `apps/mobile/src/lib/offline/transport.ts`, including reconnect-drained writes.
3. Extend mobile notification unit coverage to prove payload shape, degraded dispatch handling, and reconnect-safe behavior.

## Must-Haves

- [ ] Successful mobile direct writes and reconnect-drained writes attempt best-effort shared-change dispatch without changing canonical mutation authority.
- [ ] Failed or forbidden mobile writes never dispatch.
- [ ] Unit proof pins dispatch payload shape and shows degraded dispatch does not mutate queue or replay semantics.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts`
- Confirm the unit coverage includes at least one successful write with dispatch and one degraded dispatch that preserves the write outcome.

## Observability Impact

- Signals added/changed: dispatch-helper outcomes attached to the mobile notification contract/runtime proof surfaces without changing queue-state semantics.
- How a future agent inspects this: run the mobile notification unit suite and inspect the captured invoke payloads / degraded outcome assertions.
- Failure state exposed: missing mobile-origin dispatch, replay-triggered duplicate dispatch, or dispatch degradation incorrectly changing write/reconnect status.

## Inputs

- `apps/mobile/src/lib/supabase/client.ts` — current mobile client type boundary.
- `apps/mobile/src/lib/offline/transport.ts` — canonical mobile direct-write and reconnect path.
- `apps/mobile/src/lib/notifications/transport.ts` — existing notification transport conventions and reason codes.
- `apps/mobile/tests/mobile-notification-contract.unit.test.ts` — notification contract proof surface.
- `apps/mobile/tests/mobile-notification-runtime.unit.test.ts` — runtime proof surface that must remain compatible.

## Expected Output

- `apps/mobile/src/lib/supabase/client.ts` — client seam widened or adapted for best-effort function invocation.
- `apps/mobile/src/lib/offline/transport.ts` — successful direct/replay writes wired to dispatch after canonical success.
- `apps/mobile/src/lib/notifications/calendar-change-dispatch.ts` — reusable mobile shared-change dispatch helper.
- `apps/mobile/tests/mobile-notification-contract.unit.test.ts` — unit proof for mobile dispatch payloads and degraded handling.
- `apps/mobile/tests/mobile-notification-runtime.unit.test.ts` — runtime-safe coverage ensuring replay/duplicate behavior remains truthful.
