---
id: M005
title: "Predictive assistance and release hardening"
status: verification-failed
generated_at: 2026-05-12T00:00:00Z
verification_passed: false
---

# M005: Predictive assistance and release hardening

**Milestone closeout verification failed; M005 was not completed.**

## What was verified

- `gsd_milestone_status` confirms the milestone is still `active` and all six slices (`S01`–`S06`) are `complete`.
- Milestone code-change evidence exists even though `HEAD` equals `main`: milestone-scoped commit history contains non-`.gsd/` implementation/test changes across web, mobile, and shared-core files (for example `packages/caluno-core/src/schedule/recurrence.ts`, `packages/caluno-core/src/schedule/conflicts.ts`, `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`, and `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte`).
- Slice `SUMMARY.md` and `UAT.md` artifacts exist for all six slices under `.gsd/milestones/M005/slices/`.

## Verification failures

### Fresh regression command

```bash
npx --yes supabase db reset --local --yes
pnpm --dir apps/web exec playwright test tests/e2e
```

### Result

- Exit code: `1`
- Passed: `6`
- Failed: `3`
- Did not run after failure cutoff: `8`
- Evidence: `.gsd/exec/c6e54fd1-4120-4555-b561-fa663f134910.stdout`

### Failing specs

1. `tests/e2e/auth-groups-access.spec.ts:45:1`
   - **join onboarding surfaces invalid codes, admits a valid redemption, survives reload, and loses access after sign-out**
   - Expected `data-testid="groups-shell"` to contain `onboarding-empty`, but the page rendered the trusted-online shell state instead.
2. `tests/e2e/calendar-shifts.spec.ts:339:1`
   - **touching-boundary create drafts stay advisory-free before submit**
   - The create dialog still reported advisory overlap count `1` for a boundary-touching draft that should remain advisory-free.
3. `tests/e2e/find-time.spec.ts:21:1`
   - **permitted member sees ranked top picks before the lighter browse inventory on the real find-time route**
   - Expected `10 truthful windows`, but the route rendered `8 truthful windows`.

## Closeout decision

M005 cannot be marked complete because milestone-level success criteria and definition-of-done verification are not fully satisfied:

- Launch-hardening is not freshly re-proven milestone-wide while the full web E2E regression still fails.
- Trust/authorization verification is not clean because the auth/onboarding regression failed.
- The predictive clash-advisory flow is not clean because the touching-boundary advisory-free regression failed.
- Find-time inventory/regression coverage is not clean because the ranked-window count regression failed.
- The existing validation artifact remains `needs-attention`, and the roadmap boundary map is still `Not provided.` while no slice `*-ASSESSMENT.md` artifacts are present.

## Next attempt

1. Fix the three failing web E2E regressions.
2. Re-run the full web regression command until it passes cleanly.
3. Refresh validation evidence after the regressions are fixed.
4. Retry milestone completion only after success criteria and definition-of-done checks pass without exceptions.
