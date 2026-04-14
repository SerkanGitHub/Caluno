# M001: Shared scheduling substrate

**Gathered:** 2026-04-14
**Status:** Ready for planning

## Project Description

Caluno is an offline-first shared scheduling product for shift workers, families, partners, and small groups who need to coordinate irregular schedules without constant manual reconciliation. The product goal is to turn chaotic schedules into shared clarity automatically, but this milestone is intentionally about the substrate, not the intelligence layer.

## Why This Milestone

Caluno cannot earn trust through matching or predictive help until the schedule itself is trustworthy. M001 exists to prove that users can share calendars, model messy real-life shifts, keep working when offline, and reconnect without losing meaning or creating hidden schedule drift.

## User-Visible Outcome

### When this milestone is complete, the user can:

- sign in, create or join a group, and open only the shared calendars they are allowed to access in the browser
- create, edit, move, and delete multiple shifts per day in a shared calendar, keep using previously synced calendars offline, and see changes reconcile when connectivity returns

### Entry point / environment

- Entry point: browser-based web app
- Environment: browser / local dev / production-like web runtime
- Live dependencies involved: Supabase auth, database, realtime, and browser-local persistence

## Completion Class

- Contract complete means: scheduling domain rules, local persistence boundaries, sync decisions, and conflict detection are covered by unit and integration tests plus substantive artifact checks
- Integration complete means: the browser app, local store, Supabase auth, shared calendar access rules, realtime updates, and reconnect sync all work together across real subsystem boundaries
- Operational complete means: offline continuity, reconnect behavior, and cached-session access to previously synced calendars work under real browser lifecycle conditions

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- a signed-in user can create or join a group and see only the shared calendars they are permitted to access
- two group members can edit a shared schedule in the browser, see live updates when online, and recover cleanly after an offline edit/reconnect cycle
- the milestone cannot be considered done unless the assembled browser flow is exercised end-to-end with real auth, persistence, sync, and conflict visibility instead of isolated mocks alone

## Scope

### In Scope

- secure account access and cached-session offline continuity for previously synced calendars
- group membership, role-based sharing, and secure shared-calendar access
- multi-shift-per-day scheduling, recurring patterns, and browser calendar editing flows
- offline-capable browser persistence for schedule reads and writes
- deterministic sync, realtime shared updates, and baseline conflict detection
- a stress-friendly browser scheduling experience that is clear and low-clutter

### Out of Scope / Non-Goals

- social-time-matching and shared free-time suggestions
- predictive scheduling assistance
- shared day notes and day tasks
- notifications and reminders
- childcare-specific conflict policies
- chat, social features, enterprise workforce management, heavy analytics, and medical-grade documentation

## Architectural Decisions

### Stack authority

**Decision:** The repo is authoritative: Caluno is planned on SvelteKit + Capacitor, not the stale React Native / Flutter references in uploaded notes.

**Rationale:** The real codebase already exists in this shape, and planning against it avoids fake architecture and unnecessary migration work.

**Alternatives Considered:**
- React Native / Flutter rewrite — rejected because the current repo already defines the actual implementation path

### Backend shape

**Decision:** Use Supabase for auth, database, realtime, and RLS, with a thin SvelteKit server layer for privileged or composed operations only.

**Rationale:** This keeps the backend simple, preserves a strong auth/RLS story, and avoids inventing a GraphQL layer before the substrate exists.

**Alternatives Considered:**
- SvelteKit API first — rejected because it adds avoidable indirection over capabilities Supabase already provides
- GraphQL-first API — rejected because it increases surface area before the schedule substrate is proven

### Local data and sync authority

**Decision:** Clients are local-first, but the server is canonical after reconnect. M001 uses browser SQLite/WASM as the web local store behind repository boundaries.

**Rationale:** The product promise requires offline continuity, but deterministic reconciliation is easier to reason about when one authority settles the final state. Browser SQLite/WASM keeps the web proof surface closer to the long-term offline model.

**Alternatives Considered:**
- Server-first caching — rejected because it weakens the offline-first contract
- Loose client-biased merging — rejected because hidden divergence would make shared schedules harder to trust
- IndexedDB-specific planning — rejected as the primary architectural statement because the chosen direction is browser SQLite/WASM behind a repository contract

### Proof surface

**Decision:** M001 is web-first for proof and verification.

**Rationale:** The user needs to simulate and test the milestone in a browser and does not currently have a phone available for reliable device testing.

**Alternatives Considered:**
- Mobile-first milestone proof — rejected because it would make validation harder in the current working setup
- Equal proof burden on web and mobile in M001 — rejected because it adds delivery risk before the substrate is proven

## Error Handling Strategy

Offline writes queue locally and expose clear sync state instead of blocking the user. Realtime disconnects degrade to local operation plus later sync, not broken UI. Cached sessions allow access to previously synced calendars offline, while fresh login and other privileged online operations still require connectivity. Partial sync failures must stay scoped and observable; one failed record or request must not freeze the whole calendar. Deterministic reconciliation handles ordinary conflicts, while hard conflicts that would silently change schedule meaning are flagged clearly instead of guessed away. User-facing errors should be plain, stress-friendly, and specific about what failed, what was saved locally, and what will retry.

## Risks and Unknowns

- Browser-local offline durability and sync semantics could be weaker than expected under real browser constraints — this would undermine the core product promise if not proven early
- Shared realtime updates and offline edits can conflict semantically — if reconciliation is surprising, users will stop trusting the calendar
- Group access and RLS boundaries must stay correct while sharing gets more dynamic — a leak here would damage trust immediately

## Existing Codebase / Prior Art

- `apps/web/` — the primary proof surface for M001, already set up with SvelteKit and `adapter-node`
- `apps/mobile/` — product-direction mobile shell, but not the primary proof surface in M001
- `packages/db/src/tenant.ts` — existing tenant-scoping helper that shows the repo already leans toward explicit data-boundary helpers rather than hidden magic
- `.gsd/REFERENCE_MyDuty.md` — competitive reference that clarifies what Caluno must surpass, especially around multi-shift support, offline behavior, and shared coordination

## Relevant Requirements

- R001 — establish cached-session continuity for previously synced calendars
- R002 — establish group membership, roles, and secure shared calendar access
- R003 — establish multi-shift browser scheduling
- R004 — establish offline local schedule persistence
- R005 — establish deterministic sync and realtime shared updates
- R006 — establish baseline conflict visibility
- R007 — establish a stress-friendly browser scheduling experience
- R012 — enforce auth and RLS boundaries around shared data

## Technical Constraints

- Use the existing SvelteKit + Capacitor repo as the implementation baseline
- Web must be the primary proof surface for M001
- Browser-local persistence should follow the browser SQLite/WASM direction behind repository seams
- Supabase is the backend dependency for auth, database, realtime, and RLS
- Keep state flow deterministic and avoid hidden side effects in sync or conflict handling

## Integration Points

- Supabase Auth — identity, sessions, and access boundaries
- Supabase Postgres + RLS — canonical shared calendar data and data isolation
- Supabase Realtime — live shared updates between group members
- Browser-local SQLite/WASM layer — offline reads, writes, and mutation queueing in the web client

## Testing Requirements

M001 requires unit tests for scheduling and conflict rules, unit and integration tests for sync and reconciliation decisions, and browser-level verification for the main shared-calendar flows. The browser proof surface must explicitly exercise online editing, offline continuity, reconnect sync, and live shared updates between group members.

## Acceptance Criteria

- Users can sign in, create or join groups, and open only the shared calendars they are allowed to access in the browser
- Users can create, edit, move, and delete multiple shifts per day through browser calendar views
- Previously synced calendars remain readable and editable offline with a cached session
- Local edits reconcile deterministically after reconnect
- Live shared updates between group members are proven in real browser flows
- Baseline conflicts such as overlapping shifts or double-booking are visible and do not silently corrupt schedule meaning
- The browser scheduling experience remains clear, low-clutter, and fit for everyday coordination work

## Open Questions

- How much mobile implementation should land in M001 alongside the web-first proof surface — current thinking: keep mobile aligned architecturally but do not make it the milestone proof burden
- How much invite/join flow depth belongs in M001 beyond what is necessary to make shared calendars real — current thinking: include enough to make collaboration genuine, but avoid over-expanding admin flow complexity
