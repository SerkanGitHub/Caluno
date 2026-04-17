# S06: S06

**Goal:** Close the remaining M001 offline/realtime validation gap by hardening the preview-backed browser proof, proving reconnect/realtime outcomes against stable diagnostics, and updating milestone artifacts so the evidence for R005/R006 (and the supporting offline continuity proof they depend on) is explicit and current.
**Demo:** Previously synced calendars reopen offline, queued edits reconcile after reconnect, collaborator updates appear in browser proof, and validation artifacts clearly map touched requirements and assessments.

## Must-Haves

- **Demo:** Previously synced Alpha calendars reopen offline, queued local edits survive reload and reconcile after reconnect, collaborator updates appear in the second browser session without manual reload, and the milestone validation artifacts point directly at the browser proof and slice assessments that justify the result.
- ## Must-Haves
- `apps/web/tests/e2e/calendar-offline.spec.ts` proves cached-offline reopen and reconnect drain against the server-confirmed shift identity rather than a stale `local-*` id.
- `apps/web/tests/e2e/calendar-sync.spec.ts` proves shared create/realtime refresh using stable board, queue, and realtime diagnostics instead of transient action-strip timing, while next-week scope guards still hold.
- The preview-backed proof is rerunnable in isolation and together on a clean local Supabase reset: `tests/e2e/calendar-offline.spec.ts`, `tests/e2e/calendar-sync.spec.ts`, and then both specs in one command.
- Validation closure is explicit: missing slice assessments for `S01`–`S04` exist, `.gsd/milestones/M001/M001-VALIDATION.md` reflects the real assessment inventory and green browser proof, and `.gsd/REQUIREMENTS.md` contains updated validation evidence for `R005`/`R006` plus any justified supporting notes for `R001`/`R004`.
- ## Threat Surface
- **Abuse**: stale local ids, out-of-scope realtime payloads, and offline route navigation can create false green proof if assertions widen calendar/week scope or trust intermediate UI state.
- **Data exposure**: diagnostics and validation artifacts may mention only seeded ids, titles, timestamps, and state labels already visible in the permitted Alpha calendar; never tokens, raw sessions, or cross-calendar rows.
- **Input trust**: Playwright waits must treat route state, queue state, browser-local snapshots, and realtime timing as untrusted until confirmed by visible board data plus the existing typed diagnostics.
- ## Requirement Impact
- **Requirements touched**: `R005`, `R006`, with supporting continuity evidence for `R001` and `R004`.
- **Re-verify**: cached-offline reopen, reconnect drain to `0 pending / 0 retryable`, collaborator refresh to `data-remote-refresh-state="applied"`, overlap visibility after reconnect/realtime, and fail-closed off-scope navigation.
- **Decisions revisited**: `D023`, `D024`, `D025`, `D027`, and `D028` must still hold after the proof hardening.
- ## Verification
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-sync.spec.ts`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts`
- `pnpm --dir apps/web check && pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts`
- `test -f .gsd/milestones/M001/slices/S01/S01-ASSESSMENT.md && test -f .gsd/milestones/M001/slices/S02/S02-ASSESSMENT.md && test -f .gsd/milestones/M001/slices/S03/S03-ASSESSMENT.md && test -f .gsd/milestones/M001/slices/S04/S04-ASSESSMENT.md && rg -n "S05 \| Present|R005|R006|cached session|offline|realtime" .gsd/milestones/M001/M001-VALIDATION.md .gsd/REQUIREMENTS.md`

## Proof Level

- This slice proves: - This slice proves: final-assembly
- Real runtime required: yes
- Human/UAT required: no

## Integration Closure

- Upstream surfaces consumed: `apps/web/src/lib/offline/calendar-controller.ts`, `apps/web/src/lib/offline/sync-engine.ts`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`, `apps/web/tests/e2e/fixtures.ts`, `apps/web/tests/e2e/calendar-offline.spec.ts`, `apps/web/tests/e2e/calendar-sync.spec.ts`, and the existing `S01`–`S05` summaries/UAT artifacts.
- New wiring introduced in this slice: proof helpers that re-resolve server-confirmed create ids, more stable realtime settle assertions bound to queue/board diagnostics, and validation artifacts that map those proof surfaces back to requirement evidence.
- What remains before the milestone is truly usable end-to-end: only slice completion, milestone revalidation, and milestone completion once the green proof is recorded.

## Verification

- Runtime signals: `calendar-local-state`, `calendar-sync-state`, `calendar-realtime-state`, board/day/shift conflict summaries, and retained Playwright flow-diagnostics attachments remain the authoritative proof surfaces.
- Inspection surfaces: isolated preview spec runs, clean-db combined reruns, `.gsd/milestones/M001/M001-VALIDATION.md`, and `.gsd/REQUIREMENTS.md`.
- Failure visibility: stale local-vs-server shift ids, queue drain stalls, remote refresh state, out-of-scope refresh attempts, and assessment inventory drift must all be directly inspectable.
- Redaction constraints: record only seeded ids/titles/timestamps and typed failure reasons; never secrets or raw auth payloads.

## Tasks

- [x] **T01: Reworked the offline Playwright proof to re-resolve the created shift’s rendered id across reload and reconnect so post-drain conflict assertions follow the server-confirmed shift id.** `est:1h30m`
  Use the installed `debug-like-expert` skill before coding. The current offline spec is red because it keeps asserting conflict state against the pre-reconnect local create id even though `reconcileSuccessfulMutation()` is designed to remap that id to the trusted server id after acknowledgement. Keep this task tightly scoped to the offline preview proof: stabilize the helper/spec so cached-offline reopen, reload continuity, reconnect drain, and post-reconnect conflict assertions all follow the remapped shift identity. Only touch runtime code if an isolated clean-db rerun proves the remap contract itself is not surfacing in the rendered board after the queue drains.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Preview-backed offline route + browser-local repository | Stop and retain the route/queue/snapshot diagnostics instead of claiming cached-offline continuity. | Fail on readiness with captured `calendar-route-state` / `calendar-local-state` evidence instead of adding longer blind waits. | Treat the run as proof-invalid and keep the failing flow diagnostics attached. |
| Local-first create → reconnect reconciliation contract | Re-read the created card from visible board state before asserting overlaps; do not trust the old local id. | Abort the reconnect assertion once queue drain or board settle stops progressing and capture the last visible sync state. | Fail closed and inspect `calendar-controller.ts` rather than guessing the server-confirmed id. |

## Load Profile

- **Shared resources**: local Supabase reset, preview build/runtime, browser-local snapshot store, reconnect queue.
- **Per-operation cost**: one isolated preview spec run with offline reload and reconnect replay.
- **10x breakpoint**: preview repository bootstrap and reconnect settle timing will fail first, so waits must stay signal-driven.

## Negative Tests

- **Malformed inputs**: missing created-card `data-testid`, stale cached scope, or unexpected shift-id remap shape.
- **Error paths**: offline reopen degrading to `offline-denied`, reconnect leaving pending/retryable entries, or remapped id never appearing after a successful create.
- **Boundary conditions**: local overlap absent before the move, visible after the move, preserved across offline reload, and still visible after reconnect drain.

## Steps

1. Re-run `tests/e2e/calendar-offline.spec.ts` against a clean local reset to confirm the final failing assertion is still the stale local-id lookup described in S06 research.
2. Add or extend a shared Playwright helper in `apps/web/tests/e2e/fixtures.ts` so the spec can re-resolve the created shift card/id from visible board state after reconnect instead of reusing the pre-reconnect `local-*` id.
3. Update `apps/web/tests/e2e/calendar-offline.spec.ts` to use that helper around the reconnect boundary and keep the queue/conflict assertions tied to visible board diagnostics.
4. If the isolated rerun proves the UI never exposes the remapped id after the queue drains, patch the minimal runtime surface in `apps/web/src/lib/offline/calendar-controller.ts` that prevents the server-confirmed id from surfacing, then rerun the spec.

## Must-Haves

- [ ] Cached-offline reopen still proves the seeded Thursday overlap and the Friday offline overlap before reconnect.
- [ ] After reconnect drains to `0 pending / 0 retryable`, the spec re-finds the created shift by rendered card state and proves the Friday conflict against the server-confirmed id.
- [ ] The task leaves behind a reusable helper so later browser proof does not rely on stale local ids.

## Verification

- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts`
- `pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts`

## Observability Impact

- Signals added/changed: offline proof can now distinguish the local create id from the server-confirmed id at reconnect time.
- How a future agent inspects this: rerun `calendar-offline.spec.ts` and inspect the retained flow diagnostics plus the resolved created-card `data-testid` after reconnect.
- Failure state exposed: queue drain may succeed while id remap proof fails, making stale-assertion regressions obvious instead of looking like conflict regressions.
  - Files: `apps/web/tests/e2e/calendar-offline.spec.ts`, `apps/web/tests/e2e/fixtures.ts`, `apps/web/src/lib/offline/calendar-controller.ts`
  - Verify: npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts

- [x] **T02: Hardened the sync proof around remote-refresh diagnostics, added realtime auth ordering coverage, and captured a blocker: collaborator sessions still never receive the shared shift refresh signal in preview proof.** `est:1h30m`
  Use the installed `debug-like-expert` skill before coding. The clean-db sync rerun suggests the shared create itself lands, but the browser spec still over-asserts on transient action-strip timing. Replace timing-sensitive success checks with stronger board/queue/realtime assertions, keep next-week scope-guard proof intact, and only investigate runtime code if the collaborator page still fails to refresh after the stronger evidence surfaces are in place.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Multi-session Playwright collaborator setup | Fail with retained diagnostics for both sessions rather than collapsing back to a single-page proof. | Stop on channel/refresh readiness failure and capture both pages' realtime state instead of sleeping longer. | Treat unexpected page state as proof-invalid and preserve the flow attachment. |
| Realtime change-detection + trusted refresh path | Prove the primary create from board/queue state first, then localize any failure to channel readiness vs remote refresh application. | Abort when `data-remote-refresh-state` never leaves `idle` and capture the last signal/channel metadata. | Inspect `sync-engine.ts` / `+page.svelte` rather than trusting a transient action-strip label. |

## Load Profile

- **Shared resources**: local Supabase reset, preview runtime, two browser sessions, realtime channel, trusted route invalidation.
- **Per-operation cost**: one isolated sync spec run with a seeded baseline, a shared create, and one collaborator refresh path.
- **10x breakpoint**: realtime readiness and trusted refresh settle before action-strip rendering, so assertions must prefer those calmer signals.

## Negative Tests

- **Malformed inputs**: collaborator on the wrong week, missing conflict card id, or malformed realtime payloads.
- **Error paths**: channel never reaches `ready`, remote refresh stays `idle`/`failed`, or created overlap appears only after manual reload.
- **Boundary conditions**: seeded Thursday baseline remains 1 pair before the create, grows to 3 pairs after the create, and the out-of-scope next-week collaborator remains unchanged.

## Steps

1. Re-run `tests/e2e/calendar-sync.spec.ts` on a clean local reset and confirm whether the first red assertion is still the `SHIFT_CREATED` action-strip timing check.
2. Extend `apps/web/tests/e2e/fixtures.ts` with any missing helpers needed to wait on board conflict counts, queue drain, and `data-remote-refresh-state` instead of transient action-strip text.
3. Update `apps/web/tests/e2e/calendar-sync.spec.ts` so the primary create is proven by visible shift card + conflict count + `0 pending / 0 retryable`, and the collaborator refresh is proven by `remote-refresh-state="applied"` plus the new overlap warnings.
4. If the stronger spec is still red, patch the smallest runtime seam in `apps/web/src/lib/offline/sync-engine.ts` and/or `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` to fix the real refresh application bug, then rerun the isolated sync proof.

## Must-Haves

- [ ] The primary session proves the overlapping create from stable board and queue state without depending on immediate `SHIFT_CREATED` text.
- [ ] The collaborator session proves a realtime-driven trusted refresh by reaching `data-remote-refresh-state="applied"` and showing the new overlap warning without manual reload.
- [ ] The next-week collaborator guard still shows no refresh and no out-of-scope overlap card.

## Verification

- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-sync.spec.ts`
- `pnpm --dir apps/web exec vitest run tests/schedule/sync-engine.unit.test.ts tests/schedule/board.unit.test.ts`

## Observability Impact

- Signals added/changed: sync proof now trusts queue counts, conflict summaries, channel state, and remote refresh state before transient action-strip messaging.
- How a future agent inspects this: rerun `calendar-sync.spec.ts` and compare primary vs collaborator flow diagnostics for board conflict counts and realtime state.
- Failure state exposed: whether the red state is assertion drift, channel readiness, remote refresh application, or scope-guard logic becomes explicit.
  - Files: `apps/web/tests/e2e/calendar-sync.spec.ts`, `apps/web/tests/e2e/fixtures.ts`, `apps/web/src/lib/offline/sync-engine.ts`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
  - Verify: npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-sync.spec.ts

- [x] **T03: Root-cause and fix collaborator realtime delivery in preview proof** `est:2h`
  Use the installed `debug-like-expert` skill before coding. Reproduce the clean-db `tests/e2e/calendar-sync.spec.ts` failure and confirm, with retained diagnostics plus direct probes, whether the missing collaborator refresh is caused by Supabase realtime publication/RLS visibility, server-action write-path metadata, browser subscription filtering, or trusted refresh application after signal receipt. Add the smallest diagnostics needed so future flow attachments make it explicit whether a shared-shift change was emitted, received, filtered, or rejected. Patch the narrowest seam that fixes the real collaborator-delivery contract — this may include `apps/web/src/lib/offline/sync-engine.ts`, the calendar route refresh path, focused test helpers, or the local Supabase migration/config surface if the preview-backed environment is suppressing in-scope shift events. Lock the root cause with unit/integration coverage and keep the out-of-scope next-week guard fail-closed.
  - Files: `apps/web/src/lib/offline/sync-engine.ts`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`, `apps/web/tests/e2e/calendar-sync.spec.ts`, `apps/web/tests/e2e/fixtures.ts`, `apps/web/tests/schedule/sync-engine.unit.test.ts`, `apps/web/tests/schedule/server-actions.unit.test.ts`, `supabase/migrations/20260416_000001_schedule_realtime.sql`, `supabase/config.toml`
  - Verify: npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-sync.spec.ts && pnpm --dir apps/web exec vitest run tests/schedule/sync-engine.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/server-actions.unit.test.ts

- [x] **T04: Rerun full browser proof and close validation artifacts after realtime repair** `est:1h15m`
  Once T03 is green, rerun the isolated offline proof if needed, then execute the clean combined preview suite and supporting type/unit regressions so the slice closes on the same proof surface used for milestone validation. Use `gsd_summary_save` to create `ASSESSMENT` artifacts for `S01` through `S04` grounded in their existing summaries/UAT plus the now-green S06 browser evidence. Use `gsd_requirement_update` to refresh validation evidence for `R005` and `R006`, and add supporting validation notes for `R001` / `R004` only if the combined rerun now genuinely proves them. Finish by calling `gsd_validate_milestone` so `.gsd/milestones/M001/M001-VALIDATION.md` reflects the real slice inventory, repaired browser proof, and current requirement coverage.
  - Files: `apps/web/tests/e2e/calendar-offline.spec.ts`, `apps/web/tests/e2e/calendar-sync.spec.ts`, `.gsd/milestones/M001/M001-VALIDATION.md`, `.gsd/REQUIREMENTS.md`, `.gsd/milestones/M001/slices/S01/S01-SUMMARY.md`, `.gsd/milestones/M001/slices/S01/S01-UAT.md`, `.gsd/milestones/M001/slices/S02/S02-SUMMARY.md`, `.gsd/milestones/M001/slices/S02/S02-UAT.md`, `.gsd/milestones/M001/slices/S03/S03-SUMMARY.md`, `.gsd/milestones/M001/slices/S03/S03-UAT.md`, `.gsd/milestones/M001/slices/S04/S04-SUMMARY.md`, `.gsd/milestones/M001/slices/S04/S04-UAT.md`, `.gsd/milestones/M001/slices/S05/S05-ASSESSMENT.md`
  - Verify: npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts && pnpm --dir apps/web check && pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts tests/schedule/server-actions.unit.test.ts && test -f .gsd/milestones/M001/slices/S01/S01-ASSESSMENT.md && test -f .gsd/milestones/M001/slices/S02/S02-ASSESSMENT.md && test -f .gsd/milestones/M001/slices/S03/S03-ASSESSMENT.md && test -f .gsd/milestones/M001/slices/S04/S04-ASSESSMENT.md && rg -n "R005|R006|cached session|offline|realtime|S05 \| Present" .gsd/milestones/M001/M001-VALIDATION.md .gsd/REQUIREMENTS.md

## Files Likely Touched

- apps/web/tests/e2e/calendar-offline.spec.ts
- apps/web/tests/e2e/fixtures.ts
- apps/web/src/lib/offline/calendar-controller.ts
- apps/web/tests/e2e/calendar-sync.spec.ts
- apps/web/src/lib/offline/sync-engine.ts
- apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
- apps/web/tests/schedule/sync-engine.unit.test.ts
- apps/web/tests/schedule/server-actions.unit.test.ts
- supabase/migrations/20260416_000001_schedule_realtime.sql
- supabase/config.toml
- .gsd/milestones/M001/M001-VALIDATION.md
- .gsd/REQUIREMENTS.md
- .gsd/milestones/M001/slices/S01/S01-SUMMARY.md
- .gsd/milestones/M001/slices/S01/S01-UAT.md
- .gsd/milestones/M001/slices/S02/S02-SUMMARY.md
- .gsd/milestones/M001/slices/S02/S02-UAT.md
- .gsd/milestones/M001/slices/S03/S03-SUMMARY.md
- .gsd/milestones/M001/slices/S03/S03-UAT.md
- .gsd/milestones/M001/slices/S04/S04-SUMMARY.md
- .gsd/milestones/M001/slices/S04/S04-UAT.md
- .gsd/milestones/M001/slices/S05/S05-ASSESSMENT.md
