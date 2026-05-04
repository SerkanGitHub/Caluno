---
estimated_steps: 40
estimated_files: 8
skills_used: []
---

# T02: Add native notification adapters and deterministic reminder resync runtime

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

## Inputs

- ``apps/mobile/package.json` — current Capacitor dependency surface without notification plugins.`
- ``apps/mobile/src/lib/offline/repository.ts` — existing trusted week metadata store that must be enumerated for reminder resync.`
- ``apps/mobile/src/lib/offline/app-lifecycle.ts` — existing resume listener adapter pattern to reuse.`
- ``apps/mobile/src/lib/offline/network.ts` — existing connectivity adapter pattern to reuse.`
- ``apps/mobile/src/lib/notifications/device-installation.ts` — stable installation id created in T01.`
- ``apps/mobile/src/lib/notifications/state.ts` — combined notification state contract from T01.`

## Expected Output

- ``apps/mobile/package.json` — notification plugin dependencies added for mobile runtime support.`
- ``apps/mobile/src/lib/offline/repository.ts` — synced-week enumeration helpers for deterministic reminder resync.`
- ``apps/mobile/src/lib/notifications/local-notifications.ts` — typed local notification adapter.`
- ``apps/mobile/src/lib/notifications/push-notifications.ts` — typed push notification adapter.`
- ``apps/mobile/src/lib/notifications/scheduler.ts` — deterministic reminder id and schedule/cancel logic.`
- ``apps/mobile/src/lib/notifications/runtime.ts` — per-calendar notification runtime that composes permission, registration, and reminder sync.`
- ``apps/mobile/src/lib/offline/app-lifecycle.ts` — reused or lightly extended lifecycle hook support for notification resume handling.`
- ``apps/mobile/tests/mobile-notification-runtime.unit.test.ts` — unit proof for deterministic resync, permission denial, and partial failures.`

## Verification

pnpm --dir apps/mobile exec vitest run tests/mobile-continuity.unit.test.ts tests/mobile-notification-contract.unit.test.ts tests/mobile-notification-runtime.unit.test.ts && pnpm --dir apps/mobile check

## Observability Impact

This task changes async plugin/runtime behavior, so it must expose permission, registration, and local reminder resync phases in a way later routes can show without guesswork.
