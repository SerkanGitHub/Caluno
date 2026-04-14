# ARCHITECTURE.md – Caluno System Architecture

Caluno is an intelligent, offline‑first shift and family scheduling platform.  
This document defines the system architecture for all agents (Architect, Mobile, Web, Backend, UX, QA).

---

## 1. Architectural Goals

- Offline‑first operation with full functionality without network access.
- Deterministic state and predictable data flow.
- Multi‑platform support: iOS, Android, Web.
- Modular, domain‑isolated architecture.
- Real‑time collaboration and synchronization.
- Extendable and maintainable codebase.
- High testability across all layers.

---

## 2. High‑Level System Overview

### Clients
- Mobile App (Flutter or React Native)
- Web App (React)

### Backend
- Supabase (Postgres, Auth, Realtime, Row‑Level Security)
- GraphQL API (preferred) or typed REST
- Event‑based sync layer for delta synchronization

### Local
- SQLite local database
- Client‑side Sync Engine
- Conflict resolution logic

### Core Domains
1. User & Auth  
2. Calendar & Shifts  
3. Collaboration & Sharing  
4. Social‑Time‑Matching  
5. Notifications & Reminders  

---

## 3. Domain Model (Simplified)

### 3.1 User & Auth
- `User`: id, email, name, role, settings
- `Group`: id, name, type (family, team), members
- `Membership`: user_id, group_id, role

### 3.2 Calendar & Shifts
- `Calendar`: id, owner_id, type
- `Shift`: id, calendar_id, user_id, date, start_time, end_time, type, metadata
- `Event`: id, calendar_id, title, start_datetime, end_datetime, participants

### 3.3 Collaboration
- `SharedCalendar`: calendar_id, group_id, permissions
- `DayNote`: id, calendar_id, date, content
- `Task`: id, calendar_id, date, title, status, assigned_to

### 3.4 Social‑Time‑Matching
- `AvailabilityWindow`: user_id, start_datetime, end_datetime, source
- `MatchSuggestion`: id, group_id, participants, start_datetime, end_datetime, confidence, reason

---

## 4. Layered Architecture

### Client‑Side Layers
1. Presentation Layer (UI components, screens)
2. State / ViewModel Layer
3. Domain Layer (use cases, business logic)
4. Data Layer (repositories, local/remote data sources)
5. Sync Engine (delta sync, conflict resolution)

### Backend Layers
1. API Layer (GraphQL/REST)
2. Service Layer (business logic)
3. Persistence Layer (Postgres)
4. Realtime Layer (Supabase channels)

---

## 5. Offline‑First & Sync Engine

### Principles
- Local‑first reads and writes.
- Mutations stored locally and synced when online.
- Delta‑sync for efficient updates.
- Conflict resolution:
  - Last‑Writer‑Wins for simple fields
  - Merge strategies for lists
  - Conflict flags for UI resolution

---

## 6. Social‑Time‑Matching Architecture

### Goals
- Compute shared free time between 2+ users.
- Consider full‑day availability and partial windows (before/after shifts).
- Generate suggestions with reasoning.

### Pipeline
1. Load shifts and events.
2. Compute availability windows per user.
3. Intersect windows across users.
4. Filter by minimum duration.
5. Generate match suggestions.

---

## 7. Security & Permissions

- Supabase Auth for identity.
- Row‑Level Security for data isolation.
- Group‑based permissions.
- No cross‑group data leakage.

---

## 8. Non‑Functional Requirements

- Smooth calendar rendering.
- Matching calculations under 300ms.
- No data loss during offline usage.
- Comprehensive unit, integration, and UI tests.

---

## 9. Module Structure (Recommended)

- `core/domain`
- `core/data`
- `core/sync`
- `features/calendar`
- `features/shifts`
- `features/matching`
- `features/groups`
- `features/settings`

---

## 10. Agent Responsibilities

- Architect: maintain architecture consistency.
- Backend: implement schema, RLS, APIs.
- Mobile: implement offline‑first app.
- Web: implement web UI.
- UX: define flows and layouts.
- QA: derive test cases and ensure reliability.

