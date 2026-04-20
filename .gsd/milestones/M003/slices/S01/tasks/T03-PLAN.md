---
estimated_steps: 4
estimated_files: 7
skills_used:
  - frontend-design
---

# T03: Ship the mobile-first shell and trusted calendar denial states

**Slice:** S01 — Mobile shell, auth, and trusted calendar scope
**Milestone:** M003

## Description

Close the real user-facing value for both owned requirements. Load the permitted inventory on the client through authenticated Supabase reads that mirror the web app-shell query shape, then render a deliberate phone-first groups/calendar shell that resolves access only from that trusted inventory and never from guessed ids.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| RLS-backed scope queries (`group_memberships`, `groups`, `calendars`, `group_join_codes`) | Show a typed shell-load failure state and keep protected content hidden. | Leave the shell in a retryable loading/error state instead of guessing partial scope. | Reject malformed rows during shaping and surface a load failure rather than widening inventory. |
| Shared route/access helpers | Keep denied-state rendering explicit and fail the task if reason codes drift from the shared package. | Block completion until the same helper contract drives both mobile and web tests. | Treat mismatched calendar/group ids as invalid shell data and fail closed. |

## Load Profile

- **Shared resources**: authenticated Supabase reads across four tables plus client-side shell state.
- **Per-operation cost**: one bounded membership read followed by up to three scoped table reads and local shaping of the permitted inventory.
- **10x breakpoint**: unnecessary repeat reloads of the shell inventory or unbounded client polling will fail first.

## Negative Tests

- **Malformed inputs**: malformed `calendarId`, missing default calendar, and malformed join-code rows.
- **Error paths**: empty memberships, RLS denial/query failure, stale route params, and partial row-shape corruption.
- **Boundary conditions**: one group/one calendar, multiple groups with only one primary calendar, and authorized vs out-of-scope calendar ids.

## Steps

1. Add a mobile shell loader that mirrors the web layout query shape for memberships, groups, calendars, and join codes, then shapes the result with the shared app-shell helpers.
2. Build a mobile-specific groups/home shell and primary-calendar landing flow that feels native on phone form factors instead of shrinking the desktop two-column layout.
3. Add `/calendars/[calendarId]` route handling that resolves access only from the trusted inventory, renders the permitted calendar view when allowed, and shows explicit denied surfaces for malformed or out-of-scope ids.
4. Add unit/component tests covering onboarding-empty, permitted primary-calendar selection, `calendar-id-invalid`, and `calendar-missing` denial collapse.

## Must-Haves

- [ ] The mobile shell loads only the memberships/groups/calendars already permitted by existing RLS.
- [ ] Primary-calendar selection and shell shaping come from shared helpers, not hand-rolled mobile-only logic.
- [ ] The UI direction is intentionally mobile-specific and does not mirror the web shell route-for-route.
- [ ] Out-of-scope existing calendar ids collapse to `calendar-missing` without probing schedule data.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/shell-scope.unit.test.ts tests/auth-bootstrap.unit.test.ts tests/trusted-core.unit.test.ts`
- `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build`

## Observability Impact

- Signals added/changed: shell bootstrap mode, onboarding state, denied reason, failure phase, and attempted calendar id become visible in protected mobile route state.
- How a future agent inspects this: run `pnpm --dir apps/mobile exec vitest run tests/shell-scope.unit.test.ts` and inspect mobile route `data-testid` surfaces for shell and denied states.
- Failure state exposed: empty memberships, shell load failures, malformed route params, and out-of-scope calendar ids stay distinguishable.

## Inputs

- `packages/caluno-core/src/app-shell.ts` — shared viewer/group/calendar shaping helpers from T01.
- `packages/caluno-core/src/route-contract.ts` — shared trusted calendar route-resolution helpers from T01.
- `apps/web/src/routes/(app)/+layout.server.ts` — reference query shape for permitted inventory loading.
- `apps/web/tests/e2e/auth-groups-access.spec.ts` — acceptance reference for permitted vs denied calendar behavior.
- `apps/mobile/src/lib/auth/mobile-session.ts` — authenticated user/session state from T02.
- `apps/mobile/src/app.css` — current mobile styling baseline.

## Expected Output

- `apps/mobile/src/lib/shell/load-app-shell.ts` — client-side trusted inventory loader for groups/calendars/join codes.
- `apps/mobile/src/lib/components/MobileShell.svelte` — mobile-specific protected shell surface.
- `apps/mobile/src/routes/groups/+page.svelte` — phone-first groups/home route.
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` — trusted calendar route with explicit denied states.
- `apps/mobile/src/app.css` — mobile shell styling updates.
- `apps/mobile/tests/shell-scope.unit.test.ts` — shell/load/denial regression coverage.
