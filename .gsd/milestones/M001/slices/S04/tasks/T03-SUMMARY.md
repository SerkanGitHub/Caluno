---
id: T03
parent: S04
milestone: M001
key_files:
  - apps/web/src/lib/offline/sync-engine.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
  - apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte
  - apps/web/tests/schedule/sync-engine.unit.test.ts
  - apps/web/tests/e2e/fixtures.ts
  - supabase/migrations/20260416_000001_schedule_realtime.sql
  - .gsd/KNOWLEDGE.md
  - .gsd/DECISIONS.md
key_decisions:
  - D025 — Treat shared shift Realtime as change detection that invalidates the trusted calendar route and then re-ingests the refreshed week through the existing replay helper, instead of applying row payloads directly to the board.
  - Keep delete-event handling conservative by refusing refreshes when `calendar_id` is missing locally, and rely on `REPLICA IDENTITY FULL` plus realtime publication to provide scoped delete payloads in local Supabase.
duration: 
verification_result: passed
completed_at: 2026-04-15T16:37:53.092Z
blocker_discovered: false
---

# T03: Added shared-shift realtime refresh detection with trusted-week replay and visible channel diagnostics.

**Added shared-shift realtime refresh detection with trusted-week replay and visible channel diagnostics.**

## What Happened

I extended `apps/web/src/lib/offline/sync-engine.ts` with a browser-side realtime layer that opens a calendar-scoped `postgres_changes` subscription through the existing Supabase browser client, treats Realtime strictly as change detection, ignores malformed or mis-scoped payloads, coalesces bursty collaborator edits, and retries timed-out or failed channels without mutating the board directly. I wired the calendar route in `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` to use that subscription, invalidate the trusted route on shared shift signals, and then ingest the refreshed trusted week back through the existing replay helper so pending local queue work stays visible instead of being overwritten. I surfaced the new channel lifecycle and remote refresh state on both the route rail and `CalendarWeekBoard.svelte`, updated the shared Playwright fixture surface to capture those diagnostics, and added focused sync-engine tests for delete payload scope refusal, update overlap handling, refresh coalescing, retry/restart behavior, and teardown cleanup. I also added a Supabase migration to publish `public.shifts` to Realtime and set `REPLICA IDENTITY FULL` so delete events can stay conservative without losing local dev visibility.

## Verification

Passed `pnpm --dir apps/web check`, the slice’s broader unit surface for protected routes and schedule/offline sync modules, and the task contract `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec vitest run tests/schedule/sync-engine.unit.test.ts`. The verification proves realtime payload filtering, burst coalescing, subscription retry/teardown, trusted refresh replay, and the local Supabase migration ordering/publication path. I also attempted a live browser sanity pass against `pnpm --dir apps/web dev --host 127.0.0.1`, but the local dev server failed before route render because `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` were not configured in this auto-mode environment.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web check` | 0 | ✅ pass | 2967ms |
| 2 | `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/server-actions.unit.test.ts tests/schedule/offline-queue.unit.test.ts tests/schedule/sync-engine.unit.test.ts` | 0 | ✅ pass | 1444ms |
| 3 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec vitest run tests/schedule/sync-engine.unit.test.ts` | 0 | ✅ pass | 26994ms |

## Deviations

The planned migration filename `supabase/migrations/20260415_000003_schedule_realtime.sql` had to be adapted to `supabase/migrations/20260416_000001_schedule_realtime.sql` because local Supabase keys migrations by the leading numeric version; keeping the `20260415_...` prefix caused duplicate-version collisions and an invalid execution order during `supabase db reset --local`.

## Known Issues

Manual browser proof against the Vite dev server is still blocked in this environment until `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` are configured for the web app; the shipped code paths were verified through type/unit/DB-reset checks instead.

## Files Created/Modified

- `apps/web/src/lib/offline/sync-engine.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/tests/schedule/sync-engine.unit.test.ts`
- `apps/web/tests/e2e/fixtures.ts`
- `supabase/migrations/20260416_000001_schedule_realtime.sql`
- `.gsd/KNOWLEDGE.md`
- `.gsd/DECISIONS.md`
