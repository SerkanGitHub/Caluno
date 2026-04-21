# S04 — Research

**Date:** 2026-04-21

## Summary

S04 owns **R010** and **R023**. The repo currently has the right *calendar truth* and *mobile continuity* substrate for notifications, but almost none of the notification substrate itself. Mobile already has: a trusted per-user shell (`apps/mobile/src/lib/shell/load-app-shell.ts`), a phone-first calendar route with stable route/sync diagnostics (`apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`, `apps/mobile/src/lib/components/calendar/SyncStatusStrip.svelte`), a durable Preferences-backed continuity repository (`apps/mobile/src/lib/offline/repository.ts`), and a direct trusted Supabase transport for schedule reads and writes (`apps/mobile/src/lib/offline/transport.ts`). What it does **not** have is any notification plugin dependency, any device-installation identity, any per-device/per-calendar preference persistence, any reminder scheduler, any push-token capture, any notification tap-routing surface, or any backend notification tables/functions.

That gap matters because **D047** is stricter than “add a bell icon.” The product contract is one calm per-device, per-calendar toggle that governs **both** upcoming reminders and shared-calendar change notifications. The easiest way to accidentally violate that contract is to split the implementation into unrelated local and remote toggles, or to hide partial failure behind a fake enabled state. S04 should instead ship a single notification control plane: one toggle per visible calendar, one truthful status surface for permission + local scheduling + remote subscription, and one device installation record that survives token rotation. The final end-to-end proof that enabled calendars notify, disabled ones stay quiet, duplicates are suppressed, and taps land correctly belongs to **S05**, but S04 needs to choose the data model and native seams now so S05 is verification work rather than architectural rework.

The highest-risk hidden constraint is **scope and horizon**. Current mobile schedule loading is week-scoped (`loadWeek()` in `apps/mobile/src/lib/offline/transport.ts`), and the repository only answers “does any synced week exist?” via `hasSyncedCalendarContinuity()`; it does not enumerate stored week metadata or future snapshots. That means reminder scheduling cannot honestly promise more than the schedule data already known on-device unless S04 adds a broader query/snapshot seam. Keep the first implementation truthful: schedule reminders from known synced shifts on this device, expose honest permission/subscription state, and avoid implying a background scheduling authority the app does not yet have.

## Recommendation

Implement S04 as a **mobile-local notification control layer plus backend subscription wiring**, not as a delivery-proof slice.

1. **Keep the single toggle contract intact.** Do not create separate UI controls for reminders vs shared-change push. One per-calendar toggle should fan out into:
   - local reminder scheduling/cancelation on this device, and
   - remote shared-change subscription enable/disable for this device.

2. **Keep device notification state app-local, not in `@repo/caluno-core`.** Shared packages currently hold pure product contracts; device permission, push token, plugin state, and tap-routing are mobile-runtime concerns. Preserve **D045** by reusing shared calendar/app-shell data, but model notification runtime state in new app-local modules rather than polluting `packages/caluno-core/src/app-shell.ts` with mobile-only fields.

3. **Introduce a stable device installation id in local persistence and a server-side device subscription model.** A push token is not a durable primary key because it can rotate. Persist one app-generated installation id in Preferences, then upsert the current push token and per-calendar toggle state against that device record on the server. This keeps R010/R023 per-device instead of accidentally becoming per-user/global.

4. **Follow the existing adapter pattern for native APIs.** `apps/mobile/src/lib/offline/network.ts` and `app-lifecycle.ts` already wrap Capacitor plugins behind tiny typed adapters with dependency injection. Use the same pattern for:
   - `@capacitor/local-notifications`
   - `@capacitor/push-notifications`
   - notification-action/tap routing

5. **Use deterministic notification ids and explicit state surfaces now.** Even though duplicate-suppression proof belongs to S05, S04 should already choose deterministic ids like `calendarId + shiftId + triggerAt + installationId` for local reminders and stable payload fields like `extra.path` for taps. Otherwise S05 will have to rewrite the scheduler instead of verifying it.

6. **Use Supabase webhook/Edge Function style wiring for remote change notifications, but keep provider choice explicit.** The repo has no existing background worker stack. Supabase docs confirm the webhook → Edge Function pattern, and local Supabase already exposes `/functions/v1`, but the project still needs a provider-specific sender for APNs/FCM. Treat that as wiring in S04 and delivery proof in S05.

## Implementation Landscape

### Key Files

- `apps/mobile/src/routes/groups/+page.svelte` — Best existing surface for the required **one toggle per visible shared calendar**. The route already renders the permitted calendar inventory under trusted shell scope; adding the control here avoids inventing a separate settings screen.
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` — Best active-calendar mirror surface for honest notification state. This route already exposes route/sync data attributes and should project the active calendar’s notification state without becoming the only place the toggle exists.
- `apps/mobile/src/lib/shell/load-app-shell.ts` — Trusted inventory loader. Good place to attach mobile-local notification status lookups to already-permitted calendars, but do **not** move notification runtime state into `@repo/caluno-core` types.
- `apps/mobile/src/lib/offline/repository.ts` — Critical for reminder scheduling. It already persists week snapshots and week metadata, but currently only exposes `rememberSyncedCalendarWeek()` and `hasSyncedCalendarContinuity()`. S04 likely needs a new helper to enumerate synced week metadata/snapshots for an enabled calendar so reminders can be scheduled and canceled deterministically.
- `apps/mobile/src/lib/offline/app-lifecycle.ts` — Existing native-listener adapter pattern to follow for notification resume/tap listeners.
- `apps/mobile/src/lib/offline/network.ts` — Existing native-listener adapter pattern to follow for permission/registration refresh and retry behavior.
- `apps/mobile/src/lib/offline/runtime.ts` / `apps/mobile/src/lib/offline/controller.ts` — Existing route-scoped runtime/state surface. Reuse their observability conventions, but do **not** force per-device notification state into this week-scoped controller; notifications span calendars and weeks.
- `apps/mobile/src/lib/offline/transport.ts` — Current trusted calendar transport. It proves the app can read/write shifts directly under Supabase RLS. S04 may need an additional trusted notification-preference transport, but should avoid mixing notification writes into schedule mutation paths.
- `apps/mobile/src/routes/+layout.ts` — Best bootstrap point for registering notification action listeners and routing taps into the SPA. It already normalizes protected-route entry and can host a notification-launch bridge.
- `apps/mobile/src/lib/shell/load-app-shell.ts` (`normalizeInternalPath()`) — Existing internal-path sanitizer. Use this for notification payload routing instead of trusting raw paths from `extra` payloads.
- `apps/mobile/package.json` — Currently lacks `@capacitor/local-notifications` and `@capacitor/push-notifications`; S04 will need them.
- `apps/mobile/capacitor.config.ts` / `apps/mobile/ios/App/App/capacitor.config.json` / `apps/mobile/ios/App/CapApp-SPM/Package.swift` — Native sync evidence surfaces that will change when notification plugins are added.
- `apps/mobile/ios/App/App/AppDelegate.swift` — Currently has no APNs registration callbacks. Capacitor push docs show AppDelegate work may be required for APNs token registration forwarding.
- `supabase/migrations/20260414_000001_auth_groups_access.sql` — Existing calendar/group membership/RLS contract that notification preference writes must preserve.
- `supabase/migrations/20260416_000001_schedule_realtime.sql` — Existing shared-change publication seam for `public.shifts`; important for remote change notification triggers.
- `supabase/migrations/` (new) — S04 will need new schema for device installations and per-device/per-calendar notification preferences. Nothing notification-related exists today.
- `supabase/functions/` (new, likely) — No Edge Functions exist yet. If S04 includes remote delivery wiring, this is the cleanest repo-local seam.
- `apps/mobile/tests/mobile-continuity.unit.test.ts` and `apps/mobile/tests/mobile-sync-runtime.unit.test.ts` — Good examples of how the repo already tests Capacitor-style adapters with fake storage/network/lifecycle implementations. Notification adapters should follow this pattern.
- `apps/mobile/tests/e2e/auth-scope.spec.ts` and `apps/mobile/tests/e2e/calendar-offline.spec.ts` — Existing browser proof substrate and trusted-state assertions. S04 can extend this style for toggle/state observability even though native delivery itself is not fully browser-provable.

### Build Order

1. **Define the notification control-plane contract first.**
   - Add a durable installation id on-device.
   - Add server tables/RLS for device installations and per-device/per-calendar notification preferences.
   - Decide the combined state model: permission, local reminder scheduling status, remote push registration/subscription status, effective toggle state.
   - This retires the biggest risk: fake “enabled” UI with no durable device identity behind it.

2. **Add app-local notification adapters and service modules.**
   - Wrap `@capacitor/local-notifications` and `@capacitor/push-notifications` behind typed adapters with injected plugin interfaces for unit tests.
   - Add a notification routing helper that normalizes target paths before calling `goto()`.
   - This keeps native complexity out of Svelte components.

3. **Attach one reusable calendar-toggle component to the permitted inventory surfaces.**
   - Primary control surface: `/groups` calendar list.
   - Active-state mirror: `/calendars/[calendarId]`.
   - Expose honest `data-testid` / `data-*` status attributes here, reusing the S01/S02 observability style.

4. **Implement local reminder scheduling from synced on-device data.**
   - Extend the repository with week-metadata/snapshot enumeration.
   - Schedule/cancel deterministic local notifications only from trusted synced shifts already on this device.
   - Do not guess unsynced future schedule.

5. **Wire push permission, token registration, and remote subscription persistence.**
   - Register for push only when the combined toggle needs remote delivery.
   - Upsert token changes against the stable installation id.
   - Disabling one calendar should cancel that calendar’s reminders and remote subscription without unregistering the whole device if other calendars remain enabled.

6. **Add remote-change delivery wiring, but stop short of claiming correctness proof.**
   - Use a server-side trigger seam (likely Supabase webhook → Edge Function) that can later fan out to enabled device subscriptions.
   - Standardize payload shape now (`calendarId`, human summary, sanitized in-app path), but leave duplicate-suppression and tap correctness proof to S05.

### Verification Approach

- `pnpm --dir apps/mobile check`
- `pnpm --dir apps/mobile exec vitest run tests/mobile-continuity.unit.test.ts tests/mobile-sync-runtime.unit.test.ts <new-notification-unit-tests>`
- `npx --yes supabase db reset --local --yes`
- `pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts <new-calendar-notifications.spec.ts>`
- `pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'`

What S04 should be able to prove:
- Every visible permitted calendar shows exactly one notification toggle on-device.
- Enabling/disabling a calendar updates a truthful combined state surface (permission + local reminder schedule + remote subscription), not just optimistic UI.
- Local reminder scheduling/cancelation is deterministic for synced shifts on that device.
- Notification state survives reload/reopen because installation id and preference state are persisted.
- If push permission or registration fails, the UI reports the partial failure explicitly instead of pretending the calendar is fully subscribed.

What should remain for S05:
- actual delivered push/local notification correctness across enabled/disabled calendars,
- duplicate suppression proof,
- and tap landing proof against real delivery events.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Local reminder scheduling, permission checks, pending/delivered inspection, notification action listeners | `@capacitor/local-notifications` | The official plugin already provides scheduling, cancelation, permission, pending/delivered queries, and action callbacks; custom timers or native bridges would be brittle and hard to test. |
| Push permission, token registration, received/action listeners | `@capacitor/push-notifications` | The official plugin already owns permission prompts, registration events, token delivery, and action callbacks; S04 needs truthful state, not a homegrown bridge. |
| App resume/network observation around notification resync | Existing `@capacitor/app` and `@capacitor/network` adapter pattern in `apps/mobile/src/lib/offline/app-lifecycle.ts` and `network.ts` | Reusing the current adapter style keeps notification logic testable with fakes and consistent with S02 runtime wiring. |
| Remote change dispatch seam | Supabase webhook → Edge Function pattern | The repo already uses Supabase and local Supabase exposes Functions. This is a closer fit than inventing a separate job runner or polling service. |
| In-app tap routing sanitization | `normalizeInternalPath()` in `apps/mobile/src/lib/shell/load-app-shell.ts` | Notification payloads should route only to internal safe paths; reusing the existing normalizer avoids trusting raw payload navigation. |

## Constraints

- **R010 / D047:** one per-device, per-calendar toggle must govern both reminders and shared-change notifications. Separate reminder and push toggles would violate the stated product contract.
- **D045:** mobile should reuse shared calendar/backend contracts, but device permission/token state is runtime-specific and should stay app-local.
- **D046:** mobile continuity guardrails still apply. Notification behavior must not widen trusted calendar scope or imply authority beyond previously synced/on-device data.
- The current mobile schedule transport is **visible-week scoped**. There is no existing broad future-range fetch for reminder planning.
- The current repository exposes only `hasSyncedCalendarContinuity()` for calendar-level continuity checks; it does not yet enumerate stored weeks/snapshots for reminder rescheduling.
- Browser-based Playwright proof is the current mobile verification surface. Native notification plugins will need unit-level fakes plus `cap:sync` evidence; full delivery proof is not realistically browser-only.
- There is no notification schema, no notification functions, and no notification provider integration in the repo today.

## Common Pitfalls

- **Splitting the control model** — adding separate reminder and push switches would contradict D047 and make calmness harder to reason about.
- **Storing the toggle only on-device** — local-only state cannot truthfully control remote shared-change push when the app is closed, and it breaks multi-device semantics.
- **Using the push token as the durable device id** — push tokens rotate. Use a stable installation id and upsert the latest token against it.
- **Unregistering push for the whole device when one calendar is turned off** — that would silence other enabled calendars on the same device.
- **Burying notification state inside the week-scoped controller** — notification control is per device and per calendar across weeks, not just for the current visible week.
- **Scheduling local reminders with non-deterministic ids** — resync/reopen would create duplicates instead of updating/canceling known reminders.
- **Trusting raw notification target paths** — payload routing should go through `normalizeInternalPath()` before navigation.

## Open Risks

- The repo has no chosen provider for sending APNs/FCM notifications from the backend. Supabase docs give the webhook/function pattern, but the actual provider integration remains to be selected during execution.
- If the product expectation is reminders beyond already-synced weeks, S04 may need a new bounded future-range load instead of only enumerating stored week snapshots.
- Real tap/delivery proof may need simulator/device-native verification beyond the current browser Playwright harness. S04 should budget for unit fakes plus native packaging proof, while S05 likely needs the stronger end-to-end surface.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Mobile UI / phone-first control surface | `frontend-design` | installed |
| Native/plugin debugging if notification proof flakes | `debug-like-expert` | installed |
| Capacitor notification-specific skill | none found in the currently installed project skills | none found |

## Sources

- Capacitor Push Notifications docs confirmed the official install flow, permission/register/listener model, and the `pushNotificationActionPerformed` event surface, plus APNs AppDelegate forwarding expectations for iOS. (source: [Capacitor Push Notifications docs / guide](https://github.com/ionic-team/capacitor-docs/blob/main/docs/apis/push-notifications.md), [Capacitor push guide](https://github.com/ionic-team/capacitor-docs/blob/main/docs/main/guides/push-notifications-firebase.md))
- Capacitor Local Notifications docs confirmed the official install flow, scheduling/cancelation APIs, pending/delivered inspection, permission checks, action listeners, and action-type registration surface. (source: [Capacitor Local Notifications docs](https://github.com/ionic-team/capacitor-docs/blob/main/docs/apis/local-notifications.md))
- Supabase docs confirmed the webhook → Edge Function push-notification pattern as the closest repo-local remote delivery seam, even though the exact provider implementation here remains open. (source: [Supabase Edge Functions push notification example](https://supabase.com/docs/guides/functions/examples/push-notifications), [Supabase database changes / Realtime guide](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes))