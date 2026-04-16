# S06 Research — Validation remediation: offline/realtime proof closure

## Summary

S06 is narrower than the roadmap wording suggests. On the current codebase, the offline/realtime substrate is largely assembled already; the remaining red state is concentrated in browser-proof assumptions and milestone artifact closure, not an obvious missing sync architecture.

Requirements this slice should explicitly retire or re-prove:
- **R001 / R004** — cached offline reopen and local-first continuity in the browser
- **R005** — reconnect drain and live shared refresh proof
- **R006** — conflict visibility surviving reconnect/realtime proof, so validation can promote it from "advanced" to real evidence
- **MV02 / milestone validation evidence** — slice assessments and requirement mapping cleanup in `.gsd`

Following the installed **`debug-like-expert`** skill rules — especially **"VERIFY, DON'T ASSUME"** and **"NO DRIVE-BY FIXES"** — I re-ran the real preview-backed Playwright proof on a freshly reset local Supabase stack before drawing conclusions.

## Recommendation

Treat S06 as a **targeted proof-hardening + artifact-closure** slice.

Build/prove in this order:
1. **Fix the offline reconnect assertion drift** in `apps/web/tests/e2e/calendar-offline.spec.ts`.
2. **Fix the sync-spec action-strip timing assumption** in `apps/web/tests/e2e/calendar-sync.spec.ts` / `apps/web/tests/e2e/fixtures.ts`.
3. **Re-run the two preview specs independently on a clean DB**, then together.
4. **Only if a real collaborator-refresh bug remains after those test fixes**, investigate app code in `+page.svelte` / `sync-engine.ts`.
5. **After browser proof is green**, close the validation-artifact gap: assessments + requirement/validation updates.

Do **not** start by rewriting the offline repository, reconnect engine, or realtime substrate. Current evidence does not justify that.

## Current Evidence

### Real reruns performed

Commands executed during research:
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-sync.spec.ts`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts`

### What changed relative to the S05 summary

The earlier S05 blocker wording is now partially stale.

What is already working on the current code:
- preview-backed runtime surface installs and exposes service-worker/isolation readiness
- cached offline reopen works far enough to get through the earlier `offline-denied` / `snapshot-missing` blocker
- collaborator baseline setup works on a clean DB: both members reach the same scoped week with `realtime ready` and the seeded conflict baseline visible

What is still red now:
1. **Offline spec:** final reconnect assertion still looks for the old **local temporary create id** after reconnect.
2. **Sync spec:** create step still expects immediate `SHIFT_CREATED` text in the action strip, even when stronger evidence already shows the create succeeded.
3. **Combined suite:** when the offline spec fails late, it mutates the canonical seeded DB before the sync spec runs, so the second spec can fail on polluted state. This is a debugging artifact, not necessarily a second product bug.

## Root-Cause Findings

### 1) `calendar-offline.spec.ts` is asserting against a stale local create id after reconnect

**Evidence:**
- `apps/web/tests/e2e/calendar-offline.spec.ts` stores `offlineCreateShiftId` during offline create.
- During reconnect proof it only re-reads the card id if that variable is null.
- But the variable is already set to the **local** id (`local-*`).
- The current failure is:
  - `expected shift local-... to show 1 visible overlap(s)`
  - received `null`
- The failure page snapshot still shows the created card visible, queue drained, board online, and Friday conflict summary present.

**Why this happens:**
- `apps/web/src/lib/offline/calendar-controller.ts` → `reconcileSuccessfulMutation()` intentionally remaps locally created ids to server ids using `serverState.affectedShiftIds`.
- That is already the designed contract.
- Supporting proof already exists in unit coverage under `apps/web/tests/schedule/offline-queue.unit.test.ts`.

**Implication:**
- The offline reconnect browser flow is mostly working.
- The red test is mainly using the wrong identifier after server acknowledgement.

### 2) `calendar-sync.spec.ts` is over-asserting on transient action-strip timing

**Evidence from clean rerun:**
- With a fresh `supabase db reset`, the sync spec no longer fails at baseline conflict/realtime readiness.
- It now fails at:
  - `await expect(page.getByTestId('schedule-action-strip')).toContainText('SHIFT_CREATED')`
- Failure snapshot shows **all of these are already true**:
  - `9 visible shifts`
  - `3 overlap pairs in view`
  - `0 pending / 0 retryable`
  - `Server-synced board`
  - `Online`
- But the action strip still reads `LOCAL_PENDING_SERVER_CONFIRMATION`.

**Why this matters:**
- S04’s summary explicitly warned that **action-strip assertions are less stable than board/queue outcomes** and recommended using observable board/queue evidence instead of exact timing of success labels.
- Current proof matches that warning exactly.

**Most likely interpretation:**
- The create action is landing, the board is updated, and the queue is drained.
- The flaky part is the **UI success-surface timing**, not the shared-schedule create itself.

### 3) Validation evidence is still incomplete even after code proof stabilizes

**Evidence:**
- `.gsd/milestones/M001/M001-VALIDATION.md` still calls out missing slice assessments for S01-S05.
- File inventory now shows `S05-ASSESSMENT.md` exists, so the validation doc is already stale there.
- S01-S04 still have no `*-ASSESSMENT.md` files under `.gsd/milestones/M001/slices/`.

**Implication:**
- Even if browser proof goes green, milestone validation will still need artifact cleanup before M001 can be cleanly revalidated/completed.

## Implementation Landscape

### Proof files to change first

- `apps/web/tests/e2e/calendar-offline.spec.ts`
  - Final reconnect step is the only current failure in the offline proof.
  - Natural change: re-resolve the created shift id after reconnect from the visible card/title instead of keeping the pre-reconnect local id.

- `apps/web/tests/e2e/calendar-sync.spec.ts`
  - Current failure is the immediate `SHIFT_CREATED` action-strip assertion.
  - Natural change: assert on stronger invariants already exposed by the app (`0 pending / 0 retryable`, visible created card, updated conflict counts, server-synced board), or add a more explicit helper for post-confirmation action state if that surface truly matters.

- `apps/web/tests/e2e/fixtures.ts`
  - Best place for shared helpers, e.g.:
    - re-read created shift id by title after reconnect/server confirm
    - wait for a stable success condition based on queue/board diagnostics rather than raw action-strip timing
  - This keeps the two specs aligned and reduces repeated brittle polling code.

### App code that explains the current failures

- `apps/web/src/lib/offline/calendar-controller.ts`
  - `reconcileSuccessfulMutation()` is authoritative for local→server id remapping after create.
  - This explains the offline-spec failure and should be treated as the intended contract.

- `apps/web/src/lib/schedule/board.ts`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
  - These expose the calmer, more reliable proof surfaces already visible in the snapshots: board source, sync phase, queue state, conflict counts.
  - Prefer these surfaces over the action strip when proving the create really settled.

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/offline/sync-engine.ts`
  - Do **not** touch first. Only investigate if the sync spec still fails after proof-hardening changes.
  - If needed later, these are the right files for deeper collaborator-refresh debugging.

### Artifact / validation files likely needed later in the slice

- `.gsd/milestones/M001/M001-VALIDATION.md`
- `.gsd/milestones/M001/slices/S01/`
- `.gsd/milestones/M001/slices/S02/`
- `.gsd/milestones/M001/slices/S03/`
- `.gsd/milestones/M001/slices/S04/`
- `.gsd/milestones/M001/slices/S05/`

Natural documentation follow-up after proof is green:
- add missing `S01`–`S04` assessment artifacts or justified omissions
- update milestone validation evidence so the assessment inventory is current
- promote touched requirements only after the green browser evidence exists

## Natural Seams for Planning

### Seam A — Offline proof repair
**Files:**
- `apps/web/tests/e2e/calendar-offline.spec.ts`
- maybe `apps/web/tests/e2e/fixtures.ts`

**Goal:**
Make reconnect proof follow the server-confirmed shift identity, not the pre-reconnect local temp id.

**Risk:** low

**Why first:**
It is the cleanest current failure and also removes suite pollution for later runs.

### Seam B — Sync proof hardening
**Files:**
- `apps/web/tests/e2e/calendar-sync.spec.ts`
- maybe `apps/web/tests/e2e/fixtures.ts`

**Goal:**
Replace or strengthen the action-strip success assertion so the spec proves the real user outcome instead of timing-sensitive intermediate UI state.

**Risk:** low-to-medium

**Why second:**
Current clean-db rerun suggests this is now the primary browser-proof blocker for R005/R006 collaborator evidence.

### Seam C — Only-if-needed runtime investigation
**Files:**
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/offline/sync-engine.ts`
- `apps/web/src/lib/offline/calendar-controller.ts`

**Goal:**
If the collaborator step still fails after Seam B, use the existing diagnostics to determine whether the remaining issue is requestTrustedRefresh timing, remote refresh application, or action-state reconciliation.

**Risk:** medium

**Why deferred:**
Current evidence does not yet prove a runtime bug here.

### Seam D — Validation artifact closure
**Files / tools:**
- `.gsd` slice assessment artifacts
- milestone validation/requirement updates
- GSD completion/validation tools after proof is green

**Goal:**
Close MV02 and requirement-evidence gaps once technical proof is actually passing.

**Risk:** low

## Verification Plan

### Fast debugging loop
Run each spec independently with a clean DB until both are green:

- `npx --yes supabase db reset --local --yes`
- `pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts`

- `npx --yes supabase db reset --local --yes`
- `pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-sync.spec.ts`

### Slice closeout loop
Once both pass independently:

- `npx --yes supabase db reset --local --yes`
- `pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts`

### Regression / support checks
After proof is green:

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts`

### Validation closure after technical green
Then:
- add/update assessment artifacts
- rerun milestone validation with fresh evidence
- update requirement statuses/validation notes for R001/R004/R005/R006 only if the browser proof now justifies it

## Notable Constraints / Surprises

- The noisy browser console warning about `supabase.auth.getSession()` originates from realtime auth priming in `apps/web/src/lib/offline/sync-engine.ts`. It is not the current red blocker, but it does pollute proof logs.
- The combined preview suite is currently a poor debugging loop because a late failure in the offline spec mutates canonical state before the sync spec runs. During remediation, prefer one-spec-per-reset until stable.
- `M001-VALIDATION.md` is stale relative to the current filesystem at least for S05 assessment presence.

## Skill Discovery

Already installed and directly relevant:
- `debug-like-expert` — best fit for evidence-first reruns and hypothesis-driven proof stabilization

Promising optional external skills (not installed):
- Playwright: `npx skills add currents-dev/playwright-best-practices-skill@playwright-best-practices`
- Supabase: `npx skills add supabase/agent-skills@supabase`
- SvelteKit route/data flow: `npx skills add spences10/svelte-skills-kit@sveltekit-data-flow`

## Planner Takeaway

Plan S06 as **proof repair first, platform surgery only if evidence demands it**.

The highest-confidence path is:
1. update the offline reconnect assertion to follow server-confirmed ids,
2. update the sync create proof to rely on stable queue/board/conflict evidence,
3. rerun each preview spec independently on a clean DB,
4. only then decide whether any realtime/app-code fix is still necessary,
5. finish with GSD assessment/validation artifact closure.
