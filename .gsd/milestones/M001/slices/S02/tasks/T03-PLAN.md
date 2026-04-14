---
estimated_steps: 5
estimated_files: 8
skills_used:
  - frontend-design
---

# T03: Build the custom week-view board and browser editing flows

**Slice:** S02 — Multi-shift calendar model and browser editing flows
**Milestone:** M001

## Description

Turn the schedule contract into the actual browser demo. This task advances **R003** and **R007** by replacing the placeholder calendar shell with a custom, high-clarity week board that shows multiple same-day shifts, supports bounded recurring creation, and exposes explicit edit/move/delete controls without depending on an unthemed stock calendar widget.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Schedule page data and action state | Keep the board on the current week, render the inline error state, and preserve the user's last form values. | Show a retryable pending/timeout state without clearing the visible schedule. | Treat malformed data as a non-renderable schedule section and surface a visible error banner rather than broken cards. |
| Svelte form submissions | Fall back to full-page form posts if enhanced behavior fails; do not require client-only state to create or edit a shift. | Leave the current board visible and keep controls disabled only for the active submit. | Reject malformed fields server-side and render the returned action error inline. |

## Load Profile

- **Shared resources**: the calendar route DOM, form actions, and per-day card stacks for the visible week.
- **Per-operation cost**: rendering seven day columns plus the shift cards/actions for the loaded week.
- **10x breakpoint**: visual clutter and card density become the first failure mode, so the board must prefer clear per-day stacks, concise card content, and explicit controls over heavy calendar chrome.

## Negative Tests

- **Malformed inputs**: blank titles, impossible time ranges, invalid recurrence bound fields, and invalid week-navigation query values returned from the browser.
- **Error paths**: failed create/edit/move/delete actions that must remain visible on the same route, and malformed schedule data that should not crash the page.
- **Boundary conditions**: empty day column, multiple same-day shifts, overlapping cards, recurring create that generates several visible occurrences, and moving a shift onto a different day.

## Steps

1. Add a small custom component surface under `apps/web/src/lib/components/calendar/` plus `apps/web/src/lib/schedule/board.ts` to group and sort week data for rendering without moving schedule authority into the client.
2. Replace `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` with a week board that keeps the denied-state branch from S01 intact, renders the current visible week, and shows multiple cards per day instead of a single-shift placeholder.
3. Add accessible browser forms for create/edit/delete plus explicit move controls and week navigation; for M001, implement move through date/time editing and explicit controls rather than drag-and-drop.
4. Add bounded recurring controls (for example: none or weekly + until date/count) and make sure successful actions rerender the board immediately from server data.
5. Use the installed `frontend-design` skill to keep the schedule surface calm, legible, and stress-friendly rather than generic calendar chrome.

## Must-Haves

- [ ] The browser shows multiple shifts in the same day column and keeps them ordered clearly.
- [ ] Users can create, edit, move, and delete shifts from the browser without bypassing the server action boundary.
- [ ] Recurring creation is available but bounded, and the board rerenders concrete occurrences in the visible week.
- [ ] The existing denied route branch remains visible and explicit for unauthorized calendars.

## Verification

- `pnpm --dir apps/web check && pnpm --dir apps/web exec vitest run tests/schedule/board.unit.test.ts tests/routes/protected-routes.unit.test.ts tests/schedule/server-actions.unit.test.ts`
- Manually inspect the rendered board in the browser if needed to confirm the week view remains legible under same-day multi-shift density.

## Observability Impact

- Signals added/changed: inline create/edit/move/delete status cards, visible-week labels, and empty/error schedule states become inspectable UI signals.
- How a future agent inspects this: open the calendar route in the browser or rerun `pnpm --dir apps/web check` plus the schedule/unit tests to confirm rendered state shaping.
- Failure state exposed: invalid form submissions and server action failures remain visible on the same page instead of disappearing into silent reloads.

## Inputs

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — current placeholder calendar shell to replace.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` — trusted loader/actions from T02.
- `apps/web/src/app.css` — existing editorial visual language to extend.
- `apps/web/src/lib/schedule/types.ts` — schedule/domain types from T01.
- `apps/web/src/lib/server/schedule.ts` — page-scoped schedule data contract from T02.

## Expected Output

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — real calendar page with board, forms, and denied-state preservation.
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte` — week-board composition shell.
- `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte` — per-day column renderer.
- `apps/web/src/lib/components/calendar/ShiftCard.svelte` — shift card with clear metadata and actions.
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte` — create/edit form surface for one shift or bounded recurrence.
- `apps/web/src/lib/schedule/board.ts` — pure grouping/sorting helpers for rendering.
- `apps/web/tests/schedule/board.unit.test.ts` — unit tests for grouping/order/presentation shaping.
- `apps/web/src/app.css` — calendar-specific styling that matches the existing product language.
