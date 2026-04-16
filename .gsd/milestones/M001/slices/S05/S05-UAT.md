# S05: Baseline conflict detection and milestone assembly proof — UAT

**Milestone:** M001
**Written:** 2026-04-16T12:18:42.606Z

# S05 UAT — Baseline conflict visibility and continuity proof

## Preconditions
- Local Supabase stack is running and seeded (`npx --yes supabase db reset --local --yes`).
- Web app public Supabase env is available to the runtime.
- Browser starts from a signed-out state.
- Seeded calendar `Alpha shared` exists with the visible week `2026-04-13` through `2026-04-19`.

## Test Case 1 — Trusted-online seeded overlap and clean touch boundary
1. Sign in as `bob@example.com`.
   - Expected: Groups page loads in trusted-online mode.
2. Open `Alpha shared` for visible week start `2026-04-13`.
   - Expected: Calendar route shows trusted-online, local queue `0 pending / 0 retryable`, and board source `Server-synced board`.
3. Inspect Thursday (`2026-04-16`).
   - Expected: Board summary warns about overlap pairs in view, Thursday day summary warns about overlap pairs, and both `Kitchen prep` and `Supplier call` show shift-level conflict warnings.
4. Inspect Wednesday (`2026-04-15`).
   - Expected: `Alpha opening sweep` ending at `09:00` and `Morning intake` starting at `09:00` do **not** show a conflict; Wednesday remains clean.
5. Inspect badges on conflicting cards.
   - Expected: Conflict warnings are distinct from `Local only`, `Pending sync`, retry, or realtime badges.

## Test Case 2 — Unauthorized route remains denied
1. While signed in as Bob, open unsynced / unauthorized calendar id `bbbbbbbb-bbbb-2222-2222-222222222222` for the same week.
   - Expected: Explicit denied surface appears with failure metadata; no guessed calendar data renders.
2. Return to `Alpha shared`.
   - Expected: Permitted calendar reopens normally with the same trusted-online week scope.

## Test Case 3 — Offline local overlap continuity
1. Open `Alpha shared` online first so the week is trusted and cached.
   - Expected: Local snapshot/scope is established before going offline.
2. Force the browser offline and reopen the same Alpha week.
   - Expected: Route should reopen from cached-offline scope, preserve the seeded Thursday conflict warning, and keep the Wednesday touch boundary clean.
3. Create a new local-only shift on Friday that does not conflict yet.
   - Expected: Card appears immediately with `Local only` and `Pending sync`; queue count increments.
4. Move or edit another shift to overlap that new Friday shift.
   - Expected: Friday day summary and both participating shift cards show conflict warnings immediately while offline.
5. Reload the page while still offline.
   - Expected: Pending queue count, local edits, and Friday conflict warnings survive reload.
6. Restore connectivity.
   - Expected: Queue drains back to `0 pending / 0 retryable`, cards lose local-only/pending-sync badges, and the Friday conflict warning still reflects the reconciled server-backed schedule.
7. If the route fails closed instead of reopening cached data, record route mode, reason code, snapshot diagnostics, and queue diagnostics as a failure.

## Test Case 4 — Collaborator realtime propagation without manual reload
1. Open `Alpha shared` in two browser sessions: Bob on the primary page and `dana@example.com` as collaborator on a second page, both on week `2026-04-13`.
   - Expected: Both pages show trusted-online, queue `0 pending / 0 retryable`, seeded Thursday conflict baseline, and realtime channel state `ready`.
2. From Bob’s page, create a Thursday shift overlapping both `Kitchen prep` and `Supplier call`.
   - Expected: Bob’s page shows three overlap pairs on Thursday.
3. Wait on Dana’s page without manual reload.
   - Expected: Realtime diagnostics record a received signal and remote refresh application, the new shift appears automatically, and Thursday conflict summaries update to three overlap pairs with all three shifts reflected.
4. If the channel is ready but the collaborator refresh never applies, record realtime channel state, remote refresh state, and last signal diagnostics as a failure.

## Test Case 5 — Realtime scope guard
1. Keep Dana on next week (`2026-04-20`) while Bob remains on `2026-04-13`.
2. From Bob’s page, create another current-week overlap.
   - Expected: Bob’s page updates, but Dana’s next-week board stays untouched, remote refresh remains idle, and no out-of-scope shift appears.

## Edge Cases to Record
- `endAt === next.startAt` must stay non-conflicting.
- Conflict warnings must remain week-scoped only; no hidden calendar rows or cross-calendar data should appear.
- Denied and offline-denied metadata must remain visible when scope cannot be trusted.
