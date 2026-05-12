---
phase: verification
milestone: M005
title: Predictive assistance and release hardening
generated: 2026-05-12T11:00:00Z
status: failed
verification_passed: false
---

# M005 Verification Failure Summary

## Outcome

Milestone M005 is **not ready for completion**.

## Verified inputs

- `gsd_milestone_status` shows milestone `M005` is still `active` and all six slices (`S01`–`S06`) are `complete`.
- Code-change verification passed via milestone-scoped commit evidence from `.gsd/exec/7b0afe35-557a-4479-a3b7-065445e20f0e.stdout`, even though `HEAD` currently self-diffs against `main`.
- `.gsd/milestones/M005/M005-VALIDATION.md` still reports `verdict: needs-attention`, so there is no authoritative passing validation artifact for closeout.
- Slice closeout artifacts remain present for all slices via the milestone directory scan.

## Fresh verification evidence gathered on this attempt

### Command

```bash
npx --yes supabase db reset --local --yes
pnpm --dir apps/web exec playwright test tests/e2e/auth-groups-access.spec.ts tests/e2e/calendar-shifts.spec.ts tests/e2e/find-time.spec.ts
```

### Evidence

- Stdout: `.gsd/exec/a4591056-6fd0-413c-aa39-e3cf58fb0b66.stdout`
- Stderr: `.gsd/exec/a4591056-6fd0-413c-aa39-e3cf58fb0b66.stderr`
- Exit code: `1`
- Result: `8 passed`, `2 failed`, `3 did not run`

## Blocking verification failures

1. **Authorization/onboarding regression remains open**
   - Spec: `tests/e2e/auth-groups-access.spec.ts:45:1`
   - Failure: after signing in as the seeded no-membership user, `getByTestId('groups-shell')` rendered trusted-online shell copy instead of the expected `onboarding-empty` state.
   - Why it blocks completion: the milestone success criterion **“All trust, privacy, and authorization constraints from prior milestones are maintained”** is not freshly re-proven while this auth/onboarding regression is still failing.

2. **Find-time integrated regression remains open**
   - Spec: `tests/e2e/find-time.spec.ts:21:1`
   - Failure: `getByTestId('find-time-summary')` rendered `11 truthful windows` instead of the expected `10 truthful windows` for the seeded permitted-member route.
   - Why it blocks completion: the milestone success criterion **“Launch hardening: reliability, onboarding, performance, accessibility, observability, and deployment readiness are addressed”** is not cleanly re-proven while this integrated real-route web flow still fails after a fresh local reset.

## Verification summary by required gate

### Step 4 — Code changes exist

**Pass.** Milestone-scoped commit evidence proves non-`.gsd/` implementation and test changes landed for M005.

Representative touched files from `.gsd/exec/7b0afe35-557a-4479-a3b7-065445e20f0e.stdout`:
- `packages/caluno-core/src/schedule/recurrence.ts`
- `packages/caluno-core/src/schedule/conflicts.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`
- `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte`

### Step 5 — Success criteria

**Fail.**

- ✅ Predictive assistance is live and covered by unit/E2E evidence from S02–S06.
- ✅ `R011` is already validated by the existing S06 requirement update and supporting evidence.
- ❌ Launch hardening is not freshly green milestone-wide because the targeted post-reset web regression still fails in `auth-groups-access` and `find-time`.
- ✅ UX calmness/polish evidence remains supported by S03–S05 summaries.
- ❌ Trust/privacy/authorization constraints are not freshly re-proven because `auth-groups-access.spec.ts` still fails.
- ✅ Predictive UI/diagnostic seams remain evidenced by S03–S06.

### Step 6 — Definition of done

**Fail.**

- ✅ All roadmap slices are marked complete.
- ✅ Slice summaries/UAT artifacts exist.
- ✅ Cross-slice predictive integration remains evidenced by the slice summaries and existing validation notes.
- ❌ Integrated milestone-closeout verification is not fully green because the fresh targeted regression run still fails.
- ❌ The milestone validation artifact remains `needs-attention`, so there is no passing closeout validation to rely on.

## Notes on newly improved evidence

- `tests/e2e/calendar-shifts.spec.ts:339:1` now passes in the fresh targeted run, so the earlier touching-boundary advisory regression is no longer part of the blocking set.
- The remaining blockers are narrowed to auth/onboarding and find-time inventory behavior.

## Next attempt should

1. Fix the remaining `auth-groups-access` onboarding-state regression.
2. Fix the remaining `find-time` truthful-window inventory regression or update the seeded expectation only if the product behavior intentionally changed and the broader contract still holds.
3. Re-run the affected web E2E coverage from a fresh local reset until both failing specs pass.
4. Refresh milestone validation once the full milestone-closeout evidence is green.
5. Re-attempt milestone completion only after the success-criteria and definition-of-done gates are fully green.
