# S04: Device notification controls and delivery wiring — UAT

**Milestone:** M003
**Written:** 2026-05-04T12:18:20.586Z

# UAT: S04 Device notification controls and delivery wiring

## Preconditions
- Local Supabase is reset with `npx --yes supabase db reset --local --yes`.
- Mobile web app is available from `apps/mobile`.
- Seeded member `bob@example.com / password123` can sign in.
- Browser harness starts with the seeded stable installation id and fixed time near the April 15–16 seeded shifts.

## Scenario 1 — One toggle per permitted calendar, mirrored on the active calendar route, survives reload
1. Sign in as the seeded Alpha member.
   - Expected: `/groups` loads with trusted shell state `ready` and the Alpha Team calendars are visible.
2. Confirm the groups list shows exactly one notification toggle for `Alpha shared` and exactly one for `Alpha backlog`.
   - Expected: each visible permitted calendar card exposes one toggle surface; no duplicate settings-only flow appears.
3. Enable notifications for `Alpha shared`.
   - Expected: the toggle settles to enabled, permission `granted`, local reminders `ready`, remote subscription `subscribed`, phase `ready`, and the backlog calendar remains disabled.
4. Reload `/groups`.
   - Expected: the `Alpha shared` toggle still shows enabled truthfully after reload; `Alpha backlog` remains disabled.
5. Open `/calendars/[alphaSharedId]`.
   - Expected: the calendar route mirrors the same enabled/degraded state as `/groups` rather than showing conflicting notification information.

## Scenario 2 — Permission denial stays explicit instead of collapsing the toggle to off
1. Start from a fresh signed-in session with both local and push notification permission simulated as denied.
2. Enable notifications for `Alpha shared` from `/groups`.
   - Expected: the toggle remains enabled as user intent, but permission shows `denied`, local reminders show `blocked`, remote subscription shows `degraded`, phase shows `degraded`, and reason shows `permission-denied`.
3. Reload the page.
   - Expected: the same denied/degraded truth persists; the UI does not silently flip the toggle back to off.

## Scenario 3 — Provider-unconfigured remote delivery is honest while local reminders still work
1. Start from a fresh signed-in session where remote shared-change delivery is returned as provider-unconfigured.
2. Enable notifications for `Alpha shared`.
   - Expected: permission remains `granted`, local reminders remain `ready`, remote subscription shows `provider-unconfigured`, phase shows `degraded`, and reason shows `provider-unconfigured`.
3. Reload `/groups`.
   - Expected: the same degraded remote state persists without pretending full push delivery exists.

## Scenario 4 — Unsafe notification targets are rejected and safe targets land inside trusted scope
1. While signed in on `/groups`, trigger a simulated push notification action with target `https://evil.test/phish`.
   - Expected: the app stays on `/groups`, route diagnostics show `path-rejected`, and no external navigation occurs.
2. Trigger a simulated local notification action with target `/calendars/[alphaSharedId]`.
   - Expected: the app navigates to that mobile calendar route, route diagnostics show `navigated`, and the attempted calendar id matches the permitted target.

## Edge Checks
- Disabling one calendar must not mutate the sibling calendar's reminder or subscription state.
- Notification diagnostics must never expose raw push tokens or raw installation ids in the UI.
- Reminder scheduling must remain bounded to trusted synced weeks already stored on the device; no unsynced future guesses should appear.
