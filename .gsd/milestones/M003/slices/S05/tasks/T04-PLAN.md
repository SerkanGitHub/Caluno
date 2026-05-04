---
estimated_steps: 5
estimated_files: 3
skills_used: []
---

# T04: Added final assembled mobile tracer-bullet spec (5 phases: sign-in, offline continuity, find-time handoff, notification delivery, negative paths) and promoted calendar-notifications + mobile-assembly into the default test:e2e bar.

Close M003 with one final mobile assembly proof that exercises the real core loop in sequence: sign in, open a permitted calendar, survive continuity/reconnect, hand a Find time slot into create, and land a notification back inside the protected calendar context. Update the normal mobile E2E scripts so notification correctness and final assembly are part of the everyday verification bar instead of optional extra commands.

Steps:
1. Add a new Playwright assembly spec that stitches together the proven auth, continuity, Find time, and notification contracts without relying on placeholder behavior.
2. Reuse the existing route and handoff diagnostics so failures still point to the actual broken surface.
3. Update `apps/mobile/package.json` to include `calendar-notifications.spec.ts` and the new assembly spec in the default `test:e2e` commands, then run the full slice verification bar.

## Inputs

- ``apps/mobile/tests/e2e/fixtures.ts``
- ``apps/mobile/tests/e2e/auth-scope.spec.ts``
- ``apps/mobile/tests/e2e/calendar-offline.spec.ts``
- ``apps/mobile/tests/e2e/find-time-handoff.spec.ts``
- ``apps/mobile/tests/e2e/calendar-notifications.spec.ts``
- ``apps/mobile/package.json``

## Expected Output

- ``apps/mobile/tests/e2e/mobile-assembly.spec.ts``
- ``apps/mobile/package.json``
- ``apps/mobile/tests/e2e/fixtures.ts``

## Verification

npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts tests/e2e/find-time-handoff.spec.ts tests/e2e/calendar-notifications.spec.ts tests/e2e/mobile-assembly.spec.ts && pnpm --dir apps/mobile test:e2e

## Observability Impact

The final assembly spec should assert the existing route-state, sync-strip, create-arrival, and notification-route diagnostics so milestone-level failures remain attributable to the real broken surface instead of a vague end-to-end timeout.
