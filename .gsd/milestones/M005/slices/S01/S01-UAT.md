# S01: Define predictive feature set and launch criteria — UAT

**Milestone:** M005
**Written:** 2026-05-11T08:50:43.229Z

# S01: Define predictive feature set and launch criteria — UAT

**Milestone:** M005
**Written:** 2026-05-11

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: This slice's deliverable is planning and decision documentation, so correctness is proven by the presence, completeness, and consistency of the milestone artifacts rather than by running product behavior.

## Preconditions

- Repository checkout includes the current `.gsd` milestone artifacts for M005.
- The tester can inspect markdown files in the repo.

## Smoke Test

Open `.gsd/milestones/M005/M005-CONTEXT.md` and confirm it visibly contains predictive feature scoping, launch criteria, and out-of-scope sections for M005.

## Test Cases

### 1. Predictive feature brief is fully scoped

1. Open `.gsd/milestones/M005/M005-CONTEXT.md`.
2. Confirm the document names both `detectRecurrencePattern` and `previewShiftConflicts`.
3. Confirm the document includes a `## Launch Criteria` section.
4. Confirm the document includes a `## Out of Scope` section.
5. **Expected:** The context document fully scopes the predictive work and defines what is intentionally deferred.

### 2. Decision, requirement, and roadmap references align

1. Open `.gsd/DECISIONS.md` and locate `D063`.
2. Open `.gsd/REQUIREMENTS.md` and locate `R011`, then confirm its primary owning slice is `M005/S01`.
3. Open `.gsd/milestones/M005/M005-ROADMAP.md` and confirm downstream slices `S02` through `S06` are listed.
4. **Expected:** The decision log, requirement tracking, and roadmap all point to the same predictive-assistance milestone plan without contradiction.

## Edge Cases

### Existing artifacts require no rewrite

1. Compare the validated planning artifacts against the slice goal.
2. Confirm no missing planning section, decision reference, or roadmap step forced a closeout-time edit.
3. **Expected:** The slice still passes because the required artifacts were already complete before closeout.

## Failure Signals

- `M005-CONTEXT.md` is missing predictive feature names, launch criteria, or out-of-scope content.
- `D063` cannot be found in `.gsd/DECISIONS.md`.
- `R011` is missing or no longer owned by `M005/S01`.
- The roadmap does not include the downstream implementation chain through `S06`.

## Not Proven By This UAT

- Runtime correctness of predictive helpers or UI integration.
- Build, accessibility, observability, or deployment readiness evidence for later M005 slices.

## Notes for Tester

This is a documentation-contract slice. Treat the milestone artifacts as the product surface for UAT, and do not expect user-visible application changes yet.
