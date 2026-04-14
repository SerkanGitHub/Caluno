# FEATURES.md – Caluno Feature Specification

Caluno is an intelligent, offline‑first shift and family scheduling platform that synchronizes complex schedules, detects conflicts, and finds shared free time across individuals and groups.

---

## 1. Core Scheduling Features
- Multiple shifts per day (Early, Late, Night, Custom)
- Overlapping events
- Recurring shifts and patterns
- Offline‑first editing with local database
- Delta‑sync when online
- Conflict detection (overlaps, double shifts, missing childcare)
- Monthly, weekly, daily views
- Drag‑and‑drop shift editing
- Fast shift entry (1‑tap add)

---

## 2. Collaboration & Sharing
- Shared calendars between partners, families, teams
- Real‑time sync across devices
- Role‑based visibility
- Shared notes per day
- Shared tasks per day
- Color‑coded overlays for multiple people

---

## 3. Social‑Time‑Matching (Key Differentiator)

Caluno must automatically compute shared free time between two or more people.

### Requirements
- Detect days where at least two people are free
- Detect partial overlaps (before/after shifts)
- Compute time windows based on shift start/end
- Group matching (2+, 3+, 4+ people)
- Example:
  - A and B are free on April 1 → Suggest meeting
  - C has late shift → Suggest “C can join from 09:00–13:30 before shift”
- Must work offline and online
- Must be fast and deterministic

---

## 4. Intelligent Assistance
- Automatic shift suggestions
- Predictive availability
- Smart reminders
- Conflict warnings
- Optional activity suggestions based on time windows

---

## 5. UX/UI Requirements
- Clean, minimal, stress‑friendly UI
- Large tap targets
- Color‑coded shifts and users
- Dark mode + high contrast mode
- Zero‑clutter design
- Consistent mobile + web experience

---

## 6. Technical Requirements
- Offline‑first architecture
- Local SQLite database
- Supabase backend (Auth, Realtime, Policies)
- GraphQL API
- Deterministic state management
- Modular domain‑isolated code structure
- Multi‑device support

---

## 7. Quality Requirements
- Unit tests for scheduling logic
- Integration tests for sync
- UI tests for critical flows
- Schema validation
- Performance checks for calendar rendering

---

## 8. Non‑Goals
- No chat/messaging system
- No heavy social network features
- No enterprise workforce management
- No complex analytics dashboards
- No medical‑grade documentation

