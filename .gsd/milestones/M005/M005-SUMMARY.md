---
id: M005
title: "Predictive assistance and release hardening"
status: verification-failed
completed_at: null
verification_passed: false
---

# M005: Predictive assistance and release hardening

**Milestone closeout verification failed. M005 remains active and must not be marked complete yet.**

## What Happened

All six slices (S01–S06) are marked complete in the milestone database, and the milestone contains delivered implementation changes beyond `.gsd/` files when compared with `origin/main` (merge-base `c0fed57685ef5cf8b386f1b1901be3068aadc71c` → `HEAD 57c45c51722e96f4ef1cc5bba7cc86f8fe7f8cfc`, with non-`.gsd/` diffs present across web/mobile source and tests). However, milestone completion is blocked by the current validation state and unresolved verification gaps.

The authoritative validation artifact for M005 is still `needs-attention`. It records that predictive assistance shipped and that `R011` is validated, but it also records milestone-wide closeout failures: fresh full web E2E regression proof was not clean, launch-hardening was not fully re-proven, and broader trust/authorization coverage was not cleanly re-validated. In addition, the roadmap still has `Boundary Map: Not provided.`, and no slice-level `*-ASSESSMENT.md` artifacts are present under `.gsd/milestones/M005/`.

Because verification failed, this file is a failure summary for the next remediation attempt, not a completion record rendered by `gsd_complete_milestone`.

## Success Criteria Results

- ✅ Predictive or anticipatory scheduling features are live and covered by unit and E2E tests for the predictive flows.
- ✅ `R011` (predictive scheduling assistance) has slice-level evidence and is already rendered as validated in requirements.
- ❌ Launch hardening is not fully proven milestone-wide. The current validation artifact reports three failing existing web E2E specs in the fresh full regression run: `auth-groups-access`, `calendar-shifts` (touching-boundary advisory-free flow), and `find-time` (ranked-window inventory).
- ✅ UX calmness/polish for predictive assistance is evidenced by the shipped suggestion/advisory surfaces and stable diagnostics.
- ❌ Trust, privacy, and authorization constraints are not fully re-proven milestone-wide because the fresh regression includes the failing `auth-groups-access` spec.
- ✅ Explicit UI and diagnostics for predictive features and hardening outcomes are present.

## Definition of Done Results

- ✅ `gsd_milestone_status` reports all slices complete: S01, S02, S03, S04, S05, S06.
- ✅ Slice summary and UAT artifacts exist for all six slices.
- ❌ The current milestone validation verdict is `needs-attention`, not pass.
- ❌ Integrated verification is not fully clean because the latest recorded full web E2E regression is failing.
- ❌ The roadmap boundary map requested by milestone validation is still missing (`Boundary Map: Not provided.`).
- ❌ No slice-level `Sxx-ASSESSMENT.md` artifacts were found under `.gsd/milestones/M005/`.

## Requirement Outcomes

- `R011`: evidence remains strong and slice summaries support its validated state, but no additional requirement transition should be persisted during this closeout attempt because the milestone itself is not yet complete.

## Blocking Issues

1. Re-establish clean milestone-wide regression evidence by fixing or re-verifying the failing web E2E specs called out in `M005-VALIDATION.md`.
2. Refresh milestone validation so it truthfully covers the current artifact set and returns a passing verdict.
3. Add the missing authoritative boundary map to `M005-ROADMAP.md` or otherwise remediate the MV03 documentation gap.
4. Decide whether slice-level `*-ASSESSMENT.md` artifacts are required by project process for this milestone; if yes, generate them before the next closeout attempt.

## Next Attempt Guidance

Do not call `gsd_complete_milestone` until the validation verdict is upgraded to pass and milestone-wide regression evidence is clean. Once those issues are resolved, rerun milestone verification, update any requirement evidence that truly changed, extract learnings, and only then persist milestone completion.
