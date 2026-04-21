# M003: Cross-platform continuity and reminders

## Vision
Make Caluno mobile real on top of the proven shared scheduling and Find time substrate, while adding calm, trustworthy per-device notifications for reminders and shared-calendar changes.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | S01 | high | — | ✅ | A user can sign in on mobile, land in a native-feeling shell, see only permitted calendars, and hit truthful denied states when scope is invalid. |
| S02 | S02 | high | — | ⬜ | A previously synced calendar reopens on mobile, a shift can be created or edited offline, the change stays visibly pending, and reconnect drains it back through the trusted path. |
| S03 | Mobile Find time and compact create handoff | medium | S01, S02 | ⬜ | A user can run Find time on mobile, scan compact Top picks and browse windows, and hand a chosen slot directly into mobile shift creation with the right context already set. |
| S04 | Device notification controls and delivery wiring | high | S01, S02 | ⬜ | On a device, each shared calendar has one notification toggle that truthfully controls both reminders and shared-calendar change notifications, with honest permission/subscription state. |
| S05 | Cross-surface notification correctness and final mobile assembly proof | medium | S02, S03, S04 | ⬜ | Enabled calendars notify, disabled calendars stay quiet, duplicate notifications are suppressed, taps land in the right mobile context, and the assembled app proves it doesn’t feel fake. |
