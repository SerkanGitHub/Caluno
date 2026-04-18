---
estimated_steps: 4
estimated_files: 5
skills_used:
  - frontend-design
  - debug-like-expert
---

# T02: Wire calendar-route prefill consumption, visible cue, and one-shot cleanup

**Slice:** S03 — Suggestion-to-create handoff
**Milestone:** M002

## Description

Make the destination route safe and calm. The existing create flow must accept a valid Find time handoff, visibly explain why the dialog opened, and immediately consume the one-shot params so later writes or reloads do not keep reopening the same suggestion.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Calendar route load and action search-param handling | Ignore invalid prefill and fall back to the existing calendar board state instead of breaking the route. | Preserve the current schedule timeout/denied surfaces; do not add a second failure mode for prefill. | Withhold prefill props, keep the week board renderable, and leave malformed params visible only long enough for guarded cleanup/fallback. |
| ShiftEditorDialog create mode and details open state | Keep the existing manual create path working even if open-on-load fails. | Not applicable beyond existing route load behavior. | Prefer default create values over guessed prefill values when props are absent or invalid. |

## Load Profile

- **Shared resources**: calendar route search params, local-first form actions, and the week-board/dialog render path.
- **Per-operation cost**: one protected route load plus one post-arrival URL replacement when valid prefill is present.
- **10x breakpoint**: stale query params will create UX loops first if cleanup is not truly one-shot.

## Negative Tests

- **Malformed inputs**: invalid `prefillStartAt`, invalid `prefillEndAt`, missing one side of the pair, and `endAt <= startAt`.
- **Error paths**: denied calendar ids, malformed schedule payloads, and action submissions after a prefilled arrival.
- **Boundary conditions**: prefill on a later week than the current board, reload after arrival, and edit/move dialogs that must ignore create-prefill props.

## Steps

1. Parse the timing-only prefill contract in `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` and thread validated create-prefill data through the page into `CalendarWeekBoard` and `ShiftEditorDialog`.
2. Extend the create dialog so valid prefill opens automatically, shows a visible “From Find time” cue, and uses exact start/end values ahead of day-based defaults without changing edit/move behavior.
3. Strip `create`, `prefillStartAt`, `prefillEndAt`, and `source` from the URL after arrival while preserving the derived `start=` week.
4. Add route-level proof for valid prefill, invalid prefill fallback, correct week scope, and non-sticky follow-on action behavior.

## Must-Haves

- [ ] The existing create dialog opens automatically only for a valid prefill contract.
- [ ] The dialog shows an explicit handoff cue instead of silently changing its defaults.
- [ ] Invalid or malformed prefill params fail closed and do not invent schedule state.
- [ ] After arrival, the destination URL keeps `start=` but drops the one-shot prefill params so later writes and reloads stay calm.

## Verification

- `pnpm --dir apps/web exec vitest run tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts`
- `pnpm --dir apps/web check`

## Observability Impact

- Signals added/changed: create-dialog source banner/state, open-on-arrival behavior, and URL cleanup after prefilled landings.
- How a future agent inspects this: compare the board URL, `data-visible-week-start`, create dialog state, and protected-route test results after a valid or invalid handoff.
- Failure state exposed: wrong-week landings, sticky prefill reopen loops, and missing source cues become visible immediately on the calendar route.

## Inputs

- `apps/web/src/lib/schedule/create-prefill.ts` — shared contract from T01.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` — current load/action search-param behavior that currently preserves URL params.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — calendar route composition and client-side route state.
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte` — create entrypoint wiring point.
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte` — existing create/edit/move dialog that needs prefill support.
- `apps/web/tests/routes/protected-routes.unit.test.ts` — current calendar-route contract proof.

## Expected Output

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` — validated create-prefill parsing and safe handoff state exposure.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — one-shot param cleanup while preserving visible week context.
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte` — create-entry wiring for optional prefill props.
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte` — visible “From Find time” cue and exact prefill behavior for create mode.
- `apps/web/tests/routes/protected-routes.unit.test.ts` — route proof for valid prefill, invalid prefill, and cleanup semantics.
