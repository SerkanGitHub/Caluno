# S05: Baseline conflict detection and milestone assembly proof

**Goal:** Add non-blocking baseline conflict visibility to the shared calendar board so overlapping visible-week shifts warn clearly at card/day/board level and the same warning layer remains correct through trusted-online, cached-offline, reconnect, and realtime flows.
**Demo:** In the browser, shared calendars warn about overlapping or double-booked schedule conflicts while the full substrate works end-to-end offline and online.

## Must-Haves

- **Demo:** In the browser, `Alpha shared` shows calm but explicit conflict warnings for overlapping shifts, the Wednesday touch boundary stays clean, and the same warning layer survives offline local edits, reload, reconnect drain, and collaborator-triggered realtime refresh without widening route authority.
- ## Must-Haves
- Derive conflicts purely from the visible `effectiveSchedule` / week-board data; do not persist conflict metadata, do not reject writes, and do not introduce any client-authoritative calendar scope.
- Warn on true same-day temporal overlaps in the rendered week, including local-only and replayed shifts, while treating `endAt === next.startAt` as non-conflicting.
- Keep conflict warnings visually distinct from local/sync/realtime transport diagnostics and expose stable browser-proof hooks at board, day, and shift level.
- Add durable proof files for this slice: `apps/web/tests/schedule/conflicts.unit.test.ts`, `apps/web/tests/schedule/board.unit.test.ts`, `apps/web/tests/e2e/calendar-shifts.spec.ts`, `apps/web/tests/e2e/calendar-offline.spec.ts`, and `apps/web/tests/e2e/calendar-sync.spec.ts`.
- Re-prove denied and offline-denied scope behavior alongside conflict visibility so S05 does not weaken the S01/S02/S03 authority boundary.
- ## Threat Surface
- **Abuse**: untrusted shift times, route params, queued local mutations, and realtime payloads could try to mis-scope conflict warnings or create refresh noise; the slice must keep warnings week-scoped and non-authoritative.
- **Data exposure**: warning summaries may expose only already-visible shift titles/times within the permitted calendar week; no cross-calendar rows, tokens, or hidden schedule data may appear in badges or diagnostics.
- **Input trust**: server-loaded schedule data, browser-local snapshots, queued local writes, and realtime refresh payloads are all untrusted until reduced to the current `effectiveSchedule` inside the existing trusted route scope.
- ## Requirement Impact
- **Requirements touched**: `R006` (owned), plus `R005`, `R004`, `R001`, `R002`, and `R012`.
- **Re-verify**: seeded overlap visibility, touching-boundary clean state, offline reopen + reload continuity, reconnect drain to zero, realtime collaborator refresh, and denied/offline-denied route behavior.
- **Decisions revisited**: `D012`, `D014`, `D020`, `D023`, `D024`, and `D025` remain in force and must still be true after conflict visibility lands.
- ## Verification
- `pnpm --dir apps/web check`
- `pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts`
- `npx --yes supabase db reset --local --yes`
- `pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`
- `pnpm --dir apps/web build && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts`
- Browser proof must explicitly show the seeded Thursday overlap warning, the clean Wednesday touch boundary, offline overlap warning persistence through reload + reconnect, realtime collaborator propagation, and unchanged denied/offline-denied scope metadata.

## Proof Level

- This slice proves: - This slice proves: final-assembly
- Real runtime required: yes
- Human/UAT required: no

## Integration Closure

- Upstream surfaces consumed: `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`, `apps/web/src/lib/schedule/board.ts`, `apps/web/src/lib/server/schedule.ts`, `apps/web/src/lib/offline/calendar-controller.ts`, `apps/web/src/lib/offline/sync-engine.ts`, and the seeded fixtures in `supabase/seed.sql` plus `apps/web/tests/e2e/fixtures.ts`.
- New wiring introduced in this slice: a pure visible-week conflict module feeding the board model, calm board/day/card warning surfaces, and browser-proof helpers/assertions that inspect conflict visibility across trusted, offline, reconnect, and realtime paths.
- What remains before the milestone is truly usable end-to-end: nothing inside M001 beyond milestone validation once preview-backed conflict proof is green.

## Verification

- Runtime signals: board/day/shift conflict counts and warning badges remain separate from queue, sync, and realtime transport diagnostics.
- Inspection surfaces: `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`, `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte`, `apps/web/src/lib/components/calendar/ShiftCard.svelte`, and retained conflict readers in `apps/web/tests/e2e/fixtures.ts`.
- Failure visibility: missing or incorrect conflict summaries, queue/realtime state, and denied/offline-denied metadata must remain inspectable in the live UI and Playwright flow diagnostics.
- Redaction constraints: diagnostics may include seeded calendar/shift ids and already-visible titles/times only; never tokens or cross-calendar rows.

## Tasks

- [x] **T01: Derive visible-week conflict warnings and render them in the calm board UI** `est:2h30m`
  ## Description

Deliver the owned **R006** behavior as a pure derived warning layer on top of the existing week board. Compute overlaps from the same visible-week schedule the page already renders, keep `endAt === next.startAt` clean, and surface the result at board, day, and shift level without turning conflicts into write blockers or overloading sync failure badges.

Load the installed `frontend-design` and `debug-like-expert` skills before coding so the warning treatment stays calm, precise, and well-proven against the seeded Thursday overlap plus Wednesday touch-boundary fixtures.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Visible-week schedule data from `board.ts` / `+page.svelte` | Keep the board renderable and fail closed on guessed conflict badges instead of fabricating warnings. | Reuse the existing schedule load state; do not introduce a second waiting path for conflict rendering. | Treat invalid timestamps/order as non-renderable conflict input and keep the issue inspectable in unit coverage. |
| Existing shift status badge pipeline in `ShiftCard.svelte` | Preserve local/sync diagnostics separately so transport failures stay visible even if conflict rendering regresses. | Keep the card usable without blocking edit/move/delete controls. | Withhold only the malformed conflict badge rather than collapsing the rest of the card metadata. |

## Load Profile

- **Shared resources**: the visible-week board model, same-day shift groupings, and dense multi-shift day columns.
- **Per-operation cost**: one deterministic sort plus day-scoped overlap detection across the rendered week; no network or storage round-trips.
- **10x breakpoint**: dense same-day weeks will stress comparison count first, so the helper must stay week-scoped, deterministic, and avoid quadratic rework beyond the per-day overlap pass.

## Negative Tests

- **Malformed inputs**: invalid timestamps, inverted ranges, duplicate ids/titles, and empty day groups.
- **Error paths**: mixed local-only and server-confirmed shifts in one day, missing diagnostics for existing queue badges, and malformed schedule rows reaching the helper.
- **Boundary conditions**: touching ranges (`09:00` end / `09:00` start), one shift overlapping multiple later shifts, and recurring plus one-off overlaps on the same day.

## Steps

1. Add a pure helper in `apps/web/src/lib/schedule/conflicts.ts` that groups visible-week shifts by rendered day, detects real overlaps, and returns shift/day/board summaries with non-conflicting touch boundaries excluded.
2. Extend `apps/web/src/lib/schedule/board.ts` so `buildCalendarWeekBoard()` merges conflict diagnostics with the existing board model while keeping semantic conflict badges distinct from local/sync/realtime transport diagnostics.
3. Update `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`, `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte`, `apps/web/src/lib/components/calendar/ShiftCard.svelte`, and `apps/web/src/app.css` to render calm warning pills/summaries plus stable `data-testid` hooks for board, day, and shift conflict states.
4. Add deterministic unit coverage in `apps/web/tests/schedule/conflicts.unit.test.ts` and `apps/web/tests/schedule/board.unit.test.ts` for true overlap, clean touching boundary, multi-overlap summaries, and merged local/sync badge rendering.

## Must-Haves

- [ ] The seeded Thursday overlap renders as conflict data on the board, day, and both participating shift cards.
- [ ] The seeded Wednesday `08:30–09:00` / `09:00–11:00` boundary stays clean with no false conflict badge.
- [ ] Conflict warnings stay non-blocking and visually separate from `Local only`, `Pending sync`, retry, and realtime diagnostics.
  - Files: `apps/web/src/lib/schedule/conflicts.ts`, `apps/web/src/lib/schedule/board.ts`, `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`, `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte`, `apps/web/src/lib/components/calendar/ShiftCard.svelte`, `apps/web/src/app.css`, `apps/web/tests/schedule/conflicts.unit.test.ts`, `apps/web/tests/schedule/board.unit.test.ts`
  - Verify: pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts tests/schedule/board.unit.test.ts

- [x] **T02: Prove conflict visibility through trusted, offline reconnect, and realtime collaborator flows** `est:2h30m`
  ## Description

Turn the new warning layer into milestone-closing proof. Use the existing seeded fixtures plus the S03/S04 local-first substrate to show that conflicts are visible online, appear immediately for offline local overlaps, survive reload and reconnect replay, and propagate to another online session through realtime-triggered trusted refreshes.

Load the installed `debug-like-expert` skill before changing browser proof so the known preview-backed repository/realtime fragility stays observable and every failure retains enough flow context to tell whether the problem came from conflict rendering, offline continuity, reconnect drain, or channel readiness.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Preview-backed runtime, browser-local repository, and reconnect surface | Stop the scenario with retained diagnostics instead of claiming offline conflict continuity on an untrusted runtime. | Keep the failure localized to readiness/wait helpers and preserve queue/realtime state in the flow attachment. | Fail closed and treat the route as proof-invalid rather than guessing conflict state. |
| Multi-session realtime proof and trusted refresh pipeline | Keep the primary session assertions explicit and capture collaborator diagnostics before rerun. | Abort the collaborator wait with channel/refresh metadata attached instead of hiding flake behind long sleeps. | Treat the remote refresh as failed and preserve the last signal / channel reason in retained diagnostics. |

## Load Profile

- **Shared resources**: local Supabase stack, preview build/runtime, browser-local repository, reconnect queue, and two Playwright pages/contexts.
- **Per-operation cost**: one local stack reset, trusted-online seeded assertions, offline reload/reconnect scenario, and a multi-session collaborator propagation scenario.
- **10x breakpoint**: slower preview repository bootstrap and realtime readiness will fail first, so the specs must prefer explicit readiness/conflict assertions over fixed delays.

## Negative Tests

- **Malformed inputs**: unsynced or unauthorized calendar ids, stale cached scope, and mismatched collaborator week scope.
- **Error paths**: repository-unavailable preview boots, reconnect leaving retryable entries, realtime channel never reaching `ready`, and remote refresh failing after a signal.
- **Boundary conditions**: seeded touch boundary staying clean, local overlap created while offline, reload before reconnect, reconnect draining multiple pending writes, and collaborator viewing the next week while the writer changes the current week.

## Steps

1. Extend `apps/web/tests/e2e/fixtures.ts` with conflict-specific readers/waits so browser proof can inspect board/day/shift warnings alongside the already-existing route, queue, sync, and realtime diagnostics.
2. Expand `apps/web/tests/e2e/calendar-shifts.spec.ts` to assert the seeded Thursday overlap warning, the clean Wednesday touch boundary, and unchanged denied-route behavior in the trusted-online path.
3. Expand `apps/web/tests/e2e/calendar-offline.spec.ts` to create or move an overlapping shift while offline, prove the warning appears immediately, survives reload, and remains visible after reconnect drains the queue.
4. Expand `apps/web/tests/e2e/calendar-sync.spec.ts` so one session creates a visible-week overlap and the collaborator session refreshes to the same warning without manual reload, while next-week scope guards still prevent out-of-scope refreshes.
5. Keep retained diagnostics rich enough to localize preview-backed failures by conflict state, queue summary, sync phase, channel state, remote refresh state, and denied/offline-denied metadata.

## Must-Haves

- [ ] Trusted-online browser proof shows the seeded Thursday overlap warning and the clean Wednesday touch boundary in the same visible week.
- [ ] Offline browser proof shows a locally created or moved overlap warning immediately, keeps it across reload, and still shows it after reconnect drains to `0 pending / 0 retryable`.
- [ ] Realtime browser proof shows a collaborator-triggered overlap warning appear without manual reload while out-of-scope next-week views stay untouched.
  - Files: `apps/web/tests/e2e/fixtures.ts`, `apps/web/tests/e2e/calendar-shifts.spec.ts`, `apps/web/tests/e2e/calendar-offline.spec.ts`, `apps/web/tests/e2e/calendar-sync.spec.ts`
  - Verify: npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts && pnpm --dir apps/web build && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts

## Files Likely Touched

- apps/web/src/lib/schedule/conflicts.ts
- apps/web/src/lib/schedule/board.ts
- apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte
- apps/web/src/lib/components/calendar/ShiftDayColumn.svelte
- apps/web/src/lib/components/calendar/ShiftCard.svelte
- apps/web/src/app.css
- apps/web/tests/schedule/conflicts.unit.test.ts
- apps/web/tests/schedule/board.unit.test.ts
- apps/web/tests/e2e/fixtures.ts
- apps/web/tests/e2e/calendar-shifts.spec.ts
- apps/web/tests/e2e/calendar-offline.spec.ts
- apps/web/tests/e2e/calendar-sync.spec.ts
