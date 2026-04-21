---
estimated_steps: 28
estimated_files: 6
skills_used:
  - debug-like-expert
  - frontend-design
---

# T03: Wire the calendar entrypoint, compact cards, and one-shot create handoff

Spend the trusted route-state contract on the actual phone-first UX. Add a contextual Find time entrypoint from the mobile calendar board, keep Top picks explanation-rich while browse cards stay lighter, and thread the selected slot back into the existing `ShiftEditorSheet.svelte` so mobile create opens once with exact values and immediately cleans up one-shot query state.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Mobile Find time route state | Keep the compact UI in explicit error/offline/denied state instead of rendering partial cards. | Preserve the retryable route state and do not auto-open create on stale or incomplete data. | Withhold CTAs when a result card lacks a valid exact slot handoff contract. |
| Existing mobile calendar/editor runtime | Keep normal manual create/edit/move/delete behavior intact if arrival-prefill state is absent or rejected. | Do not leave the create sheet stuck open if the route is still resolving post-arrival cleanup. | Reject malformed prefill params and keep the calendar week renderable without auto-opening the sheet. |
| Browser history / query cleanup | Preserve the slot-derived `start` week while stripping transient handoff params. | Treat delayed navigation cleanup as incomplete handoff and keep tests pinned to the cleaned URL. | Never keep sticky `create` / `prefill*` / `source` params that would reopen on reload. |

## Load Profile

- **Shared resources**: mobile calendar route state, compact result rendering, sheet state, and browser history/query updates.
- **Per-operation cost**: one contextual link from the board, one route render for compact results, and one create-sheet seed/cleanup pass on arrival.
- **10x breakpoint**: dense result-card rendering and repeated arrival-state transitions will break determinism before the underlying shared matcher contract should fail.

## Negative Tests

- **Malformed inputs**: missing `prefillStartAt`, missing `prefillEndAt`, invalid ISO instants, mismatched `start` week, unknown `source`.
- **Error paths**: offline-unavailable route, denied route, CTA with invalid slot metadata, and arrival on malformed prefill params.
- **Boundary conditions**: Top picks present with zero browse cards, browse-only results, earlier search anchor week differing from chosen slot week, and reload immediately after arrival cleanup.

## Steps

1. Add a contextual `find-time-entrypoint` on `MobileCalendarBoard.svelte` that opens the new mobile route for the current visible week rather than introducing a new primary shell tab.
2. Finish the compact mobile results UI: Top picks first with richer explanation and deterministic CTA metadata, browse windows second with lighter summaries, and explicit test ids for ordering/count assertions.
3. Parse strict create-prefill params on the mobile calendar route, thread accepted state into `ShiftEditorSheet.svelte`, auto-open create once with exact datetime-local values and a visible `From Find time` cue, and then strip transient query params while preserving `start=`.
4. Add unit coverage for valid arrival-prefill behavior, malformed rejection, one-shot cleanup, and no-regression manual create behavior.

## Must-Haves

- [ ] A permitted mobile user can open Find time directly from the real calendar board for the current visible week.
- [ ] Compact Top picks render before browse windows and expose deterministic CTA metadata (`data-handoff-source`, week, start, end).
- [ ] The existing mobile create sheet opens once on arrival with exact slot values and a visible `From Find time` cue.
- [ ] Reload after arrival does not reopen the create sheet because one-shot query params were stripped while preserving the slot-derived week.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/mobile-find-time.unit.test.ts tests/mobile-create-prefill.unit.test.ts`
- `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build`

## Inputs

- `apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte` — mobile Find time route from T02 that needs the compact UI and CTA wiring.
- `apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte` — current mobile board hero where the contextual entrypoint belongs.
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` — existing mobile calendar route that must consume and clean one-shot handoff params.
- `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte` — existing create/edit surface that must open on arrival instead of a new create UI.
- `packages/caluno-core/src/schedule/create-prefill.ts` — strict timing-only handoff contract to parse/build.
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte` — prior-art surface for `data-open-on-arrival` and visible prefill-source semantics.
- `apps/web/tests/e2e/find-time.spec.ts` — established handoff proof pattern and deterministic CTA metadata expectations.

## Expected Output

- `apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte` — contextual mobile Find time entrypoint and any supporting board metadata.
- `apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte` — compact Top-pick and browse result surface with deterministic CTA/test ids.
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` — arrival-prefill parsing plus one-shot query cleanup while preserving visible week.
- `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte` — create sheet support for open-on-arrival, exact prefill values, and visible source cue.
- `apps/mobile/src/app.css` — styling updates needed for the compact phone-first Find time and handoff surfaces.
- `apps/mobile/tests/mobile-create-prefill.unit.test.ts` — unit proof for strict prefill parsing, cleanup, and manual-create no-regression.

## Verification

pnpm --dir apps/mobile exec vitest run tests/mobile-find-time.unit.test.ts tests/mobile-create-prefill.unit.test.ts && pnpm --dir apps/mobile check && pnpm --dir apps/mobile build

## Observability Impact

- Signals added/changed: `find-time-entrypoint` CTA metadata, mobile Find time route status/count attributes, and create-sheet arrival metadata (`data-open-on-arrival`, `data-create-source`, `data-prefill-source`, `data-prefill-start`, `data-prefill-end`).
- How a future agent inspects this: open the mobile calendar route or the new unit tests and read deterministic `data-testid` / `data-*` surfaces instead of inferring state from copy.
- Failure state exposed: wrong slot week, missing handoff metadata, malformed prefill rejection, and sticky arrival params all become directly assertable.
