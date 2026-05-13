---
phase: complete-milestone
milestone: M005
generated: 2026-05-13T00:00:00Z
status: failed
verification_passed: false
verification_runs:
  code_change_check: .gsd/exec/3ee60abd-801e-4415-b5c9-f8fd022ff016.stdout
  artifact_check:
    - .gsd/exec/4ee2e784-771c-4e65-86c4-2dace2102cb5.stdout
    - .gsd/exec/b0d7bce9-86fc-4571-9693-2b84a5275ca1.stdout
  integrated_regression: .gsd/exec/8f7910e9-28cd-4051-8ff1-ab71b88493c1.stdout
---

# M005 Verification Failure Summary

Milestone closeout stopped at the verification gate. `gsd_complete_milestone` was **not** called, `.gsd/PROJECT.md` was **not** refreshed for completion, and requirement state was **not** mutated during this turn.

## What passed

- **Duplicate-closeout guard:** `gsd_milestone_status(M005)` returned `status: active`; all six slices are still `complete`.
- **Code-change verification:** `HEAD` equals `main`, so this turn was evaluated as a self-diff retry. Milestone-scoped commit evidence still shows non-`.gsd/` implementation/test changes for M005, including:
  - `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
  - `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`
  - `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
  - `apps/web/tests/e2e/calendar-shifts.spec.ts`
  - `apps/web/tests/e2e/fixtures.ts`
- **Slice artifact completeness:** all slice summary artifacts exist (`S01`-`S06`) and all slice UAT artifacts exist (`S01`-`S06`).
- **Predictive-scope evidence remains intact:** the shipped recurrence suggestion, clash advisory, mobile parity, typed route diagnostics, scoped accessibility proof, and build-readiness evidence recorded in S02-S06 remain internally consistent.
- **Requirement rendering check:** `.gsd/REQUIREMENTS.md` still renders `R011` as `validated` with M005/S06 proof.

## Fresh integrated verification run

Command rerun for closeout evidence:

```bash
npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/auth-groups-access.spec.ts tests/e2e/calendar-shifts.spec.ts tests/e2e/find-time.spec.ts
```

Result: **exit 1**

Outcome summary:
- `calendar-shifts.spec.ts` is now green in this run, including the previously problematic touching-boundary advisory-free case.
- Two milestone-level web regression failures remain.

Evidence:
- stdout: `.gsd/exec/8f7910e9-28cd-4051-8ff1-ab71b88493c1.stdout`
- stderr: `.gsd/exec/8f7910e9-28cd-4051-8ff1-ab71b88493c1.stderr`

## Remaining verification failures

### 1) Auth/onboarding regression still failing

- Spec: `apps/web/tests/e2e/auth-groups-access.spec.ts:45`
- Test: `join onboarding surfaces invalid codes, admits a valid redemption, survives reload, and loses access after sign-out`
- Failure mode: stale assertion for the signed-in no-membership shell state.
- Expected: `data-testid="groups-shell"` contains `onboarding-empty`
- Actual: `groups-shell` renders the shell state text (`trusted-online`) while the empty-membership onboarding surface is exposed separately via `data-testid="onboarding-empty-state"`

This means the onboarding/trust surface is not currently re-proven by the fresh closeout run.

### 2) Find-time ranked inventory regression still failing

- Spec: `apps/web/tests/e2e/find-time.spec.ts:21`
- Test: `permitted member sees ranked top picks before the lighter browse inventory on the real find-time route`
- Failure mode: stale expected inventory count.
- Expected: `find-time-summary` contains `10 truthful windows`
- Actual: the route renders `11 truthful windows`

This means the broader integrated release-hardening regression remains red even though the predictive scheduling surfaces themselves are green.

## Success criteria status at this gate

- [x] Predictive or anticipatory scheduling features are live and covered by unit and E2E tests.
- [x] `R011` is validated in the rendered requirements register.
- [ ] Launch hardening: reliability, onboarding, performance, accessibility, observability, and deployment readiness are addressed.
  - Blocked by the still-failing auth/onboarding and find-time web regressions in the fresh closeout run.
- [x] UX is refined for calmness, polish, and fit/finish.
- [ ] All trust, privacy, and authorization constraints from prior milestones are maintained.
  - Blocked because the fresh auth/onboarding regression proof is not green.
- [x] Explicit UI and diagnostics exist for predictive features and hardening outcomes.

## Definition-of-done status at this gate

- [x] All roadmap slices are complete.
- [x] Slice summary and UAT artifacts exist for S01-S06.
- [ ] Milestone-wide integrated web proof is green.
  - Blocked by the two failing Playwright specs above.

## Why milestone completion is blocked

M005 cannot be completed while the fresh integrated web regression is still red. The predictive-assistance work itself remains delivered and evidenced, but milestone-closeout verification still fails on broader launch-hardening and trust/onboarding surfaces. Per the completion contract, that blocks `gsd_complete_milestone`.

## Recommended next action

Open a new execution/remediation unit to repair or truthfully update these two failing web E2E cases, then rerun:

```bash
npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/auth-groups-access.spec.ts tests/e2e/calendar-shifts.spec.ts tests/e2e/find-time.spec.ts
```

If that targeted rerun passes, perform one more milestone-closeout attempt and only then call `gsd_complete_milestone`.
