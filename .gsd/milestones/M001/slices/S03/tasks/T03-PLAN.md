---
estimated_steps: 5
estimated_files: 6
skills_used:
  - frontend-design
  - debug-like-expert
---

# T03: Add fail-closed cached-shell routing for offline protected pages

**Slice:** S03 — Offline local persistence with cached-session continuity
**Milestone:** M001

## Description

Introduce the browser-side route fallback that turns the new cache into usable offline continuity without weakening the existing server contract. This task directly advances **R001** and **R004** by adding browser-only protected-shell loads and route state that prefer trusted online data when available, but can reopen cached groups and synced calendars offline.

The route model must stay fail-closed. An offline direct URL for a calendar that was never synced on this browser must render an explicit denied state, and online SSR auth remains the default whenever the network is available.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Browser-side layout/page loads | Fall back to the explicit offline-unavailable or denied branch instead of showing an empty shell. | Keep the route in a visible loading/unavailable state and avoid partial hydration. | Reject malformed cached route data and clear it rather than rehydrating guessed permissions. |
| Cached app-shell snapshot | Preserve the online shell when available; if offline, show only the fail-closed continuity branch. | Treat the snapshot as unavailable and keep protected pages locked down. | Render the explicit offline-denied surface instead of silently widening scope. |
| Existing server route contract | Keep the current online SSR contract untouched and fix the browser-side wrapper rather than mutating server auth into a weak cached-session check. | N/A | Any mismatch between cached scope and server data should resolve in favor of the existing trusted server contract when online. |

## Load Profile

- **Shared resources**: cached app-shell snapshot, browser route data hydration, and the protected calendar page boot path.
- **Per-operation cost**: one cached-shell lookup plus a single calendar snapshot lookup for the current route.
- **10x breakpoint**: large cached calendar inventories or repeated route reloads would first affect client-side boot/hydration cost, so the fallback must stay scoped to previously synced permitted calendars only.

## Negative Tests

- **Malformed inputs**: invalid `calendarId` route params, stale cached scope for a different user, and corrupted cached route payloads.
- **Error paths**: offline boot with no cached shell, offline boot for a calendar that was never synced, and route data mismatch between cached scope and server data.
- **Boundary conditions**: online boot, offline reopen after prior sync, and direct offline navigation to an unsynced but otherwise valid calendar id.

## Steps

1. Extend `apps/web/src/app.d.ts` with typed route data for online, cached-offline, and offline-denied states.
2. Add `apps/web/src/routes/(app)/+layout.ts` so the protected shell can reuse server data online or cached app-shell state offline.
3. Add `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts` so the calendar route can resolve a synced local calendar snapshot before the component renders.
4. Update `apps/web/src/routes/(app)/groups/+page.svelte` and `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` to expose cached/offline state using the existing calm UI language.
5. Expand `apps/web/tests/routes/protected-routes.unit.test.ts` to prove cached reopen for permitted/synced scope and explicit denial for unsynced offline ids.

## Must-Haves

- [ ] Protected pages distinguish trusted-online, cached-offline, and offline-denied route state.
- [ ] The cached-shell branch only exposes previously synced permitted calendars.
- [ ] Unsynced or malformed offline calendar URLs still render an explicit denied state.
- [ ] Route/unit tests lock the fail-closed offline routing contract.

## Verification

- `pnpm --dir apps/web check && pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts`
- Confirm the route tests prove offline cached reopen and fail-closed denial for unsynced calendar ids.

## Observability Impact

- Signals added/changed: route data explicitly distinguishes trusted-online, cached-offline, and offline-denied state.
- How a future agent inspects this: use route/unit tests and visible shell pills/copy to determine whether the page booted from server data or cached local scope.
- Failure state exposed: unsynced calendar ids, stale/missing cached scope, and malformed route params remain explicit denied branches instead of silent empty pages.

## Inputs

- `apps/web/src/app.d.ts` — current route typing.
- `apps/web/src/routes/(app)/+layout.server.ts` — authoritative online app-shell loader.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts` — authoritative online calendar route loader/actions.
- `apps/web/src/routes/(app)/groups/+page.svelte` — current protected shell list UI.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — current calendar page UI.
- `apps/web/tests/routes/protected-routes.unit.test.ts` — existing protected-route contract tests.

## Expected Output

- `apps/web/src/app.d.ts` — typed route state for offline continuity.
- `apps/web/src/routes/(app)/+layout.ts` — browser-side protected-shell fallback load.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts` — browser-side calendar route fallback load.
- `apps/web/src/routes/(app)/groups/+page.svelte` — groups UI updated for cached/offline continuity state.
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — calendar UI updated for cached/offline route state.
- `apps/web/tests/routes/protected-routes.unit.test.ts` — route/unit proof for offline fail-closed behavior.
