---
estimated_steps: 25
estimated_files: 8
skills_used:
  - frontend-design
  - debug-like-expert
---

# T01: Derive visible-week conflict warnings and render them in the calm board UI

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

## Inputs

- `apps/web/src/lib/schedule/board.ts`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte`
- `apps/web/src/lib/components/calendar/ShiftCard.svelte`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/server/schedule.ts`
- `apps/web/tests/schedule/board.unit.test.ts`
- `supabase/seed.sql`

## Expected Output

- `apps/web/src/lib/schedule/conflicts.ts`
- `apps/web/src/lib/schedule/board.ts`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte`
- `apps/web/src/lib/components/calendar/ShiftCard.svelte`
- `apps/web/src/app.css`
- `apps/web/tests/schedule/conflicts.unit.test.ts`
- `apps/web/tests/schedule/board.unit.test.ts`

## Verification

pnpm --dir apps/web exec vitest run tests/schedule/conflicts.unit.test.ts tests/schedule/board.unit.test.ts

## Observability Impact

- Signals added/changed: explicit board/day/shift conflict counts and warning pills that remain separate from transport-state diagnostics.
- How a future agent inspects this: read the new conflict test ids in the board UI and run the dedicated unit tests for overlap vs touching-boundary behavior.
- Failure state exposed: missing/incorrect conflict summaries become visible without hiding existing local, sync, or realtime status badges.
