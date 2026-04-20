# M003: Cross-platform continuity and reminders

**Gathered:** 2026-04-20
**Status:** Ready for planning

## Project Description

M003 turns Caluno mobile into a real product surface on the same trusted scheduling substrate that already works on the web. The goal is not to ship a thin wrapper around the web UI. The goal is to make the phone app feel native, focused, calm, and fast to move through, while preserving the actual Caluno product contract for the main/core loop.

That core loop on mobile must include sign-in, opening permitted shared calendars, creating and editing shifts, and using Find time with a more compact presentation. The milestone also adds per-device, per-calendar notification control through a single toggle that governs both reminders and shared-calendar change notifications.

## Why This Milestone

The web product already proves the trust boundary, offline continuity, reconnect behavior, realtime refresh, and truthful Find time. The biggest remaining gap is that `apps/mobile` is still just a Capacitor starter shell. If Caluno is meant to work where coordination actually happens, the phone app cannot feel fake or second-class.

This milestone exists now because the current substrate is finally stable enough to extend rather than still being in flux. Mobile parity and notification continuity depend on the scheduling and Find time contracts already established in M001 and M002.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Open Caluno on mobile, sign in, see only permitted shared calendars, and use a native-feeling core loop to view, create, and edit shifts.
- Reopen previously synced calendars on mobile while offline, make edits that stay clearly pending, and have those changes reconcile cleanly when connectivity returns.
- Use Find time on mobile in a compact UI, browse Top picks and windows, and hand a chosen slot directly into mobile shift creation.
- Enable or disable notifications per device and per shared calendar, receive reminders and shared-calendar change notifications when enabled, and trust that disabled calendars stay quiet.

### Entry point / environment

- Entry point: mobile app built from `apps/mobile`
- Environment: mobile runtime via Capacitor on iOS and Android targets, plus local development/browser shell during implementation
- Live dependencies involved: Supabase auth/database/RLS/realtime, device-local notification scheduling, push delivery, native app lifecycle handling

## Completion Class

- Contract complete means: shared schedule/find-time contracts, notification preference contracts, duplicate suppression rules, and deep-link landing contracts are covered by automated tests.
- Integration complete means: mobile UI, offline continuity, trusted schedule writes, Find time reads, local reminders, push delivery, and notification-open routing work together against real app/runtime boundaries.
- Operational complete means: app close/reopen, offline/online transitions, permission denial, push registration failure, and reconnect recovery all produce truthful user-visible states.

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A mobile user can sign in, open a permitted calendar, create or edit a shift offline, reopen the app, and watch that pending change reconcile after reconnect.
- A mobile user can run Find time, choose a compact Top-pick or browse suggestion, and land in shift creation with the right calendar/week/timing already set up.
- A device with notifications enabled for one calendar and disabled for another receives only the enabled calendar’s reminder/change notifications, without duplicates, and tapping a notification lands in the correct mobile context.
- The mobile app feels like Caluno rather than a thin wrapper: the real runtime must be exercised, not just browser-mocked or unit-tested.

## Scope

### In Scope

- Real mobile app shell and navigation for Caluno’s core loop
- Mobile sign-in and trusted permitted-calendar scope
- Mobile calendar read/create/edit flows
- Mobile offline continuity for previously synced calendars
- Mobile reconnect drain and truthful pending/retry surfaces
- Mobile Find time with Top picks, browse windows, explanations, and direct create handoff in a compact UI
- Per-device, per-calendar notification toggle covering both reminders and shared-calendar change notifications
- Duplicate suppression, quiet disabled calendars, and notification tap landing behavior
- Real mobile-runtime proof for continuity and notifications

### Out of Scope / Non-Goals

- Predictive scheduling assistance and anticipatory suggestions beyond current Find time
- Chat, messaging, social/network features, or engagement loops
- Analytics/dashboard expansion
- Enterprise workforce-management workflows
- Medical-grade documentation or regulated recordkeeping
- Shipping a thin web wrapper and calling it parity

## Architectural Decisions

### Shared contracts, mobile-native flows

**Decision:** Reuse shared product logic and trusted backend contracts where possible, but design mobile-specific UI flows instead of mirroring the web screens route-for-route.

**Rationale:** The existing scheduling/offline/find-time contracts are already proven on the web, so duplicating domain logic would add risk and drift. But porting web screens directly into a phone shell is exactly how the app starts to feel fake.

**Evidence:** The real domain logic already lives in `apps/web/src/lib/server/*`, `apps/web/src/lib/offline/*`, `apps/web/src/lib/schedule/*`, and `apps/web/src/lib/find-time/*`, while `apps/mobile` is currently almost empty and can still be shaped intentionally.

**Alternatives Considered:**
- Rebuild mobile logic separately — rejected because it would split product behavior and increase drift.
- Wrap web routes inside Capacitor — rejected because it would preserve contracts but fail the “must not feel fake” bar.

### Keep the calendar-core continuity contract on mobile

**Decision:** Mobile must preserve the real product contract for the calendar core: previously synced calendars reopen, offline edits remain usable, and reconnect reconciles through the trusted write path.

**Rationale:** An online-only phone app would feel like a companion shell instead of the same product. The web already proves this continuity contract; dropping it on phone would weaken Caluno where users actually need it.

**Evidence:** M001 already validated cached-session offline reopen, local edits, reconnect drain, and realtime refresh on web.

**Alternatives Considered:**
- Online-first mobile for M003 — rejected because it would make the phone app feel second-class and fake.

### Split notification delivery by source of truth

**Decision:** Use local scheduled notifications for the user’s own upcoming shift reminders and push notifications for shared-calendar changes that must arrive while the app is closed.

**Rationale:** Upcoming reminders can be scheduled on-device once trusted schedule data exists locally. Shared-calendar changes originate from remote collaborators and need server-driven delivery when the app is backgrounded or closed.

**Evidence:** Capacitor’s current notification model requires real permission handling and different runtime behavior for local versus push delivery. Android exact-alarm and permission behavior are real constraints, not optional details.

**Alternatives Considered:**
- Use push for everything — rejected because upcoming reminders map naturally to local schedule state and would add unnecessary server dependency.
- Use local notifications for shared-calendar changes — rejected because closed/background delivery for remote changes needs server-driven push.

### Per-device, per-calendar notification control

**Decision:** Notification preference is stored and enforced per device and per shared calendar, through one toggle that covers both reminders and shared-calendar change notifications.

**Rationale:** Notification appetite depends on the device context. One calm toggle matches the user’s preference for low-friction control, while per-calendar scope prevents all-or-nothing noise.

**Alternatives Considered:**
- Account-wide notification settings — rejected because the user explicitly wants per-device behavior.
- Separate toggles for reminders and changes — rejected because the user preferred one combined control.

### Keep Find time trusted and fail closed offline on mobile

**Decision:** Mobile Find time remains server-backed and offline-denied, even while the mobile calendar core supports offline continuity.

**Rationale:** Find time depends on trusted roster scope and member-attributed busy intervals. Replaying stale local guesses on mobile would fork the product contract from web and create a more dangerous kind of “fake” experience: confident but untrusted answers.

**Evidence:** M002 already established explicit fail-closed offline behavior for Find time on web.

**Alternatives Considered:**
- Cached/offline Find time on mobile — rejected because it would widen authority from stale local data.

## Error Handling Strategy

- **Auth/session:** fail closed on invalid or expired session; preserve previously trusted offline scope only where continuity rules already allow it.
- **Calendar continuity:** previously synced calendars reopen offline; offline edits are stored locally and marked clearly pending until reconnect drain succeeds.
- **Reconnect:** drain queued changes deterministically through the same trusted write path rather than introducing a second mobile-only mutation channel.
- **Find time:** show explicit offline/denied/unavailable states instead of guessed cached answers.
- **Notifications:** keep permission/subscription state honest in the UI. If push registration fails or exact scheduling is unavailable, the device must not pretend it is fully subscribed.
- **Notification open:** treat push as a delivery hint only; tapping a notification must reopen the trusted app flow and refresh canonical data before assuming current truth.
- **Tone:** user-facing states stay calm, specific, and non-spammy, with visible pending/retry surfaces and no noisy retry loops.

## Risks and Unknowns

- Turning `apps/mobile` into a real client without bloating it or coupling it too tightly to web route structure — this is the central “does it feel fake?” risk.
- Reusing offline/sync logic cleanly across browser and mobile runtimes — the contract exists, but the runtime implementation details differ.
- Notification correctness across runtime boundaries — per-device preference scope, push token registration, permission denial, duplicate suppression, and quiet disabled calendars all have to line up.
- Deep-link/notification landing behavior — if taps land in the wrong place or lose context, the app will feel flimsy even if delivery works.

## Existing Codebase / Prior Art

- `apps/web/src/lib/offline/*` — existing offline repository, queue, controller, sync-engine, and trusted shell continuity behavior.
- `apps/web/src/lib/server/schedule.ts` — trusted schedule reads/writes and authorization boundaries.
- `apps/web/src/lib/server/find-time.ts` — trusted roster/busy lookup and Find time composition.
- `apps/web/src/lib/find-time/*` — ranking and explanation contract already proven on web.
- `apps/web/src/lib/schedule/create-prefill.ts` — existing exact timing handoff contract from Find time into create flow.
- `apps/mobile/src/routes/+page.svelte` — current mobile surface is only a starter shell and should not be mistaken for product parity.
- `apps/mobile/package.json` / `apps/mobile/capacitor.config.ts` — Capacitor is available but no real mobile product flow exists yet.

## Relevant Requirements

- R002 — Extend permission-bound shared calendar scope cleanly onto mobile surfaces.
- R009 — Make mobile a real first-class Caluno client on the same substrate.
- R010 — Add per-device, per-calendar reminders and change notifications without undermining calmness.
- R022 — Preserve mobile offline continuity and reconnect behavior for the calendar core.
- R023 — Make notification delivery trustworthy: quiet disabled calendars, no duplicates, correct landing context.

## Technical Constraints

- Preserve the existing Supabase + SvelteKit trust boundary; do not invent a second authority model for mobile.
- Do not widen Find time authority from cached local data.
- Mobile must not become a thin wrapper around web screens.
- Notification handling must respect real platform/runtime constraints such as permission prompts, push registration failures, and Android exact-alarm behavior.
- The milestone must prove behavior in a real mobile runtime, not just browser simulation.

## Integration Points

- Supabase auth/database/RLS/realtime — remains the canonical backend boundary for auth, schedule data, sharing scope, and collaborator-originated changes.
- Capacitor runtime — hosts the real mobile UI and native lifecycle behavior.
- Local notification APIs — schedule upcoming shift reminders on-device.
- Push notification delivery — deliver shared-calendar changes while the app is closed/backgrounded.
- Existing schedule/find-time contracts — reused rather than redefined for mobile.

## Testing Requirements

M003 needs a mixed proof bar.

- Contract tests for shared schedule/find-time logic, notification preference contracts, duplicate suppression rules, and deep-link/landing contracts.
- Integration tests for trusted mobile schedule writes, reconnect drain, Find time server-backed behavior, and notification preference wiring.
- Real mobile-runtime proof for offline continuity, app close/reopen, permission-denied notification states, enabled-versus-disabled calendar delivery, duplicate suppression, and notification tap landing.
- Verification must include both happy-path and truthful failure-state proof surfaces.

## Acceptance Criteria

### Scope
- Mobile ships the main/core Caluno loop rather than a viewer or thin wrapper.
- Mobile supports sign-in, opening permitted calendars, creating/editing shifts, and using Find time.
- Mobile remains focused and not bloated.

### Architectural Decisions
- Shared contracts/backend logic are reused where appropriate, but mobile UI flows are intentionally mobile-specific.
- Calendar continuity works offline on mobile.
- Find time stays server-backed and fail closed offline.
- Notifications split into local reminders and push-driven shared-calendar changes.
- Notification control is per device and per calendar with one toggle.

### Error Handling Strategy
- Invalid auth/session states fail closed.
- Offline edits are visibly pending until reconnect succeeds.
- Push registration/permission problems are exposed honestly.
- Quiet disabled calendars and duplicate suppression are part of the contract, not polish.

### Quality Bar
- Mobile navigation feels native and easy to move through.
- Core actions get the user where they want to go quickly with the right context already set up.
- Notification taps land in the right context.
- Real mobile runtime proof exists in addition to contract tests.

## Open Questions

- Whether group-management flows beyond the main/core loop should remain web-first in M003 or need partial mobile treatment once implementation starts revealing the seams.
- The exact reminder lead-time policy for upcoming shifts — the discussion locked the control model, not the final reminder timing defaults.
- The exact server-side delivery mechanism for shared-calendar change push notifications within the existing Supabase/SvelteKit boundary.
