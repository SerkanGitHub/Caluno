# S03: S03 — UAT

**Milestone:** M003
**Written:** 2026-05-04T10:50:05.331Z

# UAT — S03 Mobile Find time and create handoff

## Preconditions
- Docker Desktop is running locally.
- From the repo root, local Supabase has been reset with `npx --yes supabase db reset --local --yes`.
- Mobile Playwright harness can start with local public Supabase env from `supabase status --output env`.
- Use seeded user `bob@example.com / password123`.
- Test against `apps/mobile` on the local Playwright web server.

## Scenario 1 — Enter Find time from the real mobile board
1. Sign in as the seeded Alpha member.
   - Expected: The mobile shell opens trusted content; no config or invalid-session surface appears.
2. Open the Alpha shared calendar for week `2026-04-13`.
   - Expected: The calendar board is visible and the route state reports `trusted-online`.
3. Locate the `Find time` CTA in the board header.
   - Expected: The CTA is visible and exposes the current calendar id, visible week start, and default duration metadata.
4. Tap `Find time`.
   - Expected: The app navigates to `/calendars/<calendarId>/find-time`, keeping the same calendar context.

## Scenario 2 — Run mobile Find time and inspect compact results
1. On the Find time route, set duration to `60` and search start to `2026-04-15`.
2. Submit the search.
   - Expected: Route status becomes `ready`.
   - Expected: Top picks count is `3` and browse results are present.
   - Expected: Top picks render before browse windows.
   - Expected: Result cards expose stable handoff metadata and `Create from this slot` CTAs.
3. Inspect one shortlist card and one browse card.
   - Expected: Each card shows who is free, blocked-member context when relevant, and nearby constraint summaries without widening authority.

## Scenario 3 — Hand a chosen slot into mobile create
1. Tap `Create from this slot` on the first Top pick.
   - Expected: Navigation returns to the calendar route for the same calendar and week.
   - Expected: The existing create sheet opens automatically once.
   - Expected: The sheet shows a visible `From Find time` cue.
   - Expected: Start/end inputs are prefilled with the exact slot values from the chosen suggestion.
2. Confirm the URL after first render.
   - Expected: Transient `create`, `prefill*`, and `source` params are stripped immediately, while `start=2026-04-13` remains.

## Scenario 4 — Create from the handoff and verify reload behavior
1. Submit a new shift titled `Find time handoff coverage shift` from the auto-opened create sheet.
   - Expected: The shift is created on the intended day column.
   - Expected: Pending and retryable queue counts remain `0` after trusted submission.
2. Reload the calendar route.
   - Expected: The create sheet does not reopen.
   - Expected: Create-prefill route diagnostics reset to `none`.
   - Expected: The newly created shift remains visible on the intended day.

## Scenario 5 — Out-of-scope Find time stays denied
1. While signed in as the Alpha member, navigate directly to the Beta shared calendar Find time route.
   - Expected: The route shows the explicit denied surface.
   - Expected: Reason is `calendar-missing` with denial phase `calendar-lookup`.
   - Expected: Top-pick and browse counts are both `0`.

## Scenario 6 — Offline Find time fails closed
1. Warm the Alpha shared calendar route while online.
2. Simulate offline connectivity.
3. Open the warmed Find time route.
   - Expected: The route shows `offline-unavailable` instead of replaying cached results.
   - Expected: Network state is `offline`.
   - Expected: Top-pick and browse counts are both `0`.

## Scenario 7 — Malformed arrival params stay attributable
1. Navigate directly to the Alpha shared calendar route with malformed `prefillStartAt` and valid `create/source` params.
   - Expected: The calendar route reports create-prefill status `rejected`.
   - Expected: The create sheet does not auto-open.
   - Expected: Malformed one-shot params are stripped after route resolution.
2. Reload the route.
   - Expected: Create-prefill state remains `none` and the malformed arrival does not reopen.

