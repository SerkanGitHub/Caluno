# S01: Truthful availability search route — UAT

**Milestone:** M002
**Written:** 2026-04-18T17:07:32.928Z

# UAT — S01 Truthful availability search route

## Preconditions
- Local Supabase seed is reset and loaded with the Alpha/Beta fixtures from `supabase/seed.sql`.
- Web app is running with the current S01 code.
- Use seeded account `bob@example.com / password123` for Alpha-only access.
- The Alpha shared calendar id is `aaaaaaaa-aaaa-1111-1111-111111111111` and the Beta shared calendar id is `bbbbbbbb-bbbb-2222-2222-222222222222`.

## Test Case 1 — Permitted member opens Find time from the calendar board
1. Sign in as `bob@example.com`.
   - Expected: the protected groups shell loads successfully.
2. Open the Alpha shared calendar for week start `2026-04-13`.
   - Expected: the calendar board renders and shows the `Browse truthful find-time` entrypoint.
3. Click `Browse truthful find-time` from the calendar hero.
   - Expected: the browser navigates to `/calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?...` and the find-time shell is visible.
4. Confirm the default duration input is `60` and then search with `duration=60` and `start=2026-04-15`.
   - Expected: the route state and search state both show `ready`.
5. Review the results list.
   - Expected: the summary reports `9 truthful windows`, the result container exposes `data-window-count="9"`, and visible member names come only from the authorized Alpha roster (`Alice Owner`, `Bob Member`, `Dana Multi-Group`).
6. Inspect the first, focused, and last cards.
   - Expected: each card shows an exact slot, a wider continuous span, and named available members; the first card starts at `2026-04-15T00:00:00.000Z`, the focused card includes `Bob Member` and `Dana Multi-Group`, and the last card starts at `2026-04-16T15:00:00.000Z`.

## Test Case 2 — Invalid input stays explicit instead of guessing
1. While signed in as the Alpha member, open `/calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=10&start=2026-04-15`.
   - Expected: the page loads the protected route but does not show truthful result cards.
2. Inspect the route/search diagnostics.
   - Expected: the UI shows an explicit invalid-input/error surface rather than empty success content, and the message explains that the requested duration is outside the trusted bounds.

## Test Case 3 — Unauthorized calendar access fails closed
1. While signed in as `bob@example.com`, open `/calendars/bbbbbbbb-bbbb-2222-2222-222222222222/find-time?duration=60&start=2026-04-15`.
   - Expected: the route renders the denied state instead of any roster or result data.
2. Inspect the denial details.
   - Expected: the UI shows `calendar-missing` as the reason, `calendar-lookup` as the failure phase, and the attempted Beta calendar id; no Beta member roster or availability windows are exposed.

## Test Case 4 — Offline entry stays fail-closed even after the route is warmed
1. Sign in as the Alpha member and open the Alpha calendar board online.
   - Expected: the board and offline runtime surface render successfully.
2. Capture the `Browse truthful find-time` link target from the calendar board.
   - Expected: the href points at the Alpha `/find-time` route.
3. Simulate browser-offline semantics for the next navigation and then open the warmed `/find-time` URL.
   - Expected: the page still opens the protected document shell.
4. Inspect the find-time state surfaces.
   - Expected: the shell state shows `cached-offline`, the route state shows `offline-unavailable`, the screen states that find-time is fail-closed offline, and no result cards are rendered.

## Edge Focus
- Confirm that only already authorized member names appear in result cards.
- Confirm that denied/offline/invalid-input states remain visually distinct and never degrade into a silent empty list.
- Confirm that the route never replays stale cached match results as if they were trusted when offline.
