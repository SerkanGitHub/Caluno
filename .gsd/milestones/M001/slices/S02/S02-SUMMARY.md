---
id: S02
parent: M001
milestone: M001
provides:
  - A concrete Supabase schedule schema with membership-derived RLS and deterministic seeded same-day/recurring fixtures.
  - A protected `/calendars/[calendarId]` server contract for week-scoped load plus create/edit/move/delete mutations.
  - A custom multi-shift week board that keeps the explicit denied surface intact while supporting bounded recurring creation and explicit move controls.
  - Repeatable unit and Playwright proof for schedule lifecycle flows and unauthorized calendar denial.
requires:
  - slice: S01
    provides: Trusted SSR auth state, membership-derived calendar inventory, and explicit denied-calendar route behavior from S01.
affects:
  - S03
  - S04
  - S05
key_files:
  - supabase/migrations/20260415_000002_schedule_shifts.sql
  - supabase/seed.sql
  - apps/web/src/lib/server/schedule.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
  - apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte
  - apps/web/src/lib/schedule/recurrence.ts
  - apps/web/tests/schedule/recurrence.unit.test.ts
  - apps/web/tests/schedule/server-actions.unit.test.ts
  - apps/web/tests/schedule/board.unit.test.ts
  - apps/web/tests/e2e/calendar-shifts.spec.ts
  - apps/web/tests/e2e/fixtures.ts
key_decisions:
  - D011 — Persist recurring schedules as concrete `public.shifts` rows with bounded provenance in `public.shift_series`.
  - D012 — Keep schedule loading route-scoped to `/calendars/[calendarId]` and re-derive calendar/shift authority server-side for every mutation.
  - D013 — Generate shift/series ids in trusted create actions and insert without `.select()` because local Supabase RLS blocks fresh-row representation reads even when inserts succeed.
  - D014 — Capture schedule proof diagnostics centrally in the shared Playwright fixture so failing browser phases retain calendar/week/shift context and failed-request metadata.
patterns_established:
  - Persist recurring intent in `shift_series` while keeping concrete editable occurrences in `shifts`.
  - Load schedule data one validated visible week at a time on the page route rather than overfetching in the app shell.
  - Treat every browser-submitted calendar, shift, date, and recurrence value as untrusted until normalized and re-authorized server-side.
  - Prefer deterministic seeded ids plus shared Playwright flow diagnostics for browser-proof slices so failures stay reproducible.
observability_surfaces:
  - `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` visible-week metadata and typed action states.
  - `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` route-state, denied-state, and schedule action diagnostics.
  - `apps/web/tests/schedule/recurrence.unit.test.ts`, `apps/web/tests/schedule/server-actions.unit.test.ts`, and `apps/web/tests/schedule/board.unit.test.ts` as deterministic contract surfaces.
  - `apps/web/tests/e2e/fixtures.ts` flow-diagnostics attachment with phase/calendar/week/shift context, console/page errors, and failed requests.
  - `apps/web/tests/e2e/calendar-shifts.spec.ts` end-to-end proof for same-day visibility, recurring create, edit, move, delete, reload continuity, and denied access.
drill_down_paths:
  - .gsd/milestones/M001/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S02/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S02/tasks/T03-SUMMARY.md
  - .gsd/milestones/M001/slices/S02/tasks/T04-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-15T07:29:44.299Z
blocker_discovered: false
---

# S02: Multi-shift calendar model and browser editing flows

**Completed the protected multi-shift scheduling substrate for shared calendars, including bounded recurrence, trusted server mutations, a custom week board, and deterministic browser proof for create/edit/move/delete plus denied access.**

## What Happened

## Delivered capability
S02 turned the protected calendar route from a placeholder shell into a real shared scheduling surface. The slice introduced a Supabase-backed schedule model with bounded recurrence, `shift_series` provenance, and concrete editable `shifts` rows seeded with deterministic same-day, overlapping, and recurring Alpha-calendar fixtures. On the web route, schedule loading now stays week-scoped on `/calendars/[calendarId]`, and every create/edit/move/delete mutation re-derives calendar and shift authority on the server instead of trusting browser-supplied ids. The browser UI now renders a custom calm week board that supports multiple cards per day, bounded recurring creation, edit-in-place, explicit move timing, delete flows, empty-day states, and the unchanged explicit denied branch for unauthorized calendar ids.

## Requirement and integration closure
This slice delivered the primary proof for R003 and R007 and re-verified the S01 trust boundary that supports R001, R002, and R012. The seeded Alpha week now proves multiple same-day shifts and recurring concrete occurrences, while direct navigation to the seeded Beta calendar id still fails closed with visible reason and failure-phase metadata. Downstream slices can treat concrete `shifts` rows, deterministic ids, typed schedule action states, and route-scoped visible-week loading as the scheduling substrate they must preserve rather than replace.

## Observability and diagnostics
Health signal: the protected calendar route exposes visible-week metadata, deterministic seeded ids, total visible shift counts, and typed create/edit/move/delete success states such as `SHIFT_CREATED`, `SHIFT_UPDATED`, `SHIFT_MOVED`, and `SHIFT_DELETED`. Failure signal: invalid schedule inputs surface named reasons like `RECURRENCE_BOUND_REQUIRED` and `AUTH_REQUIRED`, denied calendar routes retain failure phase plus attempted id, and Playwright attaches flow diagnostics with current phase, calendar/week context, focused shift ids, console/page errors, and failed responses. Recovery procedure: reset the local Supabase stack, rerun the schedule unit suite plus `calendar-shifts.spec.ts`, and inspect the retained Playwright flow-diagnostics artifact before touching route or RLS code. Monitoring gap: production-grade telemetry, alerts, and cross-session mutation analytics do not exist yet; current readiness depends on deterministic fixtures, test coverage, and UI-visible state.

## What this slice provides downstream
S03 inherits a trustworthy week-scoped schedule contract and deterministic fixture week for offline persistence work. S04 inherits authoritative concrete shift rows, server-generated ids, and typed mutation outcomes for reconciliation/realtime propagation. S05 inherits same-day and overlapping fixtures plus the browser week board where baseline conflict visibility can be layered without changing the storage model.

## Verification

Executed every slice-level verification check from the plan and all passed.

1. `pnpm --dir apps/web check`
   - Passed with 0 Svelte/TypeScript errors and 0 warnings.
2. `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/recurrence.unit.test.ts tests/schedule/server-actions.unit.test.ts`
   - Passed: 4 test files, 30 tests total.
3. `npx --yes supabase db reset --local --yes`
   - Passed and re-seeded the deterministic local schedule fixtures.
4. `pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`
   - Passed: 2/2 tests covering seeded same-day visibility, recurring create validation + success, edit, move, delete, reload continuity, and unauthorized calendar denial.

Observability verification also passed through the same proof surfaces: the route exposed visible-week metadata and typed action states, the denied branch kept failure phase/reason visible, and the Playwright fixture attached centralized flow-diagnostics artifacts with phase/calendar/week context plus failed-request capture.

## Requirements Advanced

- R001 — S02 re-verified the protected auth/session boundary while exercising real schedule writes on the trusted calendar route.
- R002 — The protected shared-calendar route now carries real schedule data and mutations while preserving membership-derived access scope.
- R006 — Concrete same-day and overlapping shift fixtures established the substrate that S05 will inspect for baseline conflict visibility.
- R012 — Cross-calendar route denial and server-side mutation authority checks were re-proven during schedule editing work.

## Requirements Validated

- R003 — Passed `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/board.unit.test.ts tests/schedule/recurrence.unit.test.ts tests/schedule/server-actions.unit.test.ts` plus `npx --yes supabase db reset --local --yes` and `pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`, proving same-day multi-shift rendering, bounded recurring create, edit, move, delete, and reload continuity.
- R007 — Passed `pnpm --dir apps/web check`, schedule board/action unit coverage, and browser proof for the calm custom week board, explicit controls, visible denied state, and UI-visible schedule diagnostics.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

Used explicit schedule test file paths instead of the slice plan's unquoted shell glob during Vitest verification, because repo-root shell expansion can skip `apps/web/tests/schedule/*.unit.test.ts`. The Playwright harness itself did not require `apps/web/playwright.config.ts` changes once the deterministic seeded week and shared diagnostics fixture were in place.

## Known Limitations

Move is implemented through explicit timing controls rather than drag-and-drop, which is acceptable for M001 but still less direct than a future richer interaction model. Offline continuity, realtime propagation, and conflict warnings are not part of this slice yet. Operational monitoring is currently test- and diagnostic-surface-driven rather than backed by production metrics or alerts.

## Follow-ups

S03 should persist the same trusted visible-week schedule surface locally so previously synced calendars remain usable offline with cached-session continuity. S04 should build on the deterministic shift/series ids and typed action states to reconcile local edits and propagate shared updates live. S05 should layer conflict visibility on top of the concrete `shifts` rows and existing same-day/overlap fixtures instead of inventing a second schedule representation.

## Files Created/Modified

- `supabase/migrations/20260415_000002_schedule_shifts.sql` — Added bounded recurrence schema, concrete shift storage, RLS policies, and deterministic seeded schedule fixtures for the Alpha/Beta proof surface.
- `supabase/seed.sql` — Extended seed data with deterministic recurring, same-day, and overlapping shift fixtures used by unit and browser proof.
- `apps/web/src/lib/schedule/recurrence.ts` — Added recurrence normalization/expansion helpers and board shaping logic for the week-view surface.
- `apps/web/src/lib/server/schedule.ts` — Implemented trusted week-scoped schedule loading plus create/edit/move/delete server actions behind the protected calendar route.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — Replaced the placeholder calendar shell with the custom multi-shift week board, create dialog, edit/move controls, and denied-state-preserving route UI.
- `apps/web/tests/schedule/board.unit.test.ts` — Added board, recurrence, protected-route, and server-action unit coverage for the scheduling contract.
- `apps/web/tests/e2e/calendar-shifts.spec.ts` — Added deterministic Playwright proof for same-day multi-shift load, recurring create, edit, move, delete, reload continuity, and denied access.
