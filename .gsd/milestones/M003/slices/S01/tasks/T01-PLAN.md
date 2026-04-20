---
estimated_steps: 4
estimated_files: 9
skills_used:
  - debug-like-expert
---

# T01: Extract shared trusted-scope contracts and stand up mobile tests

**Slice:** S01 — Mobile shell, auth, and trusted calendar scope
**Milestone:** M003

## Description

Retire the biggest drift risk before mobile starts calling Supabase. Move the pure access, app-shell, route-contract, and public-env helpers into a shared workspace package that both surfaces can import, and give `apps/mobile` its first real test runner so S01 starts with executable contract proof instead of manual spot checks.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Workspace package resolution | Fail the task and restore local app imports rather than leaving `apps/web` or `apps/mobile` on broken aliases. | Treat the extraction as incomplete and keep the shared package unwired. | Reject the export shape in tests and keep the old helper contract from silently drifting. |
| Existing web auth/scope regressions | Stop on the first failing web regression and fix contract parity before touching mobile behavior. | Do not proceed to auth/bootstrap work until the same denial semantics are green again. | Treat mismatched denied reasons as a contract break, not a harmless refactor. |

## Negative Tests

- **Malformed inputs**: invalid join-code strings, malformed calendar ids, null/blank public env values.
- **Error paths**: missing exports, broken package resolution, and web regression failures after import rewiring.
- **Boundary conditions**: no memberships, no calendars, default-calendar absence, and guessed out-of-scope calendar ids.

## Steps

1. Create `packages/caluno-core` with exports for access, app-shell shaping, route contract, and public Supabase env helpers extracted from the existing pure web modules.
2. Rewire `apps/web` to import those helpers from `@repo/caluno-core` without changing the current protected-route behavior or denied reason codes.
3. Add Vitest support and scripts to `apps/mobile` so the slice has a real mobile-local test surface from the first task.
4. Add `apps/mobile/tests/trusted-core.unit.test.ts` covering shared denial semantics, primary-calendar selection, and public-env validation imported from the new package.

## Must-Haves

- [ ] `apps/mobile` can import the shared trust helpers without reaching into `apps/web/src`.
- [ ] Existing web auth/protected-route regressions stay green after the extraction.
- [ ] `apps/mobile` gains a repeatable unit-test command in `package.json`.
- [ ] Shared helper tests prove `calendar-id-invalid` / `calendar-missing` behavior and primary-calendar selection before mobile UI work starts.

## Verification

- `pnpm --dir apps/mobile exec vitest run tests/trusted-core.unit.test.ts`
- `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/routes/protected-routes.unit.test.ts`

## Inputs

- `apps/web/src/lib/access/contract.ts` — current pure access/denial helpers to extract.
- `apps/web/src/lib/server/app-shell.ts` — current viewer/group/calendar shaping and denied-state helpers.
- `apps/web/src/lib/schedule/route-contract.ts` — current trusted calendar route-resolution helpers.
- `apps/web/src/lib/supabase/config.ts` — current public Supabase env loader.
- `apps/web/tests/auth/session.unit.test.ts` — existing auth/session contract regression surface.
- `apps/web/tests/routes/protected-routes.unit.test.ts` — existing protected-calendar denial regression surface.
- `apps/mobile/package.json` — current mobile scripts and dependency baseline.

## Expected Output

- `packages/caluno-core/package.json` — shared workspace package metadata and exports.
- `packages/caluno-core/src/index.ts` — shared package barrel exports.
- `packages/caluno-core/src/access.ts` — extracted access and join-code contract helpers.
- `packages/caluno-core/src/app-shell.ts` — extracted viewer/group/calendar shaping helpers.
- `packages/caluno-core/src/route-contract.ts` — extracted trusted route-resolution helpers.
- `packages/caluno-core/src/supabase.ts` — extracted public Supabase env reader.
- `apps/mobile/package.json` — mobile test scripts and test dependencies.
- `apps/mobile/vite.config.ts` — Vitest-enabled Vite config for mobile.
- `apps/mobile/tests/trusted-core.unit.test.ts` — executable shared-contract regression coverage.
