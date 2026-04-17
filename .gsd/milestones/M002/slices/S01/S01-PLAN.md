# S01: Truthful availability search route

**Goal:** Deliver a protected `/calendars/[calendarId]/find-time` route that computes truthful 30-day valid windows from named member availability for a permitted calendar, while keeping calendar scope, roster access, and offline behavior fail-closed.
**Demo:** A signed-in member opens `/calendars/[calendarId]/find-time` for a permitted calendar, searches a 30-day horizon for a duration, and sees a truthful browseable list of valid windows computed from named member availability; unauthorized and offline access stay explicit and fail closed.

## Must-Haves

- A permitted calendar member can read only the roster summaries and member-attributed busy intervals needed for find-time without widening access outside the calendar’s group.
- New and seeded shifts carry member availability attribution, so the matcher can truthfully determine who is busy and who is free over the next 30 days.
- The find-time server contract validates duration/range inputs, denies malformed or out-of-scope calendar access before loading data, and returns typed ready/no-results/error states.
- The UI exposes a browseable list of valid windows with named member availability, plus explicit denied, invalid-input, query-failure, and offline-unavailable states.
- Verification passes in named files: `apps/web/tests/find-time/member-availability.unit.test.ts`, `apps/web/tests/find-time/matcher.unit.test.ts`, `apps/web/tests/routes/find-time-routes.unit.test.ts`, `apps/web/tests/access/policy-contract.unit.test.ts`, `apps/web/tests/schedule/server-actions.unit.test.ts`, and `apps/web/tests/e2e/find-time.spec.ts`.

## Threat Surface

- **Abuse**: calendar-id guessing, duration/range tampering, roster scraping through guessed ids, and offline replay of stale results must all fail closed.
- **Data exposure**: only permitted member display names plus their busy/free contribution inside the authorized calendar scope; never raw profile rows, unrelated group memberships, tokens, or cross-group schedule data.
- **Input trust**: `calendarId`, duration/range query params, and any roster/assignment rows returned from Supabase remain untrusted until the protected route contract validates them.

## Requirement Impact

- **Requirements touched**: `R002`, `R008`, `R012`
- **Re-verify**: protected calendar authorization, member roster scoping, truthful valid-window generation across 30 days, and explicit offline denial for `/find-time`.
- **Decisions revisited**: `D031`, `D032`, `D033`, `D034`

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `pnpm --dir apps/web exec vitest run tests/find-time/member-availability.unit.test.ts tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/access/policy-contract.unit.test.ts tests/schedule/server-actions.unit.test.ts`
- `pnpm --dir apps/web check`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts`

## Observability / Diagnostics

- Runtime signals: typed `reason` / `message` states for denied, invalid-input, query-failure, no-results, and offline-unavailable outcomes.
- Inspection surfaces: `/find-time` route state UI, `tests/routes/find-time-routes.unit.test.ts`, `tests/find-time/*.unit.test.ts`, and `tests/e2e/find-time.spec.ts`.
- Failure visibility: invalid duration bounds, roster lookup/query timeouts, malformed assignment rows, empty result sets, and offline denial remain distinguishable.
- Redaction constraints: expose only member names and window summaries already authorized for the current calendar; never widen profile visibility.

## Integration Closure

- Upstream surfaces consumed: `supabase/migrations/20260414_000001_auth_groups_access.sql`, `supabase/migrations/20260415_000002_schedule_shifts.sql`, `supabase/seed.sql`, `apps/web/src/routes/(app)/+layout.server.ts`, `apps/web/src/lib/server/app-shell.ts`, `apps/web/src/lib/server/schedule.ts`, and the existing protected calendar route patterns.
- New wiring introduced in this slice: member-attributed shift availability storage, a safe calendar-member roster read path, a 30-day availability matcher in the server layer, and the protected `/calendars/[calendarId]/find-time` route with explicit offline denial.
- What remains before the milestone is truly usable end-to-end: ranked suggestion/explanation polish and the selected-window handoff into the existing create flow.

## Decomposition Rationale

The work is ordered substrate → matcher → route/UI because the real milestone risk is not styling a new page; it is proving that the codebase can answer “who is free?” truthfully at all. T01 retires that risk by adding member-attributed busy data and a safe roster contract. T02 then proves the bounded 30-day matching contract in pure server code with deterministic tests. T03 finally wires that trusted contract into the protected app, adds calm runtime states, and closes with browser proof for permitted, denied, and offline behavior.

## Tasks

- [x] **T01: Add member-attributed busy scope and a safe calendar roster contract** `est:2h`
  - Why: The current schedule model is calendar-scoped, so this task retires the blocker that prevents truthful “who is free” answers before any matcher or UI work begins.
  - Files: `supabase/migrations/20260418_000001_find_time_member_availability.sql`, `supabase/seed.sql`, `apps/web/src/lib/server/find-time.ts`, `apps/web/src/lib/server/schedule.ts`, `apps/web/tests/find-time/member-availability.unit.test.ts`, `apps/web/tests/access/policy-contract.unit.test.ts`, `apps/web/tests/schedule/server-actions.unit.test.ts`
  - Do: Add a member-attribution join table for shifts plus a security-definer calendar-member roster read path, seed Alpha/Beta fixtures with named assignments, default newly created single and recurring shifts to the acting member, and expose a trusted server helper that returns roster summaries plus member-attributed busy intervals for a bounded range without loosening `profiles` access.
  - Verify: `pnpm --dir apps/web exec vitest run tests/find-time/member-availability.unit.test.ts tests/access/policy-contract.unit.test.ts tests/schedule/server-actions.unit.test.ts`
  - Done when: a permitted calendar can load named members and member-attributed busy intervals truthfully, while out-of-scope access and malformed DB responses still fail closed.
- [ ] **T02: Build the 30-day availability matcher and protected server route contract** `est:2h`
  - Why: Once roster and busy ownership are truthful, this task proves the core product logic—valid-window generation and protected route loading—without depending on Svelte UI behavior.
  - Files: `apps/web/src/lib/find-time/matcher.ts`, `apps/web/src/lib/server/find-time.ts`, `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.server.ts`, `apps/web/tests/find-time/matcher.unit.test.ts`, `apps/web/tests/routes/find-time-routes.unit.test.ts`
  - Do: Add duration and horizon normalization for a bounded 30-day search, compute browseable valid windows from member-attributed busy intervals, return typed ready/no-results/error route payloads for the new protected server load, and cover denied, invalid-input, timeout, and empty-result branches with deterministic tests.
  - Verify: `pnpm --dir apps/web exec vitest run tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/find-time/member-availability.unit.test.ts`
  - Done when: the server contract returns truthful valid windows for a permitted calendar, rejects invalid/out-of-scope requests before data load, and preserves explicit reason codes for future diagnostics.
- [ ] **T03: Ship the browseable `/find-time` UI, calendar entrypoint, and offline fail-closed browser proof** `est:2h`
  - Why: This closes the real user path by wiring the new server contract into the protected app, exposing browseable valid windows, and proving that unauthorized and offline states stay explicit.
  - Files: `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.ts`, `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`, `apps/web/tests/e2e/find-time.spec.ts`, `apps/web/tests/e2e/fixtures.ts`
  - Do: Add a calendar entrypoint into `/find-time`, render duration search controls plus a calm browseable window list that names the available members, show explicit denied/no-results/query-error/offline-unavailable states, and fail closed in the browser load when the route is opened offline instead of replaying cached authority.
  - Verify: `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts && pnpm --dir apps/web check`
  - Done when: a signed-in member can open `/calendars/[calendarId]/find-time`, search the next 30 days for a duration, browse truthful valid windows from named members, and see explicit unauthorized/offline denial instead of guessed results.

## Files Likely Touched

- `supabase/migrations/20260418_000001_find_time_member_availability.sql`
- `supabase/seed.sql`
- `apps/web/src/lib/server/find-time.ts`
- `apps/web/src/lib/server/schedule.ts`
- `apps/web/src/lib/find-time/matcher.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.server.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/tests/find-time/member-availability.unit.test.ts`
- `apps/web/tests/find-time/matcher.unit.test.ts`
- `apps/web/tests/routes/find-time-routes.unit.test.ts`
- `apps/web/tests/access/policy-contract.unit.test.ts`
- `apps/web/tests/schedule/server-actions.unit.test.ts`
- `apps/web/tests/e2e/find-time.spec.ts`
- `apps/web/tests/e2e/fixtures.ts`
