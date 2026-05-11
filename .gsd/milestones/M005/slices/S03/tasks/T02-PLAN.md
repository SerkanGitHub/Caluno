---
estimated_steps: 44
estimated_files: 6
skills_used: []
---

# T02: Wire the create-dialog suggestion UX and prove accept/dismiss flows in Playwright

---
estimated_steps: 8
estimated_files: 6
skills_used:
  - frontend-design
  - accessibility
  - test
  - verify-before-complete
---

## Why

Once the loader can surface a hint, the web create dialog must present it calmly and accessibly, prefill only truthful recurrence fields, and prove accept/dismiss behavior in a real browser.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Route-provided recurrence suggestion prop | Fall back to blank recurrence controls and hide the suggestion UI. | N/A — route data is present before render. | Treat it as absent and keep one-off defaults. |
| Local-first create submit/reset cycle | Clear transient suggestion state on close, success, or new load data so stale UI does not bleed into later creates. | Preserve editable form state but stop claiming the suggestion is still active after the dialog resets. | Keep recurrence inputs user-editable and avoid locking the form into an invalid selection. |

## Load Profile

- **Shared resources**: client-local component state only.
- **Per-operation cost**: trivial UI updates plus the existing create submission path.
- **10x breakpoint**: none before the existing dialog rendering cost, but repeated opens must still reset cleanly.

## Negative Tests

- **Malformed inputs**: absent suggestion data renders no chip and leaves one-off selected.
- **Error paths**: dismissed suggestions stay hidden for the current suggestion instance and do not reappear until fresh loader data arrives.
- **Boundary conditions**: accept fills cadence `weekly` and interval `1` only; `repeatCount` and `repeatUntil` remain blank.

## Steps

1. Thread the new suggestion prop from `+page.svelte` through `CalendarWeekBoard.svelte` into `ShiftEditorDialog.svelte`.
2. Convert create-mode recurrence controls from hardcoded checked/value attributes to local state with dynamic selected styling.
3. Render a dismissible suggestion surface with stable test ids (`recurrence-suggestion`, `recurrence-suggestion-accept`, `recurrence-suggestion-dismiss`), accessible button text, and calm contextual copy.
4. On accept, set cadence to `weekly` and interval to `1`, leave repeat bounds blank, and keep all recurrence fields manually editable.
5. Reset suggestion acceptance/dismissal and recurrence defaults when the dialog closes, a create succeeds, or new suggestion data arrives so `reset: false` cannot leak stale state.
6. Extend Playwright helpers to snapshot suggestion visibility and recurrence field values, then add accept and dismiss flows to `apps/web/tests/e2e/calendar-shifts.spec.ts`.

## Must-Haves

- [ ] Accepting a suggestion never invents `repeatCount` or `repeatUntil`.
- [ ] Dismissing the suggestion leaves recurrence inputs blank and keeps manual recurrence editing available.
- [ ] Browser proof covers both accept and dismiss paths against the seeded Alpha weekly pattern.

## Verification

- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`
- Confirm the new snapshot helpers assert suggestion visibility, selected cadence, interval value, and blank bounds after accept/dismiss.

## Observability Impact

- Signals added/changed: stable `data-testid` hooks and explicit dialog state for suggestion accept/dismiss behavior.
- How a future agent inspects this: use the Playwright snapshots or inspect the create dialog DOM directly in the browser.
- Failure state exposed: missing chip, wrong selected cadence, stale dismissal, or nonblank repeat bounds become directly visible in the dialog.

## Done when

- Opening the seeded Alpha create dialog shows the suggestion, accept pre-fills weekly/1 only, dismiss keeps the form blank, and both behaviors remain true after close/reopen and browser reload cycles.

## Inputs

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`
- `apps/web/src/app.css`
- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`
- `supabase/seed.sql`

## Expected Output

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`
- `apps/web/src/app.css`
- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`

## Verification

npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts

## Observability Impact

Adds inspectable DOM hooks and repeatable browser snapshots for recurrence suggestion lifecycle debugging.
