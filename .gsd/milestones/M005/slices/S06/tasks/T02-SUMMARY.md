---
id: T02
parent: S06
milestone: M005
key_files:
  - apps/web/package.json
  - pnpm-lock.yaml
  - apps/web/tests/e2e/calendar-shifts.spec.ts
  - apps/web/playwright.config.ts
key_decisions:
  - Scoped the new axe proof to `[data-testid="create-shift-editor"]` while the seeded `recurrence-suggestion` surface is visible, so missing selectors fail loudly and the scan stays on the predictive editor subtree.
  - Switched the web Playwright server from `vite dev` to build+preview so the offline proof uses a real service worker runtime that reaches `data-service-worker-status="ready"` under Chromium.
duration: 
verification_result: passed
completed_at: 2026-05-11T16:49:21.356Z
blocker_discovered: false
---

# T02: Added scoped axe coverage for the predictive web create editor and stabilized web Playwright on a preview-backed service-worker runtime.

**Added scoped axe coverage for the predictive web create editor and stabilized web Playwright on a preview-backed service-worker runtime.**

## What Happened

Added `@axe-core/playwright` to the web app and extended `apps/web/tests/e2e/calendar-shifts.spec.ts` with a dedicated predictive accessibility proof that signs in through the seeded Alpha calendar flow, opens the real `create-shift-editor`, asserts the live `recurrence-suggestion` hooks are visible, and runs an AxeBuilder scan scoped to the editor subtree with violations surfaced directly in the test diff. While re-running slice verification, I confirmed the pre-existing offline proof was failing because Playwright booted `vite dev`, where Chromium reported `service-worker.js` script-evaluation failure; I updated `apps/web/playwright.config.ts` to build and serve `vite preview` instead, then hardened the overlap-proof cleanup in `calendar-shifts.spec.ts` so the full predictive suite remains green under the preview-backed runtime.

## Verification

Reset local Supabase and verified the new predictive accessibility proof in isolation, then re-ran the full `calendar-shifts.spec.ts` suite to confirm the surrounding predictive scenarios still pass, and finally re-ran the previously failing slice-level offline/sync Playwright command to prove the preview-backed server now reaches a live service worker and clears the gate.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts -g "predictive create editor stays free of new WCAG 2.1 AA violations in the seeded recurrence suggestion flow"` | 0 | ✅ pass | 36200ms |
| 2 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts` | 0 | ✅ pass | 54064ms |
| 3 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts` | 0 | ✅ pass | 51116ms |

## Deviations

Updated `apps/web/playwright.config.ts` to boot a built `vite preview` server because the slice-level offline proof only reaches a live service worker in preview mode; this was required to clear the existing verification gate after the task-local axe work was in place.

## Known Issues

Preview-backed Playwright runs still print repeated Supabase warnings about `getSession()` user objects and Vite chunk-splitting warnings; the suites now pass, but the stderr noise remains.

## Files Created/Modified

- `apps/web/package.json`
- `pnpm-lock.yaml`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`
- `apps/web/playwright.config.ts`
