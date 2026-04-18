# S03: Suggestion-to-create handoff

**Goal:** Let a member choose a truthful shared free-time suggestion and land in the existing calendar create dialog with the exact slot prefilled in the same authorized calendar, the correct visible week, and a one-shot handoff that does not stick across reloads or later writes.
**Demo:** A member chooses a suggested window from Find time and lands in the existing calendar create experience with the exact time prefilled in the correct calendar/week context.

## Must-Haves

- Find-time Top picks and browse cards expose stable suggestion CTA surfaces that stay inside the same authorized calendar and build a timing-only handoff URL from the selected window’s exact `startAt` / `endAt` values.
- The calendar route validates incoming prefill params fail closed, derives the visible week from the selected slot, ignores malformed or end-before-start handoffs, and never widens roster or calendar authority.
- A valid handoff opens the existing create dialog on arrival, shows a visible “From Find time” cue, and prepopulates exact `datetime-local` start/end values without affecting edit or move dialogs.
- Prefill-specific params are consumed once and removed from the destination URL while preserving the `start=` week context, so reloads and later create/edit/move/delete submissions do not keep reopening the same handoff.
- Verification passes in `apps/web/tests/schedule/create-prefill.unit.test.ts`, `apps/web/tests/routes/protected-routes.unit.test.ts`, `apps/web/tests/e2e/find-time.spec.ts`, and `apps/web/tests/e2e/calendar-shifts.spec.ts`.

## Threat Surface

- **Abuse**: tampering with `create`, `prefillStartAt`, `prefillEndAt`, or `start` to force wrong-week landings, replay stale handoff URLs, or probe guessed calendar ids must fail closed and never bypass the existing protected calendar boundary.
- **Data exposure**: the handoff may expose only exact slot timing plus a local source label; it must not leak free-member lists, blocked-member explanations, shift diagnostics from other calendars, tokens, or cross-group roster data via URL params or dialog copy.
- **Input trust**: all handoff query params are untrusted until the calendar route validates them; only already-authorized calendar context and exact slot timestamps may flow into the create dialog.

## Requirement Impact

- **Requirements touched**: `R002`, `R007`, `R008`, `R012`
- **Re-verify**: same-calendar authorization on both routes, malformed/guessed handoff rejection, calm create-flow UX, correct week targeting, exact prefill values, and non-sticky reload/post-submit behavior.
- **Decisions revisited**: `D033`, `D036`, `D037`, `D041`, `D042`

## Proof Level

- This slice proves: final-assembly
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `pnpm --dir apps/web exec vitest run tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts`
- `pnpm --dir apps/web check`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts tests/e2e/calendar-shifts.spec.ts`

## Observability / Diagnostics

- Runtime signals: suggestion CTA `data-testid` / handoff attributes, create-dialog source state, exact prefill field values, board `data-visible-week-start`, and destination URL cleanup after arrival.
- Inspection surfaces: `apps/web/tests/schedule/create-prefill.unit.test.ts`, `apps/web/tests/routes/protected-routes.unit.test.ts`, `apps/web/tests/e2e/find-time.spec.ts`, `apps/web/tests/e2e/calendar-shifts.spec.ts`, plus route/dialog `data-testid` attributes.
- Failure visibility: wrong-week landings, malformed prefill rejection, sticky query params, missing source cue, and absent created-shift visibility remain directly observable in unit and browser proof.
- Redaction constraints: only exact timing and source may travel in the URL; roster names, blocked-member explanations, and unrelated schedule data must stay out of the handoff contract.

## Integration Closure

- Upstream surfaces consumed: `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`, `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`, `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`, and the exact-slot recommendation contract from S01/S02.
- New wiring introduced in this slice: a timing-only create-prefill helper, calendar load-to-dialog prop threading, one-shot URL cleanup after arrival, and suggestion CTA hooks on both Top picks and browse cards.
- What remains before the milestone is truly usable end-to-end: nothing for the core M002 flow once this slice passes verification.

## Decomposition Rationale

This slice is best split into three tasks because the risky part is the transient contract, not the button styling. T01 isolates the week-derivation and fail-closed query parsing in pure code so later tasks share one trusted handoff contract. T02 then wires that contract into the protected calendar route and existing create dialog, where the real fragility lives: action search params currently persist, so one-shot cleanup and exact prefill behavior must be proven before browser assembly. T03 closes the loop from the real Find time UI into the real create flow and uses browser proof to verify the exact slot, visible week, created shift, and non-sticky reload behavior without regressing denied or offline boundaries.

## Tasks

- [x] **T01: Build the create-prefill contract and fail-closed validation proof** `est:75m`
  - Why: The handoff only stays trustworthy if week derivation and prefill parsing are isolated in a pure helper before any route wiring.
  - Files: `apps/web/src/lib/schedule/create-prefill.ts`, `apps/web/tests/schedule/create-prefill.unit.test.ts`
  - Do: Add one shared helper for building suggestion handoff hrefs and parsing/validating incoming prefill params, derive the destination week from `window.startAt` instead of the original find-time search anchor, keep the contract timing-only, and add unit coverage for valid plus malformed/end-before-start cases.
  - Verify: `pnpm --dir apps/web exec vitest run tests/schedule/create-prefill.unit.test.ts`
  - Done when: the helper owns both handoff generation and fail-closed parsing, and tests prove correct week derivation plus invalid-input rejection.
- [x] **T02: Wire calendar-route prefill consumption, visible cue, and one-shot cleanup** `est:2h`
  - Why: The highest-risk integration is the destination route, because schedule actions currently preserve search params and can otherwise reopen the dialog indefinitely.
  - Files: `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`, `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`, `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`, `apps/web/tests/routes/protected-routes.unit.test.ts`
  - Do: Parse validated prefill data in the calendar route, thread it into the existing create dialog, auto-open only the create path for valid handoffs, show a visible “From Find time” cue, preserve manual create/edit/move behavior, and strip one-shot prefill params after arrival while keeping `start=` intact.
  - Verify: `pnpm --dir apps/web exec vitest run tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts`
  - Done when: a valid handoff lands on the correct board week with exact values and a visible cue, invalid params are ignored safely, and route proof covers cleanup plus non-sticky follow-on writes.
- [ ] **T03: Add suggestion CTA wiring and prove the end-to-end handoff in the browser** `est:2h`
  - Why: The slice demo is only true once a real suggestion on `/find-time` can carry a member into the actual create flow and survive submit/reload proof.
  - Files: `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte`, `apps/web/tests/e2e/fixtures.ts`, `apps/web/tests/e2e/find-time.spec.ts`, `apps/web/tests/e2e/calendar-shifts.spec.ts`
  - Do: Add deterministic CTA hooks to both Top picks and browse cards using the shared prefill helper, extend fixtures to read the CTA target and prefilled dialog values, and prove click→land→create→reload behavior in the browser while preserving denied and offline `/find-time` proof paths.
  - Verify: `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts tests/e2e/calendar-shifts.spec.ts && pnpm --dir apps/web check`
  - Done when: the real browser flow lands on the correct week, opens the prefilled dialog, creates the shift on the intended day, and reload no longer reopens the same handoff.

## Files Likely Touched

- `apps/web/src/lib/schedule/create-prefill.ts`
- `apps/web/tests/schedule/create-prefill.unit.test.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`
- `apps/web/tests/routes/protected-routes.unit.test.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte`
- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/e2e/find-time.spec.ts`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`
