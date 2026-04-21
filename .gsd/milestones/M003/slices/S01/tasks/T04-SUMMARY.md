---
id: T04
parent: S01
milestone: M003
key_files:
  - apps/mobile/playwright.config.ts
  - apps/mobile/tests/e2e/fixtures.ts
  - apps/mobile/tests/e2e/auth-scope.spec.ts
  - apps/mobile/src/lib/components/MobileShell.svelte
  - apps/mobile/src/routes/signin/+page.svelte
  - apps/mobile/package.json
  - apps/mobile/ios/App/App.xcodeproj/project.pbxproj
  - apps/mobile/ios/App/App/AppDelegate.swift
  - .gsd/KNOWLEDGE.md
key_decisions:
  - D053: Expose sign-out inside the shared protected MobileShell and surface invalid-session through explicit sign-in metadata because authenticated users are redirected away from /signin.
duration: 
verification_result: passed
completed_at: 2026-04-21T08:51:33.795Z
blocker_discovered: false
---

# T04: Added the mobile Playwright proof, reachable shell sign-out observability, and first successful Capacitor iOS bootstrap/sync for the trusted mobile shell.

**Added the mobile Playwright proof, reachable shell sign-out observability, and first successful Capacitor iOS bootstrap/sync for the trusted mobile shell.**

## What Happened

I added `apps/mobile/playwright.config.ts` so the mobile E2E harness reads the live local Supabase public env from `supabase status --output env`, boots the mobile Vite server on a fixed localhost port, and retains trace/screenshot/video artifacts on failure. I then added `apps/mobile/tests/e2e/fixtures.ts` and `apps/mobile/tests/e2e/auth-scope.spec.ts` to exercise the seeded Bob sign-in path, the permitted Alpha calendar route, explicit denied states for both invalid and out-of-scope calendar ids, reload continuity, protected-route denial after sign-out, and malformed persisted-session denial using the real Supabase SSR cookie storage path. To make those flows truthful in the shipped UI, I exposed a shared protected-shell sign-out control in `apps/mobile/src/lib/components/MobileShell.svelte`, added stable sign-in surface metadata in `apps/mobile/src/routes/signin/+page.svelte` (`data-signin-flow`, `data-auth-surface-state`, explicit `signed-out` and `invalid-session` surfaces), and updated `apps/mobile/package.json` with dedicated `test:e2e` scripts plus workspace-local Capacitor CLI scripts. After the browser proof was green, I bootstrapped the first native iOS project under `apps/mobile/ios`, ran `cap sync`, and verified the generated Xcode project and AppDelegate were present so the mobile shell is now packaged into a real native target instead of remaining browser-only.

## Verification

Passed the slice-level mobile unit suite (`trusted-core`, `auth-bootstrap`, `shell-scope`), the slice-level web auth/protected-route regression suite, the seeded mobile Playwright auth/scope proof against a freshly reset local Supabase instance, and the final `check + build + cap:add:ios/cap:sync` packaging command. The final native proof created `apps/mobile/ios/App/App.xcodeproj/project.pbxproj`, generated `apps/mobile/ios/App/App/AppDelegate.swift`, and synced the built mobile shell into the iOS target without errors.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/mobile exec vitest run tests/trusted-core.unit.test.ts tests/auth-bootstrap.unit.test.ts tests/shell-scope.unit.test.ts` | 0 | ✅ pass | 845ms |
| 2 | `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/routes/protected-routes.unit.test.ts` | 0 | ✅ pass | 867ms |
| 3 | `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts` | 0 | ✅ pass | 33100ms |
| 4 | `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'` | 0 | ✅ pass | 5700ms |

## Deviations

The malformed persisted-session E2E path targets Supabase SSR auth cookies rather than `localStorage`, because the actual mobile browser client persists sessions in cookies. I also replaced `npx cap ...` package scripts with the workspace-local `cap ...` binary after the pnpm-scoped packaging proof showed `npx` could not resolve the Capacitor executable in this workspace.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/playwright.config.ts`
- `apps/mobile/tests/e2e/fixtures.ts`
- `apps/mobile/tests/e2e/auth-scope.spec.ts`
- `apps/mobile/src/lib/components/MobileShell.svelte`
- `apps/mobile/src/routes/signin/+page.svelte`
- `apps/mobile/package.json`
- `apps/mobile/ios/App/App.xcodeproj/project.pbxproj`
- `apps/mobile/ios/App/App/AppDelegate.swift`
- `.gsd/KNOWLEDGE.md`
