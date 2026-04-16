---
id: T01
parent: S05
milestone: M001
key_files:
  - apps/web/src/lib/schedule/conflicts.ts
  - apps/web/src/lib/schedule/board.ts
  - apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte
  - apps/web/src/lib/components/calendar/ShiftDayColumn.svelte
  - apps/web/src/lib/components/calendar/ShiftCard.svelte
  - apps/web/src/app.css
  - apps/web/tests/schedule/conflicts.unit.test.ts
  - apps/web/tests/schedule/board.unit.test.ts
  - .gsd/KNOWLEDGE.md
key_decisions:
  - Kept overlap conflicts as a pure derived visible-week warning layer with dedicated board/day/shift surfaces instead of merging them into local/sync/realtime transport badges (recorded as D027).
duration: 
verification_result: mixed
completed_at: 2026-04-16T10:29:09.674Z
blocker_discovered: false
---

# T01: Added derived visible-week conflict warnings to the calendar board with separate board/day/shift diagnostics and unit coverage.

**Added derived visible-week conflict warnings to the calendar board with separate board/day/shift diagnostics and unit coverage.**

## What Happened

Implemented `apps/web/src/lib/schedule/conflicts.ts` as a pure visible-week overlap helper that works day-by-day, excludes touch boundaries where `endAt === next.startAt`, fails closed on malformed rows and duplicate ids, and returns board/day/shift summaries without introducing transport state. Extended `buildCalendarWeekBoard()` to merge those summaries into the existing board model while keeping queue, sync, and realtime diagnostics on their original channels. Updated `CalendarWeekBoard.svelte`, `ShiftDayColumn.svelte`, `ShiftCard.svelte`, and `app.css` to render calm warning pills plus dedicated `data-testid` hooks for board/day/shift conflict surfaces, separate from `Local only`, `Pending sync`, retry, and realtime badges. Added deterministic unit coverage in `tests/schedule/conflicts.unit.test.ts` and refreshed `tests/schedule/board.unit.test.ts` to prove the seeded Thursday overlap warns at board/day/card level, the seeded Wednesday 08:30–09:00 / 09:00–11:00 boundary stays clean, malformed rows fail closed, and conflict rendering coexists with existing local-sync badges. Recorded the separation-of-concerns decision in D027 and added a project knowledge note about the local browser env requirement discovered during verification.

## Verification

Verified the conflict layer with the task’s required Vitest suite and an additional `svelte-check` pass. `pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts tests/schedule/board.unit.test.ts` passed and covered true overlaps, clean touch boundaries, multi-overlap aggregation, malformed inputs, and coexistence with local/sync badge rendering. `pnpm --dir apps/web exec svelte-check` passed with 0 errors and 0 warnings, confirming the updated Svelte surfaces and board types compile cleanly. I also attempted real local browser proof by starting `pnpm --dir apps/web dev`, navigating to `http://localhost:5174/`, and confirming via curl/browser diagnostics that the route currently fails with HTTP 500 because `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` are missing in this environment; that blocked live UI exercise, but it also verified that the remaining browser issue is environmental rather than caused by the conflict feature code.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts tests/schedule/board.unit.test.ts` | 0 | ✅ pass | 1516ms |
| 2 | `pnpm --dir apps/web exec svelte-check` | 0 | ✅ pass | 2725ms |
| 3 | `curl -s -o /tmp/caluno-root-body.txt -w "%{http_code}" http://localhost:5174/` | 1 | ❌ fail | 96ms |

## Deviations

None.

## Known Issues

Local browser proof is currently blocked in this environment because `pnpm --dir apps/web dev` returns HTTP 500 until `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` are present. The shipped conflict layer itself passed unit and Svelte checks, but the real browser board could not be exercised further against the missing-env server.

## Files Created/Modified

- `apps/web/src/lib/schedule/conflicts.ts`
- `apps/web/src/lib/schedule/board.ts`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte`
- `apps/web/src/lib/components/calendar/ShiftCard.svelte`
- `apps/web/src/app.css`
- `apps/web/tests/schedule/conflicts.unit.test.ts`
- `apps/web/tests/schedule/board.unit.test.ts`
- `.gsd/KNOWLEDGE.md`
