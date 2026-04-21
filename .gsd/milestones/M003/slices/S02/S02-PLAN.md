# S02: Mobile calendar continuity and editing

**Goal:** Restore Caluno’s local-first calendar continuity on mobile by letting previously synced permitted calendars reopen offline, staging shift edits locally with visible pending or retryable state, and draining them back through a trusted mobile transport when connectivity returns.
**Demo:** A previously synced calendar reopens on mobile, a shift can be created or edited offline, the change stays visibly pending, and reconnect drains it back through the trusted path.

## Must-Haves

- `R022`: a previously trusted mobile shell and previously synced calendar week can reopen offline only when the cached session, user, and calendar scope still validate; stale, mismatched, or unsynced scope fails closed.
- `R022`: create/edit/move/delete schedule mutations can be staged locally on mobile, survive reload/reopen, remain visibly pending or retryable, and replay in deterministic order on reconnect.
- `R009`: pure continuity, queue, replay, and schedule view helpers live in `@repo/caluno-core` instead of `apps/mobile` importing from `apps/web/src`, so mobile stays on the shared product substrate while shipping phone-first UI.
- Mobile runtime adapters use Capacitor-native persistence and lifecycle surfaces (`@capacitor/preferences`, `@capacitor/network`, `@capacitor/app`) rather than an ad hoc `localStorage` / `navigator.onLine`-only story.
- The mobile calendar route exposes stable `data-testid` / `data-*` proof surfaces for route mode, snapshot origin, queue counts, sync phase, and last retryable failure so future agents can diagnose continuity failures without guessing.
- Verification passes in named files: `apps/mobile/tests/continuity-contract.unit.test.ts`, `apps/mobile/tests/mobile-continuity.unit.test.ts`, `apps/mobile/tests/mobile-sync-runtime.unit.test.ts`, `apps/mobile/tests/e2e/calendar-offline.spec.ts`, plus web regressions `apps/web/tests/schedule/offline-queue.unit.test.ts`, `apps/web/tests/schedule/sync-engine.unit.test.ts`, `apps/web/tests/schedule/board.unit.test.ts`, `apps/web/tests/schedule/conflicts.unit.test.ts`, and `apps/web/tests/schedule/recurrence.unit.test.ts`.

## Threat Surface

- **Abuse**: stale-session replay, cached-shell tampering, unsynced calendar-id guessing, forged reconnect queue payloads, and repeated drain retries must all fail closed instead of widening mobile scope or hiding write failures.
- **Data exposure**: only the signed-in user’s already-permitted shell metadata, cached week snapshot, and local queue state may be visible on device; never Supabase tokens, cross-group shifts, or calendars outside the trusted inventory.
- **Input trust**: cached JSON from device storage, route params, shift form payloads, network/lifecycle plugin events, and Supabase write responses are all untrusted until validated against the shared contract and typed mobile adapters.

## Requirement Impact

- **Requirements touched**: `R022`, `R009`, regression-safe `R002`
- **Re-verify**: mobile auth/scope shell, cached continuity fail-closed rules, offline create/edit queue persistence, reconnect drain ordering, out-of-scope denial, web shared offline regressions, and Capacitor plugin sync.
- **Decisions revisited**: `D045`, `D046`, `D049`, `D050`, `D052`

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/continuity-contract.unit.test.ts tests/mobile-continuity.unit.test.ts tests/mobile-sync-runtime.unit.test.ts`
- `pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/conflicts.unit.test.ts tests/schedule/recurrence.unit.test.ts`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts`
- `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'`

## Observability / Diagnostics

- Runtime signals: `data-route-mode`, `data-snapshot-origin`, `data-queue-state`, `data-pending-count`, `data-retryable-count`, `data-sync-phase`, and last retryable failure metadata on the mobile calendar surface.
- Inspection surfaces: `apps/mobile/tests/*.test.ts`, `apps/mobile/tests/e2e/calendar-offline.spec.ts`, mobile calendar route `data-testid` surfaces, and `pnpm --dir apps/mobile cap:sync` output for native plugin wiring.
- Failure visibility: stale continuity session, corrupt cached snapshot, unsynced calendar reopen, queue parse failure, drain stop-on-error, and offline transport rejection remain attributable to named phases instead of generic empty-state UI.
- Redaction constraints: do not surface Supabase tokens, raw session payloads, or shift data outside the already-permitted calendar scope.

## Integration Closure

- Upstream surfaces consumed: `packages/caluno-core/src/route-contract.ts`, `apps/mobile/src/lib/auth/mobile-session.ts`, `apps/mobile/src/lib/shell/load-app-shell.ts`, `apps/web/src/lib/offline/app-shell-cache.ts`, `apps/web/src/lib/offline/mutation-queue.ts`, `apps/web/src/lib/offline/sync-engine.ts`, `apps/web/src/lib/offline/calendar-controller.ts`, and `apps/web/src/lib/server/schedule.ts`.
- New wiring introduced in this slice: shared offline/schedule helpers in `@repo/caluno-core`, Capacitor-backed mobile continuity storage and connectivity adapters, continuity-aware protected route entry, trusted mobile schedule transport, a phone-first calendar/editor surface, and Playwright proof for offline reopen plus reconnect drain.
- What remains before the milestone is truly usable end-to-end: reminder and push notification slices, plus final assembled mobile UAT across continuity and notification controls.

## Decomposition Rationale

The order follows the real continuity risk curve. T01 retires drift first by moving the proven pure queue, replay, and schedule helpers into the shared package and pinning them with executable regressions. T02 then removes the structural blocker identified in research by giving mobile a durable trusted shell and offline-open gate that still fails closed on stale or unsynced scope. T03 wires the real mobile runtime adapters—storage, transport, connectivity, and reconnect drain—so the slice proves actual local-first behavior rather than a cached mock. T04 spends that truthful runtime on a phone-first calendar/editor surface with explicit pending and retryable diagnostics. T05 finishes with end-to-end browser proof and Capacitor sync so the slice closes on runnable evidence, not component confidence.

## Tasks

- [x] **T01: Extract the shared mobile continuity and schedule contract** `est:2h`
  - Why: Mobile continuity should reuse the already-proven product rules, not fork them inside `apps/mobile`.
  - Files: `packages/caluno-core/package.json`, `packages/caluno-core/src/index.ts`, `packages/caluno-core/src/offline/app-shell-cache.ts`, `packages/caluno-core/src/offline/mutation-queue.ts`, `packages/caluno-core/src/offline/sync-engine.ts`, `packages/caluno-core/src/schedule/board.ts`, `packages/caluno-core/src/schedule/conflicts.ts`, `packages/caluno-core/src/schedule/recurrence.ts`
  - Do: Extract pure cached-shell, queue/replay, and schedule-view helpers into `@repo/caluno-core`; rewire web imports/tests; add a mobile-local contract regression file proving fail-closed stale-session, user-mismatch, unsynced-calendar, and replay-order behavior.
  - Verify: `pnpm --dir apps/mobile exec vitest run tests/continuity-contract.unit.test.ts && pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/conflicts.unit.test.ts tests/schedule/recurrence.unit.test.ts`
  - Done when: mobile depends on shared pure helpers instead of `apps/web/src`, and existing web offline regressions still pass.
- [ ] **T02: Add durable trusted shell continuity and offline route reopening on mobile** `est:2h`
  - Why: Without a durable trusted shell and week cache, the app cannot satisfy R022 after reload or app restart.
  - Files: `apps/mobile/package.json`, `apps/mobile/src/lib/auth/mobile-session.ts`, `apps/mobile/src/lib/shell/load-app-shell.ts`, `apps/mobile/src/lib/continuity/mobile-app-shell-cache.ts`, `apps/mobile/src/lib/offline/repository.ts`, `apps/mobile/src/routes/+layout.ts`, `apps/mobile/tests/mobile-continuity.unit.test.ts`
  - Do: Add Preferences-backed continuity storage, persist trusted shell and week metadata, and teach protected mobile routes to reopen only previously synced permitted scope in a truthful `cached-offline` mode.
  - Verify: `pnpm --dir apps/mobile exec vitest run tests/mobile-continuity.unit.test.ts tests/continuity-contract.unit.test.ts && pnpm --dir apps/mobile check`
  - Done when: a previously synced permitted calendar can reopen offline, while stale, mismatched, corrupt, or unsynced continuity state still fails closed.
- [ ] **T03: Wire mobile local-first schedule storage, trusted writes, and reconnect drain** `est:2h`
  - Why: Continuity without local-first mutation staging would only reopen stale read-only state and still miss the core requirement.
  - Files: `apps/mobile/src/lib/offline/repository.ts`, `apps/mobile/src/lib/offline/runtime.ts`, `apps/mobile/src/lib/offline/transport.ts`, `apps/mobile/src/lib/offline/network.ts`, `apps/mobile/src/lib/offline/app-lifecycle.ts`, `apps/mobile/src/lib/offline/controller.ts`, `apps/mobile/tests/mobile-sync-runtime.unit.test.ts`
  - Do: Implement the mobile repository/runtime adapters, trusted Supabase schedule transport, and one reconnect/drain authority driven by Capacitor Network and App lifecycle signals.
  - Verify: `pnpm --dir apps/mobile exec vitest run tests/mobile-sync-runtime.unit.test.ts tests/mobile-continuity.unit.test.ts && pnpm --dir apps/mobile check`
  - Done when: offline create/edit/move/delete stage locally, reconnect drain replays in deterministic order, and timed-out or rejected writes remain visible as retryable state.
- [ ] **T04: Ship the phone-first calendar board and shift editor with explicit sync diagnostics** `est:2h`
  - Why: R009 still requires the mobile surface to feel native and truthful, not like a web placeholder bolted onto the continuity runtime.
  - Files: `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`, `apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte`, `apps/mobile/src/lib/components/calendar/ShiftCard.svelte`, `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte`, `apps/mobile/src/lib/components/calendar/SyncStatusStrip.svelte`, `apps/mobile/src/app.css`
  - Do: Replace the calendar placeholder route with a compact mobile week board, phone-first shift editor controls, and stable queue/sync/test-id diagnostics that read from the local-first controller.
  - Verify: `pnpm --dir apps/mobile exec vitest run tests/mobile-sync-runtime.unit.test.ts tests/mobile-continuity.unit.test.ts && pnpm --dir apps/mobile check && pnpm --dir apps/mobile build`
  - Done when: pending and retryable shifts stay visible across reload, and the calendar surface clearly distinguishes trusted-online, cached-offline, draining, and paused-retryable states.
- [ ] **T05: Prove mobile offline continuity end to end and sync native plugins** `est:90m`
  - Why: The slice is only done when the full offline reopen and reconnect story is proven on the real entry path and the native project still syncs.
  - Files: `apps/mobile/tests/e2e/fixtures.ts`, `apps/mobile/tests/e2e/calendar-offline.spec.ts`, `apps/mobile/tests/e2e/auth-scope.spec.ts`, `apps/mobile/playwright.config.ts`, `apps/mobile/package.json`, `apps/mobile/capacitor.config.ts`, `apps/mobile/ios/App/App.xcodeproj/project.pbxproj`
  - Do: Extend the mobile Playwright harness to prove online warm-up, offline reopen, offline edit survival across reload, reconnect drain, and fail-closed denial for unsynced calendars, then finish with `cap:sync`.
  - Verify: `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts && pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync' && pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts`
  - Done when: Playwright proves the continuity story end to end and native plugin sync stays green.

## Files Likely Touched

- `packages/caluno-core/package.json`
- `packages/caluno-core/src/index.ts`
- `packages/caluno-core/src/offline/app-shell-cache.ts`
- `packages/caluno-core/src/offline/mutation-queue.ts`
- `packages/caluno-core/src/offline/sync-engine.ts`
- `packages/caluno-core/src/schedule/board.ts`
- `packages/caluno-core/src/schedule/conflicts.ts`
- `packages/caluno-core/src/schedule/recurrence.ts`
- `apps/mobile/package.json`
- `apps/mobile/src/lib/auth/mobile-session.ts`
- `apps/mobile/src/lib/shell/load-app-shell.ts`
- `apps/mobile/src/lib/continuity/mobile-app-shell-cache.ts`
- `apps/mobile/src/lib/offline/repository.ts`
- `apps/mobile/src/lib/offline/runtime.ts`
- `apps/mobile/src/lib/offline/transport.ts`
- `apps/mobile/src/lib/offline/network.ts`
- `apps/mobile/src/lib/offline/app-lifecycle.ts`
- `apps/mobile/src/lib/offline/controller.ts`
- `apps/mobile/src/routes/+layout.ts`
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`
- `apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte`
- `apps/mobile/src/lib/components/calendar/ShiftCard.svelte`
- `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte`
- `apps/mobile/src/lib/components/calendar/SyncStatusStrip.svelte`
- `apps/mobile/src/app.css`
- `apps/mobile/tests/continuity-contract.unit.test.ts`
- `apps/mobile/tests/mobile-continuity.unit.test.ts`
- `apps/mobile/tests/mobile-sync-runtime.unit.test.ts`
- `apps/mobile/tests/e2e/fixtures.ts`
- `apps/mobile/tests/e2e/calendar-offline.spec.ts`
- `apps/mobile/playwright.config.ts`
- `apps/mobile/capacitor.config.ts`
- `apps/mobile/ios/App/App.xcodeproj/project.pbxproj`
