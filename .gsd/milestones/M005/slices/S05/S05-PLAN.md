# S05: Mobile surfaces for recurrence suggestion and clash advisory

**Goal:** Carry the web predictive-create contract onto mobile by loading truthful same-calendar recurrence suggestions for the visible week context, threading visible-week shifts into `ShiftEditorSheet`, and rendering stable recurrence-suggestion plus clash-advisory surfaces with mobile Playwright proof.
**Demo:** ShiftEditorSheet on mobile renders both the suggestion chip and the clash advisory when applicable. Playwright mobile smoke passes.

## Must-Haves

- # S05: Mobile surfaces for recurrence suggestion and clash advisory
- **Goal:** Carry the web predictive-create contract onto mobile without widening data scope.
- **Demo:** On the mobile calendar route, `ShiftEditorSheet` shows a truthful recurrence suggestion when the same-calendar 30-day history supports it, shows a non-blocking `clash-advisory` when the current draft overlaps visible-week shifts, and Playwright mobile smoke proves accept/dismiss plus overlap/clear behavior.
- ## Must-Haves
- `apps/mobile/src/lib/offline/transport.ts` adds a bounded recurrence-suggestion loader that mirrors the web query contract: same `calendarId`, trailing 30-day lookback ending at `visibleWeek.endAt`, sorted rows, and fail-closed `null` on timeout/query/malformed data.
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` derives mobile `existingShifts`, owns nullable recurrence-suggestion state, and clears suggestion state explicitly for cached-offline or unavailable route modes instead of guessing from visible-week data.
- `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte` exposes the same stable predictive hooks used on web: `data-testid="recurrence-suggestion"`, `recurrence-suggestion-accept`, `recurrence-suggestion-dismiss`, `data-testid="recurrence-field-state"`, and `data-testid="clash-advisory"`.
- Accepting the suggestion only pre-fills recurrence cadence/interval, never overwrites create-prefill start/end values, and dismissal persists across close/reopen on the same page instance until fresh loader data arrives.
- Edit and move entrypoints on mobile receive the visible-week `existingShifts` context so self-excluding clash previews reuse the same shared advisory rule as web.
- Verification passes:
- `pnpm --dir apps/mobile check`
- `pnpm --dir apps/web exec vitest run tests/schedule/shift-editor-advisory.unit.test.ts`
- `pnpm --dir apps/mobile exec vitest run tests/mobile-predictive.unit.test.ts`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/mobile-predictive.spec.ts tests/e2e/find-time-handoff.spec.ts tests/e2e/mobile-assembly.spec.ts`
- ## Threat Surface
- **Abuse**: The new suggestion fetch must stay constrained to the already-permitted `calendarId`; malformed ids, widened lookbacks, or out-of-scope rows must fail closed to `null` rather than surfacing cross-calendar guidance.
- **Data exposure**: Suggestion and clash surfaces may only reveal titles/times from the same authorized calendar and already-loaded visible-week context; no broader history or unrelated calendars may leak into the sheet.
- **Input trust**: User-entered draft fields are untrusted local input; invalid or inverted drafts must suppress the advisory instead of throwing or surfacing stale overlap results.
- ## Requirement Impact
- **Requirements touched**: `R011` directly; trust/scope promises from `R002` remain supporting constraints.
- **Re-verify**: mobile create/edit/move flows, find-time handoff create prefill, and predictive-create behavior on the permitted Alpha shared calendar week.
- **Decisions revisited**: `D064`, `D065`, `D066`.
- ## Proof Level
- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no
- ## Verification
- `pnpm --dir apps/mobile check`
- `pnpm --dir apps/web exec vitest run tests/schedule/shift-editor-advisory.unit.test.ts`
- `pnpm --dir apps/mobile exec vitest run tests/mobile-predictive.unit.test.ts`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/mobile-predictive.spec.ts tests/e2e/find-time-handoff.spec.ts tests/e2e/mobile-assembly.spec.ts`
- ## Observability / Diagnostics
- Runtime signals: `data-testid="calendar-route-state"` should expose recurrence-suggestion load state so future agents can distinguish `ready`/`empty` from fail-closed paths without inferring from missing UI alone.
- Inspection surfaces: mobile sheet hooks `recurrence-suggestion`, `recurrence-field-state`, and `clash-advisory` provide explicit proof points for Playwright and future debugging.
- Failure visibility: timeout/query/malformed suggestion fetches should collapse to a visible route-state diagnostic plus absent suggestion chip; overlapping versus clear drafts should be inspectable before submit.
- Redaction constraints: only already-authorized shift titles/times from the same calendar may appear; no secrets or cross-calendar metadata.
- ## Integration Closure
- Consumes the S03 bounded recurrence-suggestion semantics and the S04 shared clash-advisory rule, then closes mobile parity for predictive create/edit surfaces on the phone calendar route. S06 remains responsible for milestone-wide hardening, accessibility/build readiness, and formal `R011` validation.

## Proof Level

- This slice proves: integration

## Integration Closure

Consumes the S03 bounded recurrence-suggestion contract plus the S04 clash-advisory pattern and closes mobile parity on the real calendar route; only S06 hardening/validation remains before milestone closure.

## Verification

- Adds mobile route-state diagnostics for recurrence-suggestion loading and stable predictive sheet hooks (`recurrence-suggestion`, accept/dismiss controls, `recurrence-field-state`, `clash-advisory`) so absent, dismissed, accepted, and overlapping states are explicitly inspectable.

## Tasks

- [x] **T01: Extract the shared shift-editor clash helper into `@repo/caluno-core` and repoint web** `est:45m`
  ---
  estimated_steps: 6
  estimated_files: 5
  skills_used:
    - test
    - verify-before-complete
  ---
  - Files: `packages/caluno-core/src/schedule/shift-editor-advisory.ts`, `packages/caluno-core/src/index.ts`, `packages/caluno-core/package.json`, `apps/web/src/lib/schedule/shift-editor-advisory.ts`, `apps/web/tests/schedule/shift-editor-advisory.unit.test.ts`
  - Verify: pnpm --dir apps/web exec vitest run tests/schedule/shift-editor-advisory.unit.test.ts

- [x] **T02: Add bounded mobile recurrence-suggestion loading and route-level diagnostics** `est:1h`
  ---
  estimated_steps: 8
  estimated_files: 3
  skills_used:
    - test
    - best-practices
  ---
  - Files: `apps/mobile/src/lib/offline/transport.ts`, `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`, `apps/mobile/tests/mobile-predictive.unit.test.ts`
  - Verify: pnpm --dir apps/mobile exec vitest run tests/mobile-predictive.unit.test.ts && pnpm --dir apps/mobile check

- [x] **T03: Wire suggestion and clash-advisory UI into all mobile `ShiftEditorSheet` entrypoints** `est:1h15m`
  ---
  estimated_steps: 9
  estimated_files: 4
  skills_used:
    - frontend-design
    - accessibility
  ---
  - Files: `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`, `apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte`, `apps/mobile/src/lib/components/calendar/ShiftCard.svelte`, `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte`
  - Verify: pnpm --dir apps/mobile check

- [x] **T04: Add mobile predictive Playwright helpers and prove accept/dismiss plus clash smoke flows** `est:55m`
  ---
  estimated_steps: 7
  estimated_files: 2
  skills_used:
    - test
    - verify-before-complete
  ---
  - Files: `apps/mobile/tests/e2e/fixtures.ts`, `apps/mobile/tests/e2e/mobile-predictive.spec.ts`
  - Verify: npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/mobile-predictive.spec.ts tests/e2e/find-time-handoff.spec.ts tests/e2e/mobile-assembly.spec.ts

## Files Likely Touched

- packages/caluno-core/src/schedule/shift-editor-advisory.ts
- packages/caluno-core/src/index.ts
- packages/caluno-core/package.json
- apps/web/src/lib/schedule/shift-editor-advisory.ts
- apps/web/tests/schedule/shift-editor-advisory.unit.test.ts
- apps/mobile/src/lib/offline/transport.ts
- apps/mobile/src/routes/calendars/[calendarId]/+page.svelte
- apps/mobile/tests/mobile-predictive.unit.test.ts
- apps/mobile/src/lib/components/calendar/MobileCalendarBoard.svelte
- apps/mobile/src/lib/components/calendar/ShiftCard.svelte
- apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte
- apps/mobile/tests/e2e/fixtures.ts
- apps/mobile/tests/e2e/mobile-predictive.spec.ts
