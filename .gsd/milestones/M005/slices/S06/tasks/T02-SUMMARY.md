---
id: T02
parent: S06
milestone: M005
key_files:
  - apps/web/package.json
  - pnpm-lock.yaml
  - apps/web/tests/e2e/calendar-shifts.spec.ts
key_decisions:
  - Keep the accessibility proof scoped to the live `create-shift-editor` subtree so missing predictive-editor hooks fail loudly instead of silently scanning the wrong surface.
duration: 
verification_result: passed
completed_at: 2026-05-11T17:18:59.842Z
blocker_discovered: false
---

# T02: Verified the predictive create editor’s scoped axe proof and re-passed the fresh-reset `calendar-shifts` Playwright seam after recovering the local Supabase stack.

**Verified the predictive create editor’s scoped axe proof and re-passed the fresh-reset `calendar-shifts` Playwright seam after recovering the local Supabase stack.**

## What Happened

I inspected the task’s target files and found the scoped accessibility implementation already present: `apps/web/package.json` and `pnpm-lock.yaml` already carry `@axe-core/playwright`, and `apps/web/tests/e2e/calendar-shifts.spec.ts` already contains a dedicated test that opens the seeded predictive create editor, keeps the live recurrence suggestion visible, and runs AxeBuilder against `[data-testid="create-shift-editor"]`. I then focused on truthful execution instead of duplicating code. The first two fresh-reset verification attempts failed before Playwright started because local `supabase db reset --local --yes` hit a repeatable storage-side 502 while restarting containers. After confirming the local stack and isolating the failure to the storage probe, I recycled the local Supabase stack with `supabase stop --no-backup && supabase start`, re-ran the exact task verification command, and got a clean pass. The full serial `calendar-shifts` seam now passes end to end, which re-confirms the predictive editor axe proof and the same cleanup-sensitive proof surface in one run.

## Verification

Verified the completion criteria by first confirming the dependency and scoped test seam exist in `apps/web/package.json`, `pnpm-lock.yaml`, and `apps/web/tests/e2e/calendar-shifts.spec.ts`, then running the task’s required fresh-reset Playwright command. After a one-time local Supabase stack recycle, `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts` exited 0 and Playwright reported `7 passed`, including the predictive create editor accessibility proof that scopes Axe to `data-testid="create-shift-editor"` with the seeded recurrence suggestion surface visible.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx --yes supabase stop --no-backup && npx --yes supabase start && npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts` | 0 | ✅ pass | 106201ms |
| 2 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts` | 0 | ✅ pass | 65305ms |

## Deviations

The repo changes required by the task were already present when execution began, so this run became a verification-and-recovery pass rather than a code-editing pass. A one-time local `supabase stop --no-backup && supabase start` recycle was needed before the plan’s exact reset command would pass because `supabase db reset --local --yes` initially failed with a storage-service 502 during container restart.

## Known Issues

Local `supabase db reset --local --yes` can transiently fail with a storage `502` after container restart until the local stack is recycled; captured as project memory MEM125. No repo code issue remains from this task.

## Files Created/Modified

- `apps/web/package.json`
- `pnpm-lock.yaml`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`
