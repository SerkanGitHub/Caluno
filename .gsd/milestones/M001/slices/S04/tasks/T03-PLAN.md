---
estimated_steps: 4
estimated_files: 6
skills_used:
  - debug-like-expert
---

# T03: Subscribe to shared shift changes and refresh the visible week safely

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

## Inputs

- `apps/web/src/lib/offline/sync-engine.ts`
- `apps/web/src/lib/supabase/client.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/tests/schedule/sync-engine.unit.test.ts`
- `supabase/migrations/20260415_000002_schedule_shifts.sql`

## Expected Output

- `apps/web/src/lib/offline/sync-engine.ts`
- `apps/web/src/lib/supabase/client.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `supabase/migrations/20260415_000003_schedule_realtime.sql`
- `apps/web/tests/schedule/sync-engine.unit.test.ts`

## Verification

`npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec vitest run tests/schedule/sync-engine.unit.test.ts`

## Observability Impact

- Add realtime subscription status and last remote-refresh diagnostics to the visible calendar route and browser proof surfaces.
- Keep teardown/reconnect behavior inspectable so a future agent can tell whether a stale board came from a dead channel, a failed trusted refresh, or an unreplayable local queue.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Supabase Realtime channel on `public.shifts` | Surface channel failure, keep polling/refresh manual until reconnect or resubscribe succeeds, and do not imply live propagation is active. | Recreate the subscription and keep the current board state intact. | Ignore the event as untrusted change detection and require a trusted refresh instead. |
| Trusted refresh after a realtime signal | Keep the current board and pending queue visible, then retry later. | Leave the board in its current state and surface a last-remote-refresh failure. | Reject the payload and avoid applying guessed remote changes. |

## Load Profile

- **Shared resources**: Realtime channels, trusted week refresh requests, and replay of pending local mutations after each remote change.
- **Per-operation cost**: one channel event may trigger one trusted week refresh plus one replay pass over pending queue entries.
- **10x breakpoint**: bursty collaborator edits can cause refresh storms, so the engine should coalesce repeated events and scope refreshes to the active calendar/week.

## Negative Tests

- **Malformed inputs**: delete payloads missing `calendar_id`, unexpected channel event shapes, and stale visible-week metadata.
- **Error paths**: subscription failure, publication missing locally, trusted refresh failure after a valid event, and replay failure on top of a remote refresh.
- **Boundary conditions**: rapid successive collaborator edits, route teardown during an active subscription, calendar/week navigation while subscribed, and local pending writes still present during a remote refresh.
