---
estimated_steps: 1
estimated_files: 13
skills_used: []
---

# T04: Rerun full browser proof and close validation artifacts after realtime repair

Once T03 is green, rerun the isolated offline proof if needed, then execute the clean combined preview suite and supporting type/unit regressions so the slice closes on the same proof surface used for milestone validation. Use `gsd_summary_save` to create `ASSESSMENT` artifacts for `S01` through `S04` grounded in their existing summaries/UAT plus the now-green S06 browser evidence. Use `gsd_requirement_update` to refresh validation evidence for `R005` and `R006`, and add supporting validation notes for `R001` / `R004` only if the combined rerun now genuinely proves them. Finish by calling `gsd_validate_milestone` so `.gsd/milestones/M001/M001-VALIDATION.md` reflects the real slice inventory, repaired browser proof, and current requirement coverage.

## Inputs

- `.gsd/milestones/M001/slices/S06/tasks/T01-SUMMARY.md`
- `.gsd/milestones/M001/slices/S06/tasks/T02-SUMMARY.md`
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

- `The isolated and combined preview-backed browser proof passes on a clean reset.`
- `Assessment artifacts for S01 through S04 exist and match the real summary/UAT evidence.`
- ``.gsd/milestones/M001/M001-VALIDATION.md` and `.gsd/REQUIREMENTS.md` cite the repaired offline/realtime proof and no longer drift from the actual assessment inventory.`

## Verification

npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts && pnpm --dir apps/web check && pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts tests/schedule/server-actions.unit.test.ts && test -f .gsd/milestones/M001/slices/S01/S01-ASSESSMENT.md && test -f .gsd/milestones/M001/slices/S02/S02-ASSESSMENT.md && test -f .gsd/milestones/M001/slices/S03/S03-ASSESSMENT.md && test -f .gsd/milestones/M001/slices/S04/S04-ASSESSMENT.md && rg -n "R005|R006|cached session|offline|realtime|S05 \| Present" .gsd/milestones/M001/M001-VALIDATION.md .gsd/REQUIREMENTS.md

## Observability Impact

Promotes only genuinely green combined proof into validation artifacts and makes requirement/assessment drift visible through regenerated milestone validation plus explicit assessment existence checks.
