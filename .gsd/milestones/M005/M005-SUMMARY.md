---
id: M005
title: "Predictive assistance and release hardening"
status: verification-failed
generated_at: 2026-05-12T00:00:00Z
verification_passed: false
key_decisions:
  - Preserve the existing predictive-assistance scope evidence but block milestone completion until milestone-wide hardening regressions are cleared.
  - Treat M005-VALIDATION.md (verdict: needs-attention) as authoritative for the current closeout state because no fresher passing validation exists.
key_files:
  - .gsd/milestones/M005/M005-VALIDATION.md
  - .gsd/milestones/M005/M005-VERIFICATION-FAILURE.md
  - .gsd/exec/c6e54fd1-4120-4555-b561-fa663f134910.stdout
  - .gsd/exec/8a988344-13c4-4af9-8f69-a7ac6ffea93f.stdout
lessons_learned:
  - Milestone closeout must use milestone-wide regression evidence, not only slice-local passes.
  - When HEAD self-diffs against main, milestone-scoped commit trailers can still prove real non-.gsd implementation changes.
---

# M005: Predictive assistance and release hardening

**Milestone closeout verification failed; M005 is not complete.**

## What Happened

`gsd_milestone_status` confirms M005 is still `active` while all six slices (`S01`–`S06`) are `complete`, so this turn was a closeout-only verification pass rather than implementation work. Code-change verification passed through milestone-scoped commit evidence even though `HEAD`, `main`, and the merge-base are the same commit: `.gsd/exec/8a988344-13c4-4af9-8f69-a7ac6ffea93f.stdout` shows non-`.gsd/` web, mobile, and shared-core work landed during M005. Slice `SUMMARY.md` and `UAT.md` artifacts are present for every slice, but milestone completion is blocked because the existing validation artifact remains `needs-attention` and the fresh milestone-wide web regression proof still fails three E2E specs.

## Verification Results

### Code-change verification

- ✅ `HEAD` equals `main`/merge-base, so the closeout used milestone-scoped commit evidence instead of a direct diff.
- ✅ `.gsd/exec/8a988344-13c4-4af9-8f69-a7ac6ffea93f.stdout` records non-`.gsd/` milestone commits touching shared-core, web, and mobile implementation/test files.

### Fresh regression verification

Command evidence from `.gsd/exec/c6e54fd1-4120-4555-b561-fa663f134910.stdout`:

```bash
npx --yes supabase db reset --local --yes
pnpm --dir apps/web exec playwright test tests/e2e
```

- ❌ Exit code: `1`
- ✅ Passed: `6`
- ❌ Failed: `3`
- ⚠️ Did not run after failure cutoff: `8`

Failing specs:
1. `tests/e2e/auth-groups-access.spec.ts:45:1` — expected `groups-shell` to show `onboarding-empty`, but the trusted-online shell rendered instead.
2. `tests/e2e/calendar-shifts.spec.ts:339:1` — a touching-boundary draft incorrectly surfaced clash advisory overlap count `1` before submit.
3. `tests/e2e/find-time.spec.ts:21:1` — expected `10 truthful windows`, but the real route rendered `8 truthful windows`.

## Success Criteria Results

- ✅ **Predictive or anticipatory scheduling features are live and covered by unit and E2E tests.** Slice summaries and validation evidence show predictive helpers plus web/mobile recurrence and clash-advisory flows shipped with unit and targeted browser coverage.
- ✅ **R011 (predictive scheduling assistance) is validated.** Slice evidence and `.gsd/REQUIREMENTS.md` already record R011 as validated.
- ❌ **Launch hardening: reliability, onboarding, performance, accessibility, observability, and deployment readiness are addressed.** Fresh milestone-wide web E2E regression still fails, so launch hardening is not cleanly re-proven.
- ✅ **UX is refined for calmness, polish, and fit/finish.** Slice summaries consistently describe calm, warning-only predictive UI with explicit diagnostics.
- ❌ **All trust, privacy, and authorization constraints from prior milestones are maintained.** The failing auth/onboarding regression means broader trust/authorization proof is not currently clean.
- ✅ **Explicit UI and diagnostics exist for predictive features and hardening outcomes.** Predictive chips, clash advisories, and route-state diagnostics are present in slice evidence.

## Definition of Done Results

- ✅ All six roadmap slices are marked complete in `gsd_milestone_status`.
- ✅ Slice `SUMMARY.md` and `UAT.md` artifacts exist for `S01`–`S06`.
- ❌ Integrated milestone verification is not green because the fresh full web E2E run failed three existing specs.
- ❌ The current milestone validation artifact is still `needs-attention`, so there is no fresh passing milestone validation to authorize closeout.
- ❌ The roadmap boundary map is still `Not provided.`
- ⚠️ No slice `*-ASSESSMENT.md` artifacts are present under `.gsd/milestones/M005`.

## Requirement Outcomes

- No requirement status changes were applied during this closeout turn.
- Existing evidence still supports `R011` as implemented and validated for the predictive-assistance scope, but milestone completion remains blocked by broader hardening and regression failures.

## Deviations

Closeout could not proceed to milestone completion because milestone-wide verification uncovered unresolved regressions outside the narrow predictive slice-local proofs.

## Follow-ups

1. Fix the three failing web E2E regressions in auth/onboarding, touching-boundary clash advisory behavior, and find-time ranked inventory.
2. Re-run the full web regression command until it passes cleanly.
3. Refresh milestone validation so `M005-VALIDATION.md` becomes a fresh pass instead of `needs-attention`.
4. Retry `gsd_complete_milestone` only after success criteria and definition-of-done checks are fully green.
