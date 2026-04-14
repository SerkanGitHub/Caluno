---
estimated_steps: 4
estimated_files: 8
skills_used: []
---

# T01: Establish the Supabase SSR auth boundary and typed session contract

**Slice:** S01 — Auth, groups, and secure shared-calendar access
**Milestone:** M001

## Description

Create the request-scoped auth seam that every later slice will trust, and set up the first durable test so auth regressions are caught before group/calendar work lands. This task advances **R001** by establishing trusted login state and the cached-session contract boundary for previously synced calendars without claiming offline data persistence yet.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Supabase SSR auth client | Fail the protected request closed, clear invalid session state, and surface a signed-out/auth-error state instead of trusting stale cookies. | Return a retryable auth-unavailable state for protected routes and keep public auth screens reachable. | Treat the response as unauthenticated, log a redacted reason, and avoid populating trusted user data. |
| Environment variables | Stop boot with a clear configuration error in server code and keep tests exercising the missing-env path. | N/A | Reject startup when required keys are blank or structurally invalid. |

## Load Profile

- **Shared resources**: Supabase auth verification, request cookies, and root layout data shared by every browser navigation.
- **Per-operation cost**: one trusted user lookup plus lightweight session shaping per request.
- **10x breakpoint**: repeated trusted auth calls and cookie churn become the first scaling concern, so the implementation must keep the root load thin and avoid duplicate validation in nested routes.

## Negative Tests

- **Malformed inputs**: missing env vars, blank callback params, and corrupted auth cookies.
- **Error paths**: Supabase user lookup failure, expired session, and anonymous access to a protected server load.
- **Boundary conditions**: first request with no session, refresh after sign-in, and sign-out clearing stale browser state.

## Steps

1. Add the web dependencies and scripts needed for Supabase SSR auth plus Vitest-based contract checks, and document the required Supabase env keys in `.env.example`.
2. Create `apps/web/src/app.d.ts`, `apps/web/src/hooks.server.ts`, `apps/web/src/lib/supabase/server.ts`, `apps/web/src/lib/supabase/client.ts`, and `apps/web/src/routes/+layout.server.ts` so every request gets a typed trusted-user contract.
3. Keep the root data flow explicit: public routes may render without a user, while protected routes must receive trusted auth state from server loads rather than browser-only checks.
4. Add `apps/web/tests/auth/session.unit.test.ts` to lock the contract for anonymous, authenticated, and invalid-session cases.

## Must-Haves

- [ ] Trusted user resolution goes through a server-validated path rather than blindly trusting `auth.getSession()`.
- [ ] `App.Locals` and root page data expose only the minimal typed auth/session state later routes need.
- [ ] Missing or invalid auth state fails closed for protected routes and stays inspectable in tests.
- [ ] The task leaves an executable unit check in place for later slices.

## Verification

- `pnpm -C apps/web check && pnpm -C apps/web vitest run tests/auth/session.unit.test.ts`
- Confirm the root server load exposes explicit signed-in vs signed-out state without requiring browser-only session reads.

## Observability Impact

- Signals added/changed: explicit signed-in vs signed-out auth state from the root server load and redacted auth-bootstrap failures in test output.
- How a future agent inspects this: `pnpm -C apps/web vitest run tests/auth/session.unit.test.ts` plus root page data inspection in server loads.
- Failure state exposed: invalid cookie / missing env / trusted-user lookup failure becomes visible instead of silently falling back to an assumed user.

## Inputs

- `apps/web/package.json`
- `apps/web/src/routes/+layout.svelte`
- `apps/web/src/routes/+page.svelte`
- `apps/web/vite.config.ts`
- `apps/web/tsconfig.json`
- `.env.example`

## Expected Output

- `apps/web/package.json`
- `.env.example`
- `apps/web/src/app.d.ts`
- `apps/web/src/hooks.server.ts`
- `apps/web/src/lib/supabase/server.ts`
- `apps/web/src/lib/supabase/client.ts`
- `apps/web/src/routes/+layout.server.ts`
- `apps/web/tests/auth/session.unit.test.ts`
