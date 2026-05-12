---
id: T02
parent: S06
milestone: M005
key_files:
  - apps/web/package.json
  - pnpm-lock.yaml
  - apps/web/tests/e2e/calendar-shifts.spec.ts
key_decisions:
  - Keep accessibility coverage app-local by using `@axe-core/playwright` only in `apps/web` rather than widening the workspace test surface.
  - Scope the axe assertion to `[data-testid="create-shift-editor"]` while opening the editor through the seeded `recurrence-suggestion` path so the proof stays truthful to the predictive surface and fails loudly on selector drift.
duration: 
verification_result: passed
completed_at: 2026-05-12T08:12:56.983Z
blocker_discovered: false
---

# T02: Added a scoped axe-core Playwright proof for the predictive web create editor and re-verified the seeded calendar-shifts seam after a fresh local Supabase reset.

**Added a scoped axe-core Playwright proof for the predictive web create editor and re-verified the seeded calendar-shifts seam after a fresh local Supabase reset.**

## What Happened

I verified the task outputs against the authoritative plan and confirmed the web package now carries `@axe-core/playwright` in `apps/web/package.json` with the matching lockfile entry in `pnpm-lock.yaml`. I also confirmed `apps/web/tests/e2e/calendar-shifts.spec.ts` contains a dedicated accessibility proof that signs in through the seeded Alpha calendar flow, opens the live `create-shift-editor`, keeps the recurrence suggestion surface visible, and scopes `AxeBuilder` to `[data-testid="create-shift-editor"]` so the proof stays pinned to the predictive create subtree instead of scanning the whole page. No silent rule downgrades or broad selectors were introduced; the seam fails loudly if the editor subtree or recurrence suggestion surface is missing, which preserves the slice-scoped WCAG 2.1 AA proof surface described in the plan.

## Verification

Ran the task’s required clean-reset verification command: `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`. The command exited 0. Supabase reset completed successfully, and Playwright reported `7 passed`, including the dedicated accessibility test `predictive create editor stays free of new WCAG 2.1 AA violations in the seeded recurrence suggestion flow`, confirming the scoped axe proof executed on the live predictive create editor without violations.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts` | 0 | ✅ pass | 65156ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/web/package.json`
- `pnpm-lock.yaml`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`
