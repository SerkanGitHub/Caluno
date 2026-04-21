# S02: Mobile calendar continuity and editing — UAT

**Milestone:** M003
**Written:** 2026-04-21T13:40:53.046Z

# UAT: S02 Mobile calendar continuity and editing

## Preconditions

1. Local Supabase stack is running and seeded via `npx --yes supabase db reset --local --yes`.
2. Mobile app dependencies are installed and `pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts` passes in the verification environment.
3. Seeded member credentials for the permitted Alpha calendar are available in the local test fixture.
4. The device/browser can simulate offline and online transitions.

## Test Case 1 — Trusted online warm-up of a permitted calendar

1. Open the mobile app sign-in flow and sign in as the seeded permitted member.
   - **Expected:** Sign-in succeeds and the groups/calendars shell loads without exposing out-of-scope data.
2. Open the permitted Alpha calendar.
   - **Expected:** The calendar route renders the mobile week board and `data-testid="calendar-route-state"` reports `data-route-mode="trusted-online"`.
3. Observe the sync strip.
   - **Expected:** The strip reports a truthful idle/healthy state with no retryable work and an honest snapshot origin.

## Test Case 2 — Previously synced calendar reopens offline

1. While still signed in after Test Case 1, reload once online so the trusted shell and week snapshot are warmed.
   - **Expected:** The route remains on the same permitted calendar and continuity metadata is persisted.
2. Put the device/browser offline.
3. Reload the same calendar route.
   - **Expected:** The route reopens in `cached-offline` mode instead of redirecting away.
   - **Expected:** `data-route-mode="cached-offline"` is visible on both the route-state surface and the sync strip.
4. Confirm the week board still renders the last synced calendar data.
   - **Expected:** The board is visible, clearly marked as offline/cached, and does not pretend to be live data.

## Test Case 3 — Offline create/edit survives reload with visible pending state

1. Stay offline on the reopened calendar.
2. Create a new shift or edit an existing shift from the mobile editor sheet.
   - **Expected:** The change appears immediately on the board as local-first state.
   - **Expected:** The route/sync-strip surfaces show pending queue work (`data-pending-count` increases).
3. Reload the page while still offline.
   - **Expected:** The queued change is still present after reload.
   - **Expected:** The item remains visibly pending and is not silently dropped or falsely marked synced.

## Test Case 4 — Reconnect drains queued work through the trusted path

1. Return the device/browser online.
2. Wait for automatic drain or trigger the available retry/drain control.
   - **Expected:** The sync phase moves out of offline/pending into drain/reconnect activity.
3. Let replay finish.
   - **Expected:** Pending and retryable counts return to `0`.
   - **Expected:** `data-sync-phase="idle"` after drain completion.
   - **Expected:** The created/edited shift remains on the board as trusted synced state.

## Test Case 5 — Unsynced or out-of-scope calendar fails closed offline

1. Sign in online and warm only the permitted Alpha calendar.
2. Go offline.
3. Attempt to open a different calendar that was never synced on this device or is out of scope.
   - **Expected:** The route does not reopen guessed or unsynced data.
   - **Expected:** The user sees an explicit denied/offline-unavailable reason instead of an empty fake calendar.

## Test Case 6 — Corrupt continuity state is rejected explicitly

1. Corrupt the cached trusted shell snapshot in device/browser storage.
2. Reload the protected calendar route while offline.
   - **Expected:** Continuity validation fails closed.
   - **Expected:** The route shows an explicit invalid/corrupt continuity reason and does not reuse stale scope.

## Test Case 7 — Invalid week params and malformed queue payloads stay attributable

1. Open the calendar with an invalid week parameter.
   - **Expected:** The route falls back safely and surfaces a truthful diagnostic instead of crashing.
2. Inject a malformed queued mutation payload.
   - **Expected:** The UI exposes `queue-entry-invalid` diagnostics.
   - **Expected:** Pending/retryable counts remain truthful and the app does not pretend the malformed entry was synced.

## Edge Checks

- Sign out from a protected calendar route.
  - **Expected:** The app closes the protected route and returns to sign-in or auth-required flow.
- Reload with malformed persisted auth session data.
  - **Expected:** Session bootstrap fails closed and the route returns to sign-in with an explicit invalid-session reason.
- Retry after a local environment failure during proof.
  - **Expected:** Restarting the local Supabase stack restores reset/playwright verification without code changes.
