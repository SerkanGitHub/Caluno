# S04 — Research

**Date:** 2026-04-15

## Summary

S04 owns **R005** (deterministic reconnect sync plus live shared updates) and directly supports the already-landed offline/auth boundaries from **R001**, **R004**, **R002**, and **R012**. The codebase already has the hard parts for local-first staging: a persisted per-week snapshot, a deterministic mutation queue sorted by `createdAt`, and queue payloads rich enough to replay local edits (`createdShifts`, `previousShift`, `nextShift`, `deletedShift`). What is missing is the actual **sync engine**: nothing currently flushes queued mutations when connectivity returns, nothing subscribes to Supabase realtime updates, and nothing can safely ingest a fresh server snapshot while local pending work still exists.

The biggest implementation trap is not realtime itself; it is **state clobbering during refresh**. `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts` currently writes a `server-sync` snapshot on every online load, while `createCalendarController().initialize()` loads the stored snapshot **before** the queue and does not replay queued mutations onto a refreshed server schedule. That means a naive `invalidateAll()` or realtime-triggered reload can overwrite the browser-local `local-write` snapshot and make pending local changes disappear from the board even though the queue still exists. Build the pure rebase/replay path first, then wire reconnect flushing and realtime on top of it.

For browser-proof hardening, the installed `debug-like-expert` skill is directly relevant: follow its **“VERIFY, DON'T ASSUME”** and **“COMPLETE READS”** rules. S03 already ended with explicit browser instability around the local-first recurring-create path; S04 should treat the retained flow diagnostics as evidence, not guesswork, before changing the sync surface.

## Recommendation

Implement S04 as a **controller-centered sync layer** that keeps the existing trust boundary intact:

1. **Do not write directly to Supabase from the browser for queued mutations.** Reuse the trusted SvelteKit route actions on `/calendars/[calendarId]` for create/edit/move/delete confirmation, because S02 decisions D012/D013 intentionally keep mutation authority on the trusted route/server contract.
2. **Add a pure “replay queued mutations onto a server schedule” path before any realtime invalidation.** The queue payloads already contain enough information to deterministically reapply pending local work in order.
3. **Use Supabase Realtime only for change detection, not as the source of truth.** Subscribe in the browser with the existing singleton client from `src/lib/supabase/client.ts`, then fetch/reload the current visible week (or merge a fresh schedule) from the trusted route/server contract. Avoid inventing a custom websocket/event bus.
4. **Scope live updates to concrete `shifts` rows, not `shift_series`.** The week board renders concrete shift occurrences; subscribing to `public.shifts` is sufficient for visible board updates in M001.
5. **Keep conflict handling conservative.** S04 should deterministically reconcile queued writes and live updates, but should not hand-roll semantic conflict policy that belongs to **R006 / S05**. If a reconnect result cannot safely reconcile, keep the queue entry retryable and surface explicit diagnostics instead of guessing.

Concretely, the clean seam is a new browser module (for example `apps/web/src/lib/offline/sync-engine.ts`) that:
- watches online/offline transitions,
- drains the existing queue sequentially through the current route actions,
- subscribes/unsubscribes to Supabase realtime channels,
- requests a fresh trusted schedule when online changes arrive,
- rebases any still-pending local mutations onto that refreshed schedule,
- and persists the merged snapshot back through the repository.

## Implementation Landscape

### Key Files

- `apps/web/src/lib/offline/calendar-controller.ts` — Core local-first state machine. It already stages local create/edit/move/delete mutations, persists snapshots, and acknowledges/retries queue entries. It needs the new S04 seam: **ingest a fresh server schedule and replay queued mutations**, plus likely a public method to reconcile/replace schedule state outside the enhanced-form flow.
- `apps/web/src/lib/offline/mutation-queue.ts` — Deterministic persisted queue. Entries are sorted by `createdAt`/`id` and already store enough replay data for rebase. This should remain the source of replay order during reconnect.
- `apps/web/src/lib/offline/repository.ts` — Stores per-`userId/calendarId/weekStart` snapshots plus local mutations. Good existing seam for persisting post-rebase snapshots. Likely only needs light changes unless S04 adds sync metadata.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — Current browser orchestration point. It creates the repository/controller, hooks online/offline listeners, and parses enhanced-form action results. This is where the sync engine lifecycle should start/stop.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts` — **Current clobber point.** Online loads always cache the server week as `origin: 'server-sync'`. With pending queue entries, that can overwrite a `local-write` snapshot before replay. This file must be guarded or changed to merge/skip writes when local pending state exists.
- `apps/web/src/lib/supabase/client.ts` — Already exposes `getSupabaseBrowserClient()` singleton. This is the right browser-side source for Supabase realtime channels so auth/session stay aligned with the signed-in browser.
- `apps/web/src/lib/server/schedule.ts` — Trusted week load plus create/edit/move/delete action contract. Background reconnect sync should reuse these server contracts instead of bypassing them.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` — Named route actions already return typed `ScheduleActionState`. If S04 adds background action posting, keep response parsing consistent with this contract.
- `supabase/migrations/20260415_000002_schedule_shifts.sql` — Schedule schema/RLS source. There is **no explicit realtime publication setup** in the repo today; budget for a migration if local Supabase realtime does not emit `shifts` changes automatically.
- `apps/web/tests/schedule/offline-queue.unit.test.ts` — Best existing home for pure sync/rebase tests because it already exercises controller + queue persistence together.
- `apps/web/tests/e2e/calendar-offline.spec.ts` — Existing offline continuity proof. Natural place to extend with reconnect flush unless the planner prefers a dedicated sync spec.
- `apps/web/tests/e2e/fixtures.ts` — Browser-proof substrate. Right now it only exposes Bob/Erin and single-page diagnostics. S04 needs at least a second seeded collaborator (Alice or Dana) plus multi-page diagnostics.
- `supabase/seed.sql` — Already seeds multiple useful collaborators: **Alice owner**, **Bob member**, **Dana multi-group member**. Realtime proof does not need new auth seeds if one of these is exposed in fixtures.

### Build Order

1. **Pure replay/rebase first**
   - Add a tested helper that takes a trusted server schedule plus ordered queue entries and rebuilds the local-first board deterministically.
   - This retires the biggest risk: invalidation/realtime refresh currently can erase pending local state.

2. **Guard online snapshot writes**
   - Fix `+page.ts` so online refresh does not blindly overwrite `local-write` snapshots when queue entries still exist.
   - This must land before any realtime-triggered reload or reconnect fetch.

3. **Reconnect queue flush through trusted route actions**
   - Add browser sync orchestration that, when online, drains queue entries one by one through the existing named actions and feeds the results back into the controller.
   - Reuse controller retry/ack behavior instead of inventing a second queue protocol.

4. **Live updates via Supabase realtime**
   - Subscribe to `public.shifts` changes with the browser Supabase client.
   - On online changes, refresh the visible week from the trusted route/server path and rebase any remaining queue entries onto it.
   - Keep channel cleanup explicit (`removeChannel`) on route teardown.

5. **Browser proof last**
   - Once sync/rebase works locally, extend Playwright for multi-user live propagation and offline-reconnect confirmation.
   - Do not start with browser flake work until the state machine is deterministic under unit tests.

### Verification Approach

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/routes/protected-routes.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/offline-store.unit.test.ts tests/schedule/offline-queue.unit.test.ts`
- `npx --yes supabase db reset --local --yes`
- Realtime/browser proof should stay **explicit** because `apps/web/package.json` scripts currently only target `auth-groups-access.spec.ts`:
  - Preview-backed reconnect proof: `pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts`
  - Add/extend a realtime sync spec and run it explicitly as well (same preview config if it includes offline→online transitions, default config only if the planner intentionally isolates a pure online live-update proof)

Observable success conditions for S04:
- A previously queued offline create/edit/move/delete drains to `0 pending / 0 retryable` after reconnect.
- The route stays inside the trusted calendar scope while reconnecting; no direct client-authoritative writes appear.
- A second signed-in member sees the first member’s change appear live while both are online.
- Remote refresh does **not** erase still-pending local writes.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Browser live update transport | Supabase Realtime `postgres_changes` channels | The project already uses Supabase auth/data; a custom websocket layer would duplicate infra and weaken the current trust model. |
| Route refresh after live changes | SvelteKit `invalidateAll()` / load invalidation | Use framework revalidation rather than inventing a client event bus. Pair it with queue rebase so refreshes stay safe. |
| Server-authoritative mutation confirmation | Existing named SvelteKit route actions on `/calendars/[calendarId]` | They already enforce the trusted route scope and return typed `ScheduleActionState` payloads. |

## Constraints

- `R005` is the slice owner; S04 must keep the S01/S02/S03 security boundary intact while adding sync/realtime.
- Offline state is currently scoped to `userId + calendarId + weekStart`; S04 should stay week-scoped rather than inventing cross-range sync in M001.
- The board renders concrete `public.shifts` rows, so live-update proof should target `shifts` first.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts` currently caches server snapshots on every online load; this behavior is unsafe until queue replay exists.
- `apps/web/package.json` does not expose scripts for the offline/realtime proof surfaces; verification should keep using explicit Playwright commands/configs.

## Common Pitfalls

- **Blind invalidation clobbers local pending state** — `+page.ts` writes `origin: 'server-sync'` before the controller reloads queue state, and `calendar-controller.initialize()` does not replay queued mutations onto the refreshed schedule. Fix this before wiring realtime.
- **Delete-event filtering can be misleading on RLS tables** — Supabase docs note that delete payloads on RLS tables only reliably include primary keys from `old`. Do not depend on `calendar_id` being present for delete filters; prefer broad change detection plus current-board relevance checks or a safe route refresh.
- **Do not bypass route actions during reconnect** — direct browser writes to Supabase would sidestep the trusted route contract that S02 established.
- **Do not guess through S03 browser flake** — use the retained `flow diagnostics` surface from `tests/e2e/fixtures.ts` and the `debug-like-expert` rule set before changing proof assertions.

## Open Risks

- The repo currently has no explicit `supabase_realtime` publication migration for `public.shifts`; local realtime may need schema setup before browser proof can pass.
- Queue replay is deterministic, but semantic collaborator conflicts are not yet a product-level policy. If a reconnect result cannot be safely rebased, S04 should surface retry/failure state and leave richer conflict UX to S05/R006.
- The existing local-first recurring-create E2E path was already unstable at S03 close-out; S04 should expect proof hardening work, not only feature wiring.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Debugging flaky browser/sync proof | `debug-like-expert` | installed |
| Supabase | `supabase/agent-skills@supabase-postgres-best-practices` | available via `npx skills add supabase/agent-skills@supabase-postgres-best-practices` |
| SvelteKit | `spences10/svelte-skills-kit@sveltekit-structure` | available via `npx skills add spences10/svelte-skills-kit@sveltekit-structure` |
| Playwright | `currents-dev/playwright-best-practices-skill@playwright-best-practices` | available via `npx skills add currents-dev/playwright-best-practices-skill@playwright-best-practices` |

## Sources

- Supabase Realtime docs confirmed the intended browser subscription shape (`channel().on('postgres_changes', ...).subscribe()`) and explicit cleanup with `removeChannel`. (source: Supabase docs via Context7 `/supabase/supabase`)
- Supabase Realtime docs also confirmed the delete/old-record caveat for RLS tables: delete events only reliably expose primary keys from `old`, so `calendar_id`-filtered delete subscriptions are brittle. (source: Supabase docs via Context7 `/supabase/supabase`)
- SvelteKit docs confirmed `invalidateAll()` / manual invalidation as the right framework primitive for rerunning route loads after browser-side change detection. (source: SvelteKit docs via Context7 `/sveltejs/kit`)
