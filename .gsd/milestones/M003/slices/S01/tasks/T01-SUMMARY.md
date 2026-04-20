---
id: T01
parent: S01
milestone: M003
key_files:
  - packages/caluno-core/package.json
  - packages/caluno-core/src/index.ts
  - packages/caluno-core/src/access.ts
  - packages/caluno-core/src/app-shell.ts
  - packages/caluno-core/src/route-contract.ts
  - packages/caluno-core/src/supabase.ts
  - apps/web/src/lib/access/contract.ts
  - apps/web/src/lib/server/app-shell.ts
  - apps/web/src/lib/schedule/route-contract.ts
  - apps/web/src/lib/supabase/config.ts
  - apps/web/src/routes/(app)/+layout.server.ts
  - apps/web/src/routes/(app)/groups/+page.server.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.server.ts
  - apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts
  - apps/web/src/lib/offline/protected-routes.ts
  - apps/web/package.json
  - apps/mobile/package.json
  - apps/mobile/vite.config.ts
  - apps/mobile/tests/trusted-core.unit.test.ts
  - .gsd/KNOWLEDGE.md
key_decisions:
  - D050: keep shared trusted-scope helpers in `@repo/caluno-core` and keep Svelte runtime/env access in app-local wrappers.
duration: 
verification_result: passed
completed_at: 2026-04-20T22:41:28.047Z
blocker_discovered: false
---

# T01: Extracted the shared trusted-scope helpers into @repo/caluno-core and added the first mobile Vitest contract proof.

**Extracted the shared trusted-scope helpers into @repo/caluno-core and added the first mobile Vitest contract proof.**

## What Happened

I created a new workspace package at `packages/caluno-core` and moved the pure access, app-shell, route-contract, and public Supabase env helpers into it so mobile can consume the trusted-scope contract without importing from `apps/web/src`. In `apps/web`, I converted the old helper modules into thin compatibility shims, rewired the main route and shell consumers to import directly from `@repo/caluno-core`, and preserved the existing denied-reason semantics (`calendar-id-invalid`, `calendar-missing`, `group-membership-missing`, `anonymous`). On the mobile side, I added Vitest scripts and config, linked the new workspace package, and added `apps/mobile/tests/trusted-core.unit.test.ts` to prove malformed calendar ids reject early, out-of-scope ids collapse to `calendar-missing`, primary-calendar selection stays deterministic, app-shell shaping remains ordered, and blank public env values fail with explicit missing-key diagnostics. I also recorded decision D050 to keep the shared package pure and leave Svelte-specific env access in app-local wrappers, and appended the same portability rule to `.gsd/KNOWLEDGE.md`.

## Verification

Verified the new mobile contract surface with `pnpm --dir apps/mobile exec vitest run tests/trusted-core.unit.test.ts`, which passed all five new shared-helper regression tests. Verified web auth/protected-route parity with `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/routes/protected-routes.unit.test.ts`, which passed all 27 existing web regressions after the extraction. As an additional slice-level wiring sanity check, `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build` passed cleanly. I explicitly checked that later-slice verification files `apps/mobile/tests/auth-bootstrap.unit.test.ts`, `apps/mobile/tests/shell-scope.unit.test.ts`, and `apps/mobile/tests/e2e/auth-scope.spec.ts` are still absent, so I am not claiming T02–T04 verification yet.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/mobile exec vitest run tests/trusted-core.unit.test.ts` | 0 | ✅ pass | 8800ms |
| 2 | `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/routes/protected-routes.unit.test.ts` | 0 | ✅ pass | 5000ms |
| 3 | `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build` | 0 | ✅ pass | 4200ms |

## Deviations

Did not run the later slice commands that require future-task artifacts or create the iOS project early. Instead, I verified the T01 contract surface directly and confirmed the later mobile auth/shell/E2E test files do not exist yet, to avoid a false-positive slice verification claim.

## Known Issues

None.

## Files Created/Modified

- `packages/caluno-core/package.json`
- `packages/caluno-core/src/index.ts`
- `packages/caluno-core/src/access.ts`
- `packages/caluno-core/src/app-shell.ts`
- `packages/caluno-core/src/route-contract.ts`
- `packages/caluno-core/src/supabase.ts`
- `apps/web/src/lib/access/contract.ts`
- `apps/web/src/lib/server/app-shell.ts`
- `apps/web/src/lib/schedule/route-contract.ts`
- `apps/web/src/lib/supabase/config.ts`
- `apps/web/src/routes/(app)/+layout.server.ts`
- `apps/web/src/routes/(app)/groups/+page.server.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/find-time/+page.server.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts`
- `apps/web/src/lib/offline/protected-routes.ts`
- `apps/web/package.json`
- `apps/mobile/package.json`
- `apps/mobile/vite.config.ts`
- `apps/mobile/tests/trusted-core.unit.test.ts`
- `.gsd/KNOWLEDGE.md`
