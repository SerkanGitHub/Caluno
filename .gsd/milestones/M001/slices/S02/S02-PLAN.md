# S02: Multi-shift calendar model and browser editing flows

**Goal:** Add the multi-shift scheduling model, protected server actions, and a custom week-view browser editing surface so shared calendars support create, edit, move, and delete flows without weakening the trusted S01 access boundary.
**Demo:** A user can create, edit, move, and delete multiple shifts per day in shared calendars from the browser.

## Must-Haves

- Add a new Supabase scheduling schema with bounded recurrence support, `shift_series` + concrete `shifts` rows, membership-derived RLS/policies, and seeded fixtures that prove multiple same-day and recurring shifts on the Alpha calendar, directly advancing **R003**.
- Keep schedule loading and writes page-scoped on `/calendars/[calendarId]`, deriving calendar authority from trusted `(app)` layout scope and server-side validation instead of client-supplied group ids, so S02 supports **R001**, **R002**, and **R012** without widening access.
- Replace the placeholder calendar shell with a custom, stress-friendly week board that supports create, edit, move, and delete flows for multiple shifts per day, including bounded recurring creation, directly advancing **R007** as well as **R003**.
- Add durable proof files for this slice: `apps/web/tests/schedule/recurrence.unit.test.ts`, `apps/web/tests/schedule/server-actions.unit.test.ts`, `apps/web/tests/schedule/board.unit.test.ts`, the expanded `apps/web/tests/routes/protected-routes.unit.test.ts`, and `apps/web/tests/e2e/calendar-shifts.spec.ts`.

## Threat Surface

- **Abuse**: tampered `calendarId` or `shiftId` values, replayed form submissions, cross-calendar write attempts, and oversized recurrence/range inputs that try to create or reveal data outside the trusted membership scope.
- **Data exposure**: shift titles, times, recurrence metadata, calendar ids, and membership-derived schedule rows must stay scoped to the authenticated member's permitted calendars; no auth/session material or cross-group schedule data may leak into UI states or diagnostics.
- **Input trust**: every browser-submitted date, time, title, recurrence bound, visible-range query param, and record id is untrusted until validated in SvelteKit server actions and/or Supabase RLS-backed SQL.

## Requirement Impact

- **Requirements touched**: R001, R002, R003, R007, R012; this slice also shapes the concrete schedule surface that R006 conflict visibility will inspect later.
- **Re-verify**: trusted sign-in/session reload, denied calendar routing, group membership scope, multi-shift same-day rendering, recurring creation, edit/move/delete mutations, and accessible inline error handling on the calendar route.
- **Decisions revisited**: D002, D006, D007, and D008 remain in force and must not be weakened by direct browser-authoritative writes or by moving schedule loading into the parent app shell.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `pnpm --dir apps/web check`
- `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/*.unit.test.ts`
- `npx --yes supabase db reset --local --yes`
- `pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`
- The browser proof must show multiple shifts on the same day, a bounded recurring create that renders multiple occurrences in the visible week, successful edit/move/delete mutations, and the unchanged denied surface for an unauthorized calendar URL.

## Observability / Diagnostics

- Runtime signals: typed schedule action states for create/edit/move/delete, visible-range metadata on the calendar page, and deterministic seeded shift ids/ranges for browser proof.
- Inspection surfaces: `apps/web/tests/schedule/*.unit.test.ts`, `apps/web/tests/routes/protected-routes.unit.test.ts`, `apps/web/tests/e2e/calendar-shifts.spec.ts`, the calendar UI state, and the seeded `public.shift_series` / `public.shifts` tables after local reset.
- Failure visibility: server actions must expose named failure reasons, the current visible week/date range must remain inspectable in UI/tests, and e2e diagnostics must retain the failing phase and relevant calendar/shift fixture ids.
- Redaction constraints: keep cookies, tokens, and any future personal notes out of logs/diagnostics; surface high-level reason codes and seeded ids only.

## Integration Closure

- Upstream surfaces consumed: `apps/web/src/routes/(app)/+layout.server.ts`, `apps/web/src/lib/server/app-shell.ts`, `apps/web/src/lib/access/contract.ts`, `supabase/migrations/20260414_000001_auth_groups_access.sql`, and the S01 protected-calendar route contract.
- New wiring introduced in this slice: `supabase` scheduling tables/RLS/functions, `apps/web/src/lib/server/schedule.ts`, the schedule-aware `/calendars/[calendarId]` page server/actions, and the custom calendar UI components rendered from page-scoped schedule data.
- What remains before the milestone is truly usable end-to-end: browser-local persistence/offline reopening, sync/realtime propagation, and conflict visibility in S03-S05.

## Tasks

- [x] **T01: Model concrete shifts, bounded recurrence, and deterministic schedule fixtures** `est:2h`
  - Why: The slice cannot truthfully claim multi-shift browser editing until the database, recurrence contract, and deterministic fixtures exist for multiple same-day and recurring occurrences.
  - Files: `apps/web/package.json`, `pnpm-lock.yaml`, `supabase/migrations/20260415_000002_schedule_shifts.sql`, `supabase/seed.sql`, `apps/web/src/lib/schedule/types.ts`, `apps/web/src/lib/schedule/recurrence.ts`, `apps/web/tests/schedule/recurrence.unit.test.ts`
  - Do: Add `rrule`, introduce `shift_series` plus concrete `shifts` tables with membership-derived RLS, extend the seed with stable Alpha-calendar same-day/overlapping/recurring fixtures, and add pure schedule typing/recurrence helpers with unit proof. Keep recurrence bounded by `repeat_until` or count; do not use day-only fields or virtual-only events.
  - Verify: `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec vitest run tests/schedule/recurrence.unit.test.ts`
  - Done when: Local reset succeeds, the schedule model supports multiple same-day rows, recurrence stays bounded/deterministic, and the recurrence unit test locks the contract.
- [x] **T02: Add page-scoped schedule loading and trusted server actions on the calendar route** `est:2h`
  - Why: The schedule must load and mutate through the S01 trusted route boundary rather than through client-authoritative ids or parent-layout overfetching.
  - Files: `apps/web/src/lib/server/schedule.ts`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`, `apps/web/src/lib/access/contract.ts`, `apps/web/tests/routes/protected-routes.unit.test.ts`, `apps/web/tests/schedule/server-actions.unit.test.ts`
  - Do: Add a page-scoped schedule server layer, validate a bounded `?start=` visible week, wire create/edit/move/delete server actions on `/calendars/[calendarId]`, keep denied-route behavior fail-closed, and cover normalization plus failure paths in route/unit tests.
  - Verify: `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/server-actions.unit.test.ts`
  - Done when: A permitted calendar route returns one validated visible week, all edits are server-mediated, malformed or unauthorized ids still deny cleanly, and loader/action tests pass.
- [ ] **T03: Build the custom week-view board and browser editing flows** `est:2h30m`
  - Why: This task turns the model and server contract into the actual browser demo for R003/R007.
  - Files: `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`, `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`, `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte`, `apps/web/src/lib/components/calendar/ShiftCard.svelte`, `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`, `apps/web/src/lib/schedule/board.ts`, `apps/web/tests/schedule/board.unit.test.ts`, `apps/web/src/app.css`
  - Do: Replace the placeholder page with a custom week board, keep the denied branch intact, render multiple cards per day, add accessible create/edit/delete forms plus explicit move controls and week navigation, and use bounded recurring controls. Use `frontend-design` so the board stays calm, legible, and stress-friendly rather than generic calendar chrome. For M001, implement move via date/time editing and explicit controls instead of drag-and-drop.
  - Verify: `pnpm --dir apps/web check && pnpm --dir apps/web exec vitest run tests/schedule/board.unit.test.ts tests/routes/protected-routes.unit.test.ts tests/schedule/server-actions.unit.test.ts`
  - Done when: The calendar board shows multiple same-day shifts clearly, create/edit/move/delete work through server actions, recurring submissions rerender concrete visible occurrences, and the route still renders the explicit denied state for unauthorized calendars.
- [ ] **T04: Prove multi-shift browser editing and denied access with Playwright diagnostics** `est:1h30m`
  - Why: The slice is only done once the real browser, seeded Supabase runtime, and protected route all prove the editing flows together.
  - Files: `apps/web/tests/e2e/fixtures.ts`, `apps/web/tests/e2e/calendar-shifts.spec.ts`, `apps/web/playwright.config.ts`
  - Do: Extend the Playwright fixtures with seeded shift ids and visible-week helpers, add an end-to-end spec for same-day visibility plus create/edit/move/delete/recurring flows, keep the denied-route assertion from S01, and retain trace-friendly diagnostics including the current phase/calendar/week. Preserve the cold-start settle delay before typing into sign-in on fresh runs.
  - Verify: `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`
  - Done when: The browser proof passes for same-day multi-shift visibility, recurring creation, edit/move/delete mutation, reload continuity, and unauthorized calendar denial with useful retained diagnostics.

## Files Likely Touched

- `apps/web/package.json`
- `pnpm-lock.yaml`
- `supabase/migrations/20260415_000002_schedule_shifts.sql`
- `supabase/seed.sql`
- `apps/web/src/lib/schedule/types.ts`
- `apps/web/src/lib/schedule/recurrence.ts`
- `apps/web/tests/schedule/recurrence.unit.test.ts`
- `apps/web/src/lib/server/schedule.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
- `apps/web/src/lib/access/contract.ts`
- `apps/web/tests/routes/protected-routes.unit.test.ts`
- `apps/web/tests/schedule/server-actions.unit.test.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte`
- `apps/web/src/lib/components/calendar/ShiftCard.svelte`
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`
- `apps/web/src/lib/schedule/board.ts`
- `apps/web/tests/schedule/board.unit.test.ts`
- `apps/web/src/app.css`
- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`
- `apps/web/playwright.config.ts`
