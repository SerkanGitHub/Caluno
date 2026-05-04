---
estimated_steps: 40
estimated_files: 6
skills_used: []
---

# T03: Surface one truthful notification toggle per calendar and safe tap routing

---
estimated_steps: 18
estimated_files: 6
skills_used:
  - frontend-design
  - debug-like-expert
---

# T03: Surface one truthful notification toggle per calendar and safe tap routing

Turn the notification runtime into the actual phone-first control surface the user asked for. The executor should create one reusable toggle component, render it once per permitted calendar on `/groups`, mirror the active calendar state on `/calendars/[calendarId]`, and register notification-open routing in the mobile layout so taps resolve only through normalized internal paths.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Notification runtime/state helper | Keep the toggle visible but degraded/read-only rather than showing fake enabled state. | Surface a saving/pending phase and preserve the last trusted state instead of oscillating. | Reject malformed runtime state and keep the component in explicit degraded mode. |
| Mobile route/layout navigation | Keep raw notification payloads from navigating anywhere outside normalized internal paths. | Preserve the current route and expose a rejected-target diagnostic if open-routing cannot settle. | Treat malformed payload paths as `path-rejected` and do not navigate. |
| Trusted calendar inventory | Render toggles only for permitted calendars returned by the shell; never fabricate hidden calendars or settings screens. | Keep the route in loading/degraded state until scope arrives. | Refuse to bind toggle controls to stale calendar ids. |

## Load Profile

- **Shared resources**: notification runtime state, route-level layout listeners, and permitted calendar inventory rendering.
- **Per-operation cost**: one state subscription per visible calendar row plus one optimistic save/refresh cycle per toggle action.
- **10x breakpoint**: rapid toggling across many calendars or repeated malformed tap payloads will break state clarity before rendering throughput does.

## Negative Tests

- **Malformed inputs**: invalid notification target path, stale calendar id, malformed runtime reason code, and missing permission status.
- **Error paths**: save failure, read-only degraded state, path rejection on notification tap, and runtime bootstrap failure on the groups route.
- **Boundary conditions**: one enabled calendar beside one disabled calendar, toggle state mirrored between `/groups` and active calendar route, and notification tap into a different permitted calendar while another route is open.

## Steps

1. Create a reusable calendar notification toggle component that shows enabled intent plus explicit permission, local-reminder, remote-subscription, and degraded-reason state through stable `data-testid` / `data-*` attributes.
2. Wire that component into `/groups` so every permitted calendar gets exactly one toggle, and mirror the same active calendar state on `/calendars/[calendarId]` without adding a second settings-only flow.
3. Add a notification routing helper plus `+layout.ts` listener wiring that normalizes payload paths through `normalizeInternalPath()` before navigation and emits explicit `path-rejected` diagnostics for unsafe values.
4. Add focused unit proof for routing/state mapping so malformed payloads and degraded runtime states remain attributable before Playwright lands in T04.

## Must-Haves

- [ ] Every visible permitted calendar on `/groups` renders exactly one notification toggle.
- [ ] The active calendar route mirrors the same state so users do not see conflicting enabled/degraded information.
- [ ] Partial failures such as permission denial or remote degradation stay visible on the toggle instead of collapsing into a simple off switch.
- [ ] Notification tap payloads can only navigate through normalized internal paths; unsafe values are rejected explicitly.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts tests/mobile-notification-router.unit.test.ts`
- `pnpm --dir apps/mobile check`

## Observability Impact

- Signals added/changed: toggle enabled intent, permission state, local reminder state, remote subscription state, save phase, and tap-routing result.
- How a future agent inspects this: `/groups`, `/calendars/[calendarId]`, and the router unit suite.
- Failure state exposed: `path-rejected`, `save-failed`, `permission-denied`, and `remote-degraded` become route-visible diagnostics.

## Inputs

- ``apps/mobile/src/routes/groups/+page.svelte` — current permitted-calendar list where the primary toggle surface belongs.`
- ``apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` — active calendar route that should mirror notification state.`
- ``apps/mobile/src/routes/+layout.ts` — mobile bootstrap point for open-routing listeners.`
- ``apps/mobile/src/lib/shell/load-app-shell.ts` — existing `normalizeInternalPath()` helper that notification payloads must reuse.`
- ``apps/mobile/src/lib/notifications/runtime.ts` — per-calendar runtime state from T02.`
- ``apps/mobile/src/lib/notifications/state.ts` — combined state model from T01.`

## Expected Output

- ``apps/mobile/src/lib/components/notifications/CalendarNotificationToggle.svelte` — reusable phone-first toggle UI with explicit diagnostics.`
- ``apps/mobile/src/lib/notifications/router.ts` — safe notification-open routing helper built on normalized internal paths.`
- ``apps/mobile/src/routes/groups/+page.svelte` — one toggle rendered per permitted calendar.`
- ``apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` — active calendar notification state mirrored in-route.`
- ``apps/mobile/src/routes/+layout.ts` — notification-open listener bootstrap and route handoff wiring.`
- ``apps/mobile/tests/mobile-notification-router.unit.test.ts` — fail-closed proof for safe path routing and state mapping.`

## Verification

pnpm --dir apps/mobile exec vitest run tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts tests/mobile-notification-router.unit.test.ts && pnpm --dir apps/mobile check

## Observability Impact

This task adds user-visible state and cross-route navigation behavior, so the toggle/testid contract and tap-routing result codes are the main failure-localization surfaces for later E2E proof.
