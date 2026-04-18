# S03 Research — Suggestion-to-create handoff

## Strategic readout

S03 is **targeted integration work**, not a new matching problem. S01/S02 already give the slice everything it needs on the find-time side: exact `startAt` / `endAt`, trusted calendar scope, ranked `topPicks`, lighter `browseWindows`, and explicit denied/offline behavior. The missing piece is a **one-shot prefill contract** into the existing calendar week board create dialog.

The biggest implementation risk is not the link itself. It is that the calendar route’s mutation path currently **preserves all existing search params** on every POST, so a naive `?create=1&startAt=...&endAt=...` handoff will become sticky and keep reopening or re-prefilling the dialog after submit/reload/invalidate.

## Requirement analysis

This slice directly advances:
- `R008` — lets a member choose a truthful suggested window and land in the real create flow with exact time preserved.

This slice must preserve:
- `R002` — do not widen authority during handoff; only route into the same permitted calendar.
- `R012` — malformed or guessed handoff params must fail closed/ignore rather than inventing times or context.
- `R007` — the handoff should feel calm and intentional, not like a jarring route jump.

## Skill notes

Installed skill guidance that matters:
- `frontend-design`: the handoff should have a **clear conceptual direction** and avoid generic hidden-state UX. In practice, that argues for a visible “from Find time” cue in the create dialog instead of only silently opening prefilled fields.

Promising uninstalled skills discovered for core tech:
- SvelteKit: `npx skills add spences10/svelte-skills-kit@sveltekit-structure`
- SvelteKit: `npx skills add bobmatnyc/claude-mpm-skills@sveltekit`
- Supabase: `npx skills add supabase/agent-skills@supabase`
- Supabase/Postgres: `npx skills add supabase/agent-skills@supabase-postgres-best-practices`

No external library/web-doc research looks necessary; the existing app patterns are sufficient.

## What exists and should be reused

### 1. Find-time already exposes the exact handoff payload

Relevant file:
- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte`

What exists:
- Every top-pick and browse card already has trusted `startAt`, `endAt`, `spanStartAt`, `spanEndAt` on the rendered window object.
- The page currently renders rich/top-pick and compact/browse cards, but **no CTA/button/link exists yet** on either card type.

Implication:
- S03 does **not** need new server ranking/explanation work.
- The handoff can be implemented entirely from the already-rendered candidate timestamps.

### 2. The existing create flow is an inline `<details>` dialog on the week board

Relevant files:
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`
- `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte`
- `apps/web/src/lib/components/calendar/ShiftCard.svelte`

What exists:
- The week board renders exactly one create entrypoint via `ShiftEditorDialog` in create mode.
- `ShiftEditorDialog` already accepts `visibleWeekStart`, `defaultDayKey`, and optional `shift`.
- Default create times come from `buildDefaultCreateTimes(defaultDayKey)` in `apps/web/src/lib/schedule/board.ts`, which is day-only and falls back to `09:00–13:00`.
- The dialog is opened by `<details class="shift-editor shift-editor--create">` with no explicit prefill/open contract.

Implication:
- The natural seam is **extend `ShiftEditorDialog`**, not invent a second create surface.
- The dialog needs optional prefilled `startAt` / `endAt` plus an “open on arrival” control.

### 3. Calendar week context is already route-driven by `?start=`

Relevant files:
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
- `apps/web/src/lib/server/schedule.ts`
- `apps/web/src/lib/schedule/route-contract.ts`

What exists:
- The week board scope is controlled by `resolveVisibleWeek(searchParams)`.
- `?start=YYYY-MM-DD` is the existing contract for choosing the visible week.
- The calendar board navigation and tests already assume this contract.

Implication:
- The handoff should keep using the current week-route contract.
- The handoff link must compute the **week containing the suggested slot**, not reuse the find-time search anchor.

### 4. The calendar mutation path preserves all route search params

Relevant file:
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`

Key detail:
- `resolveActionSearchParams(url, formData)` clones `url.searchParams` wholesale, then only ensures `start` exists.
- `ShiftEditorDialog` action targets already include `?/<action>&start=${visibleWeekStart}`.
- `+page.svelte` uses `update({ reset: false })`, so the route remains on the same URL after actions.

Implication:
- A naive query-driven prefill contract will **stick across create/edit/move/delete submissions and reloads**.
- S03 needs a one-shot consumption/cleanup step, not just query parsing.

This is the most important hidden constraint for the planner.

## Implementation landscape

### Files that likely change

Primary:
- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`

Likely new helper (recommended):
- `apps/web/src/lib/schedule/create-prefill.ts`

Tests:
- `apps/web/tests/e2e/find-time.spec.ts`
- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/routes/protected-routes.unit.test.ts`
- `apps/web/tests/schedule/board.unit.test.ts` or a new `apps/web/tests/schedule/create-prefill.unit.test.ts`

### Natural seams

#### Seam A — shared prefill contract helper

Recommended to isolate the handoff math/validation in a pure helper module.

What it should do:
- Build a calendar create href from `calendarId + selected slot`.
- Validate incoming prefill query params.
- Compute the **Monday-bounded week start** from the chosen slot timestamp.
- Reject malformed timestamps or end-before-start inputs.
- Return a tiny typed payload for the calendar route/dialog.

Why separate:
- Avoid duplicating UTC week math between find-time and calendar route.
- Gives the planner a pure unit-test seam.

#### Seam B — calendar route consumption + one-shot cleanup

Likely files:
- `+page.server.ts`
- `+page.svelte`
- `CalendarWeekBoard.svelte`
- `ShiftEditorDialog.svelte`

What needs to happen:
- Parse the prefill contract when the calendar route loads.
- Pass optional `createPrefill` data down to the create dialog.
- Open the create dialog automatically when valid prefill is present.
- Show a small visible cue like “Suggested from Find time”.
- **Consume and strip the prefill params after arrival** so later form submissions/reloads do not keep reopening the dialog.

Why this should be one task:
- The cleanup behavior and dialog open-state behavior are tightly coupled.

#### Seam C — find-time CTA wiring + browser proof

Likely files:
- `find-time/+page.svelte`
- `tests/e2e/find-time.spec.ts`
- `tests/e2e/fixtures.ts`

What needs to happen:
- Add a CTA/link on top-pick cards and browse cards.
- Prefer stable `data-testid` hooks per CTA plus handoff data attributes for inspection.
- Browser proof should click a suggestion and verify the destination board/dialog state.

## Hidden constraints / planner traps

### 1. The correct week is derived from the selected slot, not the current find-time query

The current find-time route search anchor is `selectedStart`, but a valid window can land later in the 30-day horizon. If the handoff reuses the search anchor week, the calendar board can land on the wrong week and hide the selected slot.

Planner rule: compute visible week from `window.startAt`.

### 2. Do not encode roster/explanation data in the handoff URL

The create flow only needs exact timing and route context. Passing member names, blocked members, or explanation text through query params adds unnecessary URL payload and increases leakage/staleness risk.

Planner rule: handoff contract should be timing-only (`start`, `prefillStartAt`, `prefillEndAt`, maybe `source=find-time`).

### 3. Sticky query params will break the UX unless they are cleared

Because action requests preserve route search params, the prefill contract cannot remain in the URL after the first arrival.

Planner rule: treat prefill as **consume-once**.

### 4. Existing create defaults are day-based only

`buildDefaultCreateTimes()` only knows `dayKey`, not an exact slot. S03 needs a higher-priority prefill source than `defaultDayKey`.

Planner rule: prefill wins over day default, but existing edit/move values must still win over prefill when those modes are used.

### 5. Offline behavior should stay unchanged

`/find-time` is already intentionally offline-unavailable. S03 should not try to add offline authority or cached find-time replay. The handoff begins from an online trusted route and lands on the existing calendar route.

Planner rule: no service-worker/offline-authority expansion is needed for this slice.

## Recommended implementation direction

Use a **URL-based, timing-only prefill contract** into the existing calendar route, but consume it immediately after arrival.

Recommended shape:
- Find-time card CTA builds `/calendars/:calendarId?start=<derivedWeekStart>&create=1&prefillStartAt=<iso>&prefillEndAt=<iso>&source=find-time`
- Calendar route parses this into typed `createPrefill` data only when valid.
- `ShiftEditorDialog` create mode receives:
  - `prefillStartAt`
  - `prefillEndAt`
  - `openOnLoad`
  - optional `sourceLabel` / `contextLabel`
- The calendar page strips the prefill-specific params after mount/navigation while keeping the visible week `start=` intact.

Why this fits the codebase:
- Reuses the existing sibling protected-route boundary.
- Reuses the existing create dialog and POST action path.
- Keeps the handoff inspectable in browser tests.
- Avoids inventing a store-only or cross-route ephemeral state system.

## What to prove first

1. **Pure contract proof**
   - Given a candidate ISO slot, derive the correct board week start.
   - Reject malformed/partial/end-before-start prefill params.

2. **Dialog consumption proof**
   - A valid prefill opens the create dialog and sets exact `datetime-local` values.
   - Once the page has landed, prefill params are removed so later updates do not keep reopening.

3. **End-to-end handoff proof**
   - Click a real suggestion on `/find-time`.
   - Land on `/calendars/[calendarId]?start=<selected-slot-week>`.
   - Create dialog is open with exact values.
   - Submitting creates the shift on the intended day/time in the board.

## Verification

Recommended commands:
- `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/board.unit.test.ts tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts`
- `pnpm --dir apps/web check`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts tests/e2e/calendar-shifts.spec.ts`

What browser proof should explicitly assert:
- The clicked find-time CTA URL targets the selected slot’s week, not the original search anchor week.
- The calendar route remains within the same authorized calendar id.
- The create dialog is already open on arrival.
- `input[name="startAt"]` and `input[name="endAt"]` equal the selected slot timestamps in local `datetime-local` format.
- After submit, the created shift is visible on the destination board day.
- Reloading the destination page does **not** keep reopening the same prefill unless the user re-enters from `/find-time`.

## Recommendation

Plan S03 as three tasks:
1. **Prefill contract helper + validation tests**
2. **Calendar-route/dialog consumption with one-shot cleanup**
3. **Find-time CTA wiring + real browser handoff proof**

Do not spend planner context on ranking, Supabase queries, or offline caching; those are already done in S01/S02. The only risky part is the transient query-param lifecycle around the existing create dialog.
