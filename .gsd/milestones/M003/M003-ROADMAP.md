# M003: Cross-platform continuity and reminders

**Vision:** Make Caluno mobile real on top of the proven shared scheduling and Find time substrate, while adding calm, trustworthy per-device notifications for reminders and shared-calendar changes.

## Success Criteria

- A mobile user can sign in, see only permitted calendars, and use a native-feeling core loop to view, create, and edit shifts.
- A previously synced calendar reopens on mobile, offline edits survive close/reopen, and reconnect reconciles those changes through the trusted path.
- A mobile user can run Find time online, get truthful compact results, and hand a chosen slot directly into shift creation; offline still fails closed.
- Per-device, per-calendar notification control works: enabled calendars notify, disabled calendars stay quiet, duplicates are suppressed, and notification taps land in the intended mobile context.

## Slices

- [x] **S01: S01** `risk:high` `depends:[]`
  > After this: A user can sign in on mobile, land in a native-feeling shell, see only permitted calendars, and hit truthful denied states when scope is invalid.

- [x] **S02: S02** `risk:high` `depends:[]`
  > After this: A previously synced calendar reopens on mobile, a shift can be created or edited offline, the change stays visibly pending, and reconnect drains it back through the trusted path.

- [x] **S03: S03** `risk:medium` `depends:[]`
  > After this: A user can run Find time on mobile, scan compact Top picks and browse windows, and hand a chosen slot directly into mobile shift creation with the right context already set.

- [x] **S04: S04** `risk:high` `depends:[]`
  > After this: On a device, each shared calendar has one notification toggle that truthfully controls both reminders and shared-calendar change notifications, with honest permission/subscription state.

- [ ] **S05: S05** `risk:medium` `depends:[]`
  > After this: Enabled calendars notify, disabled calendars stay quiet, duplicate notifications are suppressed, taps land in the right mobile context, and the assembled app proves it doesn’t feel fake.

## Boundary Map

## Boundary Map

### S01 → S02
Produces:
- Mobile authenticated app shell that resolves trusted session state and permitted calendar inventory from the existing backend boundary
- Mobile navigation contract for calendar entry, denial surfaces, and sign-in recovery
- Shared mobile calendar scope model: `calendarId`, membership-derived permission state, primary/default calendar metadata

Consumes:
- Existing Supabase auth/session validation and protected-scope loading from M001/M002

### S01 → S03
Produces:
- Mobile app shell and authenticated calendar context that can host a compact Find time route
- Route and deep-link scaffolding for moving from calendar context into Find time and back

Consumes:
- Existing Find time trusted server contract from M002

### S02 → S03
Produces:
- Mobile create/edit shift flow with exact start/end prefill support
- Mobile calendar-week context and selected-week targeting needed for Find time handoff landing
- Mobile offline/online state surfaces that distinguish trusted calendar continuity from server-only capabilities

Consumes from S01:
- Mobile authenticated shell and permitted calendar scope

### S02 → S04
Produces:
- Device-local knowledge of previously synced calendar scope for per-calendar notification enrollment UI
- Mobile schedule event model and local calendar state needed to schedule upcoming-shift reminders
- App lifecycle and reconnect surfaces that can reschedule reminders after reopen/reconnect

Consumes from S01:
- Authenticated app shell and permitted calendar list

### S04 → S05
Produces:
- Per-device, per-calendar notification preference model
- Push registration and device-subscription wiring contract
- Local reminder scheduling contract for upcoming shifts
- Notification-open routing contract that resolves calendar context from a notification payload

Consumes from S02:
- Mobile calendar state and offline/reconnect lifecycle

### S03 → S05
Produces:
- Compact mobile Find time surface with Top picks, browse windows, and direct create handoff
- Mobile route/context contract proving Find time stays trusted-online and fail-closed offline

Consumes from S01 and S02:
- Authenticated calendar context and mobile create/edit handoff surfaces
