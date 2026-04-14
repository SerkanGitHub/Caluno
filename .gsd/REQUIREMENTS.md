# REQUIREMENTS.md – Caluno System Requirements

This document defines the functional, non‑functional, and acceptance requirements for Caluno.  
All agents (Architect, Backend, Mobile, Web, UX, QA) must treat this file as authoritative.

---

# 1. Functional Requirements

## 1.1 User & Authentication
- Users must be able to create an account using email/password.
- Users must be able to join or create groups (family, team, friends).
- Users must have roles (admin, member, viewer).
- Users must only access calendars they own or that are shared with them.
- Authentication must work offline (cached session) and sync when online.

---

## 1.2 Calendar & Scheduling
- Users must be able to create multiple shifts per day.
- Shifts must support custom start/end times.
- Users must be able to create events with participants.
- Users must be able to edit, delete, and move shifts/events.
- Calendar must support:
  - Monthly view
  - Weekly view
  - Daily view
- Drag‑and‑drop editing must be supported on mobile and web.
- Recurring shifts must be supported (daily, weekly, custom patterns).
- Conflict detection must warn users about:
  - overlapping shifts
  - double assignments
  - missing childcare (if configured)

---

## 1.3 Collaboration & Sharing
- Users must be able to share calendars with groups.
- Changes must sync in real time when online.
- Users must see color‑coded overlays for multiple people.
- Users must be able to add shared notes per day.
- Users must be able to add shared tasks per day.

---

## 1.4 Social‑Time‑Matching (Key Feature)
Caluno must automatically compute shared free time between two or more users.

### Requirements:
- Detect full‑day availability matches.
- Detect partial overlaps (before/after shifts).
- Compute availability windows based on shift start/end times.
- Support matching for:
  - 2 users
  - 3 users
  - 4+ users
- Generate suggestions with:
  - participants
  - time window
  - reasoning (e.g., “C can join before late shift”)
- Must work offline using local data.
- Must sync suggestions when online.

---

## 1.5 Notifications & Reminders
- Users must receive reminders for upcoming shifts/events.
- Users must receive notifications when:
  - a shared calendar is updated
  - a group member adds a shift/event
  - a new match suggestion is available

---

# 2. Non‑Functional Requirements

## 2.1 Performance
- Calendar rendering must remain smooth at 60 FPS.
- Matching calculations must complete in under 300 ms for groups up to 6 users.
- Sync operations must not block UI interactions.

---

## 2.2 Offline‑First Behavior
- All data must be stored locally in SQLite.
- Users must be able to:
  - create/edit/delete shifts
  - create/edit/delete events
  - view calendars
  - compute matches
  while offline.
- Sync must reconcile changes automatically when online.

---

## 2.3 Reliability
- No data loss is acceptable.
- Sync conflicts must be detected and resolved deterministically.
- The system must handle:
  - network loss
  - partial sync
  - device switching

---

## 2.4 Security
- Row‑Level Security must prevent cross‑group data access.
- Users must only access calendars they own or that are shared with them.
- Sensitive data must not be exposed in logs or error messages.

---

## 2.5 UX Requirements
- UI must be clean, minimal, and stress‑friendly.
- Large tap targets for mobile.
- Color‑coded shifts and users.
- Dark mode and high contrast mode must be supported.
- Zero‑clutter design: no unnecessary UI elements.

---

# 3. Acceptance Criteria

A feature is considered complete when:

1. It meets all functional requirements.
2. It works offline and online.
3. It syncs correctly across devices.
4. It passes all QA test cases.
5. It does not degrade performance.
6. It follows UX guidelines.
7. It does not violate security or RLS rules.
8. It is fully covered by unit and integration tests.

---

# 4. Non‑Goals

Caluno will NOT include:
- Chat or messaging features.
- Social network features.
- Enterprise workforce management.
- Complex analytics dashboards.
- Medical‑grade documentation.
- AI‑generated shift plans (future optional).

---

# 5. Dependencies & Constraints

- Supabase for backend (Auth, DB, Realtime, RLS).
- SQLite for local storage.
- GraphQL API for structured access.
- Deterministic state management (no hidden side effects).
- Modular code structure for maintainability.

---

# 6. Future Extensions (Not part of MVP)
- Activity suggestions based on time windows.
- Team‑level shift trading.
- Monthly “best days to meet” reports.
- AI‑assisted weekly planning.

