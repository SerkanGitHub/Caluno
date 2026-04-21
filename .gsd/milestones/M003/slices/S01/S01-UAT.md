# S01: Mobile shell, auth, and trusted calendar scope — UAT

**Milestone:** M003
**Written:** 2026-04-21T08:56:46.150Z

# S01 UAT — Mobile shell, auth, and trusted calendar scope

## Preconditions

- Local Supabase stack is running and seeded with the project seed data.
- `apps/mobile` has valid public Supabase env available for the test run.
- Test user: seeded Alpha member credentials used by the Playwright fixture.
- The mobile app is served locally from `apps/mobile` and the tester can open it in a browser-sized/mobile-sized viewport.

## Test Case 1 — Sign in and land on permitted mobile scope

1. Open the mobile app entrypoint.
   - Expected: The sign-in screen shows the trusted auth card, visible auth state metadata, and no protected calendar content yet.
2. Enter the seeded Alpha member email and password.
   - Expected: The submit control requests a trusted session rather than opening the shell immediately from cached local state.
3. Submit the sign-in form.
   - Expected: After trusted validation completes, the app routes into protected scope at the mobile groups/calendar shell instead of staying on the starter page.
4. Open the primary calendar from the groups shell.
   - Expected: The Alpha shared calendar opens, the calendar shell is visible, and the route state reports no denied reason.
5. Inspect the shell status ribbon.
   - Expected: Shell/bootstrap state is visible and indicates a trusted ready state rather than a blank or generic loaded state.

## Test Case 2 — Truthful denial for out-of-scope and malformed calendar ids

1. While signed in as the Alpha member, navigate directly to the known Beta shared calendar id.
   - Expected: The app does not reveal Beta calendar content.
   - Expected: A denied state is shown with reason `calendar-missing` and failure phase `calendar-lookup`.
   - Expected: The attempted calendar id is displayed in the route diagnostics.
2. Navigate directly to `/calendars/not-a-uuid`.
   - Expected: The app shows a denied state instead of crashing or probing the backend for arbitrary existence.
   - Expected: The denied reason is `calendar-id-invalid` and the failure phase is `calendar-param`.
   - Expected: The attempted id is surfaced exactly as entered.
3. Use the denied-state recovery actions.
   - Expected: Returning to groups works, and opening a permitted calendar returns to trusted in-scope content.

## Test Case 3 — Reload continuity and protected-route closure after sign-out

1. Open the permitted Alpha calendar while authenticated.
   - Expected: The calendar shell is visible with the correct calendar title.
2. Reload the page.
   - Expected: The same permitted calendar reopens after trusted session validation; the user is not kicked out unnecessarily and the route does not lose scope.
3. Press the shell-level Sign out action.
   - Expected: The app navigates to `/signin?flow=signed-out...` and the sign-in screen explicitly reports a signed-out state.
4. After sign-out, attempt to open the protected Alpha calendar URL again.
   - Expected: The route fails closed and redirects back to sign-in.
   - Expected: The auth surface reports `AUTH_REQUIRED` rather than reopening the shell from stale local data.

## Test Case 4 — Invalid persisted session fails closed

1. Sign in successfully and open the Alpha calendar.
   - Expected: Protected calendar content is visible.
2. Corrupt the persisted Supabase auth session storage for the mobile app.
   - Expected: The corruption targets the actual persisted mobile auth storage mechanism used by the app.
3. Re-open the protected Alpha calendar route.
   - Expected: The app refuses the saved session, redirects to sign-in, and does not render protected shell content.
   - Expected: The sign-in diagnostics surface `invalid-session` with reason `INVALID_SESSION`.
4. Retry sign-in with valid credentials.
   - Expected: A fresh trusted session restores access to permitted scope.

## Edge Cases to Confirm

- Missing public Supabase env blocks the sign-in form with an explicit configuration surface instead of a blank screen.
- The groups/calendar shell never lists calendars outside the user’s trusted inventory.
- Account actions remain reachable from inside the protected shell; sign-out is not hidden behind an authenticated redirect loop to `/signin`.
- Native packaging baseline exists: after build/sync, the Capacitor iOS project is present and sync completes without manual file surgery.
