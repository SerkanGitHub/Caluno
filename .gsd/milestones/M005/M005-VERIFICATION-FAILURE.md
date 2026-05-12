---
phase: verification
milestone: M005
title: Predictive assistance and release hardening
generated: 2026-05-12T10:39:45Z
status: failed
verification_passed: false
---

# M005 Verification Failure Summary

## Outcome

Milestone M005 is **not ready for completion**.

## Verified inputs

- `gsd_milestone_status` shows milestone `M005` is still `active` and all six slices (`S01`–`S06`) are `complete`.
- `.gsd/exec/1f6a0590-4302-4922-96d8-a15d9306f5af.stdout` proves milestone-scoped non-`.gsd/` implementation and test changes even though `HEAD` self-diffs against `main`.
- `.gsd/exec/d7d09b57-9019-4d66-ab89-0eb1c247b485.stdout` confirms every slice has `SUMMARY.md` and `UAT.md` artifacts.
- `.gsd/milestones/M005/M005-VALIDATION.md` still reports verdict `needs-attention`.
- `.gsd/REQUIREMENTS.md` still records `R011` as `validated` from slice-level evidence.

## Blocking verification failures

### Regression evidence

```bash
npx --yes supabase db reset --local --yes
pnpm --dir apps/web exec playwright test tests/e2e
```

Evidence file: `.gsd/exec/c6e54fd1-4120-4555-b561-fa663f134910.stdout`

### Result

- Exit code: `1`
- Passed: `6`
- Failed: `3`
- Did not run after failure cutoff: `8`

### Failing specs

1. `tests/e2e/auth-groups-access.spec.ts:45:1`
   - Expected the `groups-shell` to show `onboarding-empty`, but the trusted-online shell rendered instead.
2. `tests/e2e/calendar-shifts.spec.ts:339:1`
   - A touching-boundary create draft incorrectly surfaced a clash advisory overlap count of `1` before submit.
3. `tests/e2e/find-time.spec.ts:21:1`
   - Expected `10 truthful windows`, but the real route rendered `8 truthful windows`.

## Why completion is blocked

- Launch-hardening is not freshly re-proven milestone-wide with a clean integrated regression run.
- Trust, privacy, and authorization constraints are not cleanly re-verified because an auth/onboarding E2E still fails.
- The milestone validation artifact remains `needs-attention`, so there is no fresh pass authorizing closeout.
- The roadmap boundary map is still missing (`Not provided.` in `M005-ROADMAP.md`).
- No slice `*-ASSESSMENT.md` artifacts were found under `.gsd/milestones/M005/slices/`.

## Next attempt should

1. Fix the three failing web E2E regressions above.
2. Re-run the full web regression command until it passes cleanly.
3. Refresh milestone validation so `M005-VALIDATION.md` becomes a fresh pass.
4. Retry milestone completion only after success criteria and definition-of-done checks are fully green.
