# S04: Device notification controls and delivery wiring

**Goal:** Add a truthful per-device notification control plane to mobile so each permitted calendar exposes one calm toggle that governs both local shift reminders and shared-calendar change subscriptions, persists against a stable installation id, and reports honest permission / scheduling / remote-subscription state without widening trusted scope.
**Demo:** On a device, each shared calendar has one notification toggle that truthfully controls both reminders and shared-calendar change notifications, with honest permission/subscription state.

## Must-Haves

- Demo: on `/groups`, every permitted calendar shows exactly one notification toggle, and the active `/calendars/[calendarId]` route mirrors the same state. Enabling a calendar on this device persists a stable installation-backed preference row, refreshes reminder scheduling only from trusted synced weeks already on-device, and records remote shared-change subscription intent; disabling that calendar cancels only its own reminders/subscription while leaving other enabled calendars untouched.
- `R010`: one per-device, per-calendar control surface governs both upcoming reminders and shared-calendar change notifications without splitting the model into separate reminder/push toggles.
- `R023`: S04 advances trustworthy delivery by choosing deterministic local reminder ids, sanitized notification payload paths, and explicit degraded states (`permission-denied`, `registration-failed`, `provider-unconfigured`, `path-rejected`) so S05 can prove quiet disabled calendars, duplicate suppression, and real delivered landing instead of re-architecting the substrate.
- Preserve validated `R022`: reminder scheduling must only use trusted synced weeks already stored on this device; cached-offline continuity does not grant broader schedule authority or unsynced future guesses.
- Preserve validated `R009`: the notification flow lives in `apps/mobile` with phone-first UI and app-local runtime adapters, while shared schedule/scope substrate remains reused instead of importing web screens or moving device runtime state into `@repo/caluno-core`.
- Threat surface: untrusted notification payload paths, out-of-scope calendar ids, rotated push tokens, malformed native plugin responses, and provider misconfiguration all fail closed or degrade explicitly; no raw push token, installation id, or out-of-scope schedule data is rendered in the UI.
- Requirement impact: primary requirements touched are `R010` and `R023`; re-verify `R022` continuity boundaries, `R009` mobile shell quality, and the existing denied-scope/auth behavior on `/groups` and `/calendars/[calendarId]` after toggle wiring lands.
- Decisions revisited: `D045`, `D046`, `D047`, `D057`, and `D061`.
- Assumption: S04 does not finalize an APNs/FCM vendor integration. Missing provider configuration must surface as an honest degraded remote-subscription state instead of blocking local reminder control or pretending full remote delivery works.
- Verification target files: `apps/mobile/tests/mobile-continuity.unit.test.ts`, `apps/mobile/tests/mobile-notification-contract.unit.test.ts`, `apps/mobile/tests/mobile-notification-runtime.unit.test.ts`, `apps/mobile/tests/mobile-notification-router.unit.test.ts`, `apps/mobile/tests/e2e/calendar-notifications.spec.ts`, `apps/mobile/tests/e2e/auth-scope.spec.ts`, and `apps/mobile/tests/e2e/calendar-offline.spec.ts`.
- Verification commands: `pnpm --dir apps/mobile exec vitest run tests/mobile-continuity.unit.test.ts tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts tests/mobile-notification-router.unit.test.ts`; `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-notifications.spec.ts`; `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'`.
- Decomposition rationale: T01 establishes the durable installation / preference contract first so the toggle cannot lie; T02 spends that contract on native adapters and deterministic reminder resync; T03 turns the state into one truthful phone-first toggle plus safe tap routing; T04 closes the slice with provider-neutral remote dispatch wiring, browser proof, and native sync evidence.

## Proof Level

- This slice proves: - This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Integration Closure

Upstream surfaces consumed: `apps/mobile/src/lib/shell/load-app-shell.ts`, `apps/mobile/src/lib/offline/repository.ts`, `apps/mobile/src/lib/offline/app-lifecycle.ts`, `apps/mobile/src/lib/offline/network.ts`, `apps/mobile/src/routes/groups/+page.svelte`, `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`, `supabase/migrations/20260414_000001_auth_groups_access.sql`, and `supabase/migrations/20260416_000001_schedule_realtime.sql`.

New wiring introduced in this slice: stable device-installation persistence, per-device/per-calendar notification preference storage, local/push Capacitor adapters, deterministic reminder scheduling from trusted synced weeks, a reusable calendar notification toggle, notification-open path normalization in the mobile layout, and a provider-neutral Supabase Edge Function dispatch seam for shared-calendar changes.

What remains before the milestone is truly usable end-to-end: S05 must still prove actual delivered-notification correctness across enabled/disabled calendars, duplicate suppression, and real tap landing from native delivery events; S04 only needs the wiring and honest state surfaces to make that proof possible.

## Verification

- Runtime signals: per-calendar `data-notification-enabled`, `data-notification-permission`, `data-local-reminders`, `data-remote-subscription`, `data-notification-phase`, `data-notification-reason`, and tap-routing result codes; persisted server-side subscription / installation state with explicit degraded reasons.
- Inspection surfaces: `/groups` calendar cards, `/calendars/[calendarId]` route diagnostics, notification runtime/unit tests, Playwright toggle assertions, and Supabase notification tables/functions after `db reset`.
- Failure visibility: permission denial, push registration failure, provider misconfiguration, schedule-enumeration failure, and rejected notification target paths remain attributable through typed reason codes instead of a boolean enabled/disabled lie.
- Redaction constraints: never expose raw push tokens, stable installation ids, or out-of-scope calendar metadata in UI diagnostics or browser assertions.

## Tasks

- [x] **T01: Create the device notification control plane and persistence contract** `est:2h`
  ---
estimated_steps: 20
estimated_files: 6
skills_used:
  - best-practices
  - debug-like-expert
---

# T01: Create the device notification control plane and persistence contract

Build the durable substrate behind the single mobile notification toggle before any UI claims the feature exists. The executor should create the stable installation identity and the server-side per-device/per-calendar preference contract first, then expose a typed mobile transport/state layer that can tell the UI the difference between desired toggle state, local reminder readiness, and remote subscription health.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Supabase notification tables / RLS | Fail closed and keep toggle state unreadable rather than inferring preferences outside permitted calendar scope. | Surface a typed persistence failure and leave the calendar in a degraded unsynced state. | Reject malformed preference rows or installation records, clear unsafe local assumptions, and require a fresh trusted read. |
| Stable installation persistence | Generate or recover one installation id per device; if storage fails, keep toggles disabled/degraded instead of fabricating device identity. | Surface installation bootstrap failure explicitly and block writes that would orphan remote subscriptions. | Refuse malformed stored ids and regenerate only through the typed helper, not ad hoc component code. |
| Trusted calendar scope from the shell | Never write preference rows for calendars missing from the permitted inventory. | Keep the control plane read-only until scope is known. | Treat scope mismatch as a hard denial, not a recoverable toggle drift. |

## Load Profile

- **Shared resources**: Supabase device-installation rows, per-calendar preference rows, and mobile trusted-shell inventory.
- **Per-operation cost**: one installation lookup/upsert plus one per-calendar preference read/write round-trip per toggle action.
- **10x breakpoint**: duplicate installation rows or token-rotation churn will create drift before UI rendering cost becomes the problem.

## Negative Tests

- **Malformed inputs**: blank calendar ids, malformed stored installation ids, duplicate preference rows, and incomplete registration payloads.
- **Error paths**: RLS denial for out-of-scope calendars, storage failure during installation bootstrap, and transport timeout while syncing preference state.
- **Boundary conditions**: first launch with no installation id, token rotation on an existing installation, multiple calendars enabled on one device, and one disabled calendar beside an enabled sibling.

## Steps

1. Add a new notification migration that introduces stable device-installation and per-device/per-calendar preference tables, unique constraints, update triggers, and access policies/RPC helpers that respect existing calendar scope instead of inventing a global notification surface.
2. Add an app-local installation helper that persists one app-generated installation id on device and can upsert rotated push-token metadata against the same installation without using the token as the primary key.
3. Build a typed mobile notification transport/state module that reads and writes preference rows, separates desired toggle state from local reminder and remote subscription status, and exposes degraded reasons like `installation-unavailable`, `sync-failed`, or `provider-unconfigured`.
4. Add unit proof that installation ids survive reload, token rotation updates the same installation record, out-of-scope calendars are rejected, and malformed rows fail closed.

## Must-Haves

- [ ] A stable installation id exists outside the push token and becomes the durable key for all device notification state.
- [ ] Per-calendar preference rows are keyed by installation id plus calendar id, not by user-global settings.
- [ ] Combined status distinguishes toggle intent, permission state, local reminder readiness, remote subscription readiness, and degraded reason codes.
- [ ] Unit tests prove fail-closed behavior for malformed storage, scope mismatch, and token rotation.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/mobile-notification-contract.unit.test.ts`
- `npx --yes supabase db reset --local --yes`

## Observability Impact

- Signals added/changed: installation bootstrap status, preference sync phase, remote subscription degraded reason.
- How a future agent inspects this: query the new notification tables after local reset and inspect the state helper / unit suite outputs.
- Failure state exposed: installation and persistence failures become typed states instead of a silent false toggle.
  - Files: `supabase/migrations/20260422_000001_device_notifications.sql`, `apps/mobile/src/lib/notifications/types.ts`, `apps/mobile/src/lib/notifications/device-installation.ts`, `apps/mobile/src/lib/notifications/transport.ts`, `apps/mobile/src/lib/notifications/state.ts`, `apps/mobile/tests/mobile-notification-contract.unit.test.ts`
  - Verify: pnpm --dir apps/mobile exec vitest run tests/mobile-notification-contract.unit.test.ts && npx --yes supabase db reset --local --yes

- [x] **T02: Add native notification adapters and deterministic reminder resync runtime** `est:2h`
  ---
estimated_steps: 22
estimated_files: 8
skills_used:
  - best-practices
  - debug-like-expert
---

# T02: Add native notification adapters and deterministic reminder resync runtime

Spend the control-plane contract on the real mobile runtime seams. This task should wrap the Capacitor notification plugins behind the same small typed-adapter pattern already used for network and app lifecycle, extend the offline repository just enough to enumerate trusted synced weeks, and build the runtime that can schedule or cancel reminder notifications deterministically for enabled calendars without claiming broader future authority than the device already has.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Capacitor Local Notifications plugin | Surface local reminder scheduling as degraded and keep the calendar toggle honest instead of claiming reminders are armed. | Leave the desired toggle persisted but expose scheduling as pending/failed until the adapter recovers. | Ignore malformed pending/delivered payloads and rebuild state from trusted schedule data plus deterministic ids. |
| Capacitor Push Notifications plugin | Keep remote subscription degraded and do not fabricate a token or permission grant. | Leave local reminders intact while remote registration remains explicit as pending/failed. | Reject malformed registration/action payloads and keep raw plugin data out of UI surfaces. |
| Mobile offline repository / synced-week enumeration | Refuse to schedule beyond the trusted stored weeks already on-device. | Surface resync failure and keep reminder state degraded instead of guessing future shifts. | Clear malformed week metadata and stop scheduling from it. |

## Load Profile

- **Shared resources**: device-local plugin state, stored week snapshots, and per-calendar reminder schedules.
- **Per-operation cost**: plugin permission check, optional registration refresh, week metadata enumeration, and deterministic schedule/cancel calls for that calendar's visible trusted shifts.
- **10x breakpoint**: repeated resync on resume/reconnect and oversized local pending notification lists will break determinism before simple toggle rendering does.

## Negative Tests

- **Malformed inputs**: malformed week metadata, invalid trigger timestamps, missing shift ids, invalid permission states, and duplicate pending local notifications.
- **Error paths**: permission denied, push registration failure, local schedule failure, repository timeout, and resume/reconnect while remote state is degraded.
- **Boundary conditions**: enabling one calendar while another stays disabled, disabling a single calendar with siblings still enabled, reopen/resume after prior sync, and cached-offline route mode with no new trusted data.

## Steps

1. Add typed adapters for `@capacitor/local-notifications` and `@capacitor/push-notifications`, following the `network.ts` / `app-lifecycle.ts` wrapper style so runtime behavior stays testable with fakes.
2. Extend the mobile offline repository with helpers to enumerate synced week metadata / snapshots per calendar, then build a reminder scheduler that computes deterministic notification ids from installation id, calendar id, shift id, and trigger time.
3. Implement a notification runtime that checks permission, refreshes push registration, syncs/cancels local reminders for enabled calendars only from trusted synced weeks, and preserves partial-failure truth when remote registration or local scheduling fails.
4. Add unit coverage with fake plugins and fake storage for permission denial, registration failure, single-calendar disable, deterministic resync, and malformed repository payloads.

## Must-Haves

- [ ] Local and push notification APIs are wrapped behind typed mobile adapters instead of being called directly from Svelte components.
- [ ] Reminder ids are deterministic so resync/reopen updates or cancels known notifications instead of duplicating them.
- [ ] Scheduling stays bounded to trusted synced weeks already on-device and does not guess unsynced future schedule.
- [ ] Permission-denied and registration-failed states remain explicit while preserving the persisted desired toggle intent.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/mobile-continuity.unit.test.ts tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts`
- `pnpm --dir apps/mobile check`

## Observability Impact

- Signals added/changed: permission state, local reminder sync phase/count, remote registration state, last reminder resync timestamp.
- How a future agent inspects this: runtime state helper, unit fakes, and route-level data attributes added by later tasks.
- Failure state exposed: permission, registration, and repository failures become typed degraded reasons instead of disappearing behind a binary toggle.
  - Files: `apps/mobile/package.json`, `apps/mobile/src/lib/offline/repository.ts`, `apps/mobile/src/lib/notifications/local-notifications.ts`, `apps/mobile/src/lib/notifications/push-notifications.ts`, `apps/mobile/src/lib/notifications/scheduler.ts`, `apps/mobile/src/lib/notifications/runtime.ts`, `apps/mobile/src/lib/offline/app-lifecycle.ts`, `apps/mobile/tests/mobile-notification-runtime.unit.test.ts`
  - Verify: pnpm --dir apps/mobile exec vitest run tests/mobile-continuity.unit.test.ts tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts && pnpm --dir apps/mobile check

- [x] **T03: Surface one truthful notification toggle per calendar and safe tap routing** `est:90m`
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
  - Files: `apps/mobile/src/lib/components/notifications/CalendarNotificationToggle.svelte`, `apps/mobile/src/lib/notifications/router.ts`, `apps/mobile/src/routes/groups/+page.svelte`, `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`, `apps/mobile/src/routes/+layout.ts`, `apps/mobile/tests/mobile-notification-router.unit.test.ts`
  - Verify: pnpm --dir apps/mobile exec vitest run tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts tests/mobile-notification-router.unit.test.ts && pnpm --dir apps/mobile check

- [ ] **T04: Wire shared-change dispatch and prove notification state end to end** `est:2h`
  ---
estimated_steps: 20
estimated_files: 7
skills_used:
  - verify-before-complete
  - debug-like-expert
---

# T04: Wire shared-change dispatch and prove notification state end to end

Close the slice with real integration evidence. Add the provider-neutral server dispatch seam that can consume calendar-change events and target enabled device subscriptions, then extend the mobile Playwright harness so it proves toggle visibility, persistence, degraded states, and safe tap landing without over-claiming actual delivered notification correctness that belongs to S05.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Supabase function / shared-change dispatch seam | Surface remote delivery as degraded/provider-unconfigured and keep persisted subscription intent truthful. | Treat dispatch verification as incomplete and block slice closure. | Reject malformed change payloads or unsafe target paths before any delivery attempt is recorded. |
| Mobile Playwright harness | Stop on the first failing explicit diagnostic rather than inferring success from UI prose. | Treat long-running toggle/tap assertions as incomplete evidence and debug against named `data-*` surfaces. | Fail the spec if toggle, degraded state, or tap-routing metadata is missing or malformed. |
| Mobile build / Capacitor sync | Block completion until the new notification plugins and iOS wiring are synced into the native project. | Keep the slice open until native packaging succeeds. | Do not accept partial plugin sync or missing AppDelegate/package updates. |

## Load Profile

- **Shared resources**: seeded Supabase data, notification preference tables, Edge Function dispatch seam, Playwright browser harness, and Capacitor native project generation.
- **Per-operation cost**: local DB reset, sign-in, groups/calendar navigation, toggle save cycles, simulated tap action, browser assertions, and native sync/build.
- **10x breakpoint**: flaky async save/tap waits and missing plugin sync will break proof before the feature logic should.

## Negative Tests

- **Malformed inputs**: unsafe notification target path, malformed dispatch payload, missing provider config, and duplicate toggle actions across reload.
- **Error paths**: explicit permission denial/degraded remote subscription state, save failure, rejected tap route, and provider-unconfigured dispatch attempt.
- **Boundary conditions**: one enabled and one disabled calendar on the same device, reload after toggling, reopening the active calendar route, and simulated notification tap into a permitted calendar from another screen.

## Steps

1. Add a provider-neutral Supabase Edge Function dispatch seam that reads enabled device subscriptions for a calendar change, shapes sanitized payloads, and records explicit degraded/provider-unconfigured outcomes instead of pretending live push delivery succeeded.
2. Extend `apps/mobile/tests/e2e/fixtures.ts` with a notification harness that can simulate permission state, registration state, and notification-action events in the browser so Playwright can verify honest UI state and tap routing.
3. Add `apps/mobile/tests/e2e/calendar-notifications.spec.ts` covering one-toggle-per-calendar visibility, enable/disable persistence across reload, degraded permission/remote states, and notification tap landing in the intended mobile calendar context.
4. Re-run auth/scope and calendar-offline proof plus mobile unit suites, then finish with `check`, `build`, and `cap:sync` so notification plugins and any AppDelegate wiring are packaged into the native shell.

## Must-Haves

- [ ] A provider-neutral shared-change dispatch seam exists and exposes explicit degraded/provider-unconfigured outcomes instead of a fake subscribed state.
- [ ] Playwright proves one toggle per permitted calendar, state persistence across reload, explicit degraded states, and safe tap landing into the intended mobile context.
- [ ] Existing auth/scope and offline continuity proof stay green alongside the new notification flow.
- [ ] `cap:sync` updates native iOS/plugin wiring so the feature is not browser-only scaffolding.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/mobile-continuity.unit.test.ts tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts tests/mobile-notification-router.unit.test.ts`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-notifications.spec.ts`
- `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'`

## Observability Impact

- Signals added/changed: remote dispatch result code, toggle persistence across reload, simulated notification action result, and native plugin sync evidence.
- How a future agent inspects this: Edge Function source, Playwright notification fixtures/spec, and generated iOS package/AppDelegate files after sync.
- Failure state exposed: `provider-unconfigured`, `tap-route-rejected`, and plugin-sync regressions remain explicit and reproducible.
  - Files: `supabase/functions/notify-calendar-change/index.ts`, `apps/mobile/tests/e2e/fixtures.ts`, `apps/mobile/tests/e2e/calendar-notifications.spec.ts`, `apps/mobile/playwright.config.ts`, `apps/mobile/ios/App/App/AppDelegate.swift`, `apps/mobile/ios/App/CapApp-SPM/Package.swift`, `apps/mobile/ios/App/App/capacitor.config.json`
  - Verify: pnpm --dir apps/mobile exec vitest run tests/mobile-continuity.unit.test.ts tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts tests/mobile-notification-router.unit.test.ts && npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-notifications.spec.ts && pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'

## Files Likely Touched

- supabase/migrations/20260422_000001_device_notifications.sql
- apps/mobile/src/lib/notifications/types.ts
- apps/mobile/src/lib/notifications/device-installation.ts
- apps/mobile/src/lib/notifications/transport.ts
- apps/mobile/src/lib/notifications/state.ts
- apps/mobile/tests/mobile-notification-contract.unit.test.ts
- apps/mobile/package.json
- apps/mobile/src/lib/offline/repository.ts
- apps/mobile/src/lib/notifications/local-notifications.ts
- apps/mobile/src/lib/notifications/push-notifications.ts
- apps/mobile/src/lib/notifications/scheduler.ts
- apps/mobile/src/lib/notifications/runtime.ts
- apps/mobile/src/lib/offline/app-lifecycle.ts
- apps/mobile/tests/mobile-notification-runtime.unit.test.ts
- apps/mobile/src/lib/components/notifications/CalendarNotificationToggle.svelte
- apps/mobile/src/lib/notifications/router.ts
- apps/mobile/src/routes/groups/+page.svelte
- apps/mobile/src/routes/calendars/[calendarId]/+page.svelte
- apps/mobile/src/routes/+layout.ts
- apps/mobile/tests/mobile-notification-router.unit.test.ts
- supabase/functions/notify-calendar-change/index.ts
- apps/mobile/tests/e2e/fixtures.ts
- apps/mobile/tests/e2e/calendar-notifications.spec.ts
- apps/mobile/playwright.config.ts
- apps/mobile/ios/App/App/AppDelegate.swift
- apps/mobile/ios/App/CapApp-SPM/Package.swift
- apps/mobile/ios/App/App/capacitor.config.json
