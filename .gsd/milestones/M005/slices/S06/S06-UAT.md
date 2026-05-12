# S06: Hardening, accessibility, and deployment readiness — UAT

**Milestone:** M005
**Written:** 2026-05-12T08:24:57.224Z

# UAT Type
Operational regression replay

# Preconditions
1. Local Supabase tooling is available and the project's local stack can be reset.
2. Browser and mobile Playwright environments are installed.
3. The repo is at the S06 closeout state.

# Steps
1. Run `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-offline.spec.ts tests/e2e/calendar-sync.spec.ts`.
2. In the resulting web proof, confirm the calendar route diagnostics are asserted through structured `data-route-mode` / `data-route-reason` attributes rather than user-facing prose.
3. Run `npx --yes supabase db reset --local --yes && pnpm --dir apps/web exec playwright test tests/e2e/calendar-shifts.spec.ts`.
4. Confirm the predictive create editor accessibility test opens the seeded recurrence-suggestion flow and reports no new WCAG 2.1 AA violations inside `[data-testid="create-shift-editor"]`.
5. Run `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/mobile-predictive.spec.ts tests/e2e/mobile-assembly.spec.ts`.
6. Confirm the mobile predictive smoke still shows the recurrence suggestion and clash advisory proof surfaces without regressions.
7. Run `pnpm build` from the workspace root.
8. Open `.gsd/REQUIREMENTS.md` and inspect the `R011` block.

# Expected Outcomes
1. The web offline/realtime suite passes and proves trusted-online, cached-offline, and offline-denied behavior via typed route-state attributes.
2. The web predictive create suite passes and the scoped axe scan reports zero new WCAG 2.1 AA violations.
3. The mobile predictive and assembly suites pass unchanged from the seeded proof flows.
4. The workspace build completes successfully for both `web` and `mobile`.
5. `R011` appears under `## Validated` and cites the exact S06 verification commands.

# Edge Cases
- If multiple Supabase resets are started at once, local container teardown can briefly contend; rerun serially and require a clean pass before accepting the result.
- Non-fatal Vite mixed-import warnings during `pnpm build` do not invalidate S06 as long as the build exits 0 and the predictive proof surfaces remain unchanged.

# Not Proven By This UAT
- Any future predictive features beyond recurrence suggestions and clash advisories.
- Broader accessibility coverage outside the seeded web predictive create editor subtree.
- Production deployment health or hosted environment monitoring.
