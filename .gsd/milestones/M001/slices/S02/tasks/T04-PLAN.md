---
estimated_steps: 4
estimated_files: 3
skills_used: []
---

# T04: Prove multi-shift browser editing and denied access with Playwright diagnostics

**Slice:** S02 — Multi-shift calendar model and browser editing flows
**Milestone:** M001

## Description

Close the slice with a real browser proof that exercises the new schedule surface against the local Supabase runtime. This task proves **R003** and **R007** end to end while guarding **R012** by asserting that the existing denied route still holds even after the calendar page becomes editable.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Local Supabase runtime + seeded data | Stop on reset/test setup, capture diagnostics, and do not trust stale local data. | Retry only after the local stack is healthy; keep tests serial and deterministic. | Treat malformed seed data as a fixture failure and surface the broken id/range in diagnostics. |
| Vite/Playwright browser harness | Retain trace/video/screenshots and attach flow diagnostics so the failing phase is obvious. | Respect the known cold-start settle delay before sign-in/calendar interactions and fail with the current phase attached if readiness never arrives. | Surface failed requests/page errors in the fixture diagnostics rather than inferring success from navigation alone. |

## Load Profile

- **Shared resources**: local Supabase reset, Playwright webServer, and one serial browser session with create/edit/move/delete steps.
- **Per-operation cost**: one end-to-end scenario against a seeded week plus one denied-route assertion.
- **10x breakpoint**: local runtime startup and serial browser time dominate first, so fixtures must stay deterministic and avoid wide-range navigation.

## Negative Tests

- **Malformed inputs**: guessed/unauthorized calendar URL and invalid seeded ids/ranges.
- **Error paths**: failed form submission, missing recurrence occurrence after create, and denied route regression after the page becomes editable.
- **Boundary conditions**: same-day multiple shifts already visible on load, recurring create shows more than one occurrence, edit changes a card in place, move changes the day column, and delete removes the card from the board.

## Steps

1. Extend `apps/web/tests/e2e/fixtures.ts` with seeded shift ids, visible-week helpers, and flow diagnostics that record the current calendar/week/phase without leaking secrets.
2. Add `apps/web/tests/e2e/calendar-shifts.spec.ts` to prove: visible same-day multi-shift state on load, recurring create, edit, move, delete, reload continuity, and the unchanged denied-route behavior for an unauthorized calendar id.
3. Update `apps/web/playwright.config.ts` only as needed to keep the schedule proof deterministic and artifact-friendly.
4. Preserve the S01 cold-start lesson by waiting briefly after the sign-in shell is first visible before typing on fresh browser runs.

## Must-Haves

- [ ] The browser proof covers create, edit, move, delete, and same-day multi-shift visibility in one deterministic visible week.
- [ ] Recurring create proves multiple concrete occurrences render after submission.
- [ ] Unauthorized calendar navigation still renders the named denied surface after schedule features are added.
- [ ] Flow diagnostics make the failing phase and fixture ids obvious when the spec breaks.

## Verification

- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`
- Confirm retained Playwright diagnostics identify the current phase, calendar id, visible week, and failed requests if the spec breaks.

## Observability Impact

- Signals added/changed: flow diagnostics now include seeded shift ids, visible-week context, failed requests, page errors, and current phase for schedule editing flows.
- How a future agent inspects this: rerun `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts` and inspect retained Playwright artifacts plus the attached JSON diagnostics.
- Failure state exposed: cold-start readiness issues, failed writes, denied-route regressions, and missing rerendered occurrences become explicit in test artifacts.

## Inputs

- `apps/web/tests/e2e/fixtures.ts` — existing auth/access browser fixtures and diagnostics pattern.
- `apps/web/tests/e2e/auth-groups-access.spec.ts` — reference style for protected-route assertions and retained diagnostics.
- `apps/web/playwright.config.ts` — local Supabase + Vite browser harness.
- `supabase/seed.sql` — deterministic schedule fixtures from T01.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — browser schedule surface from T03.

## Expected Output

- `apps/web/tests/e2e/fixtures.ts` — schedule-aware browser helpers and diagnostics.
- `apps/web/tests/e2e/calendar-shifts.spec.ts` — end-to-end proof for multi-shift editing and denied access.
- `apps/web/playwright.config.ts` — any stability tweaks needed for the new proof loop.
