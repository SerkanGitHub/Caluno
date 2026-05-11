# S06 Research — Hardening, accessibility, and deployment readiness

## Summary
Targeted research. The predictive feature work is already implemented on both surfaces, so S06 is mostly a **hardening + verification** slice rather than a new feature slice. The biggest concrete gaps are: (1) there is no axe-core Playwright harness in the repo yet, (2) the **web** offline browser proof still relies on brittle route-state prose instead of structured attributes, and (3) closeout still needs build evidence plus the final R011 validation step.

## Requirement Focus
- **R011 ownership:** S06 is the slice that turns the already-delivered predictive surfaces into a formally validated requirement.
- **R002 constraint:** all proof must stay inside the already-authorized calendar scope; do not widen any predictive query or browser fixture scope while hardening tests.
- **R006 constraint:** clash UI remains advisory-only; S06 should harden proof and accessibility, not change conflict policy.
- **Accessibility skill fit:** the installed `accessibility` skill is directly aligned with the slice goal (WCAG 2.1 / keyboard / screen-reader checks).
- **Evidence rule:** the installed `verify-before-complete` skill is relevant here — do not mark R011 validated until fresh browser/build evidence exists in this slice.

## Key Findings
1. **Predictive UI hooks already exist on both surfaces.** Web create/edit flows already render `data-testid="clash-advisory"` and `data-testid="recurrence-suggestion"` in `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte:461-547`. Mobile already exposes the same hooks in `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte:490-581`.
2. **Mobile already has better accessibility semantics than web.** The mobile sheet is a real modal surface with `role="dialog"` and `aria-modal="true"` in `apps/mobile/src/lib/components/calendar/ShiftEditorSheet.svelte:418-420`. The web create surface is still a `<details>` disclosure in `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte:389-396`, so the web surface is the higher-risk place to add automated accessibility proof first.
3. **There is no axe harness in the repo today.** `apps/web/package.json` and `apps/mobile/package.json` contain Playwright but no `@axe-core/playwright`, and a repo scan found no existing axe/inject/checkA11y usage. S06 needs to add the dependency and an assertion seam.
4. **The known stale M004 web assertion is still structurally brittle.** `apps/web/tests/e2e/calendar-offline.spec.ts:120,161,296,361` still checks route mode via `.toContainText('trusted-online'/'cached-offline')`, while the web route-state container at `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte:662` exposes no `data-route-mode` attribute at all. Mobile already solved this pattern by exposing structured route diagnostics on `data-testid="calendar-route-state"` and asserting via `toHaveAttribute('data-route-mode', ...)`.
5. **The mobile top-pick ordering issue appears already remediated.** `apps/mobile/tests/e2e/mobile-assembly.spec.ts:158-181` now reads `data-top-pick-count`, asserts `>= 1`, inspects the first ranked candidate, and only then clicks the rank-1 CTA. The source route also publishes `data-top-pick-count` in `apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte:383-389`. This looks like a verify-first seam, not an obvious remaining code change.
6. **Fresh local Supabase reset is mandatory for authoritative browser proof.** Memory hits MEM002/MEM027/MEM102/MEM103 all reinforce the same constraint: Playwright specs share mutable seeded state, and `supabase db reset --local --yes` requires Docker. Planner should assume clean-reset verification, not dirty reruns.
7. **Web Playwright has a tooling asymmetry worth remembering.** `apps/web/playwright.config.ts` shells `supabase status --output env` via the global `supabase` binary, while mobile uses `npx --yes supabase ...`. This is only a blocker if the verifier environment lacks a global Supabase CLI, but it is a real readiness gotcha.
8. **Build readiness is already wired at the workspace level.** Root `package.json` defines `pnpm build` as `turbo run build`, and `turbo.json` fans that into each app’s `build` script. `apps/web/package.json` and `apps/mobile/package.json` both map `build` to `vite build`, so S06 build proof can stay simple.
9. **Final requirement closure is a tool step, not a file edit.** After proof passes, R011 should be marked validated through the GSD requirement update tool rather than hand-editing `REQUIREMENTS.md`.

## Recommendation
- Treat S06 as **web hardening first, verification second**.
- First, add stable diagnostic attributes to the web calendar route state (`data-route-mode`, and optionally reason/source companions) so `calendar-offline.spec.ts` can stop scraping prose. This directly addresses the known stale M004 assertion and aligns web with the more stable mobile contract.
- Second, add an axe-core Playwright check on the already-existing predictive create surface. The quickest truthful seam is the open web `create-shift-editor`, because `apps/web/tests/e2e/calendar-shifts.spec.ts` already has `openCreateShiftEditor()` and seeded predictive setup.
- Third, rerun the mobile assembly/predictive proofs before changing them. Current code already follows the durable memory rule: assert rank contract and counts, not brittle exact ordering.
- After browser proof is green, run the workspace/app builds and then validate R011.

## Files and Purpose
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte` — add structured route diagnostics (especially `data-route-mode`) to stabilize browser proof.
- `apps/web/tests/e2e/calendar-offline.spec.ts` — replace route-mode prose assertions with attribute-backed checks.
- `apps/web/package.json` — add `@axe-core/playwright` (minimum scope that unlocks the web accessibility scan).
- `apps/web/tests/e2e/calendar-shifts.spec.ts` — best existing seam for a focused axe scan of the predictive create editor; it already opens the seeded create surface and cleans proof shifts.
- `apps/mobile/tests/e2e/mobile-assembly.spec.ts` — likely verification-only; only edit if a clean-reset rerun still exposes ordering drift.
- `apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte` — route-state source for `data-top-pick-count`; useful reference if mobile assembly needs a follow-up patch.
- `package.json` — workspace `pnpm build` entrypoint.
- `turbo.json` — confirms build fan-out and is the place to inspect if build proof behaves unexpectedly.
- `apps/web/playwright.config.ts` — only touch if the verifier environment proves the global `supabase` binary assumption is blocking web Playwright.
- **Non-file closeout:** update requirement `R011` to validated after fresh evidence exists.

## Natural Seams
1. **Web diagnostic hardening** — add route-state attrs and convert stale offline assertions.
2. **Accessibility harness** — add axe dependency plus one focused Playwright assertion on the predictive create surface.
3. **Verification-only reruns** — mobile assembly + mobile predictive + build commands; patch only if the reruns expose a real remaining drift.
4. **Requirement closeout** — update R011 validation once all proof is green.

## First Proof
1. Run a clean-reset web browser proof after adding `data-route-mode` to the web route-state surface, and prove `trusted-online` / `cached-offline` via attributes rather than human-facing copy.
2. In the same clean environment, open the web create editor and run an axe scan limited to the predictive editor subtree (`[data-testid="create-shift-editor"]` or its open panel) so the proof stays slice-scoped.
3. Rerun `mobile-assembly.spec.ts` and `mobile-predictive.spec.ts` **without changing them first**; current source already looks hardened against top-pick ordering drift.
4. Finish with build proof and only then mark R011 validated.

## Verification
- `npx --yes supabase db reset --local --yes`
- `pnpm --dir apps/web exec playwright test tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-shifts.spec.ts`
- `npx --yes supabase db reset --local --yes`
- `pnpm --dir apps/mobile exec playwright test tests/e2e/mobile-predictive.spec.ts tests/e2e/mobile-assembly.spec.ts`
- `pnpm build`

If build failures are easier to localize per app, equivalent proof is:
- `pnpm --dir apps/web build`
- `pnpm --dir apps/mobile build`

## Watch-outs / Forward Intelligence
- **Dirty DB runs will waste time.** MEM027/MEM102/MEM103 all point to the same failure mode: shared seeded mutations make E2E expectations drift unless you reset Supabase first.
- **Docker is a prerequisite for browser proof.** MEM002: if Docker is down, the local Supabase reset fails before Playwright even starts.
- **Web accessibility proof may surface different issues than mobile** because the web editor is a disclosure (`<details>`) rather than a real modal dialog. Even if axe passes, do not over-claim focus-management guarantees that were not explicitly tested.
- **Do not broaden scope while hardening.** S06 should not redesign predictive logic, change warning-only clash behavior, or widen recurrence history access.
- **If Playwright web boot fails before tests run, inspect `apps/web/playwright.config.ts` first** for the global `supabase` binary assumption before debugging product code.

## Skill Discovery
Already-installed project skills relevant here:
- `accessibility`
- `test`
- `verify-before-complete`
- `review`

Promising external skills discovered (not installed):
- `npx skills add currents-dev/playwright-best-practices-skill@playwright-best-practices` — strongest Playwright-specific hit (37.4K installs).
- `npx skills add ejirocodes/agent-skills@svelte5-best-practices` — strongest Svelte-specific hit from the discovery run (3.2K installs).
- `npx skills add claude-dev-suite/claude-dev-suite@axe-core` — direct axe-core skill hit (32 installs) if the team wants dedicated accessibility-tooling guidance.
