---
id: M005
title: "Predictive assistance and release hardening"
status: verification-failed
completed_at: null
key_decisions:
  - M005 cannot be closed while the authoritative milestone validation remains needs-attention.
  - No additional requirement or project-state writes should occur until milestone-wide verification is clean.
key_files:
  - .gsd/milestones/M005/M005-VALIDATION.md
  - .gsd/milestones/M005/M005-ROADMAP.md
  - .gsd/REQUIREMENTS.md
lessons_learned:
  - Passing slice completion is necessary but not sufficient for milestone closeout; milestone-wide regression evidence still gates completion.
---

# M005: Predictive assistance and release hardening

**Milestone closeout verification failed. M005 remains active and must not be marked complete yet.**

## What Happened

Step 4 code-change verification passed, but only through milestone-scoped commit evidence because `HEAD` currently equals `main` at merge-base `2ccf835ac60e1b87bd1da0b6f97239bffe381677`. Milestone commits tied to `M005` still prove non-`.gsd/` delivery work exists, including shipped source/test changes such as `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`, `apps/web/tests/e2e/calendar-shifts.spec.ts`, and mobile predictive/build outputs referenced by the M005 commit history.

Closeout remains blocked by the current authoritative validation state. `.gsd/milestones/M005/M005-VALIDATION.md` is newer than the slice summaries and requirements render, and it still records verdict `needs-attention`. That validation says predictive assistance and `R011` are delivered, but milestone-wide hardening/trust proof is not yet clean because a fresh full web E2E regression previously failed `auth-groups-access`, `calendar-shifts` (touching-boundary advisory-free flow), and `find-time` (ranked-window inventory). The roadmap also still ends with `Boundary Map` -> `Not provided.`, and no slice-level `Sxx-ASSESSMENT.md` artifacts exist under `.gsd/milestones/M005`.

Because verification failed in steps 5 and 6, this file is a failure summary for the next remediation attempt, not a completion record rendered by `gsd_complete_milestone`.

## Success Criteria Results

- ✅ **Predictive or anticipatory scheduling features are live and covered by unit and E2E tests** — slice summaries and the current validation artifact consistently show shipped recurrence suggestions, clash advisories, unit coverage, and targeted browser/mobile E2E proof for the predictive flows.
- ✅ **R011 is validated** — `.gsd/REQUIREMENTS.md` currently renders `R011` as `validated`, with S06 evidence anchored to fresh predictive/browser/build verification.
- ❌ **Launch hardening is addressed milestone-wide** — the latest authoritative validation still says the fresh full web E2E regression was not clean, so reliability/deployment-readiness proof is incomplete at milestone closeout.
- ✅ **UX is refined for calmness, polish, and fit/finish** — the slice summaries and validation consistently describe calm, warning-only predictive surfaces with explicit accept/dismiss affordances and stable diagnostics.
- ❌ **Trust, privacy, and authorization constraints from prior milestones are maintained** — the failing `auth-groups-access` regression means milestone-closeout evidence does not yet fully re-prove the broader authorization surface.
- ✅ **Explicit UI and diagnostics exist for predictive features and hardening outcomes** — validation cites the shipped `recurrence-suggestion`, accept/dismiss hooks, clash advisory test ids, and typed route-state diagnostics.

## Definition of Done Results

- ✅ `gsd_milestone_status` reports all six slices complete: S01, S02, S03, S04, S05, S06.
- ✅ All six slice summary artifacts exist under `.gsd/milestones/M005/slices/`.
- ✅ All six slice UAT artifacts exist under `.gsd/milestones/M005/slices/`.
- ❌ The milestone validation artifact is not a pass; it remains `needs-attention`.
- ❌ Integrated milestone-wide verification is not yet clean because the current validation still records failing full web E2E regression evidence.
- ❌ The roadmap boundary-map requirement remains unmet: `.gsd/milestones/M005/M005-ROADMAP.md` still says `Not provided.` under `## Boundary Map`.
- ❌ No slice-level `Sxx-ASSESSMENT.md` artifacts were found under `.gsd/milestones/M005`.
- ℹ️ No `Horizontal Checklist` section is present in the roadmap, so there was nothing additional to score for step 7.

## Requirement Outcomes

- `R011` remains supported by slice and requirement evidence, but no additional requirement transition should be persisted during this attempt because the milestone itself is not yet complete.
- No other requirement status changes were verified or should be written during this failed closeout.

## Deviations

This retry produced an explicit failed-verification closeout record instead of a completion artifact because the verification gate still blocks milestone closure.

## Follow-ups

1. Re-establish clean milestone-wide regression evidence by fixing or re-verifying the failing web E2E specs called out in `M005-VALIDATION.md`.
2. Refresh milestone validation so it truthfully covers the current artifact set and returns a passing verdict.
3. Add the missing authoritative boundary map to `M005-ROADMAP.md` or otherwise resolve the MV03 documentation gap.
4. Decide whether slice-level `Sxx-ASSESSMENT.md` artifacts are required by project process for M005; if yes, generate them before the next closeout attempt.
