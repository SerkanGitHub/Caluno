---
id: M005
title: "Predictive assistance and release hardening"
status: verification-failed
verification_passed: false
---

# M005: Predictive assistance and release hardening

**Milestone M005 verification FAILED — not complete.**

## Verification Summary

- **Duplicate completion guard:** `gsd_milestone_status` reports milestone `M005` is `active`, not complete. All six slices (`S01`–`S06`) are `complete`.
- **Code changes exist:** `HEAD` equals `main`, so this is a self-diff retry. Trailer-bearing milestone/task commits do touch non-`.gsd/` files, so implementation evidence exists. Representative commits verified in git history:
  - `d5882d7` (`GSD-Task: S06/T01`) — typed web route-state proof surfaces in `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` and related E2E fixtures/specs.
  - `29906dc` (`GSD-Task: S06/T02`) — scoped axe coverage for the predictive web create editor in `apps/web/tests/e2e/calendar-shifts.spec.ts`, plus Playwright/package changes.
  - `0f31c09` (`GSD-Task: S06/T02`) — follow-up fix in `apps/web/tests/e2e/calendar-shifts.spec.ts` for scoped predictive accessibility proof.
  - `a405ff0` (`GSD-Task: S05/T04`) — mobile predictive Playwright coverage in `apps/mobile/tests/e2e/mobile-predictive.spec.ts` and `apps/mobile/tests/e2e/mobile-assembly.spec.ts`.
  - `f5872d5` (`GSD-Task: S05/T01`) — mobile recurrence suggestion UI wiring in `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte` and related mobile sources/tests.
  - `877a164` (`GSD-Task: S04/T02`) — advisory-only web clash state in `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte` and unit coverage.
  - `f4394dc` (`GSD-Task: S04/T01`) — route-derived visible-week conflicts threaded into web calendar surfaces.
- **Success criteria verification result:** failed overall.
- **Definition-of-done verification result:** failed overall.

## Success Criteria Results

- ✅ **Predictive or anticipatory scheduling features are live and covered by unit and E2E tests.**
  - Supported by the validation artifact and slice summaries: `S02` delivered deterministic shared recurrence/conflict helpers, `S03` and `S04` proved web recurrence/advisory flows, `S05` proved mobile predictive parity, and `S06` reran predictive/browser/build proof.
- ✅ **R011 (predictive scheduling assistance) is validated.**
  - `.gsd/REQUIREMENTS.md` renders `R011` as `validated`, and the requirements register records M005/S06 validation evidence.
- ❌ **Launch hardening: reliability, onboarding, performance, accessibility, observability, and deployment readiness are addressed.**
  - `.gsd/milestones/M005/M005-VALIDATION.md` remains `verdict: needs-attention` and explicitly records a failed fresh full-regression web E2E run with three failing existing specs: `tests/e2e/auth-groups-access.spec.ts`, an advisory-free touching-boundary flow in `tests/e2e/calendar-shifts.spec.ts`, and ranked-window inventory flow coverage in `tests/e2e/find-time.spec.ts`.
- ✅ **UX is refined for calmness, polish, and fit/finish.**
  - The validation artifact and slice summaries consistently describe calm, warning-only predictive surfaces with explicit accept/dismiss controls and advisory messaging across web and mobile.
- ❌ **All trust, privacy, and authorization constraints from prior milestones are maintained.**
  - The same validation artifact flags unresolved failure in `tests/e2e/auth-groups-access.spec.ts`, so milestone-closeout evidence does not yet re-prove the broader trust/authorization surface.
- ✅ **Explicit UI and diagnostics exist for predictive features and hardening outcomes.**
  - Validation cites stable hooks and diagnostics including `recurrence-suggestion`, `recurrence-suggestion-accept`, `recurrence-suggestion-dismiss`, `clash-advisory`, and typed `calendar-route-state[data-route-mode][data-route-reason]` proof surfaces.

## Definition of Done Results

### Verified
- All roadmap slices are checked complete in `.gsd/milestones/M005/M005-ROADMAP.md` and confirmed complete by `gsd_milestone_status`.
- Slice `SUMMARY` and `UAT` artifacts exist for all six slices (`S01`–`S06`).
- Cross-slice recurrence-suggestion and clash-advisory integration is documented in `.gsd/milestones/M005/M005-VALIDATION.md` and is internally consistent with the slice summaries.
- Requirement `R011` has supporting evidence for its current `validated` status.

### Blocking gaps
- `.gsd/milestones/M005/M005-VALIDATION.md` still reports `verdict: needs-attention`.
- `.gsd/milestones/M005/M005-ROADMAP.md` still ends with `## Boundary Map` → `Not provided.`
- No slice-level `*-ASSESSMENT.md` artifacts were found under `.gsd/milestones/M005/`.
- Fresh milestone-wide web regression evidence is not clean because the validation artifact records three failing existing E2E specs.

## Decision Re-evaluation

| Decision | Shipped outcome | Revisit? | Notes |
|---|---|---:|---|
| D063 | Honored | No | Predictive assistance shipped as recurrence suggestions plus clash advisories without widening scope into deferred predictive ideas. |
| D064 | Honored | No | Web recurrence suggestions stayed bounded to same-calendar trailing history and remained truthful optional prefill, not an implicit default. |
| D065 | Honored | No | Web clash detection stayed advisory-only and reused shared overlap semantics rather than blocking writes. |
| D066 | Honored | No | Mobile predictive parity reused the same bounded/shared contracts instead of introducing platform-specific scheduling logic. |
| D067 | Partially honored | Yes | Typed diagnostics and scoped accessibility proof shipped, but milestone-wide hardening proof is still blocked by the unresolved full-regression web failures and incomplete boundary-map/assessment documentation. |

## Requirement Outcomes

- **R011:** current `validated` status remains supported by existing evidence in `.gsd/REQUIREMENTS.md` and the S06 closeout proof.
- **No requirement updates were performed in this turn** because verification did not pass and the failure path forbids milestone-closeout state mutation.

## What Must Be Fixed Before Completion

1. Resolve the fresh failing full-regression web E2E specs cited by `.gsd/milestones/M005/M005-VALIDATION.md`:
   - `tests/e2e/auth-groups-access.spec.ts`
   - the advisory-free touching-boundary flow in `tests/e2e/calendar-shifts.spec.ts`
   - the ranked-window inventory flow in `tests/e2e/find-time.spec.ts`
2. Refresh milestone validation so it passes against current milestone artifacts and fresh evidence.
3. Add the missing authoritative roadmap boundary map, or explicitly realign the milestone documentation/validation contract so boundary ownership is no longer a gap.
4. Add the missing slice `*-ASSESSMENT.md` artifacts, or update the validation expectations so the artifact contract is internally consistent.

## Closeout Guardrails Applied

- `gsd_complete_milestone` was **not** called.
- `.gsd/PROJECT.md` was **not** refreshed to reflect completion.
- `.gsd/REQUIREMENTS.md` was **not** mutated in this turn.
- No learnings were extracted or persisted, because the milestone did not pass verification and closeout stopped on the failure path.

Milestone M005 verification FAILED — not complete.
