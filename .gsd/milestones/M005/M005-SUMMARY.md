---
id: M005
title: Predictive assistance and release hardening
status: verification-failed
generated_at: 2026-05-12T10:39:45Z
verification_passed: false
one_liner: Predictive assistance shipped across shared-core, web, and mobile surfaces, but milestone closeout failed because milestone-wide launch-hardening regressions are still unresolved.
key_decisions:
  - Treat the current M005 validation artifact as blocking because it still reports needs-attention and no fresher passing validation exists.
  - Use milestone-scoped non-.gsd commit evidence for code-change verification because HEAD self-diffs against main.
key_files:
  - .gsd/milestones/M005/M005-ROADMAP.md
  - .gsd/milestones/M005/M005-VALIDATION.md
  - .gsd/milestones/M005/M005-VERIFICATION-FAILURE.md
  - .gsd/REQUIREMENTS.md
  - .gsd/exec/1f6a0590-4302-4922-96d8-a15d9306f5af.stdout
  - .gsd/exec/c6e54fd1-4120-4555-b561-fa663f134910.stdout
  - .gsd/exec/d7d09b57-9019-4d66-ab89-0eb1c247b485.stdout
lessons_learned:
  - Milestone closeout must be blocked by fresh integrated regressions even when every slice is already complete.
  - When HEAD equals the integration branch, milestone-scoped commit history can still prove that real implementation files changed.
---

# M005: Predictive assistance and release hardening

**Verification failed. Milestone M005 is not complete.**

## What Happened

`gsd_milestone_status` shows M005 is still `active` while all six slices (`S01`–`S06`) are `complete`. Code-change verification passed even though `HEAD` equals `main` and the merge-base: `.gsd/exec/1f6a0590-4302-4922-96d8-a15d9306f5af.stdout` shows milestone-scoped commits touching non-`.gsd/` implementation and test files across `packages/caluno-core`, `apps/web`, and `apps/mobile`. Artifact verification also passed for slice closeout files: `.gsd/exec/d7d09b57-9019-4d66-ab89-0eb1c247b485.stdout` confirms every slice has `SUMMARY.md` and `UAT.md` artifacts.

Milestone completion remains blocked because the only milestone validation artifact still reports `needs-attention`, and the fresh full web E2E regression evidence in `.gsd/exec/c6e54fd1-4120-4555-b561-fa663f134910.stdout` still contains three failing specs. That means launch hardening and broader trust/authorization proof are not yet clean at milestone scope.

## Verification Results

### Step 4 — Code-change verification

- ✅ `HEAD == main == merge-base`, so this was treated as a self-diff retry.
- ✅ Milestone-scoped commit evidence proves non-`.gsd/` work shipped during M005.
- Evidence: `.gsd/exec/1f6a0590-4302-4922-96d8-a15d9306f5af.stdout`
- Representative touched areas:
  - `packages/caluno-core/src/schedule/recurrence.ts`
  - `packages/caluno-core/src/schedule/conflicts.ts`
  - `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
  - `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`
  - `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte`

### Step 5 — Success criteria verification

- ✅ **Predictive or anticipatory scheduling features are live and covered by unit and E2E tests.** S02–S05 slice summaries and the existing validation artifact show shipped helper contracts, web recurrence suggestions, web clash advisories, and mobile predictive parity with unit and targeted browser coverage.
- ✅ **R011 (predictive scheduling assistance) is validated.** `.gsd/REQUIREMENTS.md` records `R011` as validated from S06 evidence.
- ❌ **Launch hardening: reliability, onboarding, performance, accessibility, observability, and deployment readiness are addressed.** The milestone-wide web E2E regression evidence still fails three specs, so launch hardening is not freshly re-proven.
- ✅ **UX is refined for calmness, polish, and fit/finish.** Slice summaries describe calm, warning-only predictive UI and explicit diagnostics on web and mobile.
- ❌ **All trust, privacy, and authorization constraints from prior milestones are maintained.** The auth/onboarding regression failure prevents a clean milestone-wide trust/authorization closeout.
- ✅ **Explicit UI and diagnostics exist for predictive features and hardening outcomes.** Slice evidence records `recurrence-suggestion`, `clash-advisory`, and typed route-state diagnostics.

#### Blocking regression evidence

Fresh regression evidence from `.gsd/exec/c6e54fd1-4120-4555-b561-fa663f134910.stdout`:

```bash
npx --yes supabase db reset --local --yes
pnpm --dir apps/web exec playwright test tests/e2e
```

Result: **3 failed, 6 passed, 8 did not run**

Failing specs:
1. `tests/e2e/auth-groups-access.spec.ts:45:1` — onboarding-empty was expected, but the trusted-online shell rendered instead.
2. `tests/e2e/calendar-shifts.spec.ts:339:1` — a touching-boundary draft incorrectly surfaced clash advisory overlap count `1` before submit.
3. `tests/e2e/find-time.spec.ts:21:1` — the route rendered `8 truthful windows` instead of the expected `10 truthful windows`.

### Step 6 — Definition of done verification

- ✅ All roadmap slices are checked complete in `gsd_milestone_status`.
- ✅ Each slice has `SUMMARY.md` and `UAT.md` artifacts under `.gsd/milestones/M005/slices/`.
- ❌ Integrated milestone verification is not green because the full web E2E regression evidence still fails.
- ❌ The milestone validation artifact at `.gsd/milestones/M005/M005-VALIDATION.md` is still `needs-attention`, so there is no fresh passing validation to authorize closeout.
- ❌ The roadmap boundary map is still missing (`Not provided.` in `.gsd/milestones/M005/M005-ROADMAP.md`).
- ⚠️ No slice `*-ASSESSMENT.md` artifacts were found under `.gsd/milestones/M005/slices/`.

## Requirement Outcomes

- No requirement transitions were applied in this closeout turn.
- `R011` remains recorded as `validated` in `.gsd/REQUIREMENTS.md`, but milestone completion is blocked by milestone-wide hardening regressions rather than by a predictive-scope gap.

## Decision Re-evaluation

| Decision | Shipped outcome | Revisit? |
| --- | --- | --- |
| D063 remains the predictive feature-set anchor for M005. | Still honored: recurrence suggestions and clash advisories shipped without widening scope into speculative AI planning. | No |
| Predictive assistance should be bounded to authorized calendar scope and exposed as calm, advisory-only UI. | Honored across shared helpers plus web/mobile surfaces; no evidence suggests scope widening or blocking write policy. | No |
| Milestone closeout requires integrated launch-hardening proof, not only slice-local passes. | Not yet satisfied because the full regression evidence still fails. | Yes — retry closeout only after regressions and validation are refreshed. |

## Deviations

Closeout could not proceed to milestone completion because milestone-wide regression evidence uncovered unresolved failures outside the slice-local predictive proofs.

## Follow-ups

1. Fix the three failing web E2E regressions in auth/onboarding, touching-boundary clash advisory behavior, and find-time ranked inventory.
2. Re-run the full web regression command until it passes cleanly.
3. Refresh `M005-VALIDATION.md` to a fresh passing verdict once milestone-wide evidence is green.
4. Retry `gsd_complete_milestone` only after all success criteria and definition-of-done checks pass.
