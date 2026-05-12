---
phase: verification
milestone: M005
title: Predictive assistance and release hardening
generated: 2026-05-12T00:00:00Z
status: failed
verification_passed: false
---

# M005 Verification Failure Summary

## Outcome
Milestone M005 is **not ready for completion**.

## Verified inputs
- `gsd_milestone_status` shows milestone `M005` is still `active` and all six slices (`S01`–`S06`) are `complete`.
- Slice `SUMMARY.md` and `UAT.md` artifacts exist for every slice under `.gsd/milestones/M005/slices/`.
- `.gsd/exec/8a988344-13c4-4af9-8f69-a7ac6ffea93f.stdout` proves milestone-scoped non-`.gsd/` implementation/test changes even though `HEAD` self-diffs against `main`.
- `.gsd/milestones/M005/M005-VALIDATION.md` still reports verdict `needs-attention`.

## Blocking verification failures

### Fresh command run
```bash
npx --yes supabase db reset --local --yes
pnpm --dir apps/web exec playwright test tests/e2e
```

### Result
- Exit code: `1`
- Passed: `6`
- Failed: `3`
- Did not run after failure cutoff: `8`
- Evidence file: `.gsd/exec/c6e54fd1-4120-4555-b561-fa663f134910.stdout`

### Failing specs
1. `tests/e2e/auth-groups-access.spec.ts:45:1`
   - onboarding-empty state was expected but the trusted-online shell rendered instead.
2. `tests/e2e/calendar-shifts.spec.ts:339:1`
   - a touching-boundary draft incorrectly surfaced clash advisory overlap count `1`.
3. `tests/e2e/find-time.spec.ts:21:1`
   - expected `10 truthful windows`, but the page rendered `8 truthful windows`.

## Why completion is blocked
- Launch-hardening is not re-proven milestone-wide with a clean fresh regression run.
- Trust/authorization surfaces are not cleanly re-verified because an auth/onboarding E2E failed.
- Predictive clash-advisory proof is not cleanly re-verified because the boundary-touching advisory-free spec failed.
- The current validation artifact remains `needs-attention`.
- The roadmap boundary map is still missing (`Not provided.`).
- No slice `*-ASSESSMENT.md` artifacts are present under `.gsd/milestones/M005`.

## Next attempt should
1. Fix the three failing web E2E regressions above.
2. Re-run the full web regression command until it passes cleanly.
3. Refresh validation evidence once the regression set passes.
4. Retry milestone completion only after success criteria and definition-of-done checks pass without exceptions.
