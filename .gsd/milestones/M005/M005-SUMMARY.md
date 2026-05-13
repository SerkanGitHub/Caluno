---
id: M005
title: "Predictive assistance and release hardening"
status: verification-failed
verification_passed: false
---

# M005: Predictive assistance and release hardening

**Milestone M005 verification FAILED — not complete.**

## Verification Summary

- **Duplicate completion guard:** `gsd_milestone_status` reports milestone `M005` is still `active`, not complete. All six slices (`S01`–`S06`) are marked complete.
- **Code changes exist:** `HEAD` equals `main`, so this closeout ran as a self-diff retry. Milestone/task commit evidence touching non-`.gsd/` files is present in git history, including predictive web/mobile/runtime/test changes such as:
  - `c1efcac` — mark `R011` validated from fresh S06 predictive/browser/build evidence
  - `0f31c09` — scoped predictive-editor axe proof and text-color hardening
  - `6c8abf1` — fresh mobile predictive smoke rerun
  - `d5882d7` — typed web calendar route-state proof surface
  - `f5872d5` / `0174445` — mobile recurrence suggestion and bounded loading
  - `dcd1792` / `877a164` / `f4394dc` — web clash-advisory implementation and tests
- **Success-criteria verification result:** failed overall. The predictive-assistance scope itself is evidenced, but milestone-wide launch-hardening proof is not yet cleanly complete.
- **Definition-of-done verification result:** failed overall. All slices are complete and summary/UAT artifacts exist, but milestone validation remains `needs-attention` and required milestone-closeout evidence is incomplete.

## Success Criteria Results

- ✅ **Predictive or anticipatory scheduling features are live and covered by unit and E2E tests.**
  - Supported by `S02` shared helper contracts, `S03`/`S04` web Playwright coverage, `S05` mobile predictive parity, and `S06` rerun verification as summarized in `.gsd/milestones/M005/M005-VALIDATION.md`.
- ✅ **R011 (predictive scheduling assistance) is validated.**
  - `R011` is already rendered as `validated` in `.gsd/REQUIREMENTS.md`, with S06 evidence recorded against web/mobile predictive and build verification.
- ❌ **Launch hardening: reliability, onboarding, performance, accessibility, observability, and deployment readiness are addressed.**
  - Current milestone validation explicitly records failed fresh full-regression web E2E verification: `auth-groups-access`, the advisory-free touching-boundary flow in `calendar-shifts`, and ranked-window inventory in `find-time`.
- ✅ **UX is refined for calmness, polish, and fit/finish.**
  - Validation cites calm warning-only predictive surfaces across web and mobile plus stable semantic/test hooks.
- ❌ **All trust, privacy, and authorization constraints from prior milestones are maintained.**
  - Validation still flags the failing `tests/e2e/auth-groups-access.spec.ts` regression as unresolved milestone-closeout evidence.
- ✅ **Explicit UI and diagnostics exist for predictive features and hardening outcomes.**
  - Validation cites `recurrence-suggestion`, accept/dismiss hooks, `clash-advisory`, and typed `calendar-route-state` diagnostics.

## Definition of Done Results

### Verified
- All roadmap slices are checked complete in `.gsd/milestones/M005/M005-ROADMAP.md` and confirmed complete by `gsd_milestone_status`.
- Slice summary and UAT artifacts exist for all six slices (`12` files total across `S01`–`S06`).
- Cross-slice feature integration for recurrence suggestions and clash advisories is documented in the validation artifact and is internally consistent with the slice summaries.

### Blocking gaps
- `.gsd/milestones/M005/M005-VALIDATION.md` remains `verdict: needs-attention`.
- `.gsd/milestones/M005/M005-ROADMAP.md` still says **Boundary Map: Not provided**.
- No slice-level `*-ASSESSMENT.md` artifacts exist under `.gsd/milestones/M005/`.
- Fresh milestone-wide web regression evidence is not clean because the validation artifact records three failing existing E2E specs.

## Decision Re-evaluation

| Decision | Shipped outcome | Revisit? | Notes |
|---|---|---:|---|
| D063 | Honored | No | M005 shipped recurrence suggestions and clash previews over the existing scheduling substrate and did not widen scope into deferred quiet-time protection. |
| D064 | Honored | No | Web recurrence suggestions stayed bounded to same-calendar trailing history and only prefilled truthful weekly cadence defaults. |
| D065 | Honored | No | Web clash advisories remained warning-only, reused shared overlap semantics, and kept submit enabled. |
| D066 | Honored | No | Mobile parity reused the shared advisory contract and bounded recurrence loading without widening scope. |
| D067 | Partially honored | Yes | Typed route-state diagnostics and focused accessibility proof shipped, but milestone-wide launch-hardening verification is still blocked by unrelated existing web E2E regressions, so the hardening closeout decision needs a fresh pass once those failures are fixed. |

## Requirement Outcomes

- **R011:** evidence supports its existing `validated` status, and no additional requirement transition is needed on this closeout attempt.
- **No requirement updates were performed in this turn** because milestone verification did not pass and the failure path forbids further completion-state mutation.

## What Must Be Fixed Before Completion

1. Resolve the failing full-regression web E2E specs cited in `.gsd/milestones/M005/M005-VALIDATION.md`:
   - `tests/e2e/auth-groups-access.spec.ts`
   - advisory-free touching-boundary flow in `tests/e2e/calendar-shifts.spec.ts`
   - ranked-window inventory flow in `tests/e2e/find-time.spec.ts`
2. Refresh milestone validation so it passes with current artifacts and fresh evidence.
3. Add the missing roadmap boundary map or explicitly revise the milestone documentation so the boundary contract is authoritative.
4. Add the missing slice `*-ASSESSMENT.md` artifacts, or align the validation expectations/artifact contract so the closeout is internally consistent.

## Closeout Guardrails Applied

- `gsd_complete_milestone` was **not** called.
- `.gsd/PROJECT.md` was **not** refreshed to reflect completion.
- `.gsd/REQUIREMENTS.md` was **not** changed during this attempt.

Milestone M005 verification FAILED — not complete.
