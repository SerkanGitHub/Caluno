---
id: T01
parent: S06
milestone: M001
key_files:
  - apps/web/tests/e2e/fixtures.ts
  - apps/web/tests/e2e/calendar-offline.spec.ts
key_decisions:
  - Kept runtime code unchanged because the failing Playwright snapshot proved the rendered board already remapped the offline-created shift to a trusted server UUID after reconnect.
  - Added a reusable visible-card identity helper that can assert `local` versus `server` ids so future browser proofs fail explicitly when id remap evidence is missing.
duration: 
verification_result: mixed
completed_at: 2026-04-16T13:06:48.096Z
blocker_discovered: false
---

# T01: Reworked the offline Playwright proof to re-resolve the created shift’s rendered id across reload and reconnect so post-drain conflict assertions follow the server-confirmed shift id.

**Reworked the offline Playwright proof to re-resolve the created shift’s rendered id across reload and reconnect so post-drain conflict assertions follow the server-confirmed shift id.**

## What Happened

I first reproduced the clean-db failure and confirmed the final red assertion was still polling `shift-conflict-summary-local-*` after reconnect. The retained Playwright error context showed the board had already remapped the offline-created card to a trusted server UUID and was still rendering the Friday overlap correctly, so the bug lived in the browser proof rather than the runtime reconciliation path.

I added a shared helper in `apps/web/tests/e2e/fixtures.ts` that re-finds a visible shift card from rendered board state and resolves its current `data-testid` identity, with an explicit `idKind` guard (`local`, `server`, or `any`). I then updated `apps/web/tests/e2e/calendar-offline.spec.ts` to use that helper at every identity boundary that matters for this proof: immediately after the offline create, after the offline reload, after returning to the cached Alpha route, and again after reconnect drains to `0 pending / 0 retryable`. The reconnect phase now requires a non-`local-*` id before asserting shift-level conflict diagnostics, which turns stale-id regressions into direct proof failures instead of misreporting them as conflict failures.

I deliberately left `apps/web/src/lib/offline/calendar-controller.ts` unchanged because the isolated rerun and error snapshot proved the UI already surfaced the server-confirmed id after acknowledgement. Slice-wide verification still shows the follow-on S06 work remaining for T02/T03: the collaborator realtime proof is still red, two realtime-focused `sync-engine.unit.test.ts` cases are still failing, and the assessment/validation artifact inventory is still incomplete.

## Verification

Implemented T01 and reran the task-level and slice-level checks. The task’s required offline proof now passes cleanly on a fresh local Supabase reset. `pnpm --dir apps/web check` also passed with zero Svelte diagnostics. The remaining red checks are outside this task’s scoped fix and align with the next slice tasks: the realtime collaborator browser proof (`calendar-sync.spec.ts`) still fails to reach `data-remote-refresh-state="applied"`, the broader type+unit command still fails in two realtime subscription tests inside `tests/schedule/sync-engine.unit.test.ts`, the combined offline+sync browser command still fails in the sync spec, and the validation artifact inventory command still fails because the missing S01–S04 assessment files have not been created yet.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts` | 0 | ✅ pass | 41500ms |
| 2 | `pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts` | 1 | ❌ fail | 33800ms |
| 3 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-sync.spec.ts` | 1 | ❌ fail | 57400ms |
| 4 | `pnpm --dir apps/web check && pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts` | 1 | ❌ fail | 33100ms |
| 5 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts` | 1 | ❌ fail | 62700ms |
| 6 | `test -f .gsd/milestones/M001/slices/S01/S01-ASSESSMENT.md && test -f .gsd/milestones/M001/slices/S02/S02-ASSESSMENT.md && test -f .gsd/milestones/M001/slices/S03/S03-ASSESSMENT.md && test -f .gsd/milestones/M001/slices/S04/S04-ASSESSMENT.md && rg -n "S05 \| Present|R005|R006|cached session|offline|realtime" .gsd/milestones/M001/M001-VALIDATION.md .gsd/REQUIREMENTS.md` | 1 | ❌ fail | 0ms |

## Deviations

None. The runtime reconciliation path already exposed the server-confirmed id, so the fix stayed scoped to shared test helpers plus the offline proof spec as planned.

## Known Issues

`tests/e2e/calendar-sync.spec.ts` is still red in the collaborator refresh path (`data-remote-refresh-state` stays `idle` / combined run also fails earlier on the seeded Thursday conflict baseline). `tests/schedule/sync-engine.unit.test.ts` still has two failing realtime subscription cases (`coalesces bursty realtime collaborator edits into serialized trusted refreshes` and `retries timed-out realtime subscriptions and tears them down cleanly`). `.gsd/milestones/M001/slices/S01/S01-ASSESSMENT.md` through `S04-ASSESSMENT.md` still do not exist, so the slice validation inventory command remains red until T03 closes the artifact gap.

## Files Created/Modified

- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/e2e/calendar-offline.spec.ts`
