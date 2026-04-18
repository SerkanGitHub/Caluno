---
id: T02
parent: S03
milestone: M002
key_files:
  - apps/web/src/lib/schedule/create-prefill.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
  - apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte
  - apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte
  - apps/web/tests/routes/protected-routes.unit.test.ts
  - apps/web/tests/schedule/create-prefill.unit.test.ts
key_decisions:
  - Consume one-shot create-prefill params in both the browser URL and the server action search-param path so reloads and follow-on writes cannot reopen a stale Find time handoff.
  - Expose the handoff source and exact prefill window through dialog `data-testid` and `data-*` attributes so future browser proof can inspect open-on-arrival state and exact slot values directly.
duration: 
verification_result: passed
completed_at: 2026-04-18T20:22:51.213Z
blocker_discovered: false
---

# T02: Wired calendar handoff prefills through the create dialog, consumed one-shot params safely, and proved the route/action contract.

**Wired calendar handoff prefills through the create dialog, consumed one-shot params safely, and proved the route/action contract.**

## What Happened

I threaded the validated `createPrefill` payload from `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` into the calendar route and the week-level create dialog, while keeping edit and move dialogs isolated from the new state. On the server, the route now parses the Find time handoff contract and exposes it only when the payload is valid; malformed handoff params fail closed and the calendar week still renders from the normal schedule contract. I also centralized one-shot handoff query handling in `apps/web/src/lib/schedule/create-prefill.ts`, then reused that helper in both the route action path and the browser route shell so `create`, `prefillStartAt`, `prefillEndAt`, and `source` are consumed after arrival instead of sticking across later writes or reloads. On the client, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` now replaces the URL in place after load, preserving only the visible `start=` week, and `CalendarWeekBoard.svelte` threads the optional prefill state only into the week create entrypoint. In `ShiftEditorDialog.svelte`, a valid prefill opens the create dialog once, surfaces an explicit `From Find time` cue with inspectable `data-testid` and handoff attributes, and uses the exact slot start/end values ahead of day defaults without changing manual create or edit/move behavior. I expanded route and contract proof in `apps/web/tests/routes/protected-routes.unit.test.ts` and `apps/web/tests/schedule/create-prefill.unit.test.ts` to cover valid prefill threading, malformed fallback, and one-shot search-param stripping, then confirmed the broader seeded browser flows still pass after the new handoff wiring.

## Verification

Verified the task-level proof bar with `pnpm --dir apps/web exec vitest run tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts`, which passed all contract and protected-route cases including the new valid-prefill, malformed-prefill, and follow-on action cleanup assertions. Verified route typing and Svelte integration with `pnpm --dir apps/web check`, which completed with zero diagnostics. I also ran the slice-level browser proof command `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts tests/e2e/calendar-shifts.spec.ts`; after one debugging pass to move the route test helper behind an underscore export accepted by SvelteKit, the local database reset and all five seeded Playwright scenarios passed, confirming the trusted calendar board and find-time flows still work end to end.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web exec vitest run tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts` | 0 | ✅ pass | 1848ms |
| 2 | `pnpm --dir apps/web check` | 0 | ✅ pass | 3904ms |
| 3 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts tests/e2e/calendar-shifts.spec.ts` | 0 | ✅ pass | 37274ms |

## Deviations

I added a small shared cleanup helper surface to `apps/web/src/lib/schedule/create-prefill.ts` and used an underscore-prefixed route helper export for unit proof because live SvelteKit page-server modules reject arbitrary named exports. This stayed within the task contract and was the minimal change needed to keep the route testable without weakening runtime behavior.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/lib/schedule/create-prefill.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`
- `apps/web/tests/routes/protected-routes.unit.test.ts`
- `apps/web/tests/schedule/create-prefill.unit.test.ts`
