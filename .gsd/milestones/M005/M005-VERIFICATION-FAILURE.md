---
phase: verification
milestone: M005
title: Predictive assistance and release hardening
generated: 2026-05-12T10:42:51.991Z
status: failed
verification_passed: false
---

# M005 Verification Failure Summary

## Outcome

Milestone M005 is **not ready for completion**.

## Verified inputs

- `gsd_milestone_status` shows milestone `M005` is still `active` and all six slices (`S01`–`S06`) are `complete`.
- Code-change verification passed via milestone-scoped non-`.gsd/` commit evidence from `.gsd/exec/623b7df3-beb6-4cc1-8e80-032e0ce1ae19.stdout`, even though `HEAD` currently self-diffs against `main`.
- The inlined roadmap and validation context still identify two milestone-closeout criteria that require fresh integrated proof: launch hardening and trust/privacy/authorization preservation.
- `S06-SUMMARY.md` still provides passing targeted proof for predictive web/mobile/build hardening, including the scoped predictive-editor axe run and the web `calendar-shifts.spec.ts` rerun.

## Fresh verification evidence gathered on this attempt

### Command

```bash
npx --yes supabase db reset --local --yes
pnpm --dir apps/web exec playwright test tests/e2e/auth-groups-access.spec.ts tests/e2e/find-time.spec.ts
```

### Evidence

- Stdout: `.gsd/exec/dcf4c918-c326-48d1-8b77-e13e26e9e8cb.stdout`
- Stderr: `.gsd/exec/dcf4c918-c326-48d1-8b77-e13e26e9e8cb.stderr`
- Exit code: `1`
- Result: `1 passed`, `2 failed`, `3 did not run`

## Blocking verification failures

1. **Authorization/onboarding regression remains open**
   - Spec: `tests/e2e/auth-groups-access.spec.ts:45:1`
   - Failure: after signing in as the seeded no-membership user, `getByTestId('groups-shell')` rendered trusted-online shell copy instead of the expected `onboarding-empty` state.
   - Why it blocks completion: the milestone success criterion **“All trust, privacy, and authorization constraints from prior milestones are maintained”** is not freshly re-proven while this auth/onboarding regression is still failing.

2. **Find-time integrated regression remains open**
   - Spec: `tests/e2e/find-time.spec.ts:21:1`
   - Failure: `getByTestId('find-time-summary')` rendered `9 truthful windows` instead of the expected `10 truthful windows` for the seeded permitted-member route.
   - Why it blocks completion: the milestone success criterion **“Launch hardening: reliability, onboarding, performance, accessibility, observability, and deployment readiness are addressed”** is not cleanly re-proven while this real-route integrated web flow is still failing after a fresh local reset.

## Verification summary by required gate

### Step 4 — Code changes exist

**Pass.** Milestone-scoped commit evidence proves non-`.gsd/` implementation and test changes landed for M005.

### Step 5 — Success criteria

**Fail.**

- ✅ Predictive assistance is live and covered by unit/E2E evidence from S02–S06.
- ✅ `R011` is validated by the existing S06 requirement update and supporting verification.
- ❌ Launch hardening is not freshly green milestone-wide because the targeted post-reset web regression still fails in `auth-groups-access` and `find-time`.
- ✅ UX calmness/polish evidence remains supported by S03–S05 summaries.
- ❌ Trust/privacy/authorization constraints are not freshly re-proven because `auth-groups-access.spec.ts` still fails.
- ✅ Predictive UI/diagnostic seams remain evidenced by S03–S06.

### Step 6 — Definition of done

**Fail.**

- ✅ All roadmap slices are marked complete.
- ✅ Slice summaries/UAT artifacts exist.
- ✅ Cross-slice predictive integration remains evidenced by the existing slice summaries and validation notes.
- ❌ Integrated milestone-closeout verification is not fully green, so the milestone is not ready to close.

## Next attempt should

1. Fix the remaining `auth-groups-access` onboarding-state regression.
2. Fix the remaining `find-time` truthful-window inventory regression or update the seeded expectation only if the product behavior intentionally changed and the broader contract still holds.
3. Re-run the affected web E2E coverage from a fresh local reset until the failing specs pass.
4. Re-attempt milestone completion only after the success-criteria and definition-of-done gates are fully green.
