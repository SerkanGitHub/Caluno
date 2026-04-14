---
estimated_steps: 4
estimated_files: 4
skills_used: []
---

# T04: Prove the end-to-end auth and secure-access flow with browser tests

**Slice:** S01 — Auth, groups, and secure shared-calendar access
**Milestone:** M001

## Description

Close the slice with executable proof that the real browser entrypoint, local Supabase runtime, and security boundary all work together for both the happy path and the denied path. This task turns the slice verification contract into a repeatable browser-level proof instead of a one-off manual claim.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Playwright browser run | Stop the slice proof, save trace/log artifacts, and report which step failed. | Treat the run as a slice blocker until the slow path is understood; do not silently increase timeouts without noting why. | Fail the assertion with the captured response/UI state and keep the trace for diagnosis. |
| Local Supabase seed/runtime | Rebuild local state via reset/seed before rerunning and surface the exact missing fixture or startup issue. | Mark the environment as not ready and keep proof incomplete. | Fail the scenario at setup time and capture which auth/group/calendar fixture drifted. |

## Load Profile

- **Shared resources**: local Supabase services, browser workers, seeded test users/groups/calendars, and any trace/video artifacts.
- **Per-operation cost**: one seeded browser auth flow, several protected navigations, and one denied-access assertion path.
- **10x breakpoint**: local service startup and parallel browser workers become the first cost center, so the proof should stay serial and deterministic.

## Negative Tests

- **Malformed inputs**: direct navigation to an unauthorized `calendarId`, invalid join code entry, and stale signed-out browser state.
- **Error paths**: Supabase not started, seed drift, and action/server-load failures during onboarding.
- **Boundary conditions**: sign-out immediately after joining, a user with no permitted calendars, and repeated reload after login using the same cached session.

## Steps

1. Add Playwright configuration, test fixtures/helpers, and any local-dev scripts needed to run the browser flow against `supabase db reset --local`.
2. Create `apps/web/tests/e2e/auth-groups-access.spec.ts` covering sign-in, create-group or join-group onboarding, permitted-calendar visibility, and sign-out.
3. Assert the negative path: a guessed or unauthorized calendar URL must render the explicit access-denied surface rather than silently hiding data.
4. Capture enough diagnostics (trace, seeded fixture names, failing phase) that a future agent can localize auth vs onboarding vs RLS failures quickly.

## Must-Haves

- [ ] The slice has a real browser proof, not just unit checks.
- [ ] The test exercises both a permitted-calendar path and an unauthorized-calendar denial path.
- [ ] Sign-out or session loss removes protected access in the browser flow.
- [ ] Failure artifacts make it obvious whether the break is auth, data seed, route wiring, or access control.

## Verification

- `supabase db reset --local && pnpm -C apps/web playwright test tests/e2e/auth-groups-access.spec.ts`
- On failure, inspect the emitted Playwright trace to confirm whether the break is login, onboarding, protected load, or denied-path assertion.

## Observability Impact

- Signals added/changed: Playwright trace/log evidence for the full auth/onboarding/access-denied flow.
- How a future agent inspects this: run `pnpm -C apps/web playwright test tests/e2e/auth-groups-access.spec.ts` and inspect the emitted trace on failure.
- Failure state exposed: the exact failing phase (login, onboarding, protected load, or denied-path assertion) becomes visible in the test artifacts.

## Inputs

- `apps/web/package.json`
- `apps/web/src/routes/(auth)/signin/+page.svelte`
- `apps/web/src/routes/(app)/groups/+page.server.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
- `supabase/config.toml`
- `supabase/seed.sql`

## Expected Output

- `apps/web/playwright.config.ts`
- `apps/web/tests/e2e/auth-groups-access.spec.ts`
- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/package.json`
