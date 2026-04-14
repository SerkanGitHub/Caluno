# S01: Auth, groups, and secure shared-calendar access — UAT

**Milestone:** M001
**Written:** 2026-04-14T22:12:50.381Z

# S01 UAT — Auth, groups, and secure shared-calendar access

## Preconditions

1. Local Supabase services are available.
2. The database has been reset with the seeded S01 fixtures (`npx --yes supabase db reset --local --yes`).
3. The web app is running with the local Supabase environment configured.
4. Seeded accounts exist, including:
   - an existing Alpha member account,
   - a fresh proof user with no memberships,
   - seeded join codes including `ALPHA123` (valid), `EXPIRE01` (expired), and `REVOKED1` (revoked).
5. Known seeded calendar ids used in proof remain stable for the run, including one permitted Alpha calendar id and one out-of-scope Beta calendar id.

## Test Case 1 — Signed-out users are routed into auth

1. Open the web app root URL while signed out.
   - Expected: the landing experience does not expose protected calendars and offers a clear sign-in path.
2. Navigate directly to `/groups` while signed out.
   - Expected: the app redirects to the sign-in experience instead of rendering protected group data.
3. Navigate directly to `/calendars/{known-alpha-calendar-id}` while signed out.
   - Expected: the app does not render calendar content and sends the user through the auth boundary.

## Test Case 2 — Existing member can sign in and open a permitted calendar

1. Sign in with the seeded Alpha member email/password.
   - Expected: authentication succeeds without exposing raw provider errors.
2. After sign-in, land in the protected app shell.
   - Expected: the page shows group-aware navigation and permitted calendar inventory for the signed-in member.
3. Open the seeded Alpha calendar from the permitted list.
   - Expected: the calendar route renders the permitted shared calendar shell.
4. Reload the page while staying signed in.
   - Expected: the same permitted calendar remains accessible after reload using the active authenticated session.

## Test Case 3 — Unauthorized direct calendar navigation fails closed

1. While still signed in as the Alpha member, navigate directly to an existing Beta calendar URL that is not in the member’s permitted inventory.
   - Expected: the route renders an explicit access-denied surface, not an empty calendar view.
2. Inspect the denial messaging.
   - Expected: the UI exposes a high-level reason/failure phase (for example `calendar-missing` and `calendar-lookup`) without leaking cross-group membership details, join codes, or other tenant data.
3. Return to the permitted calendar list.
   - Expected: only allowed calendars are still visible.

## Test Case 4 — Join onboarding surfaces typed failures

1. Sign in as the fresh proof user with no memberships.
   - Expected: the user reaches the protected onboarding state rather than a broken or blank page.
2. Submit the join form with an obviously invalid code.
   - Expected: the page stays in the onboarding flow and shows a typed inline join error such as `JOIN_CODE_INVALID`.
3. Submit the join form with `EXPIRE01`.
   - Expected: the UI rejects the code with the expired-code state instead of creating membership.
4. Submit the join form with `REVOKED1`.
   - Expected: the UI rejects the code with the revoked-code state instead of creating membership.

## Test Case 5 — Valid join redemption grants scoped access

1. From the same fresh proof user session, submit join code `ALPHA123`.
   - Expected: the join succeeds and the user is redirected into the protected group/calendar shell.
2. Review the resulting group and calendar inventory.
   - Expected: Alpha group membership and its permitted calendars are now visible.
3. Open one of the newly permitted Alpha calendars.
   - Expected: the page renders the calendar shell successfully.

## Test Case 6 — Logout removes protected access

1. While signed in on a protected page, trigger logout.
   - Expected: the session is cleared and the app returns to the signed-out/auth state.
2. Use the browser back button or revisit `/groups` or the previously open calendar URL.
   - Expected: protected content is no longer available, and the user is redirected back through sign-in instead of seeing stale private data.

## Edge Cases To Observe During UAT

- Invalid or stale sessions should fail closed into sign-in or an explicit invalid-session path.
- Unauthorized calendar ids must show denial, never silent empties.
- Failure states must stay high-level and must not reveal raw tokens, cookies, or join codes beyond the code the user entered.
- A successful join should change only the newly authorized scope; it must not reveal calendars from unrelated groups.
