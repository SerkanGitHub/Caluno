---
estimated_steps: 45
estimated_files: 6
skills_used: []
---

# T03: Re-run clean-reset mobile predictive smoke and workspace builds without widening scope

---
estimated_steps: 5
estimated_files: 6
skills_used:
  - test
  - verify-before-complete
---

# T03: Re-run clean-reset mobile predictive smoke and workspace builds without widening scope

**Slice:** S06 — Hardening, accessibility, and deployment readiness
**Milestone:** M005

## Description

Treat mobile as verify-first. The S05 summary and current source suggest the mobile predictive/create/find-time surfaces are already hardened, so this task should first prove that claim unchanged from a fresh local reset. Run the mobile predictive/browser smoke suites and the workspace build commands after the web hardening work lands. If a command fails, stop on the first concrete regression and capture the exact blocker instead of broadening scope or rewriting mobile behavior speculatively.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Local Supabase + Docker for seeded Playwright reset | Treat as an environment blocker and resolve/reset before making product-code claims. | Stop and report the reset/runtime blocker; do not mark the slice complete. | N/A — this task is command-level verification over existing seeded flows. |
| Workspace build graph (`turbo run build`) | Localize the failing app/package and fix only that concrete build issue. | Stop on the failing build and capture the package/command that hung. | N/A — build proof does not consume custom response payloads. |

## Negative Tests

- **Malformed inputs**: Do not mutate seeded mobile tests before the first clean rerun; the first signal should come from current contracts.
- **Error paths**: If mobile smoke or builds fail, capture the exact first failing assertion/build target instead of papering over it with broader edits.
- **Boundary conditions**: Preserve current mobile diagnostics (`data-route-mode`, recurrence status, `data-top-pick-count`) and advisory-only clash behavior while verifying.

## Steps

1. Run `npx --yes supabase db reset --local --yes` immediately before the mobile Playwright proof.
2. Execute `apps/mobile/tests/e2e/mobile-predictive.spec.ts` and `apps/mobile/tests/e2e/mobile-assembly.spec.ts` unchanged first.
3. If the mobile proof passes, run `pnpm build` (or app-local builds if localization is required) and keep the output tied back to the failing package if anything breaks.
4. Do not redesign predictive logic, warning-only clash behavior, or query scope as part of this task.
5. Preserve the command output/evidence needed by T04 to validate `R011`.

## Must-Haves

- [ ] Fresh mobile proof is produced from a clean local reset rather than a dirty seeded state.
- [ ] Build readiness is proven at the workspace level, or the failing package is localized truthfully before any fix attempt.

## Verification

- `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/mobile-predictive.spec.ts tests/e2e/mobile-assembly.spec.ts`
- `pnpm build`

## Observability Impact

- Signals added/changed: none in product code; this task relies on the existing mobile route-state and top-pick diagnostics plus build output.
- How a future agent inspects this: rerun the same mobile Playwright commands after a local reset and inspect Turbo build logs.
- Failure state exposed: the first failing spec/assertion or build target becomes the blocker instead of being hidden behind speculative edits.

## Inputs

- `apps/mobile/tests/e2e/mobile-predictive.spec.ts` — predictive mobile browser proof.
- `apps/mobile/tests/e2e/mobile-assembly.spec.ts` — end-to-end mobile smoke including find-time diagnostics.
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` — current mobile predictive route diagnostics.
- `apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte` — current mobile top-pick diagnostics.
- `package.json` — workspace build entrypoint.
- `turbo.json` — workspace build graph.

## Expected Output

## Inputs

- `apps/mobile/tests/e2e/mobile-predictive.spec.ts`
- `apps/mobile/tests/e2e/mobile-assembly.spec.ts`
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`
- `apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte`
- `package.json`
- `turbo.json`

## Expected Output

- `apps/mobile/tests/e2e/mobile-predictive.spec.ts`
- `apps/mobile/tests/e2e/mobile-assembly.spec.ts`
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte`
- `apps/mobile/src/routes/calendars/[calendarId]/find-time/+page.svelte`
- `package.json`
- `turbo.json`

## Verification

npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/mobile-predictive.spec.ts tests/e2e/mobile-assembly.spec.ts && pnpm build

## Observability Impact

Relies on the existing mobile diagnostic attributes and Turbo build output as the final pre-closeout inspection surfaces; no new runtime instrumentation should be added unless a rerun proves it is necessary.
