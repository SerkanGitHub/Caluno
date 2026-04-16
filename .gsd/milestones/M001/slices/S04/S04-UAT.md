# S04: Sync engine and realtime shared updates — UAT

**Milestone:** M001
**Written:** 2026-04-16T08:30:08.927Z

# UAT — S04 Sync engine and realtime shared updates

## Preconditions
- Local Supabase stack is reset and seeded: `npx --yes supabase db reset --local --yes`.
- Web app can run in both dev and preview-backed Playwright surfaces.
- Seeded users exist: `bob@example.com` (Alpha member) and `dana@example.com` (Alpha collaborator).
- Target calendar: `Alpha shared`, visible week `2026-04-13` through `2026-04-20`.

## Test Case 1 — Trusted refresh never clobbers pending local work
1. Sign in as `bob@example.com` and open `Alpha shared` for week `2026-04-13`.
   - Expected: route state shows `trusted-online`, board renders the seeded week, and local state shows `0 pending / 0 retryable`.
2. Force the browser offline and reopen the same week from cached continuity.
   - Expected: route switches to `cached-offline`, board switches to `Cached local board`, and previously synced seeded shifts remain visible.
3. Create one offline shift, edit one seeded shift, move one seeded shift, and delete one seeded shift.
   - Expected: board updates immediately after each action, queue count increments, local-only/pending badges remain visible, and no action requires a new calendar scope.
4. Reload while still offline.
   - Expected: the same local changes remain visible after reload, queue count is preserved, and no trusted refresh erases the local edits.

## Test Case 2 — Reconnect drains queued work deterministically
1. Starting from the offline state above, restore connectivity while staying on the same Alpha calendar week.
   - Expected: sync diagnostics move through a reconnect/drain phase, queue count trends back to `0 pending / 0 retryable`, and board returns to `Server-synced board`.
2. Confirm the offline-created shift still exists, the offline edit remains applied, the moved shift stays in its new day column, and the deleted shift stays absent.
   - Expected: all four operations are preserved after trusted confirmation and reload.
3. Inspect the diagnostics rail.
   - Expected: a last reconnect attempt timestamp is visible, sync returns to `idle`, and no retryable queue entries remain.

## Test Case 3 — Online collaborators receive trusted shared refreshes
1. Open the same Alpha week in two signed-in browser sessions: Bob and Dana.
   - Expected: both sessions show the same visible week, `trusted-online`, `0 pending / 0 retryable`, and a ready realtime channel once subscriptions settle.
2. In Bob’s session, create a new one-off shift inside the current visible week.
   - Expected: Bob sees the shift immediately and remains in the same route scope.
3. Without manually reloading Dana’s page, wait for the shared refresh.
   - Expected: Dana receives a realtime signal, the route refreshes through the trusted loader, the new shift appears exactly once, and the board remains `Server-synced board`.

## Test Case 4 — Out-of-scope weeks do not refresh incorrectly
1. Keep Bob on the current Alpha week and place Dana on the next visible week for the same calendar.
2. Create a shift in Bob’s current week.
   - Expected: Dana’s next-week page does not jump weeks, does not show the current-week shift, and does not apply a mis-scoped refresh.

## Test Case 5 — Failure visibility remains inspectable
1. Induce an offline or reconnect failure condition (for example, disconnect before drain or cause a retryable transport failure).
   - Expected: queue counts, sync phase, last error reason/detail, and board source remain visible on the calendar route.
2. If realtime is unavailable, inspect the realtime diagnostics.
   - Expected: channel state and remote refresh state explain whether the channel is closed, retrying, or ready.

## Edge Cases / Notes
- Delete events must remain conservative: missing or mis-scoped realtime payload metadata must not apply board changes directly.
- For browser automation, use the deterministic shift-editor helper that fills the full payload and submits atomically; uncontrolled field resets can otherwise make the proof surface flaky.
- Known current gap: preview-backed offline/realtime automation can still fail before the browser-local repository or realtime channel reaches a ready state. When this reproduces, capture the retained trace/video and inspect `calendar-route-state`, `calendar-local-state`, and `calendar-realtime-state` before rerunning.
