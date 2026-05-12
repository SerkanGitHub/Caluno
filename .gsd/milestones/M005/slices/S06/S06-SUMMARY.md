---
id: S06
parent: M005
milestone: M005
provides:
  - Milestone-closeout proof that predictive assistance surfaces are stable, accessible at the targeted editor scope, and buildable across web and mobile.
  - Fresh requirement validation for `R011` tied to concrete S06 runtime evidence.
requires:
  []
affects:
  []
key_files:
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte
  - apps/web/tests/e2e/calendar-offline.spec.ts
  - apps/web/tests/e2e/calendar-sync.spec.ts
  - apps/web/tests/e2e/fixtures.ts
  - apps/web/tests/e2e/calendar-shifts.spec.ts
  - apps/mobile/tests/e2e/mobile-predictive.spec.ts
  - apps/mobile/tests/e2e/mobile-assembly.spec.ts
  - .gsd/REQUIREMENTS.md
  - .gsd/milestones/M005/slices/S06/tasks/T04-VERIFY.json
key_decisions:
  - Use `calendar-route-state` with typed `data-route-mode` / `data-route-reason` attributes as the stable continuity proof seam instead of prose assertions.
  - Keep accessibility verification slice-scoped by running `@axe-core/playwright` only on the seeded predictive create editor subtree.
  - Validate `R011` only against the shipped predictive assistance surfaces already in scope: recurrence suggestions and clash advisories grounded in real schedule data.
patterns_established:
  - Prefer structured DOM diagnostics over user-facing copy for browser E2E proof surfaces.
  - For accessibility hardening late in a milestone, add a focused axe assertion on the live feature subtree instead of widening to whole-app scans.
  - Re-run clean-reset web, mobile, and build proofs before requirement validation so requirement state reflects fresh runtime evidence.
observability_surfaces:
  - Web `calendar-route-state[data-route-mode][data-route-reason]`
  - Web predictive `data-testid="recurrence-suggestion"` and `data-testid="clash-advisory"` seams
  - Scoped web predictive create-editor accessibility scan on `[data-testid="create-shift-editor"]`
  - Mobile predictive/browser proof surfaces including route-state diagnostics and `data-top-pick-count`
drill_down_paths:
  - .gsd/milestones/M005/slices/S06/tasks/T01-SUMMARY.md
  - .gsd/milestones/M005/slices/S06/tasks/T02-SUMMARY.md
  - .gsd/milestones/M005/slices/S06/tasks/T03-SUMMARY.md
  - .gsd/milestones/M005/slices/S06/tasks/T04-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-05-12T08:24:57.224Z
blocker_discovered: false
---

# S06: Hardening, accessibility, and deployment readiness

**Closed M005 predictive launch hardening by stabilizing typed web route diagnostics, proving zero new WCAG 2.1 AA issues on the seeded predictive editor, re-running clean-reset mobile/browser/build verification, and validating R011.**

## What Happened

S06 finished the predictive-assistance milestone closeout work without widening feature scope. T01 hardened the web continuity proof surface by exposing typed `data-route-mode` and `data-route-reason` attributes on `calendar-route-state`, then moved the affected Playwright seams off prose-coupled assertions so wording changes no longer break trusted-online, cached-offline, or offline-denied proofs. T02 added focused `@axe-core/playwright` coverage on the seeded web predictive create editor, specifically exercising the live recurrence-suggestion path and scanning only `[data-testid="create-shift-editor"]` so the accessibility proof remains anchored to the shipped predictive surface. T03 stayed verification-only and re-ran the mobile predictive/browser smoke from a fresh local Supabase reset before proving workspace build readiness across both apps with `pnpm build`. T04 closed the requirement loop by confirming `R011` is now rendered under Validated with fresh S06 evidence and notes scoped to the shipped predictive assistance surfaces: recurrence suggestions and clash advisories grounded in real schedule data. During slice closeout, parallel Supabase resets initially contended on local container teardown, so the failing reruns were retried serially; no product code changes were needed for that environment-level contention.

## Verification

Fresh closeout verification passed through `gsd_exec`: (1) `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts` exited 0 in 52690ms and Playwright reported 4 passing tests, re-proving typed web route-state continuity and realtime sync seams; (2) `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts` exited 0 in 66315ms and Playwright reported 7 passing tests, including the scoped predictive create-editor axe proof with zero new WCAG 2.1 AA violations; (3) `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/mobile-predictive.spec.ts tests/e2e/mobile-assembly.spec.ts && pnpm build` exited 0 in 47961ms, re-proved 6 passing mobile predictive/assembly tests, and finished the workspace build with 2 successful Turbo build tasks. After verification, `gsd_requirement_update` confirmed `R011` remains `validated`, and manual review of `.gsd/REQUIREMENTS.md` verified the rendered R011 block cites the exact S06 proof commands and scope note.

## Requirements Advanced

- R011 — Closed the milestone hardening loop with fresh clean-reset web/mobile/build verification and a rendered validation note tied to the shipped predictive proof surfaces.

## Requirements Validated

- R011 — `gsd_exec` reruns of the web offline/realtime suite, web predictive accessibility suite, mobile predictive/assembly suite, and workspace `pnpm build`, followed by `gsd_requirement_update` plus manual review of the rendered `.gsd/REQUIREMENTS.md` R011 block.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

Parallel closeout reruns briefly contended on local Supabase container removal; verification was repeated serially and passed without code changes.

## Known Limitations

`pnpm build` still emits non-fatal Vite mixed dynamic/static import warnings in the web app (`sync-engine.ts` and `mutation-queue.ts`), but the build exits successfully and S06 did not widen scope to address them.

## Follow-ups

Optionally clean up the non-fatal Vite mixed-import warnings in a later hardening pass if they start obscuring real build regressions.

## Files Created/Modified

- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — Exposes typed `calendar-route-state` diagnostics for stable route-mode assertions.
- `apps/web/tests/e2e/calendar-offline.spec.ts` — Asserts structured route-state attributes for offline continuity flows.
- `apps/web/tests/e2e/calendar-sync.spec.ts` — Asserts structured route-state attributes for trusted-online sync flows.
- `apps/web/tests/e2e/fixtures.ts` — Waits on the typed trusted-online route-state seam instead of prose.
- `apps/web/tests/e2e/calendar-shifts.spec.ts` — Adds a focused predictive create-editor axe proof and preserves seeded predictive/advisory coverage.
- `apps/web/package.json` — Adds the web-local accessibility test dependency used by the scoped axe proof.
- `pnpm-lock.yaml` — Locks the new web accessibility testing dependency.
- `package.json` — Remains the workspace build entrypoint used for closeout readiness proof.
- `.gsd/REQUIREMENTS.md` — Renders `R011` as validated with fresh S06 proof and scope notes.
- `.gsd/milestones/M005/slices/S06/tasks/T04-VERIFY.json` — Aligns the T04 verification artifact with the actual requirement-update/manual-review closeout checks.
