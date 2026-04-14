# M001: Shared scheduling substrate

## Vision
Prove Caluno's web-first shared scheduling substrate so shared calendars, multi-shift scheduling, offline continuity, deterministic sync, live shared updates, and baseline conflict visibility work together before matching or predictive features are added.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | S01 | high | — | ⬜ | A user can sign in, create or join a group, and open only the shared calendars they are allowed to access in the browser. |
| S02 | Multi-shift calendar model and browser editing flows | high | S01 | ⬜ | A user can create, edit, move, and delete multiple shifts per day in shared calendars from the browser. |
| S03 | Offline local persistence with cached-session continuity | high | S01, S02 | ⬜ | A previously signed-in user can reopen synced calendars offline and continue making schedule changes locally in the browser. |
| S04 | Sync engine and realtime shared updates | high | S02, S03 | ⬜ | Multiple group members see shared calendar updates propagate live when online, and offline edits reconcile when connectivity returns. |
| S05 | Baseline conflict detection and milestone assembly proof | medium | S01, S02, S03, S04 | ⬜ | In the browser, shared calendars warn about overlapping or double-booked schedule conflicts while the full substrate works end-to-end offline and online. |
