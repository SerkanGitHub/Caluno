# S03: Offline local persistence with cached-session continuity — UAT

**Milestone:** M001
**Written:** 2026-04-15T14:13:38.779Z

# S03 UAT — Offline local persistence with cached-session continuity

## Preconditions
- Local Supabase stack is running and reset with seeded data.
- Web app is built or running on the preview-backed/offline-capable surface with service worker enabled.
- Seeded member `bob@example.com` can sign in and has access to the Alpha shared calendar but not the Beta shared calendar.
- Browser profile is clean enough that this test can observe first online sync and subsequent offline reopen.

## Test Case 1 — Warm the trusted shell and calendar cache online
1. Open `/signin` and sign in as `bob@example.com`.
   - Expected: the groups shell renders in `trusted-online` mode.
2. Open the seeded Alpha shared calendar for week start `2026-04-13`.
   - Expected: the calendar shell renders, the week board is visible, and route/local state surfaces show trusted online data.
3. Confirm the visible week includes the seeded Alpha shifts and recurring sweep entries.
   - Expected: Wednesday and Thursday show the known seeded multi-shift data.

## Test Case 2 — Reopen a previously synced calendar offline
1. After the Alpha calendar has loaded online once, force the browser offline.
2. Reload the same Alpha calendar route or close/reopen the browser tab on that same route.
   - Expected: the calendar reopens in cached-offline mode.
   - Expected: the board renders from browser-local data, not an empty shell.
   - Expected: the UI surfaces cached/offline status and visible-week origin.
3. Navigate back to groups while still offline.
   - Expected: only previously synced trusted groups/calendars remain visible; no new scope appears.

## Test Case 3 — Create, edit, move, and delete locally while offline
1. While offline on the Alpha calendar, create a new one-off or bounded recurring shift inside the visible week.
   - Expected: the board updates immediately and marks the new work as local/pending.
2. Edit an existing visible shift offline.
   - Expected: the board reflects the new title/time immediately and marks it as local/pending.
3. Move a visible shift to another day in the same visible week.
   - Expected: the original day loses the shift and the target day shows it immediately.
4. Delete a visible shift offline.
   - Expected: the card disappears immediately and the board shows local/pending state.

## Test Case 4 — Reload persistence for local offline changes
1. Stay offline and reload the same Alpha calendar route again.
   - Expected: all offline-created/edited/moved/deleted changes remain present after reload.
2. Inspect the route and local-first diagnostics.
   - Expected: queue counts or local diagnostics still reflect that unconfirmed work exists.
   - Expected: the last visible week and cached snapshot metadata remain inspectable.

## Test Case 5 — Fail closed for unsynced or unauthorized ids while offline
1. While still offline, navigate directly to the Beta shared calendar id (never previously synced for this user/browser).
   - Expected: the route does not render a guessed board.
   - Expected: an explicit denied state appears with a named failure phase/reason.
2. Try another malformed or unsynced calendar id.
   - Expected: the route fails closed again with named denial metadata.

## Edge Cases
- If the cached app-shell snapshot is missing or malformed, offline reopen must deny access instead of showing empty data.
- If the local repository cannot persist a write, the UI must surface a named local failure instead of silently pretending the change is durable.
- If the visible week query parameter is invalid, the route must fall back deterministically and surface the reason instead of guessing.
- No offline path may widen authority beyond the previously synced permitted calendar inventory.
