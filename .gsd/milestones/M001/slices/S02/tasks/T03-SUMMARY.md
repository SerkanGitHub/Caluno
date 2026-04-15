---
id: T03
parent: S02
milestone: M001
key_files:
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
  - apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte
  - apps/web/src/lib/components/calendar/ShiftDayColumn.svelte
  - apps/web/src/lib/components/calendar/ShiftCard.svelte
  - apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte
  - apps/web/src/lib/schedule/board.ts
  - apps/web/src/lib/server/schedule.ts
  - apps/web/src/lib/schedule/recurrence.ts
  - apps/web/src/app.css
  - apps/web/tests/schedule/board.unit.test.ts
key_decisions:
  - D013 — generate shift/series ids in trusted create actions and insert without `.select()` because local Supabase RLS rejects fresh-row representation reads even when the insert itself is allowed.
duration: 
verification_result: mixed
completed_at: 2026-04-15T06:47:18.539Z
blocker_discovered: false
---

# T03: Replaced the placeholder calendar shell with a custom week board and server-backed browser shift workflows.

**Replaced the placeholder calendar shell with a custom week board and server-backed browser shift workflows.**

## What Happened

Replaced `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` with a real week-view scheduling surface that keeps the existing denied-state branch intact while rendering trusted visible-week metadata, dense per-day stacks, empty-day states, and inline action diagnostics. Added a pure board-shaping layer in `apps/web/src/lib/schedule/board.ts` plus dedicated calendar components for the board shell, day columns, cards, and the create/edit/move form surface. The create flow now supports bounded recurrence from the browser and rerenders concrete occurrences in the visible week instead of leaving the board stale. During browser verification I found two non-obvious runtime issues and fixed them in-task: Vite SSR needed CommonJS-safe `rrule` imports, and local Supabase RLS allowed inserts but rejected `insert().select()` row representations on fresh schedule rows. I resolved the latter by generating deterministic shift/series ids inside the trusted server action and inserting without `.select()`, which preserved the protected action boundary while allowing the UI to report affected ids and success states. I also tightened the board layout for real desktop readability by widening day columns, enabling horizontal overflow for the week grid, simplifying card metadata, and making recurrence cadence controls explicitly clickable radios.

## Verification

`pnpm --dir apps/web check && pnpm --dir apps/web exec vitest run tests/schedule/board.unit.test.ts tests/routes/protected-routes.unit.test.ts tests/schedule/server-actions.unit.test.ts` passed cleanly. Browser verification against the local seeded stack confirmed the custom week board renders seeded same-day multi-shift density, surfaces deterministic shift ids and visible-week metadata, and successfully adds a bounded daily recurring series that rerenders three concrete `Coverage sweep` occurrences on Fri/Sat/Sun, increasing the visible-week total from 8 to 11. The unchanged denied-route surface remained covered by the protected-route unit suite during this task; I did not complete a fresh post-fix browser replay of edit/move/delete before timeout recovery.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web check && pnpm --dir apps/web exec vitest run tests/schedule/board.unit.test.ts tests/routes/protected-routes.unit.test.ts tests/schedule/server-actions.unit.test.ts` | 0 | ✅ pass | 3957ms |
| 2 | `Browser verification: signed in as the seeded Alpha member, opened the protected Alpha shared calendar, confirmed the custom week board rendered seeded same-day multi-shift density and deterministic ids, submitted a bounded daily recurring `Coverage sweep` create from the browser, and reloaded the route to confirm three concrete Fri/Sat/Sun occurrences plus the visible-week total increase from 8 to 11.` | -1 | unknown (coerced from string) | 0ms |

## Deviations

Switched create writes from `insert().select()` to server-generated ids plus plain inserts after reproducing a local Supabase RLS edge case where the insert succeeded but the immediate representation read failed with `42501`. Also adjusted the board layout to use wider horizontally scrollable day columns because a seven-column fit at normal desktop width made cards and controls too cramped for reliable browser use.

## Known Issues

A full browser replay of edit/move/delete was not completed before timeout recovery. Those flows are still rendered in the UI and covered by the protected server-action/unit checks, but the broader slice-level browser proof should replay them explicitly in the follow-up Playwright/UAT work.

## Files Created/Modified

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte`
- `apps/web/src/lib/components/calendar/ShiftCard.svelte`
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`
- `apps/web/src/lib/schedule/board.ts`
- `apps/web/src/lib/server/schedule.ts`
- `apps/web/src/lib/schedule/recurrence.ts`
- `apps/web/src/app.css`
- `apps/web/tests/schedule/board.unit.test.ts`
