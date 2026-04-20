---
estimated_steps: 4
estimated_files: 6
skills_used:
  - debug-like-expert
---

# T02: Implement client-validated Supabase auth bootstrap and sign-in entry

**Slice:** S01 — Mobile shell, auth, and trusted calendar scope
**Milestone:** M003

## Description

Build the fail-closed auth substrate before any protected mobile shell opens. Keep the slice on password auth, validate cached sessions with `getSession()` plus `getUser()` before trusting them, and replace the starter screen with a real sign-in, invalid-session, and loading surface that makes auth state explicit.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Supabase browser auth client | Surface a typed auth bootstrap failure and keep the protected shell closed. | Show a retryable loading/error state rather than assuming the cached session is valid. | Treat a session without a trusted user as invalid and sign the user out locally. |
| Public Supabase env | Fail fast with a visible configuration error instead of rendering a broken sign-in form. | Treat missing env as a blocking setup failure. | Reject trimmed/empty values and keep auth boot from proceeding. |

## Load Profile

- **Shared resources**: Supabase auth storage, mobile route bootstrap, and the browser client singleton.
- **Per-operation cost**: one `getSession()` plus one `getUser()` validation on boot, then one password sign-in request when credentials are submitted.
- **10x breakpoint**: repeated bootstrap loops or duplicate auth listeners will break first if the store is not singleton-safe.

## Negative Tests

- **Malformed inputs**: blank email/password, missing public env, cached session with no user, and malformed user metadata.
- **Error paths**: sign-in rejection, invalid/stale session, auth timeout, and sign-out/reset flow.
- **Boundary conditions**: anonymous first launch, already-authenticated launch, and reload while a valid session exists.

## Steps

1. Add a mobile Supabase browser client and reuse the shared public-env reader instead of duplicating config parsing inside `apps/mobile`.
2. Implement a mobile auth/session store that bootstraps exactly once, validates cached sessions via `getUser()`, and exposes typed states such as `signed-out`, `bootstrapping`, `authenticated`, `invalid-session`, and `error`.
3. Replace the starter route with a real sign-in entry surface and route redirects so `/` lands in sign-in or the protected shell based on trusted auth state.
4. Add unit tests for missing env, anonymous boot, valid session reuse, invalid-session fail-closed behavior, and password sign-in error mapping.

## Must-Haves

- [ ] Mobile does not open protected routes from cached auth state until `getUser()` re-validates the session.
- [ ] Password sign-in is the only auth flow introduced in this slice; no deep-link or OAuth complexity is added prematurely.
- [ ] Signed-out, invalid-session, loading, and auth-error states are visibly distinct.
- [ ] Auth bootstrap/unit tests cover both happy path and fail-closed branches.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/auth-bootstrap.unit.test.ts tests/trusted-core.unit.test.ts`
- `pnpm --dir apps/mobile check`

## Observability Impact

- Signals added/changed: explicit mobile auth phase and reason-code surfaces for boot, invalid-session, sign-in failure, and signed-out state.
- How a future agent inspects this: run `pnpm --dir apps/mobile exec vitest run tests/auth-bootstrap.unit.test.ts` and inspect the auth entry route test ids/state text.
- Failure state exposed: missing env, stale session, rejected credentials, and one-time bootstrap failures become visible instead of reopening the shell silently.

## Inputs

- `packages/caluno-core/src/supabase.ts` — shared public Supabase env reader from T01.
- `apps/web/src/lib/supabase/client.ts` — current browser-session continuity patterns to mirror cautiously.
- `apps/web/tests/auth/session.unit.test.ts` — trusted-session validation behavior to preserve on mobile.
- `apps/mobile/src/routes/+page.svelte` — current placeholder entry surface.
- `apps/mobile/src/routes/+layout.svelte` — current global layout shell.

## Expected Output

- `apps/mobile/src/lib/supabase/client.ts` — mobile browser Supabase client and singleton bootstrap helpers.
- `apps/mobile/src/lib/auth/mobile-session.ts` — typed mobile auth/bootstrap store.
- `apps/mobile/src/routes/+layout.ts` — root auth-aware route bootstrap/redirect logic.
- `apps/mobile/src/routes/+page.svelte` — root handoff into sign-in or protected shell.
- `apps/mobile/src/routes/signin/+page.svelte` — real password sign-in entry surface.
- `apps/mobile/tests/auth-bootstrap.unit.test.ts` — auth bootstrap and invalid-session regression coverage.
