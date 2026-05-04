---
estimated_steps: 3
estimated_files: 3
skills_used:
  - verify-before-complete
  - test
  - observability
---

# T04: Add the final assembled mobile tracer bullet and promote it into the default E2E bar

**Slice:** S05 — Cross-surface notification correctness and final mobile assembly proof
**Milestone:** M003

## Description

Close M003 with one final mobile assembly proof that exercises the real core loop in sequence: sign in, open a permitted calendar, survive continuity/reconnect, hand a Find time slot into create, and land a notification back inside the protected calendar context. Update the normal mobile E2E scripts so notification correctness and final assembly are part of the everyday verification bar instead of optional extra commands.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| `apps/mobile/tests/e2e/fixtures.ts` shared helpers | Fail the new tracer-bullet spec with explicit helper assertions | Fail fast on missing route-state transitions instead of generic end-to-end hangs | Fail on missing or malformed diagnostic attributes |
| existing auth/offline/find-time/notification route contracts | Stop at the first broken surface and leave the assertion at the real failing contract | Stop at the failing phase and preserve diagnostics for that phase | Treat malformed diagnostics as a product failure, not as skipped assertions |
| `apps/mobile/package.json` default test scripts | Keep the old script unchanged until the full tracer bullet passes locally | Do not claim promotion until `pnpm --dir apps/mobile test:e2e` covers the new files | Fail if the default script still omits notification correctness or the new assembly spec |

## Load Profile

- **Shared resources**: full mobile Playwright flow, local Supabase reset, seeded app shell + notification harness, and the default E2E script.
- **Per-operation cost**: the longest proof path in the slice because it composes auth, offline, find-time, create, and notification flows in one run.
- **10x breakpoint**: flaky waits or missing diagnostics would turn the final assembly proof into a generic timeout, so the spec must stay pinned to explicit route/sync/handoff attributes.

## Negative Tests

- **Malformed inputs**: none introduced beyond the existing route/notification diagnostics; the spec should fail if any prerequisite diagnostic is absent or invalid.
- **Error paths**: broken continuity, failed reconnect drain, missing Find time handoff cleanup, and wrong notification landing all stop the tracer bullet at the actual broken contract.
- **Boundary conditions**: sign-in from a fresh session, offline→online transition during the same flow, and notification landing back into a permitted calendar after prior handoff/create activity.

## Steps

1. Add a new Playwright assembly spec that composes the already-proven auth, continuity, Find time, create-arrival, and notification-open contracts into one tracer bullet.
2. Reuse the existing diagnostics (`data-route-mode`, sync-strip attributes, create-arrival attributes, notification-route attributes) so failures point to the actual broken surface.
3. Update `apps/mobile/package.json` so the default `test:e2e` scripts include `calendar-notifications.spec.ts` and `mobile-assembly.spec.ts`, then run the promoted command.

## Must-Haves

- [ ] One new Playwright spec proves the real phone loop hangs together across sign-in, calendar continuity, reconnect, Find time handoff, create arrival, and notification landing.
- [ ] The spec uses explicit diagnostic attributes instead of brittle copy-based waits.
- [ ] `pnpm --dir apps/mobile test:e2e` now includes notification correctness plus the final assembly spec.

## Verification

- `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts tests/e2e/find-time-handoff.spec.ts tests/e2e/calendar-notifications.spec.ts tests/e2e/mobile-assembly.spec.ts && pnpm --dir apps/mobile test:e2e`
- `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'`

## Observability Impact

- Signals added/changed: milestone-level tracer-bullet assertions across route-state, sync-strip, create-arrival, and notification-route diagnostics.
- How a future agent inspects this: run `pnpm --dir apps/mobile test:e2e` or the explicit Playwright command and inspect which contract assertion fails first.
- Failure state exposed: the exact phase where the assembled phone loop stops feeling real.

## Inputs

- `apps/mobile/tests/e2e/fixtures.ts` — shared Playwright helpers and notification harness extensions.
- `apps/mobile/tests/e2e/auth-scope.spec.ts` — trusted sign-in/scope proof to reuse as assembly entry.
- `apps/mobile/tests/e2e/calendar-offline.spec.ts` — continuity/reconnect proof surfaces to compose.
- `apps/mobile/tests/e2e/find-time-handoff.spec.ts` — handoff/create-arrival proof surfaces to compose.
- `apps/mobile/tests/e2e/calendar-notifications.spec.ts` — notification delivery/landing proof to reuse.
- `apps/mobile/package.json` — default E2E script definitions.

## Expected Output

- `apps/mobile/tests/e2e/mobile-assembly.spec.ts` — final assembled mobile tracer-bullet proof.
- `apps/mobile/package.json` — default mobile E2E commands updated to include notification correctness and final assembly.
- `apps/mobile/tests/e2e/fixtures.ts` — any helper additions needed by the new integrated spec.
