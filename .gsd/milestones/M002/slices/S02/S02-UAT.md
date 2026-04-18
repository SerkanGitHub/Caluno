# S02: Ranked suggestions and explanation quality — UAT

**Milestone:** M002
**Written:** 2026-04-18T20:00:09.713Z

# UAT — S02 Ranked suggestions and explanation quality

## Preconditions
- Local Supabase seed is reset and loaded with the Alpha/Beta fixtures from `supabase/seed.sql`.
- Web app is running with the current S02 code.
- Use seeded account `bob@example.com / password123` for Alpha-only access.
- The Alpha shared calendar id is `aaaaaaaa-aaaa-1111-1111-111111111111` and the Beta shared calendar id is `bbbbbbbb-bbbb-2222-2222-222222222222`.
- The seeded find-time query remains `duration=60` and `start=2026-04-15`.

## Test Case 1 — Permitted member sees ranked Top picks before the browse inventory
1. Sign in as `bob@example.com`.
   - Expected: the protected groups shell loads successfully.
2. Open the Alpha shared calendar for week start `2026-04-13`.
   - Expected: the calendar board renders and shows the `Browse truthful find-time` entrypoint.
3. Click the find-time entrypoint from the calendar board.
   - Expected: the browser navigates to `/calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time` and the find-time shell becomes visible.
4. Search with `duration=60` and `start=2026-04-15`.
   - Expected: both route and search states show `ready`.
5. Review the summary and result container.
   - Expected: the summary reports `9 truthful windows`, the result shell exposes `data-window-count="9"`, `data-top-pick-count="3"`, and `data-browse-count="6"`.
6. Confirm the layout order.
   - Expected: the `Top picks` section appears before the `Browse all ranked windows` section.
7. Inspect the three Top pick cards.
   - Expected: they appear in ranked order with these exact slots:
     - Top pick 1: `2026-04-16T15:00:00.000Z` → `2026-04-16T16:00:00.000Z`
     - Top pick 2: `2026-04-15T15:00:00.000Z` → `2026-04-15T16:00:00.000Z`
     - Top pick 3: `2026-04-15T00:00:00.000Z` → `2026-04-15T01:00:00.000Z`
   - Expected: all three list the authorized Alpha roster names `Alice Owner`, `Bob Member`, and `Dana Multi-Group` as free members.

## Test Case 2 — Top picks explain why a suggestion works and why nearby times do not
1. Inspect Top pick 1 in the Top picks surface.
   - Expected: the card shows `Who is free`, `Who is blocked`, `Why earlier times fail`, and `Why nearby later times fail` panels.
2. Read the free-member panel for Top pick 1.
   - Expected: it lists `Alice Owner`, `Bob Member`, and `Dana Multi-Group`.
3. Read the blocked-member panel for Top pick 1.
   - Expected: it explicitly says `All named members stay free across this exact slot.`
4. Read the leading and trailing nearby-edge panels for Top pick 1.
   - Expected: both show the no-constraint fallback copy (`No trusted busy interval pushes into the start edge...` / `...trailing edge...`) instead of blank space or guessed data.
5. Verify redaction boundaries while reviewing the card.
   - Expected: only already-authorized roster names and same-calendar shift titles appear; no unrelated calendar or group member data is exposed.

## Test Case 3 — Browse cards stay compact but still explain nearby blocked edges truthfully
1. Scroll to the browse inventory and inspect Browse card 3.
   - Expected: the card is labeled `Browse 3` and does not duplicate the full Top-pick explanation headings such as `Who is blocked` or `Why earlier times fail`.
2. Read the browse free-members panel.
   - Expected: it shows `Bob Member · Dana Multi-Group`.
3. Read the browse nearby-edge summary.
   - Expected: it shows `Before: Alpha opening sweep (Alice Owner)` and `After: Morning intake (Alice Owner)`.
4. Confirm nearby-edge truthfulness.
   - Expected: the browse card communicates that `Alice Owner` is the blocked nearby member without exposing any foreign roster or cross-group data.

## Test Case 4 — Unauthorized calendar access still fails closed
1. While signed in as `bob@example.com`, open `/calendars/bbbbbbbb-bbbb-2222-2222-222222222222/find-time?duration=60&start=2026-04-15`.
   - Expected: the route renders the denied state instead of any Top picks, browse cards, or Beta roster data.
2. Inspect the denial details.
   - Expected: the UI shows `calendar-missing` as the reason, `calendar-lookup` as the failure phase, and the attempted Beta calendar id.

## Test Case 5 — Offline entry still fails closed after warming the route
1. Sign in as the Alpha member and open the Alpha calendar board while online.
   - Expected: the board and offline runtime surface render successfully.
2. Capture the `Browse truthful find-time` link target from the board.
   - Expected: the href points at the Alpha `/find-time` route.
3. Force browser-offline semantics for the next navigation and then open the warmed `/find-time` URL.
   - Expected: the protected shell still loads.
4. Inspect the route state and visible content.
   - Expected: the shell state shows `cached-offline`, the route state shows `offline-unavailable`, the screen states that find time is fail-closed offline, and no Top picks or browse result cards render.

## Edge Focus
- Confirm Top picks are computed before truncation rather than merely reordering the first chronological page.
- Confirm Top picks carry richer explanation density than browse cards.
- Confirm only already authorized member names and same-calendar shift titles appear in explanation surfaces.
- Confirm denied and offline states remain explicit and never degrade into a silent empty shortlist or stale cached results.
