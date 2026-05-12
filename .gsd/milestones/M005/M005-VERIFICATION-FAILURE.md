---
phase: complete-milestone
milestone: M005
generated: 2026-05-12T00:00:00Z
status: failed
verification_passed: false
---

# M005 Verification Failure Summary

Milestone closeout stopped at the verification gate. `gsd_complete_milestone` was **not** called.

## What passed

- **Duplicate-closeout guard:** `gsd_milestone_status(M005)` returned `status: active`; all 6 slices are `complete`.
- **Code-change verification:** `HEAD` equals `main`, so this was treated as a self-diff retry. Milestone-scoped commit evidence exists and touches non-`.gsd/` files (70 matching commits found from `GSD-Unit: M005` / `GSD-Task:` history, including web/mobile/core implementation and test changes).
- **Requirement state check:** `.gsd/REQUIREMENTS.md` already renders `R011` as `validated` with S06 evidence.

## Verification failures

Fresh milestone-closeout regression failed on the required integrated web E2E surface:

- Command: `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e`
- Result: **exit 1**
- Evidence artifact: `.gsd/exec/825d1a1a-2d78-4a33-a331-08329bdeceee.stdout`

### Failing specs

1. `apps/web/tests/e2e/auth-groups-access.spec.ts:45`
   - Failure: onboarding assertion is stale.
   - Expected: `groups-shell` contained `onboarding-empty`.
   - Actual: `groups-shell` now reports shell mode (`trusted-online`), while onboarding emptiness is surfaced separately via `data-testid="onboarding-empty-state"`.

2. `apps/web/tests/e2e/calendar-shifts.spec.ts:339`
   - Failure: touching-boundary create draft incorrectly saw an advisory during the full-suite run.
   - Actual conflicting visible shift: `Morning intake offline revised` (`Apr 15 · 09:45–11:45 UTC`).
   - Interpretation: earlier serial suite state leaked into this scenario, so the boundary test no longer ran against the pristine seeded window it assumes.

3. `apps/web/tests/e2e/find-time.spec.ts:21`
   - Failure: find-time inventory assertion is stale under the current suite state.
   - Expected: `10 truthful windows`.
   - Actual: `8 truthful windows`.
   - This blocks fresh proof for launch hardening and trust/authorization continuity across the integrated web surface.

## Why milestone completion is blocked

The inlined validation already flagged milestone-wide hardening/trust proof as incomplete unless the fresh full web regression is green. That regression is still red, so these success criteria remain unmet:

- **Launch hardening: reliability, onboarding, performance, accessibility, observability, and deployment readiness are addressed**
- **All trust, privacy, and authorization constraints from prior milestones are maintained**

Definition of done is also blocked because milestone-level integrations are not freshly green on the full web regression surface.

## Important execution constraint

This unit is running under the `complete-milestone` tools policy, which mechanically blocks edits outside `.gsd/`. Attempting to patch `apps/web/**` test or product code in this turn is forbidden. The failing specs must be fixed in an execution/task unit, then milestone closeout can be retried.

## Recommended next action

Open an execution unit to repair the three failing web E2E cases, then rerun:

`npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e`

Only after that passes should M005 closeout be retried.
