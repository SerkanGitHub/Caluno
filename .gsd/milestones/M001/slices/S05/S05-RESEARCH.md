# S05 — Research

**Date:** 2026-04-16

## Summary

S05 owns **R006** (baseline conflict visibility) and directly supports milestone-level browser proof across the still-active **R005** sync/realtime substrate. The good news is that the core schedule model already supports this slice without new schema work: `supabase/seed.sql` already contains both a **true overlap fixture** (`Kitchen prep` 12:00–14:00 and `Supplier call` 13:00–15:00 on 2026-04-16) and a **non-overlap same-day boundary case** (`Alpha opening sweep` ending exactly when `Morning intake` starts on 2026-04-15). That gives S05 deterministic evidence for the two rules the conflict detector must get right: **warn on real overlap** and **do not warn on touching-but-non-overlapping shifts**.

What is missing is not data; it is the **derived warning layer**. `apps/web/src/lib/server/schedule.ts` and `apps/web/src/lib/schedule/route-contract.ts` expose only raw week/day/shift data. `apps/web/src/lib/schedule/board.ts` builds the render model, but today it only attaches per-shift `statusBadges` from `controllerState.shiftDiagnostics` (local-only, pending sync, retry needed). There is **no pure conflict helper, no conflict summary in the board model, no route/card/day warning surface, and no browser proof that overlap warnings appear**.

The safest path is to keep S05 **purely derived from `effectiveSchedule`** instead of adding persisted conflict state. The calendar page already chooses `effectiveSchedule` from either the trusted server week or the local-first controller state, so a conflict overlay computed from that schedule automatically follows:
- trusted online loads,
- offline cached weeks,
- local offline edits before reconnect,
- reconnect replay results,
- realtime-triggered refreshes.

That means S05 can add real user-visible warnings **without changing the schema, repository format, queue format, or trusted route contract**.

Two constraints matter:
1. **Conflicts must be warnings, not write blockers.** The existing schema intentionally allows overlap; there is no exclusion constraint, and S02 explicitly seeded overlapping rows for later proof. S05 should surface conflicts, not reject them.
2. **M001 has no assignee/owner field on shifts.** `public.shifts` stores only calendar/time/title/series metadata, so “double-booking” in this milestone can only mean **temporal overlap inside the shared calendar/week board**, not person-specific workload conflicts.

The biggest delivery risk is not the overlap algorithm; it is the **milestone assembly proof**. S04 already recorded preview-backed browser instability where `calendar-local-state` can be missing, the route can degrade to `repository-unavailable`, and realtime can remain `closed` instead of `ready`. Use the installed `debug-like-expert` rules here: **VERIFY, DON’T ASSUME** and **COMPLETE READS**. Treat retained diagnostics and existing failing preview evidence as the source of truth before changing waits or browser assertions.

For the UI, the installed `frontend-design` skill is relevant but should be applied with restraint. Its useful rule here is to **choose a clear conceptual direction and execute it with precision**, then **match implementation complexity to the vision**. S05 should not add a noisy alert wall; it should add calm, precise warning markers that fit the existing editorial dark board.

## Recommendation

Implement S05 as a **pure conflict-overlay slice** on top of the existing week board, then add milestone-assembly proof on top of that.

1. **Add a pure schedule conflict module first**
   - Introduce something like `apps/web/src/lib/schedule/conflicts.ts` that accepts either `CalendarScheduleView` or a flat `CalendarShift[]` plus visible-week/day grouping.
   - Detect only baseline temporal conflicts that the current product model can prove safely:
     - overlapping shifts within the same rendered day/visible week,
     - same shift participating in one or more overlaps,
     - day-level and board-level counts/summaries.
   - Treat `end === next.start` as **non-conflicting**.

2. **Keep conflict state derived, not persisted**
   - Do **not** write conflict warnings into the offline repository or queue payloads.
   - Do **not** add conflict metadata to Supabase rows just to render pills.
   - Compute warnings from `effectiveSchedule` during board-model construction so they remain correct after replay/reconnect/realtime.

3. **Reuse the existing board/status-badge pipeline**
   - `ShiftCard.svelte` already renders `shift.statusBadges`.
   - `ShiftDayColumn.svelte` already renders day pills and is the natural home for a day-level warning count.
   - `CalendarWeekBoard.svelte` already exposes board-level status cards and pills, so it can add a compact conflict summary without inventing a parallel UI system.
   - Keep sync/realtime badges distinct from conflict badges; don’t overload `lastFailure` or retry surfaces with semantic schedule warnings.

4. **Do not turn conflict visibility into server-side rejection**
   - Avoid exclusion constraints or write-time refusal logic for overlaps in M001.
   - Existing S02/S03/S04 flows rely on local-first edits, replay, and deterministic reconciliation. Blocking overlap writes now would change the product contract and invalidate the seeded fixtures this slice is supposed to inspect.

5. **Treat milestone assembly proof as a separate task after conflict UI lands**
   - First prove the pure overlap engine and seeded overlap UI.
   - Then extend browser proof to show the warning survives the real substrate:
     - online trusted load,
     - offline local overlap + reload continuity,
     - reconnect drain preserving/confirming the warning,
     - realtime collaborator propagation of a newly created overlap.

## Implementation Landscape

### Key Files

- `supabase/seed.sql` — Already seeds the critical deterministic fixtures for S05:
  - **real overlap:** `Kitchen prep` and `Supplier call` on 2026-04-16
  - **same-day but not overlapping:** `Alpha opening sweep` ending at 09:00 and `Morning intake` starting at 09:00 on 2026-04-15
  No new schema is required just to start S05.

- `apps/web/src/lib/server/schedule.ts` — Authoritative trusted schedule loader and action layer. Important constraint: schedule rows are grouped into days by `shift.startAt.slice(0, 10)`, so the existing board is fundamentally **start-day anchored**. S05 should stay aligned with that visible-board model instead of inventing new overnight rendering semantics in this slice.

- `apps/web/src/lib/schedule/route-contract.ts` — Client-safe shared schedule types for offline fallback and route resolution. Also currently conflict-agnostic.

- `apps/web/src/lib/schedule/board.ts` — **Best implementation seam.** It already:
  - sorts shifts deterministically,
  - builds `ShiftCardModel` and `ShiftDayColumnModel`,
  - attaches per-shift `statusBadges`,
  - exposes board-level `statusBadges`.
  This is the right place to merge **derived conflict diagnostics** with the existing local/sync diagnostics and to add day/board summary fields.

- `apps/web/src/lib/offline/calendar-controller.ts` — Existing source of local queue diagnostics (`Local only`, `Pending sync`, `Retry needed`). Important guidance: keep this focused on local-first/sync state. Conflict detection should stay schedule-derived unless a later need proves otherwise.

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — Orchestration point that derives `effectiveSchedule` from either trusted server data or controller state. This is why S05 can stay derived-only: conflict computation can operate on the same schedule used for rendering, regardless of origin.

- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte` — Natural place for a compact board-level conflict summary/status card and new test ids for browser proof.

- `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte` — Natural place for per-day warning counts like “2 conflicts” or a warning pill on busy/conflicted days.

- `apps/web/src/lib/components/calendar/ShiftCard.svelte` — Already renders `statusBadges`; likely needs only styling/text additions once the board model supplies conflict badges.

- `apps/web/src/app.css` — Existing warning/danger tones and pill system already fit this slice. Reuse the current accent/warning/danger vocabulary instead of inventing a new alert design language.

- `apps/web/tests/schedule/board.unit.test.ts` — Existing pure board-model test seam. Best current home for seeded overlap/non-overlap expectations unless the planner prefers a dedicated `conflicts.unit.test.ts`.

- `apps/web/tests/schedule/offline-queue.unit.test.ts` and `apps/web/tests/schedule/sync-engine.unit.test.ts` — Useful follow-on test surfaces when proving that conflict warnings remain correct after local edits, replay, and reconnect.

- `apps/web/tests/e2e/calendar-shifts.spec.ts` — Best first browser proof surface for seeded overlap visibility and non-overlap boundary assertions in trusted-online mode.

- `apps/web/tests/e2e/calendar-offline.spec.ts` — Best assembled proof surface for “create/edit/move overlap offline, reload, reconnect, and keep conflict visibility.”

- `apps/web/tests/e2e/calendar-sync.spec.ts` — Best assembled proof surface for live collaborator propagation of a conflict-creating change.

- `apps/web/tests/e2e/fixtures.ts` — Existing browser observability backbone. Extend it with conflict summary readers / helpers instead of inventing ad hoc DOM parsing.

- `apps/web/playwright.config.ts` and `apps/web/playwright.offline.config.ts` — Keep both proof surfaces:
  - default dev-backed config for trusted-online seeded/realtime checks,
  - preview-backed offline config for service-worker/offline/reconnect assembly proof.

### Natural Seams

1. **Pure conflict engine**
   - New pure helper module.
   - Zero Svelte dependency.
   - Easy unit-test surface.
   - Retires algorithmic ambiguity first.

2. **Board model integration**
   - `board.ts` merges conflict diagnostics with existing queue/sync diagnostics.
   - Adds day-level and board-level summary fields.
   - Keeps components mostly dumb.

3. **Calm UI surfacing**
   - `CalendarWeekBoard.svelte`, `ShiftDayColumn.svelte`, `ShiftCard.svelte`, and `app.css`.
   - Only presentation work once the board model is correct.

4. **Assembly proof / flake retirement**
   - `fixtures.ts` + `calendar-shifts.spec.ts` + `calendar-offline.spec.ts` + `calendar-sync.spec.ts`.
   - Use the existing diagnostics/test-id style so the milestone proof remains inspectable.

### Build Order

1. **Pure conflict engine first**
   - Add deterministic overlap detection with explicit coverage for:
     - real overlap,
     - touching-but-not-overlapping boundary,
     - multiple conflicts on one day,
     - local-only shifts participating in overlaps.

2. **Board-model integration second**
   - Merge conflict badges/summaries into `buildCalendarWeekBoard()`.
   - Keep the source schedule as the only authority.

3. **UI surfacing third**
   - Add per-card conflict pills, per-day summary, and a compact board-level summary.
   - Add stable `data-testid` hooks for proof.

4. **Browser proof last**
   - First: seeded trusted-online proof.
   - Then: offline/reconnect proof.
   - Then: collaborator realtime proof.
   - Only after those are stable should the planner call the milestone assembly proof “real.”

### Verification Approach

Core verification:
- `pnpm --dir apps/web check`
- `pnpm --dir apps/web exec vitest run tests/schedule/board.unit.test.ts tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts`
- If a dedicated unit file is added: `pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts`
- `npx --yes supabase db reset --local --yes`

Browser proof:
- Trusted-online seeded conflict proof:
  - `pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`
- Preview-backed offline/reconnect assembly proof:
  - `pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts`
- Online collaborator/realtime assembly proof:
  - `pnpm --dir apps/web exec playwright test tests/e2e/calendar-sync.spec.ts`

Observable success conditions for S05:
- The seeded Thursday overlap (`Kitchen prep` + `Supplier call`) renders a visible warning.
- The seeded Wednesday boundary case does **not** render a conflict warning when one shift ends exactly as another begins.
- Creating or moving an overlapping shift offline shows a warning immediately, survives reload, and still shows after reconnect drains the queue.
- A collaborator creating an overlapping shift online causes the other session to refresh and show the conflict warning without manual reload.
- Denied/offline-denied route behavior remains unchanged; conflict work must not widen route authority.

## Don’t Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Per-shift warning display | `ShiftCard.svelte` + existing `statusBadges` pills | The component already knows how to render compact badges without adding a second card-warning system. |
| Day/board state derivation | `buildCalendarWeekBoard()` in `apps/web/src/lib/schedule/board.ts` | Centralizes rendering logic for trusted-online and cached-local schedules so conflict warnings stay consistent across all modes. |
| Offline/reconnect/realtime observability | Existing route/board diagnostics + `tests/e2e/fixtures.ts` helpers | S04 already established the debugging surface; S05 should extend it rather than inventing fragile new browser parsing. |
| Local-first state source | `effectiveSchedule` in `+page.svelte` | It already abstracts over trusted server and local controller state. Conflict visibility should follow this instead of introducing another store. |

## Constraints

- `R006` is the owner requirement. S05 must add **visibility**, not a second conflict-resolution system.
- `R005` remains active and must be re-proven in the assembled browser flow, because conflict visibility is not credible if reconnect/realtime paths hide or lose warnings.
- The board is currently **start-day anchored**. Cross-midnight conflict semantics are not a good first target for this slice unless the planner explicitly broadens scope.
- There is no assignee/person dimension in the schedule schema, so S05’s “double-booking” proof must stay calendar/time based.
- Existing S04 preview-backed proof remains partially unstable; S05 should budget explicit proof-hardening time instead of assuming green offline/realtime automation.

## Common Pitfalls

- **Persisting conflict state** — warnings derived from stale cached metadata will drift after replay/realtime. Recompute from schedule shape every render.
- **Treating touching ranges as overlap** — Wednesday’s seeded `08:30–09:00` + `09:00–11:00` case should stay clean.
- **Blocking overlap writes** — the milestone wants visible conflicts, and the current substrate intentionally permits overlapping rows.
- **Hiding warnings only in a board summary** — users need to see which shift(s) conflict, not just that “something is wrong this week.”
- **Overloading sync failure UI with schedule conflicts** — S04 already uses `lastFailure`, retryable queue state, and realtime diagnostics for transport/reconciliation problems. Keep semantic schedule warnings separate.
- **Assuming the preview-backed proof is healthy** — the current evidence already shows repository/realtime readiness failures. Use the retained diagnostics and helper waits before rewriting assertions.

## Open Risks

- If the planner tries to cover person-specific double-booking, the current schema cannot prove it. That would be milestone-scope expansion, not S05 completion.
- If the planner tries to solve “conflicting edits” as full semantic merge policy, it will duplicate S04 sync responsibilities and exceed baseline conflict visibility.
- If the planner tries to broaden the slice into overnight/multi-day rendering, it will collide with the current start-day board model and likely create more risk than value in M001.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| UI surfacing for calm conflict warnings | `frontend-design` | installed |
| Investigation of preview-backed browser proof debt | `debug-like-expert` | installed |
| SvelteKit | `spences10/svelte-skills-kit@sveltekit-structure` | available via `npx skills add spences10/svelte-skills-kit@sveltekit-structure` |
| Supabase | `supabase/agent-skills@supabase-postgres-best-practices` | available via `npx skills add supabase/agent-skills@supabase-postgres-best-practices` |
| Playwright | `currents-dev/playwright-best-practices-skill@playwright-best-practices` | available via `npx skills add currents-dev/playwright-best-practices-skill@playwright-best-practices` |