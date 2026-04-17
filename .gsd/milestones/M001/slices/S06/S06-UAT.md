# S06: S06 — UAT

**Milestone:** M001
**Written:** 2026-04-17T07:08:01.376Z

# S06 UAT

## Preconditions
- Local Supabase is available and can be reset with `npx --yes supabase db reset --local --yes`.
- Browser proof uses `pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts ...` against the preview-backed runtime.
- Seeded Alpha calendar data is present, including the known Thursday overlap between Kitchen prep and Supplier call.

## Test Case 1 — Cached offline reopen and reload continuity
1. Reset local Supabase.
   - Expected: seed data and users are restored.
2. Run `tests/e2e/calendar-offline.spec.ts` in isolation.
   - Expected: the proof surface first confirms isolation headers and a live service worker.
3. Sign in as the seeded Alpha member and open the shared Alpha week online.
   - Expected: the route is `trusted-online`, the local state becomes ready, and the seeded Thursday overlap is visible.
4. Go offline, create a Friday shift, edit an existing shift, move Supplier call into Friday overlap, and delete the seeded opening sweep while remaining on the same permitted calendar.
   - Expected: queue counts increase locally, the route stays in cached/offline mode, and a Friday overlap warning becomes visible immediately.
5. Reload while still offline and reopen the cached Alpha route.
   - Expected: pending local work survives reload, the Friday overlap warning is still visible, and an unsynced/guessed calendar id still fails closed.
6. Restore connectivity and let reconnect drain.
   - Expected: sync returns to `0 pending / 0 retryable`, the locally created shift is re-resolved by server-confirmed id, and the Friday overlap warning is still visible after the board returns online.

## Test Case 2 — Same-week collaborator refresh through trusted realtime
1. Reset local Supabase.
2. Run `tests/e2e/calendar-sync.spec.ts` in isolation.
   - Expected: both browser sessions open the same Alpha calendar week and reach `data-channel-state="ready"`.
3. In the primary session, create a new overlapping Thursday shift.
   - Expected: the writer board shows the new server-confirmed shift, queue remains `0 pending / 0 retryable`, and board/day/shift conflict counts increase.
4. Observe the collaborator session without manual reload.
   - Expected: realtime diagnostics reach `data-remote-refresh-state="applied"`, the collaborator sees the created shift, and overlap warnings update live while staying on the same trusted week.

## Test Case 3 — Out-of-scope next-week guard
1. Reset local Supabase.
2. Open the writer on the seeded current week and the collaborator on the next week.
   - Expected: both sessions are ready, but the collaborator week remains conflict-free for that next-week scope.
3. Create a current-week overlap in the writer session.
   - Expected: the writer board conflict count increases relative to its current baseline.
4. Inspect the collaborator next-week session.
   - Expected: no current-week shift appears, remote refresh state stays `idle`, and the collaborator remains on the next-week URL and visible-week scope.

## Edge Cases / Known Blocker Check
1. Reset local Supabase once and run `calendar-offline.spec.ts` and `calendar-sync.spec.ts` together in one command.
   - Current expected outcome: **needs attention**. The combined run is still sensitive to shared seeded-week mutations across spec files, so it is not yet a green milestone-validation command.
2. If realtime diagnostics show `REALTIME_AUTH_APPLY_FAILED` again, inspect the browser proof for browser-session hydration regressions before weakening assertions.
3. If a shift-identity assertion fails after reconnect or collaborator refresh, confirm the proof is resolving the visible card by exact heading and server-confirmed id rather than a stale `local-*` id or substring-only match.
