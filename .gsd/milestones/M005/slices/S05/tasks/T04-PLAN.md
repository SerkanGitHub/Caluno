---
estimated_steps: 41
estimated_files: 2
skills_used: []
---

# T04: Add mobile predictive Playwright helpers and prove accept/dismiss plus clash smoke flows

---
estimated_steps: 7
estimated_files: 2
skills_used:
  - test
  - verify-before-complete
---

# T04: Add mobile predictive Playwright helpers and prove accept/dismiss plus clash smoke flows

## Description

Close the slice with mobile browser proof, using the same vocabulary as web so future regressions compare cleanly across surfaces. Add fixture readers for the predictive hooks, then write a dedicated mobile smoke spec that proves recurrence suggestion accept/dismiss/reload behavior and clash advisory overlap/clear behavior on the real Alpha shared calendar route.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Local Supabase seed/reset and Playwright mobile route | Fail the test loudly with the missing selector or route-state diagnostic that regressed. | Treat as a test failure; do not weaken assertions to polling-only success. | Fail with the explicit hook/attribute mismatch so contract drift is obvious. |

## Negative Tests

- **Malformed inputs**: if the suggestion loader fails closed, the spec should assert the route diagnostic rather than pretending the chip should exist.
- **Error paths**: dismissing the suggestion should keep it hidden on close/reopen in the same page instance and allow it to return only after reload/fresh data.
- **Boundary conditions**: overlap and clear drafts should both be exercised so the advisory does not become sticky; if edit coverage is added, self-exclusion must stay clear.

## Steps

1. Add fixture helpers in `apps/mobile/tests/e2e/fixtures.ts` to read the mobile recurrence suggestion snapshot and clash advisory snapshot using the shared web vocabulary.
2. Create `apps/mobile/tests/e2e/mobile-predictive.spec.ts` with focused mobile smoke coverage for suggestion visible → dismiss → close/reopen hidden → reload visible again.
3. In the same spec, cover suggestion accept behavior so cadence becomes weekly with interval `1` while start/end values remain the operator-selected draft window.
4. Add overlap and clear create-draft assertions for `clash-advisory`, including metadata such as overlap count and conflicting shift ids.
5. Re-run existing mobile smoke coverage (`find-time-handoff.spec.ts` and `mobile-assembly.spec.ts`) after the predictive spec so handoff/polish regressions surface before slice closeout.
6. Keep assertions hook-based and deterministic; do not rely on screenshot-only verification.
7. Reset the local Supabase DB immediately before the Playwright run to avoid shared-seed drift from prior specs.

## Must-Haves

- [ ] Mobile predictive helpers expose deterministic snapshot readers for recurrence suggestion and clash advisory state.
- [ ] The new spec proves both accept/dismiss recurrence behavior and overlap/clear advisory behavior on the real route.
- [ ] Existing mobile handoff/assembly smoke remains green after predictive wiring lands.

## Verification

- `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/mobile-predictive.spec.ts tests/e2e/find-time-handoff.spec.ts tests/e2e/mobile-assembly.spec.ts`

## Inputs

- `apps/mobile/tests/e2e/fixtures.ts` — current mobile route and create-sheet helpers.
- `apps/mobile/tests/e2e/find-time-handoff.spec.ts` — existing mobile smoke vocabulary and route bootstrap helpers.
- `apps/mobile/tests/e2e/mobile-assembly.spec.ts` — broader mobile tracer bullet regression surface.
- `apps/web/tests/e2e/fixtures.ts` — reference recurrence/advisory helper contract to mirror on mobile.
- `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte` — final hook surface from T03.

## Expected Output

- `apps/mobile/tests/e2e/fixtures.ts` — predictive snapshot helpers for mobile recurrence and advisory surfaces.
- `apps/mobile/tests/e2e/mobile-predictive.spec.ts` — focused Playwright smoke for mobile predictive behavior.

## Inputs

- `apps/mobile/tests/e2e/fixtures.ts`
- `apps/mobile/tests/e2e/find-time-handoff.spec.ts`
- `apps/mobile/tests/e2e/mobile-assembly.spec.ts`
- `apps/web/tests/e2e/fixtures.ts`
- `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte`

## Expected Output

- `apps/mobile/tests/e2e/fixtures.ts`
- `apps/mobile/tests/e2e/mobile-predictive.spec.ts`

## Verification

npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/mobile-predictive.spec.ts tests/e2e/find-time-handoff.spec.ts tests/e2e/mobile-assembly.spec.ts

## Observability Impact

Turns the new mobile predictive hooks into deterministic Playwright snapshots so future agents can localize regressions to loader state, suggestion lifecycle, or clash derivation.
