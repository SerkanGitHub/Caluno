---
id: T04
parent: S04
milestone: M001
key_files:
  - apps/web/tests/e2e/fixtures.ts
  - apps/web/tests/e2e/calendar-offline.spec.ts
  - apps/web/tests/e2e/calendar-sync.spec.ts
  - apps/web/tests/e2e/calendar-shifts.spec.ts
  - .gsd/KNOWLEDGE.md
key_decisions:
  - (none)
duration: 
verification_result: mixed
completed_at: 2026-04-15T17:09:28.604Z
blocker_discovered: false
---

# T04: Added reconnect/multi-user Playwright proof scaffolding and deterministic E2E form helpers, but slice-closing browser verification is still blocked by recurring-create regression drift in calendar-shifts.spec.ts.

**Added reconnect/multi-user Playwright proof scaffolding and deterministic E2E form helpers, but slice-closing browser verification is still blocked by recurring-create regression drift in calendar-shifts.spec.ts.**

## What Happened

I activated the debug-like-expert skill, read the S04/T04 plan plus the existing fixtures and browser proof surfaces, and then implemented the planned Playwright scaffolding for reconnect and multi-user sync proof. In `apps/web/tests/e2e/fixtures.ts` I added a second seeded collaborator (`dana@example.com` as `alphaCollaborator`), expanded retained diagnostics to capture sync-phase, board-sync, queue/failure, and realtime state, added multi-session helpers for tracked pages/flows, and introduced explicit wait helpers for queue, sync, and realtime state. I also added `submitShiftEditorForm()` so the E2E layer can submit the full create/edit payload atomically when the dialog’s uncontrolled fields reset during automation.

I expanded `apps/web/tests/e2e/calendar-offline.spec.ts` to cover offline create/edit/move/delete continuity, offline denial for unsynced calendar ids, return-to-scope, and reconnect-drain assertions (queue summary, sync attempt, sync idle, reconciled board state). I created `apps/web/tests/e2e/calendar-sync.spec.ts` to cover a two-session collaborator scenario plus a scope-guard scenario where another member stays on a different visible week. I also updated `apps/web/tests/e2e/calendar-shifts.spec.ts` to use the deterministic submit helper on the create/edit flows so the online regression surface could stay aligned with the new helper behavior.

Verification partially passed and then exposed an unresolved browser-proof mismatch. `pnpm --dir apps/web check` and the targeted unit suite both passed. Several local Supabase resets succeeded. However, the slice-closing browser verification did not converge before timeout because `pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts` stayed red on the recurring-create validation step. The retained evidence shows that the recurring create invalid-path expectation in `calendar-shifts.spec.ts` no longer matches observed runtime behavior: the browser proof submits the form, but the first create path still materializes a shift instead of surfacing the expected `RECURRENCE_BOUND_REQUIRED` validation result. I stopped at that point and recorded the recovery state instead of continuing to speculate. The new offline/sync specs were implemented but not yet verified end-to-end because the upstream online regression surface remained red.

## Verification

Passed `pnpm --dir apps/web check` and `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/server-actions.unit.test.ts tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts`. Repeated `npx --yes supabase db reset --local --yes` succeeded while iterating on the browser proof. The browser regression gate did not pass: `pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts` still fails on the recurring-create validation expectation, so I did not claim the remaining build/offline/sync Playwright commands as verified. The key observed failure is that the invalid recurring-create step in `calendar-shifts.spec.ts` expects zero created cards plus `RECURRENCE_BOUND_REQUIRED`, but the runtime still materializes one `Recurring coverage drill` card instead of failing closed.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web check` | 0 | ✅ pass | 3009ms |
| 2 | `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/server-actions.unit.test.ts tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts` | 0 | ✅ pass | 1476ms |
| 3 | `npx --yes supabase db reset --local --yes` | 0 | ✅ pass | 25736ms |
| 4 | `pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts` | 1 | ❌ fail | 17448ms |
| 5 | `Remaining slice-closing commands (`pnpm --dir apps/web build` and the preview-backed offline/sync Playwright run) were not executed after the online regression surface stayed red.` | -1 | unknown (coerced from string) | 0ms |

## Deviations

I introduced a deterministic Playwright shift-editor submit helper (`submitShiftEditorForm`) and wired the existing E2E specs to it because the dialog’s uncontrolled fields were resetting during automation. I also stopped before the final preview/offline verification command once `calendar-shifts.spec.ts` remained red on the recurring-create contract drift, so the slice-closing verification chain is incomplete.

## Known Issues

`pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts` is still failing on the recurring-create validation scenario. The browser proof currently observes one created `Recurring coverage drill` card where the test expects no created cards plus `RECURRENCE_BOUND_REQUIRED`. Because that online regression surface is still red, the new offline and multi-user Playwright specs in `calendar-offline.spec.ts` and `calendar-sync.spec.ts` were not fully validated in a slice-closing run.

## Files Created/Modified

- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/e2e/calendar-offline.spec.ts`
- `apps/web/tests/e2e/calendar-sync.spec.ts`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`
- `.gsd/KNOWLEDGE.md`
