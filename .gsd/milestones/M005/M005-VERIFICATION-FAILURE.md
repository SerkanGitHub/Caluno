---
phase: complete-milestone
milestone: M005
generated: 2026-05-13T00:00:00Z
status: failed
verification_passed: false
verification_run:
  command: npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e
  exec_artifact: .gsd/exec/956f4664-1139-4d5a-927d-d68a2b0247e0.stdout
---

# M005 Verification Failure Summary

Milestone closeout stopped at the verification gate. `gsd_complete_milestone` was **not** called.

## What passed

- **Duplicate-closeout guard:** `gsd_milestone_status(M005)` returned `status: active`; all 6 slices are `complete`.
- **Code-change verification:** `HEAD` equals `main`, so this was treated as a self-diff retry. Milestone-scoped commit evidence exists and touches non-`.gsd/` files, including web, mobile, and `@repo/caluno-core` implementation/test changes recorded in the git trailer history for M005 tasks.
- **Predictive-scope evidence:** S02-S06 summaries remain internally consistent for recurrence suggestion helpers, clash advisories, web/mobile predictive UI surfaces, typed route diagnostics, scoped accessibility proof, and `R011` validation.
- **Requirement state check:** `.gsd/REQUIREMENTS.md` still renders `R011` as `validated` with M005/S06 evidence.

## Verification failures

Fresh milestone-closeout regression failed on the required integrated web E2E surface:

- Command: `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e`
- Result: **exit 1**
- Evidence artifact: `.gsd/exec/956f4664-1139-4d5a-927d-d68a2b0247e0.stdout`

### Failing specs

1. `apps/web/tests/e2e/auth-groups-access.spec.ts:45`
   - Failure: onboarding assertion is stale.
   - Expected: `data-testid="groups-shell"` contains `onboarding-empty`.
   - Actual: `groups-shell` now reports only shell state (`trusted-online`), while the onboarding-empty condition is surfaced separately via `data-testid="onboarding-empty-state"`.

2. `apps/web/tests/e2e/calendar-shifts.spec.ts:339`
   - Failure: the touching-boundary create-draft case still observes a clash advisory.
   - Expected: overlap count stays `null` / advisory-free for the Wednesday touch-boundary draft.
   - Actual: overlap count becomes `1`, so the suite still reports an unexpected advisory on the supposedly advisory-free boundary case.

3. `apps/web/tests/e2e/find-time.spec.ts:21`
   - Failure: ranked inventory assertion is stale relative to the seeded data/runtime.
   - Expected: `find-time-summary` contains `10 truthful windows`.
   - Actual: the route now renders `8 truthful windows`, so the suite's expected inventory count no longer matches the real result.

## Why milestone completion is blocked

These fresh failures mean the required integrated web regression is still red, so milestone verification does **not** pass for:

- **Launch hardening: reliability, onboarding, performance, accessibility, observability, and deployment readiness are addressed**
- **All trust, privacy, and authorization constraints from prior milestones are maintained**

Definition of done is also blocked because the milestone-wide integrated web proof is not green on the required closeout surface.

## Recommended next action

Open an execution/task unit to repair the three failing web E2E cases, then rerun:

`npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e`

Only after that command passes should M005 closeout be retried.
