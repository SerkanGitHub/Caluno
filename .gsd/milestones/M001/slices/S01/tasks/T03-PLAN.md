---
estimated_steps: 4
estimated_files: 9
skills_used:
  - frontend-design
---

# T03: Build the protected auth, group onboarding, and permitted-calendar routes

**Slice:** S01 — Auth, groups, and secure shared-calendar access
**Milestone:** M001

## Description

Turn the security contract into the roadmap demo by adding deliberate auth and onboarding screens plus protected app routes that resolve only the current user's allowed calendars. This task closes the user-visible loop for **R001**, **R002**, and **R012** in the actual browser entrypoint.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Supabase auth callback/logout flow | Redirect to a safe auth screen with a visible error state and do not leave half-initialized session UI behind. | Surface a retryable callback/sign-out failure and preserve the previous trusted state until resolution. | Drop the callback result, clear invalid assumptions, and require a fresh sign-in. |
| Group create/join server actions | Keep the user on the current screen with inline validation or join-error messaging and avoid partial optimistic UI. | Surface a pending/retry state without creating duplicate groups or memberships. | Reject the payload server-side and return a precise field-safe error rather than mutating access state. |

## Load Profile

- **Shared resources**: authenticated server loads, form actions, membership queries, and calendar list rendering for every app navigation.
- **Per-operation cost**: one protected load plus one to a few writes/reads during create-group or join-group actions.
- **10x breakpoint**: repeated onboarding submissions and nested protected loads could duplicate queries, so the app shell must centralize membership/calendar loading.

## Negative Tests

- **Malformed inputs**: blank group names, invalid join codes, and malformed `calendarId` route params.
- **Error paths**: anonymous navigation into `(app)` routes, join action denial, and callback/logout failure.
- **Boundary conditions**: user with zero groups, user with multiple groups/calendars, and direct navigation to a calendar they are not allowed to access.

## Steps

1. Replace the starter landing page with a session-aware entrypoint and add `(auth)` routes for sign-in, callback, and logout.
2. Add the protected `(app)` layout/server loads that redirect anonymous users, compose trusted membership data, and centralize the permitted-calendar scope.
3. Implement create-group and join-group actions plus the browser screens that render onboarding, empty states, permitted calendars, and access-denied behavior.
4. Use the installed `frontend-design` skill for the auth/onboarding/access-denied surfaces so the slice ships a deliberate, stress-friendly browser experience without weakening the server-side checks.

## Must-Haves

- [ ] Anonymous users land on an auth entrypoint instead of the starter page.
- [ ] Authenticated users can create or join a group from the browser and land in a protected app shell.
- [ ] Calendar pages resolve only from trusted server data and show an explicit access-denied surface for unauthorized IDs.
- [ ] The user-facing auth/group/calendar surfaces feel intentional rather than starter-generic.

## Verification

- `pnpm -C apps/web check && pnpm -C apps/web vitest run tests/auth/session.unit.test.ts tests/access/policy-contract.unit.test.ts`
- Manual spot-check in the running browser confirms the signed-out, onboarding-empty, join-error, and access-denied states are visually distinct and stress-friendly.

## Observability Impact

- Signals added/changed: signed-out, onboarding-empty, join-error, and access-denied UI states become explicit runtime surfaces.
- How a future agent inspects this: navigate the web app or run the e2e spec and confirm the protected-route state transitions.
- Failure state exposed: callback failure, invalid join code, and unauthorized calendar lookup appear as named user-facing states instead of blank pages.

## Inputs

- `apps/web/src/routes/+page.svelte`
- `apps/web/src/routes/+layout.svelte`
- `apps/web/src/routes/+layout.server.ts`
- `apps/web/src/hooks.server.ts`
- `apps/web/src/lib/supabase/server.ts`
- `supabase/migrations/20260414_000001_auth_groups_access.sql`

## Expected Output

- `apps/web/src/routes/+page.svelte`
- `apps/web/src/routes/(auth)/signin/+page.svelte`
- `apps/web/src/routes/(auth)/callback/+server.ts`
- `apps/web/src/routes/(auth)/logout/+server.ts`
- `apps/web/src/routes/(app)/+layout.server.ts`
- `apps/web/src/routes/(app)/groups/+page.server.ts`
- `apps/web/src/routes/(app)/groups/+page.svelte`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
