---
estimated_steps: 27
estimated_files: 9
skills_used:
  - debug-like-expert
---

# T01: Extract shared find-time matching and create-prefill contracts

Extract the pure Find time matcher, ranking, and timing-only create-prefill contract into `@repo/caluno-core` before mobile consumes them. Keep the shared layer free of SvelteKit, browser, and Capacitor runtime assumptions, then rewire web wrappers so existing route behavior stays intact while mobile gains one source of truth for Top-pick ordering, explanation failure modes, and exact slot handoff.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Existing web matcher/ranking helpers | Stop on the first regression and fix the shared extraction before mobile depends on forked Top-pick or explanation logic. | Treat hanging regressions as incomplete extraction and keep mobile off the new shared surface. | Fail closed on invalid windows, duplicate member assignments, or missing shift titles instead of weakening ranking validation for portability. |
| Existing create-prefill helper | Keep the web handoff path on the known-good contract until the shared helper round-trips cleanly. | Do not start mobile arrival wiring while the timing-only contract is unresolved. | Reject malformed or mismatched `start` / `prefillStartAt` / `prefillEndAt` params instead of guessing destination week or slot values. |

## Load Profile

- **Shared resources**: shared package exports, 30-day matcher/ranking helpers, and cross-surface regression suites.
- **Per-operation cost**: pure range normalization, boundary sorting, ranking, explanation shaping, and query-param parsing with no direct network or runtime plugin calls.
- **10x breakpoint**: oversized window sets or hidden app-local imports will break portability and deterministic ranking first.

## Negative Tests

- **Malformed inputs**: blank/invalid duration, invalid search anchor, invalid ISO slot timestamps, zero-length slots, duplicate member busy assignments, missing shift titles.
- **Error paths**: missing shared exports, wrapper imports still reaching into app-local code, and ranking failure paths that should withhold malformed explanations.
- **Boundary conditions**: no results, all-free windows, all-blocked windows, slot week differing from the original search anchor week, and unrelated search params preserved after cleanup.

## Steps

1. Move or recreate the pure matcher/ranking helpers and strict create-prefill parser/builder under `packages/caluno-core/src/find-time/*` and `packages/caluno-core/src/schedule/create-prefill.ts`, adding explicit package exports.
2. Rewire `apps/web/src/lib/find-time/*.ts` and `apps/web/src/lib/schedule/create-prefill.ts` into thin wrappers or re-exports so existing web routes/tests keep their current behavior.
3. Add a mobile-local contract suite that imports the shared helpers directly and proves Top-pick ordering, fail-closed malformed ranking, strict handoff parsing, Monday week derivation, and one-shot cleanup semantics.
4. Keep the shared contract pure so later mobile route work can consume it without importing from `apps/web/src` or depending on Svelte runtime globals.

## Must-Haves

- [ ] Mobile can consume shared matcher/ranking/create-prefill helpers without importing from `apps/web/src`.
- [ ] Web matcher and create-prefill regressions stay green against the extracted shared implementation.
- [ ] Malformed ranking inputs and malformed handoff params still fail closed instead of generating guessed windows or guessed create state.
- [ ] A mobile-local contract test file exists before mobile route wiring begins.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/find-time-contract.unit.test.ts`
- `pnpm --dir apps/web exec vitest run tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts`

## Inputs

- `apps/web/src/lib/find-time/matcher.ts` — existing pure match-window contract to extract without changing web behavior.
- `apps/web/src/lib/find-time/ranking.ts` — existing Top-pick and explanation contract to keep deterministic.
- `apps/web/src/lib/schedule/create-prefill.ts` — existing timing-only handoff parser/builder to reuse on mobile.
- `apps/web/tests/find-time/matcher.unit.test.ts` — current matcher regression coverage to keep green.
- `apps/web/tests/routes/find-time-routes.unit.test.ts` — current trusted route-state contract to preserve.
- `apps/web/tests/schedule/create-prefill.unit.test.ts` — current handoff parser/builder proof to preserve.
- `apps/web/tests/routes/protected-routes.unit.test.ts` — current create-prefill arrival contract on the calendar route.
- `packages/caluno-core/package.json` — shared package export surface to extend.

## Expected Output

- `packages/caluno-core/package.json` — shared exports extended for find-time and create-prefill modules.
- `packages/caluno-core/src/index.ts` — shared package barrel updated for mobile/web consumption.
- `packages/caluno-core/src/find-time/matcher.ts` — pure shared Find time window-building contract.
- `packages/caluno-core/src/find-time/ranking.ts` — pure shared Top-pick and explanation contract.
- `packages/caluno-core/src/schedule/create-prefill.ts` — strict shared timing-only handoff contract.
- `apps/web/src/lib/find-time/matcher.ts` — thin web wrapper or re-export pointed at the shared contract.
- `apps/web/src/lib/find-time/ranking.ts` — thin web wrapper or re-export pointed at the shared contract.
- `apps/web/src/lib/schedule/create-prefill.ts` — thin web wrapper or re-export pointed at the shared contract.
- `apps/mobile/tests/find-time-contract.unit.test.ts` — mobile-local proof that the shared contract stays truthful and fail-closed.

## Verification

pnpm --dir apps/mobile exec vitest run tests/find-time-contract.unit.test.ts && pnpm --dir apps/web exec vitest run tests/find-time/matcher.unit.test.ts tests/routes/find-time-routes.unit.test.ts tests/schedule/create-prefill.unit.test.ts tests/routes/protected-routes.unit.test.ts
