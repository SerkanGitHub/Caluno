# S02: Ranked suggestions and explanation quality

**Goal:** Turn the truthful `/calendars/[calendarId]/find-time` browse route into a trustworthy recommendation surface by ranking shared windows before truncation, explaining why each candidate works and why nearby times fail, and keeping protected authorization/offline behavior fail-closed.
**Demo:** The Find time route now highlights a shortlist of top picks ahead of the full browse list, and each candidate shows who is free plus nearby busy constraints that explain adjacent exclusions.

## Must-Haves

- Ranked suggestions are computed before final truncation, so the shortlist surfaces the best truthful shared windows instead of merely reordering the first chronological page.
- Each ranked candidate truthfully explains who is free, who is blocked, and which nearby busy intervals define the adjacent invalid edges without exposing out-of-scope roster or schedule data.
- The protected `/find-time` server contract returns separate `topPicks` and ranked `browseWindows` payloads while preserving explicit `denied`, `invalid-input`, `query-failure`, `timeout`, `malformed-response`, `no-results`, and browser `offline-unavailable` behavior.
- The UI renders a visibly distinct Top picks surface with richer explanation density than the browse list, and browser proof confirms ranked order, explanation details, and fail-closed access behavior.
- Verification passes in named files: `apps/web/tests/find-time/member-availability.unit.test.ts`, `apps/web/tests/find-time/matcher.unit.test.ts`, `apps/web/tests/routes/find-time-routes.unit.test.ts`, and `apps/web/tests/e2e/find-time.spec.ts`.

## Threat Surface

- **Abuse**: parameter tampering on `calendarId`, `duration`, or `start`; forcing misleading shortlist order through pre-truncation bugs; and using explanation metadata to scrape roster or busy details outside the permitted calendar must all fail closed.
- **Data exposure**: only already-authorized member display names, busy/free participation, and same-calendar shift titles used for nearby-constraint explanations; never unrelated group memberships, raw profile rows, tokens, or cross-group schedule data.
- **Input trust**: `calendarId`, duration/start query params, and every roster/busy row returned from Supabase remain untrusted until the protected route contract validates and normalizes them.

## Requirement Impact

- **Requirements touched**: `R002`, `R008`, `R012`
- **Re-verify**: protected calendar authorization, roster/constraint scope, truthful shared-window ranking, explanation payload integrity, explicit offline denial, and malformed/timeout handling for `/find-time`.
- **Decisions revisited**: `D032`, `D033`, `D036`, `D037`, `D038`, `D039`

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `pnpm --dir apps/web exec vitest run tests/find-time/member-availability.unit.test.ts tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts`
- `pnpm --dir apps/web check`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts`

## Observability / Diagnostics

- Runtime signals: typed `status` / `reason` / `message` search states plus ranked-candidate score/explanation fields and stable UI state hooks for top-pick vs browse rendering.
- Inspection surfaces: `apps/web/tests/find-time/*.unit.test.ts`, `apps/web/tests/routes/find-time-routes.unit.test.ts`, `apps/web/tests/e2e/find-time.spec.ts`, and `data-testid` surfaces on route state, top picks, browse cards, and nearby-constraint details.
- Failure visibility: pre-truncation ranking regressions, empty-shortlist vs non-empty browse mismatches, missing nearby constraints, and denied/offline failures stay distinguishable.
- Redaction constraints: expose only member names and shift titles already authorized for the current calendar; never widen roster/profile visibility.

## Integration Closure

- Upstream surfaces consumed: `apps/web/src/lib/find-time/matcher.ts`, `apps/web/src/lib/server/find-time.ts`, `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.server.ts`, `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte`, `apps/web/tests/find-time/member-availability.unit.test.ts`, `apps/web/tests/routes/find-time-routes.unit.test.ts`, and `apps/web/tests/e2e/fixtures.ts`.
- New wiring introduced in this slice: a trusted ranking/explanation layer over raw availability spans, a server payload that separates `topPicks` from ranked browse results, and UI composition that renders richer shortlist diagnostics without changing protected-route boundaries.
- What remains before the milestone is truly usable end-to-end: selected-window handoff into the create flow in S03.

## Decomposition Rationale

The work stays in three tasks because the real risk is not CSS polish; it is proving that recommendation logic remains truthful and authorization-safe. T01 isolates the new ranking/explanation contract in pure code and extends the busy-interval shape only enough to support truthful explanations. T02 then wires that contract into the protected server payload so fail-closed route states and requirement boundaries are re-verified before any browser work. T03 spends the UI complexity budget only after the contract is stable, using a distinct Top picks surface and browser proof to confirm that the new explanation density is helpful without regressing denied or offline behavior.

## Tasks

- [x] **T01: Build the ranked candidate contract and nearby-constraint proof** `est:2h`
  - Why: The slice fails if ranking is bolted onto already truncated chronological windows, so this task retires the core recommendation risk in pure code before any route or UI wiring.
  - Files: `apps/web/src/lib/find-time/matcher.ts`, `apps/web/src/lib/find-time/ranking.ts`, `apps/web/src/lib/server/find-time.ts`, `apps/web/tests/find-time/matcher.unit.test.ts`, `apps/web/tests/find-time/member-availability.unit.test.ts`
  - Do: Add a dedicated ranking module, refactor matcher exports so ranking runs on the full candidate set before final truncation, preserve same-calendar shift titles for truthful nearby explanations, and prove order, tie-breaks, shortlist eligibility, and malformed-assignment fail-closed behavior with unit tests.
  - Verify: `pnpm --dir apps/web exec vitest run tests/find-time/matcher.unit.test.ts tests/find-time/member-availability.unit.test.ts`
  - Done when: ranked candidates expose trusted score/explanation metadata, shortlist rules are explicit and test-covered, and malformed roster or assignment data still refuses to produce guessed explanations.
- [ ] **T02: Return ranked shortlist and browse payloads from the protected route** `est:90m`
  - Why: Executors need a stable server contract before touching Svelte, and this task is where `R002`/`R012` are re-verified against the richer ready-path payload.
  - Files: `apps/web/src/lib/server/find-time.ts`, `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.server.ts`, `apps/web/tests/routes/find-time-routes.unit.test.ts`, `apps/web/tests/find-time/matcher.unit.test.ts`
  - Do: Compose the ranking layer into `loadFindTimeSearchView()`, return separate `topPicks` and `browseWindows` arrays plus explanation fields, keep denied/invalid/timeout/malformed branches explicit, and extend route tests for ranked ordering, shortlist separation, and fail-closed boundary behavior.
  - Verify: `pnpm --dir apps/web exec vitest run tests/routes/find-time-routes.unit.test.ts tests/find-time/matcher.unit.test.ts tests/find-time/member-availability.unit.test.ts`
  - Done when: the protected route emits a recommendation-aware ready payload without relaxing authorization, and route tests prove malformed ids, out-of-scope access, and trusted query failures still short-circuit safely.
- [ ] **T03: Render Top picks explanations and prove the ranked flow in the browser** `est:2h`
  - Why: The slice demo is only true once the real route visibly highlights top picks, explains nearby exclusions, and still behaves correctly for denied and offline entry in the browser.
  - Files: `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte`, `apps/web/tests/e2e/fixtures.ts`, `apps/web/tests/e2e/find-time.spec.ts`
  - Do: Redesign the page so Top picks render before the browse list with richer explanation density, add stable `data-testid` and data-attribute hooks for shortlist and browse cards, and update seeded browser assertions for ranked order, explanation details, explicit denial, and fail-closed offline entry.
  - Verify: `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/find-time.spec.ts && pnpm --dir apps/web check`
  - Done when: the browser shows a distinct shortlist with truthful free/blocked/nearby explanations, browse results stay lighter-weight and truthful, and browser proof still confirms unauthorized and offline entry remain explicit.

## Files Likely Touched

- `apps/web/src/lib/find-time/matcher.ts`
- `apps/web/src/lib/find-time/ranking.ts`
- `apps/web/src/lib/server/find-time.ts`
- `apps/web/tests/find-time/matcher.unit.test.ts`
- `apps/web/tests/find-time/member-availability.unit.test.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.server.ts`
- `apps/web/tests/routes/find-time-routes.unit.test.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.svelte`
- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/e2e/find-time.spec.ts`
