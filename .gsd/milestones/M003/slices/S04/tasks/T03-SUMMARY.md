---
id: T03
parent: S04
milestone: M003
key_files:
  - apps/mobile/src/lib/components/notifications/CalendarNotificationToggle.svelte
  - apps/mobile/src/lib/notifications/presentation.ts
  - apps/mobile/src/lib/notifications/router.ts
  - apps/mobile/src/routes/+layout.svelte
  - apps/mobile/src/routes/groups/+page.svelte
  - apps/mobile/src/routes/calendars/[calendarId]/+page.svelte
  - apps/mobile/tests/mobile-notification-router.unit.test.ts
key_decisions:
  - Use a pure presentation normalizer in front of the toggle so malformed or incomplete runtime state becomes explicit degraded/read-only UI instead of an accidental false/off rendering.
  - Publish trusted calendar ids from the active page into a shared scope store so the root layout can reject stale or external notification tap targets before calling `goto()`.
  - Keep `/calendars/[calendarId]` truthful by mirroring the active calendar toggle inline on the route rather than creating a separate notification settings flow.
duration: 
verification_result: passed
completed_at: 2026-05-04T11:33:47.114Z
blocker_discovered: false
---

# T03: Added a truthful per-calendar notification toggle UI and scope-safe mobile tap routing on mobile.

**Added a truthful per-calendar notification toggle UI and scope-safe mobile tap routing on mobile.**

## What Happened

Built the missing notification control surface for mobile around the existing runtime/state contracts from T01/T02. I added a reusable `CalendarNotificationToggle` component with stable `data-testid` and `data-*` diagnostics for enabled intent, permission, local reminders, remote subscription, phase, and reason; a pure presentation normalizer that forces malformed or missing runtime state into explicit degraded/read-only mode; and a pure notification router helper that normalizes tap payloads, rejects external/stale targets as `path-rejected`, and records route diagnostics. On `/groups`, every visible permitted calendar now renders exactly one toggle. On `/calendars/[calendarId]`, the active calendar now mirrors the same truthful notification state above the board. I also wired the root mobile layout to subscribe to local/push notification actions and route taps only through the shared safe router helper using page-published trusted calendar scope.

## Verification

Verified the notification control plane at three layers. First, `pnpm --dir apps/mobile exec vitest run tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts tests/mobile-notification-router.unit.test.ts` passed, covering the existing transport/runtime contract plus new fail-closed router and malformed-state mapping behavior. Second, `pnpm --dir apps/mobile check` passed with zero Svelte or TypeScript diagnostics. Third, I ran the mobile dev server, opened the real `/groups` route in the browser, and confirmed the signed-out shell still rendered correctly after the new layout listener wiring; structured browser assertions for the route URL and key shell copy passed. Full toggle browser proof remains blocked on missing public Supabase config in the local environment, so the per-calendar/tap-routing behavior is primarily proven by unit coverage in this task.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/mobile exec vitest run tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts tests/mobile-notification-router.unit.test.ts` | 0 | ✅ pass | 1539ms |
| 2 | `pnpm --dir apps/mobile check` | 0 | ✅ pass | 3015ms |

## Deviations

Wired notification-open listeners in `apps/mobile/src/routes/+layout.svelte` instead of `apps/mobile/src/routes/+layout.ts`. The task plan pointed at `+layout.ts`, but SvelteKit browser listeners must live in the layout component, not the load module.

## Known Issues

Local browser proof could only cover the signed-out `/groups` shell because the dev environment reports `SUPABASE_ENV_MISSING`. The new per-calendar toggle and scope-aware tap routing are therefore verified by unit tests and type-checking in this task, with authenticated Playwright coverage deferred to T04 as planned.

## Files Created/Modified

- `apps/mobile/src/lib/components/notifications/CalendarNotificationToggle.svelte`
- `apps/mobile/src/lib/notifications/presentation.ts`
- `apps/mobile/src/lib/notifications/router.ts`
- `apps/mobile/src/routes/+layout.svelte`
- `apps/mobile/src/routes/groups/+page.svelte`
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`
- `apps/mobile/tests/mobile-notification-router.unit.test.ts`
