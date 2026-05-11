# S03 Research — Wire recurrence suggestion into web shift create dialog

## Summary
Targeted research. This slice is mostly existing web-calendar wiring, but there are two real integration risks: the calendar route currently loads only visible-week shifts, and the create dialog’s recurrence controls are fully uncontrolled/hardcoded, so a suggestion cannot be truthfully prefilled without adding dialog state.

## Requirement Focus
- **R011 support:** this is the first web surface for the new predictive recurrence contract.
- **R002 constraint:** recurrence evidence must stay inside the already-authorized calendar scope; no cross-calendar history query.
- **R007 constraint:** suggestion UI must stay calm, dismissible, and keyboard-accessible.

## Key Findings
1. **The loader has no predictive hint yet.** `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` loads `schedule` plus `createPrefill`, but nothing for recurrence suggestions. The schedule loader in `apps/web/src/lib/server/schedule.ts:169-205` queries only the visible week (`.lt('start_at', visibleWeek.endAt)` / `.gt('end_at', visibleWeek.startAt)`), so S03 needs an additional same-calendar history query instead of reusing visible-week data.
2. **The create dialog is the right seam.** `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte:97-102` mounts the only web create dialog and already threads create-specific props (`createPrefill`) into `ShiftEditorDialog`.
3. **The recurrence form is currently not controllable.** `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte:210-228` hardcodes the blank radio as `checked`, the selected styling class is hardcoded, and `repeatCount` / `repeatUntil` inputs are always blank. Accepting a suggestion therefore requires local component state for cadence/interval and probably dynamic selected classes.
4. **Accepting a suggestion should not guess recurrence bounds.** `detectRecurrencePattern()` only returns weekly cadence, interval, weekday/time window, exemplar ids, and match count (`packages/caluno-core/src/schedule/recurrence.ts:204-275`). It does **not** return a safe repeat count or repeat-until value, so the likely truthful prefill is `weekly + interval 1` while leaving bounds empty for the user to choose.
5. **The route already has one-shot create-state cleanup logic.** `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte:571-586` strips create-prefill URL params after arrival. Recurrence suggestion accept/dismiss state should stay local/UI-scoped rather than add new URL params.
6. **Form state does not auto-reset after submit.** `enhanceMutation()` uses `update({ reset: false })` in `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte:534-554`. If S03 adds local recurrence state or suggestion dismissal state, success/close/reset behavior must be handled explicitly or the next open can inherit stale values.
7. **Current E2E seed data does not prove the acceptance case.** `supabase/seed.sql:261-276` defines `Alpha opening sweep` as a **daily** series, and rows at `supabase/seed.sql:353-387` are Apr 13–16 consecutive occurrences. That will not satisfy the S02 contract of “≥3 same-weekday-same-hour shifts in 30 days.” S03 needs a new weekly-pattern seed (or explicit test setup) before Playwright can prove the suggestion chip.
8. **There is existing route-load unit coverage to extend.** `apps/web/tests/routes/protected-routes.unit.test.ts:670-698` already asserts calendar load metadata and bounded fallback behavior. That is the lowest-cost place to lock the new loader hint contract.

## Recommendation
- Add a **separate server-side recurrence-suggestion load helper** near `loadCalendarScheduleView()` in `apps/web/src/lib/server/schedule.ts`, then thread its result through `+page.server.ts` into `+page.svelte` → `CalendarWeekBoard.svelte` → `ShiftEditorDialog.svelte`.
- Keep the query **same-calendar and deterministic**. The helper from S02 anchors its 30-day lookback to the latest valid input shift, so the caller must bound the dataset intentionally. Recommended planner question: choose one route-scoped evidence window and keep it fixed in code/tests (for example, a trailing 30-day query ending at the route’s visible-week end, not an unbounded history scan).
- Refactor create-mode recurrence fields in `ShiftEditorDialog.svelte` to local state so the suggestion can:
  - render as a dismissible chip/banner,
  - set cadence=`weekly` and interval=`1` on accept,
  - leave the form blank on dismiss,
  - keep existing manual editing possible.
- Add explicit `data-testid`s for the predictive surface (`recurrence-suggestion`, `recurrence-suggestion-accept`, `recurrence-suggestion-dismiss`) and accessible labels/button text.
- Add a small server-console log when the loader computes a suggestion because M005 launch criteria ask for recurrence detection observability; there is no existing structured logging pattern in `apps/web/src` yet, so a minimal single-line JSON-ish `console.info` is likely enough.

## Files and Purpose
- `apps/web/src/lib/server/schedule.ts` — add recurrence history query/helper and optional server-side observability log.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` — attach the new suggestion payload to the calendar view.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — thread the suggestion prop into the board/dialog tree.
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte` — pass create-only predictive props into the create dialog.
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte` — render the suggestion chip, manage accept/dismiss state, and convert recurrence inputs from hardcoded defaults to state-driven values.
- `apps/web/src/app.css` — style the suggestion surface near existing recurrence-field styles (`.recurrence-fields*` at `apps/web/src/app.css:535-842`).
- `apps/web/tests/routes/protected-routes.unit.test.ts` — assert the loader hint contract and bounded query behavior.
- `apps/web/tests/e2e/calendar-shifts.spec.ts` — add accept + dismiss browser proof.
- `apps/web/tests/e2e/fixtures.ts` — add snapshot helpers for the suggestion chip / recurrence field state.
- `supabase/seed.sql` and `apps/web/tests/e2e/fixtures.ts` seeded constants — add a calendar pattern that actually qualifies for the helper.

## Natural Seams
1. **Loader contract seam:** history query + helper call + page data shape.
2. **Dialog state seam:** recurrence suggestion UI + accept/dismiss + controlled recurrence inputs.
3. **Verification seam:** seed/test fixture updates + route unit + Playwright create-dialog assertions.

## First Proof
1. Extend `protected-routes.unit.test.ts` to prove the page load can surface a suggestion only when same-calendar history qualifies and stays absent otherwise.
2. Then wire the create dialog UI and prove the accept path by asserting the weekly radio + interval value change without auto-filling repeat bounds.
3. Finally add the dismiss-path Playwright assertion that the suggestion disappears and recurrence fields remain blank.

## Verification
- `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/recurrence.unit.test.ts`
- `pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`

## Watch-outs / Forward Intelligence
- The S02 helper is deterministic only if the caller supplies the right evidence slice; do not pass an unbounded query.
- Because the blank cadence radio is hardcoded as checked today, partial UI wiring will look correct visually but fail to actually prefill the submitted form.
- Because the route keeps `reset: false`, local recurrence suggestion state must be cleared deliberately after success/close.
- Do not widen scope beyond the permitted calendar; R002 still applies even though the feature feels “predictive.”

## Skill Discovery
Already-installed project skills relevant here: `accessibility`, `test`, `verify-before-complete`, `frontend-design`.

Promising external skills discovered (not installed):
- `npx skills add spences10/svelte-skills-kit@sveltekit-structure` — strongest SvelteKit-specific hit (483 installs).
- `npx skills add currents-dev/playwright-best-practices-skill@playwright-best-practices` — strongest Playwright-specific hit (37.3K installs).
- `npx skills add supabase/agent-skills@supabase` — strongest Supabase general hit (60.9K installs).
