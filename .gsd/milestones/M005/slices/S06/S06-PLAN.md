# S06: Hardening, accessibility, and deployment readiness

**Goal:** Harden the predictive scheduling proof surfaces for launch by making web route diagnostics stable, adding focused web accessibility coverage, re-running clean-reset predictive/browser/build verification, and formally validating R011 without widening schedule scope.
**Demo:** axe-core scan reports zero new WCAG 2.1 AA violations. Stale M004 E2E assertions fixed. pnpm build passes for web and mobile. R011 marked validated.

## Must-Haves

- # S06: Hardening, accessibility, and deployment readiness
- **Goal:** Harden the predictive scheduling proof surfaces for launch by making web route diagnostics stable, adding focused web accessibility coverage, re-running clean-reset predictive/browser/build verification, and formally validating R011 without widening schedule scope.
- **Demo:** A clean local reset proves typed web route-state diagnostics, the web predictive create surface passes an axe-core scan with zero new WCAG 2.1 AA violations, mobile predictive smoke still passes unchanged, `pnpm build` succeeds, and `R011` is marked validated from that evidence.
- ## Must-Haves
- Fix prose-coupled web route-state assertions by promoting `data-route-mode`-style diagnostics to the web `calendar-route-state` surface and updating the affected Playwright seams to assert structured attributes.
- Add a focused `@axe-core/playwright` proof on the seeded web predictive create editor instead of widening scope to unrelated pages or accessibility rewrites.
- Re-run the mobile predictive/browser smoke suites from a fresh local Supabase reset before changing mobile code, then prove workspace build readiness.
- Close the slice by updating `R011` to validated with fresh S06 evidence.
- ## Threat Surface
- **Abuse**: This slice should not create any new privileged behavior; the main risk is accidentally widening predictive queries or weakening fail-closed offline/access-denied diagnostics while hardening tests.
- **Data exposure**: Shared calendar schedule data remains the only sensitive runtime data in scope; no new tokens, secrets, or broader history windows may be introduced.
- **Input trust**: Untrusted inputs remain the existing shift-editor/browser form fields and local offline route state; hardening work must stay on the current contracts and test hooks.
- ## Requirement Impact
- **Requirements touched**: `R011` (owned), `R002` (supporting access-scope constraint).
- **Re-verify**: Web cached-offline/denied continuity, web predictive create accessibility, mobile predictive create/find-time smoke, and build readiness for both apps.
- **Decisions revisited**: `D064`, `D065`, `D066`, `D067`.
- ## Proof Level
- This slice proves: final-assembly
- Real runtime required: yes
- Human/UAT required: no
- ## Verification
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts tests/e2e/calendar-shifts.spec.ts`
- `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/mobile-predictive.spec.ts tests/e2e/mobile-assembly.spec.ts`
- `pnpm build`
- Tool closeout: `gsd_requirement_update` marks `R011` validated with the fresh S06 proof note after the commands above pass.
- ## Observability / Diagnostics
- Runtime signals: web `calendar-route-state` becomes a typed proof surface for route mode/reason detail; existing `recurrence-suggestion`, `clash-advisory`, mobile `calendar-route-state`, and find-time `data-top-pick-count` hooks remain the inspection seams.
- Inspection surfaces: Playwright DOM attributes on both apps, seeded browser flows, workspace build output, and the `R011` requirement record.
- Failure visibility: failing route-mode assertions should localize to attribute mismatches instead of prose drift; axe failures should report node/impact details on the predictive editor subtree.
- Redaction constraints: do not log secrets or widen calendar scope beyond the seeded shared schedule data already used in the specs.
- ## Integration Closure
- Upstream surfaces consumed: web calendar route diagnostics, shared predictive editor hooks, mobile predictive diagnostics from S05, workspace Turbo build scripts, and the GSD requirement record for `R011`.
- New wiring introduced in this slice: typed web route-state attributes plus one focused accessibility assertion seam for the web predictive create surface.
- What remains before the milestone is truly usable end-to-end: nothing beyond executing the planned closeout verification and requirement update.
- ## Tasks
- [x] **T01: Type the web route-state proof surface and unstick stale E2E assertions** `est:1h`
- [x] **T02: Add focused axe coverage for the web predictive create editor** `est:45m`
- [x] **T03: Re-run clean-reset mobile predictive smoke and workspace builds without widening scope** `est:45m`
- [x] **T04: Validate R011 from fresh S06 evidence** `est:15m`
- ## Files Likely Touched
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/tests/e2e/calendar-offline.spec.ts`
- `apps/web/tests/e2e/calendar-sync.spec.ts`
- `apps/web/tests/e2e/fixtures.ts`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`
- `apps/web/package.json`
- `pnpm-lock.yaml`
- `.gsd/REQUIREMENTS.md`

## Proof Level

- This slice proves: final-assembly

## Integration Closure

S06 closes the milestone by proving the real predictive surfaces on web and mobile, build readiness across the workspace, and final requirement validation for R011 using typed diagnostics rather than brittle prose.

## Verification

- Web `calendar-route-state` becomes a stable typed diagnostic seam, existing predictive/advisory hooks remain the browser proof surface, and final closeout records fresh evidence on `R011` for future milestone validation.

## Tasks

- [x] **T01: Type the web route-state proof surface and unstick stale E2E assertions** `est:1h`
  ---
  estimated_steps: 5
  estimated_files: 4
  skills_used:
    - accessibility
    - test
    - verify-before-complete
  ---
  - Files: `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`, `apps/web/tests/e2e/calendar-offline.spec.ts`, `apps/web/tests/e2e/calendar-sync.spec.ts`, `apps/web/tests/e2e/fixtures.ts`
  - Verify: npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts

- [x] **T02: Add focused axe coverage for the web predictive create editor** `est:45m`
  ---
  estimated_steps: 5
  estimated_files: 3
  skills_used:
    - accessibility
    - test
    - verify-before-complete
  ---
  - Files: `apps/web/package.json`, `pnpm-lock.yaml`, `apps/web/tests/e2e/calendar-shifts.spec.ts`
  - Verify: npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts

- [x] **T03: Re-run clean-reset mobile predictive smoke and workspace builds without widening scope** `est:45m`
  ---
  estimated_steps: 5
  estimated_files: 6
  skills_used:
    - test
    - verify-before-complete
  ---
  - Files: `apps/mobile/tests/e2e/mobile-predictive.spec.ts`, `apps/mobile/tests/e2e/mobile-assembly.spec.ts`, `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`, `apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte`, `package.json`, `turbo.json`
  - Verify: npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/mobile-predictive.spec.ts tests/e2e/mobile-assembly.spec.ts && pnpm build

- [ ] **T04: Validate R011 from fresh S06 evidence** `est:15m`
  ---
  estimated_steps: 4
  estimated_files: 1
  skills_used:
    - write-docs
    - verify-before-complete
  ---
  - Files: `.gsd/REQUIREMENTS.md`, `apps/web/tests/e2e/calendar-offline.spec.ts`, `apps/web/tests/e2e/calendar-sync.spec.ts`, `apps/web/tests/e2e/calendar-shifts.spec.ts`, `apps/mobile/tests/e2e/mobile-predictive.spec.ts`, `apps/mobile/tests/e2e/mobile-assembly.spec.ts`, `package.json`
  - Verify: Tool success plus manual review of .gsd/REQUIREMENTS.md for the updated R011 block.

## Files Likely Touched

- apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
- apps/web/tests/e2e/calendar-offline.spec.ts
- apps/web/tests/e2e/calendar-sync.spec.ts
- apps/web/tests/e2e/fixtures.ts
- apps/web/package.json
- pnpm-lock.yaml
- apps/web/tests/e2e/calendar-shifts.spec.ts
- apps/mobile/tests/e2e/mobile-predictive.spec.ts
- apps/mobile/tests/e2e/mobile-assembly.spec.ts
- apps/mobile/src/routes/calendars/[calendarId]/+page.svelte
- apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte
- package.json
- turbo.json
- .gsd/REQUIREMENTS.md
