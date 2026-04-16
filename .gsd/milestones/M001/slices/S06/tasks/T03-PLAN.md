---
estimated_steps: 27
estimated_files: 11
skills_used:
  - debug-like-expert
---

# T03: Re-run combined proof and close milestone validation artifacts

Once the isolated browser proofs are green, finish the slice by running the combined preview suite, re-running the supporting type/unit checks, and then closing the validation evidence gap in `.gsd`. Create the missing `S01`–`S04` assessment artifacts from the existing summaries/UAT evidence, refresh `M001-VALIDATION.md` so its slice-delivery audit matches the real filesystem and new browser proof, and update requirement validation notes for `R005`/`R006` plus any justified `R001`/`R004` supporting evidence. Use the GSD tools rather than ad-hoc file writes for assessments, requirement updates, and milestone validation.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Combined preview-backed Playwright proof | Stop artifact promotion and keep the failing command output as the blocker; do not update validation to claim green proof. | Treat long-running preview failures as evidence that the technical proof is still incomplete and leave validation in remediation state. | Keep requirement status unchanged until the evidence is trustworthy. |
| GSD artifact/validation writes | Re-run the specific tool call with corrected evidence text instead of manually editing DB-backed state. | Do not mark requirements validated if the supporting artifact write did not persist. | Fail closed and inspect the rendered markdown before proceeding. |

## Load Profile

- **Shared resources**: local Supabase reset, preview runtime, Playwright combined suite, GSD DB-backed artifact renderers.
- **Per-operation cost**: one clean combined rerun, one type/unit regression pass, four assessment artifact writes, requirement updates, and one milestone validation refresh.
- **10x breakpoint**: preview/browser runtime remains the expensive part; artifact generation is cheap but should only happen after green proof.

## Negative Tests

- **Malformed inputs**: stale slice audit rows, missing summary/UAT references, or requirement updates that cite nonexistent proof.
- **Error paths**: combined suite passes individually but fails in sequence, assessment inventory still missing a file, or validation text still claims S05 has no assessment.
- **Boundary conditions**: only promote requirement evidence that is actually proven by the green reruns; keep unsupported requirements unchanged.

## Steps

1. Run the clean combined preview suite and the supporting `check`/`vitest` regressions so the slice closes on the same proof surface that milestone validation needs.
2. Use `gsd_summary_save` to create `ASSESSMENT` artifacts for `S01`, `S02`, `S03`, and `S04`, grounding each one in the existing summaries/UAT plus the newly green S06 browser evidence where it retires prior blockers.
3. Use `gsd_requirement_update` to refresh validation notes for `R005` and `R006`, and add supporting validation text for `R001` / `R004` only if the combined rerun now genuinely proves them.
4. Use `gsd_validate_milestone` to regenerate `.gsd/milestones/M001/M001-VALIDATION.md` with a corrected slice-delivery audit, updated requirement coverage, and the new browser-proof evidence.

## Must-Haves

- [ ] The combined preview suite passes on a clean reset, not just the isolated specs.
- [ ] `.gsd/milestones/M001/slices/S01/S01-ASSESSMENT.md` through `.gsd/milestones/M001/slices/S04/S04-ASSESSMENT.md` exist and reflect the actual slice evidence.
- [ ] `.gsd/milestones/M001/M001-VALIDATION.md` and `.gsd/REQUIREMENTS.md` cite the real proof for the touched requirements and no longer claim S05 lacks an assessment.

## Verification

- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts`
- `pnpm --dir apps/web check && pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts`
- `test -f .gsd/milestones/M001/slices/S01/S01-ASSESSMENT.md && test -f .gsd/milestones/M001/slices/S02/S02-ASSESSMENT.md && test -f .gsd/milestones/M001/slices/S03/S03-ASSESSMENT.md && test -f .gsd/milestones/M001/slices/S04/S04-ASSESSMENT.md && rg -n "S05 \| Present|R005|R006|cached session|offline|realtime" .gsd/milestones/M001/M001-VALIDATION.md .gsd/REQUIREMENTS.md`

## Inputs

- `apps/web/tests/e2e/calendar-offline.spec.ts`
- `apps/web/tests/e2e/calendar-sync.spec.ts`
- `apps/web/tests/e2e/fixtures.ts`
- `.gsd/milestones/M001/M001-VALIDATION.md`
- `.gsd/REQUIREMENTS.md`
- `.gsd/milestones/M001/slices/S01/S01-SUMMARY.md`
- `.gsd/milestones/M001/slices/S01/S01-UAT.md`
- `.gsd/milestones/M001/slices/S02/S02-SUMMARY.md`
- `.gsd/milestones/M001/slices/S02/S02-UAT.md`
- `.gsd/milestones/M001/slices/S03/S03-SUMMARY.md`
- `.gsd/milestones/M001/slices/S03/S03-UAT.md`
- `.gsd/milestones/M001/slices/S04/S04-SUMMARY.md`
- `.gsd/milestones/M001/slices/S04/S04-UAT.md`
- `.gsd/milestones/M001/slices/S05/S05-ASSESSMENT.md`

## Expected Output

- `.gsd/milestones/M001/slices/S01/S01-ASSESSMENT.md`
- `.gsd/milestones/M001/slices/S02/S02-ASSESSMENT.md`
- `.gsd/milestones/M001/slices/S03/S03-ASSESSMENT.md`
- `.gsd/milestones/M001/slices/S04/S04-ASSESSMENT.md`
- `.gsd/milestones/M001/M001-VALIDATION.md`
- `.gsd/REQUIREMENTS.md`

## Verification

npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts && pnpm --dir apps/web check && pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts
