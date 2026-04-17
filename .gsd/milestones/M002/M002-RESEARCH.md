# M002 Research — Shared free-time matching

## Strategic readout

M002 should **not** start with UI polish or route scaffolding. The first thing to prove is whether the current substrate can even represent per-member availability truthfully enough to satisfy `R008`.

### Main finding

The current M001 scheduling model is **calendar-scoped but not person-scoped**:

- `public.shifts` has `calendar_id`, `series_id`, time fields, and `created_by`
- it does **not** have a member/participant ownership field
- there is no participant join table
- the current UI never asks “whose shift is this?”

That means the codebase can currently answer:
- “what busy blocks exist on this shared calendar?”

but it cannot truthfully answer:
- “who is free?”
- “which members make this time invalid?”
- “which nearby busy constraints belong to which people?”

If M002 remains literal to the milestone context, the roadmap should treat **member-attributed busy intervals** as foundational work, not an implementation detail.

A second foundational gap is roster visibility:
- current protected shell data only contains the signed-in viewer plus the viewer’s memberships
- `public.profiles` is RLS-limited to `select self`
- there is no existing helper/RPC that returns other members’ display names for a permitted calendar/group

So even if interval math existed, the current app still cannot render a trustworthy “who is free” explanation by name.

## What exists and should be reused

### 1. Protected route and fail-closed calendar scope are already well-shaped

Use these patterns directly:

- `apps/web/src/routes/(app)/+layout.server.ts`
  - authenticated app shell load
  - group/calendar inventory derived server-side
- `apps/web/src/lib/server/app-shell.ts`
  - trusted calendar resolution helpers
  - denied-surface shaping
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
  - sibling-route pattern to copy for `/calendars/[calendarId]/find-time`
- `apps/web/src/lib/server/schedule.ts`
  - good example of thin trusted server composition over Supabase
  - typed status/reason/message shaping

This is the right boundary for M002:
- calendar permission should still be resolved from trusted membership scope
- matching should run in the SvelteKit server layer
- Supabase/Postgres should remain the source of truth for scope and busy rows

### 2. The codebase already has the right test style for deterministic proof

Useful anchors:

- `apps/web/tests/schedule/server-actions.unit.test.ts`
- `apps/web/tests/routes/protected-routes.unit.test.ts`
- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`
- `apps/web/playwright.config.ts`

The current tests already favor:
- deterministic seeded fixtures
- typed failure modes
- browser proof against local Supabase + seeded data

M002 should extend that pattern instead of inventing a new verification shape.

### 3. Existing recurrence/range helpers are reusable, but week helpers are too narrow

Useful reuse:

- `apps/web/src/lib/schedule/recurrence.ts`
  - `normalizeVisibleRange()` already validates bounded ranges and defaults to 31-day max
- `apps/web/src/lib/schedule/conflicts.ts`
  - existing interval-overlap logic is simple and trustworthy

Constraint:

- `apps/web/src/lib/server/schedule.ts` and `apps/web/src/lib/schedule/route-contract.ts` are explicitly week-oriented (`resolveVisibleWeek`, 7-day Monday-bounded view)

M002 will likely need a **new 30-day search-range contract** rather than stretching the week-board helper.

## Key codebase constraints that should shape the roadmap

### Constraint 1: The current schedule model cannot support truthful per-member matching

Relevant files:
- `supabase/migrations/20260415_000002_schedule_shifts.sql`
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`
- `apps/web/src/lib/components/calendar/ShiftCard.svelte`

Observations:
- shifts/series carry no assignee/participant dimension
- create/edit/move/delete flows operate only on title + time range + recurrence
- current busy data is effectively “calendar busy”, not “member busy”

Implication:
- if the milestone means true shared free-time matching across members, M002 needs a substrate extension first
- without that, the feature devolves into “find gaps in one shared calendar”, which does not satisfy the current milestone wording or `R008`

### Constraint 2: Member roster names are not currently readable

Relevant files:
- `supabase/migrations/20260414_000001_auth_groups_access.sql`
- `apps/web/src/routes/(app)/+layout.server.ts`

Observations:
- `group_memberships` is visible to group members
- `profiles` is currently `select self` only
- app-shell data does not preload other members’ identities

Implication:
- M002 needs either:
  1. a membership-scoped RPC/helper that returns member summaries for a calendar/group, or
  2. an RLS/policy change plus route helper for safe member-summary reads

Without this, “who is free” explanations can only show ids, which is not good enough for the user-visible bar.

### Constraint 3: There is no existing create-flow handoff contract

Relevant files:
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`
- `apps/web/src/lib/schedule/board.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`

Observations:
- the “create flow” is currently an inline dialog on the week board, not a separate route
- there is no query-param or state contract for prefilled create data
- `buildDefaultCreateTimes()` falls back to a fixed seed date when it lacks a valid day key

Implication:
- “choose a suggestion and land in a prefilled create flow” is non-trivial
- M002 needs an explicit handoff contract for:
  - visible week start
  - exact start/end timestamps
  - create-dialog open state
  - any participant defaults if the data model becomes participant-aware

This is a real slice boundary, not just a button.

### Constraint 4: Offline continuity patterns exist, but matching should probably fail closed in v1

Relevant files:
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts`
- `apps/web/src/lib/offline/protected-routes.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`

Observations:
- the current calendar route has a substantial offline/cached-local continuity layer
- M002 context explicitly warns not to mint matching authority from offline/local caches

Recommendation:
- first version should likely make `/find-time` **explicitly unavailable offline** rather than caching 30-day results
- that is smaller, safer, and aligned with the milestone’s fail-closed requirement

## Biggest risk / surprise

The biggest surprise is that **M001 validated shared calendar editing, not member-attributed schedules**.

That means the true first risk for M002 is not ranking quality. It is whether the substrate can represent the domain the milestone assumes.

If the roadmap ignores this and starts with a route + list UI, it risks producing a polished feature that cannot honestly explain availability.

## What should be proven first

Prove this before building the Find time page:

1. A permitted calendar can expose a **member roster** safely.
2. Schedule entries can be attributed to one or more calendar members in a way that the existing create flow can still use.
3. Deterministic fixtures can produce obvious valid windows and obvious invalid windows across 2–3 members.
4. A pure matching function can rank those fixtures sensibly and produce truthful explanation objects.

If that proof is weak, stop there and re-scope before UI work expands.

## Recommended slice boundaries for the roadmap planner

## Slice 1 — Availability substrate uplift

Goal:
- make the schedule model capable of truthful per-member busy/free reasoning

Likely work:
- add member attribution/participation to schedule entries
- add a safe calendar-member roster read path
- update seed data so shifts belong to identifiable members
- minimally adapt create/edit surfaces so attribution can be set and preserved

Why first:
- this retires the architectural blocker
- matching and explanation quality are impossible to judge without it

Proof target:
- unit/integration proof that a permitted calendar returns member roster + member-attributed busy intervals correctly

## Slice 2 — Matching engine and explanation contract

Goal:
- compute valid windows for the next 30 days and shape deterministic explanation payloads

Likely work:
- new pure module for duration validation, 30-day range handling, interval intersection, ranking, and explanation shaping
- fixture-driven tests for “obvious windows must not be missed”

Why second:
- this is the core product risk after the substrate exists
- it should be proven independently before Svelte UI complexity is added

Proof target:
- unit tests with seeded scenarios showing shortlist ordering, full list generation, no-results, and explanation truthfulness

## Slice 3 — Protected route integration and calm states

Goal:
- deliver `/calendars/[calendarId]/find-time` as a sibling protected route

Likely work:
- route load using trusted calendar resolution
- explicit denied / invalid-input / no-results / query-failure / offline-unavailable states
- basic navigation from the existing calendar surface into Find time

Why third:
- once substrate + matcher are trustworthy, route wiring becomes straightforward and low-risk

Proof target:
- integration test for permitted access and denied access
- browser proof for search + shortlist + full list + no-results state

## Slice 4 — Prefill handoff into the existing create flow

Goal:
- selecting a candidate window opens the existing scheduling surface with trustworthy prefilled state

Likely work:
- define prefill URL/state contract
- adapt the inline create dialog or route shell to honor prefills
- confirm any participant defaults/selection behavior if the data model changed

Why separate:
- this crosses the route/UI boundary and is easy to underestimate
- the current create flow is inline, not route-based

Proof target:
- browser proof that choosing a suggestion lands in the existing create experience with exact time values populated

## Boundary contracts that matter

### Contract A — calendar scope

Keep using the existing trusted boundary:
- `(app)` layout authenticates and derives visible scope
- page-level helper resolves the target calendar from that scope
- guessed or out-of-scope ids stay denied before schedule/matching data is read

### Contract B — busy interval source

Use Postgres/Supabase as the source of truth for:
- permitted calendar
- member roster in scope
- busy intervals in scope

Do **not** push all ranking/explanation logic into SQL in v1.

### Contract C — matcher output shape

Define a stable server output early. The UI will depend on it.

At minimum each candidate should include:
- exact `startAt` / `endAt`
- duration
- free-member list
- blocked-member / nearby-constraint explanation fragments
- rank inputs or explanation metadata sufficient for truthful rendering

### Contract D — prefill handoff

Define this before UI wiring. It needs exact semantics for:
- selected start/end
- route or dialog open state
- which week/visible context to land on
- any participant defaults

## Recommended implementation direction

Keep the matcher in TypeScript in the server layer.

Why this fits the current codebase:
- `apps/web/src/lib/server/schedule.ts` already uses “trusted server composition over Supabase”
- ranking rules are expected to evolve
- explanation shaping is easier to iterate in TS than in SQL/RPC output shaping

Recommended data access pattern:
- one trusted roster query for members in the calendar’s group
- one trusted shift query bounded to the next 30 days for that calendar
- pure TS transformation into per-member busy intervals, valid windows, rankings, and explanations

## Requirement analysis

### Active requirement status

- `R008` is the core milestone contract, but it is currently **under-specified relative to the actual codebase**.

### What is table stakes but missing from the compact requirement

These are not auto-binding, but they are the main missing requirement candidates revealed by the code:

1. **Member-attributed busy intervals**
   - Without member attribution, `R008` is not implementable as written.

2. **Safe member roster exposure**
   - The feature cannot explain “who is free” unless permitted member names/ids are available.

3. **Explicit offline behavior for `/find-time`**
   - The milestone says fail closed, but does not yet make the route behavior explicit offline.
   - Recommended first version: unavailable offline, not cached-match replay.

4. **Prefill handoff contract**
   - Acceptance says the user lands in a prefilled create flow, but there is no contract yet for how.

5. **Duration validation bounds**
   - presets/custom exist in milestone context, but min/max/step are still unspecified.

### What looks optional or should stay advisory for now

- Rich explanation density in the full browse list vs shortlist
- meetup-oriented wording polish in the create flow
- any optimization beyond deterministic “good enough” ranking
- offline cached matching results

### What would be overbuilt for this milestone

- a fully SQL-native ranking engine
- cross-calendar or cross-group matching
- external calendar integrations
- a separate new event domain model if the existing schedule model can be extended safely instead

## Candidate requirements surfaced by research

These should be treated as candidate requirements for planning discussion, not auto-added scope.

### Candidate R — member occupancy contract

Caluno must persist which calendar member(s) a schedule entry makes busy, so matching can compute free time across named members truthfully.

### Candidate R — permitted member roster contract

A permitted calendar member can load the list of member summaries for that calendar/group needed to explain availability without widening access outside the group.

### Candidate R — explicit offline contract for find-time

The Find time route must either fail closed offline or clearly label any cached result as non-authoritative; recommended first version is fail-closed offline.

### Candidate R — prefill handoff contract

Selecting a suggested window must carry exact timestamps into the existing create flow through a defined route/dialog prefill mechanism.

## Skill discovery

No installed skill in the current `<available_skills>` list is directly SvelteKit/Supabase/Playwright-specific.

Promising skill suggestions:

- **SvelteKit**
  - `npx skills add spences10/svelte-skills-kit@sveltekit-structure`
  - `npx skills add spences10/svelte-skills-kit@sveltekit-data-flow`
- **Supabase**
  - `npx skills add supabase/agent-skills@supabase`
  - `npx skills add supabase/agent-skills@supabase-postgres-best-practices`
- **Playwright**
  - `npx skills add currents-dev/playwright-best-practices-skill@playwright-best-practices`

## Bottom line for the roadmap planner

Plan M002 around the real blocker:

**The current codebase does not yet encode person-level busy ownership or expose a safe member roster, so faithful shared free-time matching cannot start at the route/UI layer.**

If the milestone keeps its current meaning, the safest ordering is:

1. member-attributed schedule substrate + member roster exposure
2. deterministic matching/ranking/explanation engine
3. protected find-time route and calm state handling
4. create-flow prefill handoff and browser proof

That ordering retires the true risk first instead of polishing the shell around an unproven domain model.