---
id: T01
parent: S01
milestone: M001
key_files:
  - .env.example
  - apps/web/package.json
  - apps/web/vite.config.ts
  - apps/web/src/app.d.ts
  - apps/web/src/hooks.server.ts
  - apps/web/src/lib/supabase/config.ts
  - apps/web/src/lib/supabase/server.ts
  - apps/web/src/lib/supabase/client.ts
  - apps/web/src/routes/+layout.server.ts
  - apps/web/tests/auth/session.unit.test.ts
  - pnpm-lock.yaml
key_decisions:
  - Use the documented `@supabase/ssr` request-scoped server client pattern in `hooks.server.ts` instead of a custom cookie/session wrapper.
  - Make trusted auth resolution explicit with `safeGetSession()` calling `getUser()` after `getSession()` so cookie-backed sessions are not treated as server truth.
  - Keep public Supabase env validation in a small shared helper so missing configuration fails clearly in both server and browser client creation paths.
duration: 
verification_result: mixed
completed_at: 2026-04-14T20:49:55.801Z
blocker_discovered: false
---

# T01: Wired Supabase SSR auth into the web app with typed trusted-session state and unit coverage.

**Wired Supabase SSR auth into the web app with typed trusted-session state and unit coverage.**

## What Happened

Implemented the first real auth boundary for the web app. I added Supabase SSR runtime dependencies and Vitest support, documented the required public Supabase environment variables, and introduced typed auth state at the SvelteKit app boundary. The new server/client Supabase helpers centralize environment validation and client creation, `hooks.server.ts` now installs a request-scoped server client on `event.locals`, and `safeGetSession()` validates cookie-backed sessions by calling `getUser()` before treating a user as authenticated. The root `+layout.server.ts` exposes only the minimal trusted auth state needed by later routes. I also added unit tests covering env validation, anonymous state, authenticated state, invalid-session fallback, and the root layout load contract.

## Verification

`pnpm -C apps/web check` passed with zero Svelte diagnostics, and `pnpm -C apps/web test -- tests/auth/session.unit.test.ts` passed all six unit tests covering env parsing, trusted-session resolution, invalid-session handling, and root layout auth-state exposure.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | ``pnpm install` completed successfully and updated workspace dependencies, including the web app's Supabase SSR and Vitest packages.` | -1 | unknown (coerced from string) | 0ms |
| 2 | ``pnpm -C apps/web check` → exit 0; `svelte-check` reported 0 errors and 0 warnings.` | -1 | unknown (coerced from string) | 0ms |
| 3 | ``pnpm -C apps/web test -- tests/auth/session.unit.test.ts` → exit 0; Vitest passed 1 file / 6 tests.` | -1 | unknown (coerced from string) | 0ms |

## Deviations

The planned verification command used `pnpm -C apps/web vitest run ...`, which is not a valid pnpm workspace invocation here. I verified the same test target via `pnpm -C apps/web test -- tests/auth/session.unit.test.ts` after adding the `test` script.

## Known Issues

None.

## Files Created/Modified

- `.env.example`
- `apps/web/package.json`
- `apps/web/vite.config.ts`
- `apps/web/src/app.d.ts`
- `apps/web/src/hooks.server.ts`
- `apps/web/src/lib/supabase/config.ts`
- `apps/web/src/lib/supabase/server.ts`
- `apps/web/src/lib/supabase/client.ts`
- `apps/web/src/routes/+layout.server.ts`
- `apps/web/tests/auth/session.unit.test.ts`
- `pnpm-lock.yaml`
