# S04: Sync engine and realtime shared updates

**Goal:** Add a safe browser sync engine for shared calendars so pending local mutations rebase onto refreshed trusted week data, reconnect flushes them deterministically through the existing route actions, and online collaborators see shared shift changes propagate live without widening the S01/S02 trust boundary.
**Demo:** Multiple group members see shared calendar updates propagate live when online, and offline edits reconcile when connectivity returns.

## Must-Haves

- Add a pure replay/rebase path that applies ordered pending queue entries onto a trusted server week snapshot so refreshes and invalidations cannot erase local-only or retryable work, directly advancing R005 while preserving the local-first continuity from R004.
- Guard `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts` against blindly overwriting a `local-write` snapshot when pending or retryable queue entries still exist for the same user/calendar/week scope.
- Add a browser sync engine that drains queued create/edit/move/delete mutations sequentially through the existing `/calendars/[calendarId]` trusted route actions, keeps timeout/forbidden/malformed outcomes retryable, and exposes sync phase plus last failure in the visible board diagnostics.
- Subscribe online members to shared shift changes through Supabase Realtime as change detection only, then refresh the visible week from the trusted route/server path and rebase any still-pending local mutations onto that refreshed schedule.
- Add durable proof files for this slice: `apps/web/tests/schedule/sync-engine.unit.test.ts`, expanded `apps/web/tests/schedule/offline-queue.unit.test.ts`, expanded `apps/web/tests/e2e/calendar-offline.spec.ts`, and `apps/web/tests/e2e/calendar-sync.spec.ts`, while keeping `apps/web/tests/e2e/calendar-shifts.spec.ts` green as the online regression surface.

## Threat Surface

- **Abuse**: replaying or tampering with browser-local queue entries, forcing reconnect loops, and trying to widen calendar scope through background sync or realtime-triggered refreshes.
- **Data exposure**: cached week snapshots, queued mutation payloads, realtime event metadata, and browser diagnostics must stay scoped to the signed-in member and current calendar; no raw Supabase tokens or cross-group rows may enter logs or local storage.
- **Input trust**: queued local mutations, route params, action responses, and Realtime payloads are all untrusted until the trusted calendar route re-derives scope and the replay helper proves they can be safely applied to the visible week.

## Requirement Impact

- **Requirements touched**: `R005` (owned), plus the already-landed continuity/security boundaries in `R004`, `R001`, `R002`, and `R012`.
- **Re-verify**: offline reopen and queue persistence, trusted route-scoped mutation authority, denied cross-calendar behavior, same-week shift editing, reconnect drain to zero, and online collaborator propagation.
- **Decisions revisited**: `D003`, `D012`, `D013`, `D014`, `D015`, `D020`, and `D022` stay in force and must remain true after reconnect and realtime wiring.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Integration Closure

- Upstream surfaces consumed: `apps/web/src/lib/offline/calendar-controller.ts`, `apps/web/src/lib/offline/mutation-queue.ts`, `apps/web/src/lib/offline/repository.ts`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`, `apps/web/src/lib/server/schedule.ts`, and `apps/web/src/lib/supabase/client.ts`.
- New wiring introduced in this slice: a browser `sync-engine` orchestration layer, controller APIs for trusted refresh + queue replay, reconnect queue draining through named route actions, Supabase Realtime channel lifecycle for `public.shifts`, and browser/test diagnostics for sync phase and remote refresh state.
- What remains before the milestone is truly usable end-to-end: only the richer conflict semantics and warning UX planned for S05/R006; reconnect sync and live shared propagation should be production-shaped by the end of this slice.

## Verification

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/server-actions.unit.test.ts tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts`
- `npx --yes supabase db reset --local --yes`
- `pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`
- `pnpm --dir apps/web build && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts`
- The verification surface must also prove that queue counts, sync phase/last error diagnostics, and multi-user flow evidence stay inspectable when reconnect or realtime propagation fails.

## Observability / Diagnostics

- Runtime signals: visible queue counts, sync phase, last sync error, board source, realtime channel state, and last remote refresh outcome on the calendar route.
- Inspection surfaces: `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`, `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`, `apps/web/tests/e2e/fixtures.ts`, `apps/web/tests/e2e/calendar-offline.spec.ts`, and `apps/web/tests/e2e/calendar-sync.spec.ts`.
- Failure visibility: replay refusal, reconnect stop point, retryable queue state, and remote-refresh failure must remain user-visible or retained in Playwright flow diagnostics.
- Redaction constraints: diagnostics may include seeded calendar and shift ids plus reason codes, but must not log Supabase tokens or cross-group schedule rows.

## Tasks

- [x] **T01: Build deterministic queue replay and protect trusted refreshes from clobbering local state** `est:2h`
  ## Description

Create the safe-refresh substrate before any reconnect or realtime wiring lands. This task directly advances **R005** by ensuring a trusted server week can be ingested without erasing pending local mutations or local-only shifts, and it protects the existing **R004** offline continuity from the current `server-sync` overwrite path.

Load the installed `debug-like-expert` skill before coding so replay semantics and clobber scenarios are proven against real evidence instead of guessed from the happy path.

## Steps

1. Add a pure replay/rebase helper in `apps/web/src/lib/offline/sync-engine.ts` (or an equivalent extracted module) that reapplies ordered queue entries onto a trusted server schedule and returns either a merged local-first week or a named failure reason.
2. Extend `apps/web/src/lib/offline/calendar-controller.ts` with the smallest public seam needed to inspect pending queue state and ingest a refreshed trusted schedule through the replay helper instead of relying on initialize order.
3. Guard `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts` so trusted online loads do not overwrite a `local-write` snapshot while pending or retryable queue entries still exist for the same scope.
4. Add unit coverage for create/edit/move/delete replay order, local-only shift preservation, malformed replay refusal, and the snapshot-write guard.

## Must-Haves

- [ ] A refreshed trusted week merges with pending queue entries deterministically instead of erasing them.
- [ ] Online route loads cannot replace a `local-write` snapshot for the same scope while queue state is non-empty.
- [ ] Replay failures surface named reasons instead of silently dropping local changes.
  - Files: `apps/web/src/lib/offline/sync-engine.ts`, `apps/web/src/lib/offline/calendar-controller.ts`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts`, `apps/web/tests/schedule/offline-queue.unit.test.ts`, `apps/web/tests/schedule/sync-engine.unit.test.ts`
  - Verify: `pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts`

- [x] **T02: Drain reconnect work through trusted route actions and surface sync diagnostics** `est:2h30m`
  ## Description

Close the reconnect half of **R005** without bypassing the S02 server-authority decisions. When connectivity returns, the browser must flush pending create/edit/move/delete work sequentially through the existing named route actions, preserve retryable failures, and leave the board/status surfaces clear about what happened.

Load the installed `debug-like-expert` skill before coding so timeout, malformed-response, and partial-drain cases are instrumented and verified rather than patched ad hoc.

## Steps

1. Extend `apps/web/src/lib/offline/sync-engine.ts` to drain queue entries sequentially when the browser comes back online, posting each mutation through the existing `/calendars/[calendarId]` route actions and normalizing responses with the same `ScheduleActionState` contract used by enhanced forms.
2. Add the controller hooks needed to finalize queued reconnect outcomes, keep failed entries retryable, and mark the board `server-sync` again only after the queue really drains to zero.
3. Wire the reconnect lifecycle into `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` and the board/status surfaces so sync phase, last attempt, and last error remain visible on the real calendar route.
4. Extend unit coverage to prove sequential drain order, stop-on-failure behavior, retryable preservation, and queue-to-zero success after reconnect.

## Must-Haves

- [ ] Reconnect drains pending queue entries through trusted route actions only.
- [ ] Timeout, forbidden, and malformed outcomes stay queued as retryable work with visible diagnostics.
- [ ] A successful reconnect ends with `0 pending / 0 retryable` and a server-synced board.
  - Files: `apps/web/src/lib/offline/sync-engine.ts`, `apps/web/src/lib/offline/calendar-controller.ts`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`, `apps/web/src/lib/schedule/board.ts`, `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`, `apps/web/tests/schedule/sync-engine.unit.test.ts`
  - Verify: `pnpm --dir apps/web exec vitest run tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts`

- [x] **T03: Subscribe to shared shift changes and refresh the visible week safely** `est:2h`
  ## Description

Deliver the live-update half of **R005** while keeping refreshes safe for pending local work. Online members should receive shared shift changes through Supabase Realtime change detection, then refresh the visible week from the trusted route/server path and replay any still-pending local mutations on top.

Load the installed `debug-like-expert` skill before coding so delete-event caveats, subscription teardown, and optional publication setup are handled deliberately instead of by trial and error.

## Steps

1. Use `apps/web/src/lib/supabase/client.ts` from `apps/web/src/lib/offline/sync-engine.ts` to open and close a calendar-scoped `postgres_changes` subscription on `public.shifts`, treating Realtime as change detection only and never as client-authoritative state.
2. On relevant insert/update/delete events, fetch a fresh trusted week for the current visible range, then pass that schedule through the replay helper so local pending work remains visible.
3. Add an explicit Supabase migration for `public.shifts` realtime publication if the local stack needs it, and keep delete handling conservative so missing `calendar_id` on RLS delete payloads cannot mis-scope the refresh.
4. Expose channel lifecycle and remote-refresh diagnostics on the calendar route and in the shared Playwright fixture surface.

## Must-Haves

- [ ] Two online members on the same calendar can receive trusted refreshes when one changes a shift.
- [ ] Remote refresh never erases still-pending local writes for the visible week.
- [ ] Realtime subscriptions clean up on route teardown and week/calendar changes.
  - Files: `apps/web/src/lib/offline/sync-engine.ts`, `apps/web/src/lib/supabase/client.ts`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`, `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`, `supabase/migrations/20260415_000003_schedule_realtime.sql`, `apps/web/tests/schedule/sync-engine.unit.test.ts`
  - Verify: `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec vitest run tests/schedule/sync-engine.unit.test.ts`

- [x] **T04: Prove reconnect reconciliation and multi-user live propagation in Playwright** `est:1h30m`
  ## Description

Turn the sync design into durable browser proof. This task retires the known S03 browser-proof fragility while adding explicit reconnect and multi-user live-update evidence for **R005**.

Load the installed `debug-like-expert` skill before changing browser proof so flow diagnostics, phase markers, and failure artifacts stay ahead of flake rather than being added after a red run.

## Steps

1. Extend `apps/web/tests/e2e/fixtures.ts` with a second seeded collaborator (use `dana@example.com` or `alice@example.com` from `supabase/seed.sql`), multi-page helpers, and richer sync/realtime diagnostics such as sync phase, channel state, queue summary, and last failure.
2. Expand `apps/web/tests/e2e/calendar-offline.spec.ts` to prove offline create/edit/move/delete drain after reconnect without losing route scope or local board continuity.
3. Add `apps/web/tests/e2e/calendar-sync.spec.ts` to prove one signed-in member sees another member's online shift change propagate live while both remain within the shared calendar scope.
4. Keep `apps/web/tests/e2e/calendar-shifts.spec.ts` green as the online scheduling regression surface and use the preview-backed Playwright config plus local Supabase reset as the slice-closing contract.

## Must-Haves

- [ ] Browser proof covers reconnect queue drain and multi-user live propagation.
- [ ] Flow diagnostics retain enough sync/realtime context to localize flake or trust-boundary failures.
- [ ] Existing online scheduling proof remains green after sync and realtime wiring.
  - Files: `apps/web/tests/e2e/fixtures.ts`, `apps/web/tests/e2e/calendar-offline.spec.ts`, `apps/web/tests/e2e/calendar-sync.spec.ts`, `apps/web/tests/e2e/calendar-shifts.spec.ts`, `apps/web/playwright.offline.config.ts`
  - Verify: `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts && pnpm --dir apps/web build && pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts`

## Files Likely Touched

- apps/web/src/lib/offline/sync-engine.ts
- apps/web/src/lib/offline/calendar-controller.ts
- apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts
- apps/web/tests/schedule/offline-queue.unit.test.ts
- apps/web/tests/schedule/sync-engine.unit.test.ts
- apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
- apps/web/src/lib/schedule/board.ts
- apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte
- apps/web/src/lib/supabase/client.ts
- supabase/migrations/20260415_000003_schedule_realtime.sql
- apps/web/tests/e2e/fixtures.ts
- apps/web/tests/e2e/calendar-offline.spec.ts
- apps/web/tests/e2e/calendar-sync.spec.ts
- apps/web/tests/e2e/calendar-shifts.spec.ts
- apps/web/playwright.offline.config.ts
