---
id: S01
parent: M003
milestone: M003
provides:
  - A shared `@repo/caluno-core` trust contract reusable by both web and mobile.
  - A fail-closed mobile auth/bootstrap substrate with explicit signed-out, invalid-session, config-error, and loading states.
  - A phone-first groups/calendar shell that exposes only permitted inventory and truthful denied states.
  - A mobile Playwright auth/scope harness and first synced Capacitor iOS target for downstream runtime proof.
requires:
  []
affects:
  - S02
  - S03
  - S04
  - S05
key_files:
  - packages/caluno-core/src/access.ts
  - packages/caluno-core/src/app-shell.ts
  - packages/caluno-core/src/route-contract.ts
  - packages/caluno-core/src/supabase.ts
  - apps/mobile/src/lib/auth/mobile-session.ts
  - apps/mobile/src/lib/shell/load-app-shell.ts
  - apps/mobile/src/lib/components/MobileShell.svelte
  - apps/mobile/src/routes/groups/+page.svelte
  - apps/mobile/src/routes/calendars/[calendarId]/+page.svelte
  - apps/mobile/src/routes/signin/+page.svelte
  - apps/mobile/tests/trusted-core.unit.test.ts
  - apps/mobile/tests/auth-bootstrap.unit.test.ts
  - apps/mobile/tests/shell-scope.unit.test.ts
  - apps/mobile/tests/e2e/auth-scope.spec.ts
  - apps/mobile/playwright.config.ts
  - apps/mobile/ios/App/App.xcodeproj/project.pbxproj
  - apps/mobile/ios/App/App/AppDelegate.swift
  - .gsd/PROJECT.md
key_decisions:
  - D050 — keep shared trusted-scope helpers in pure `@repo/caluno-core` and leave Svelte/runtime integration in app-local wrappers.
  - D051 — use a singleton client-side mobile session store as the authority for one-time cached-session validation and explicit auth entry states.
  - D052 — cache one authenticated mobile app-shell snapshot per user so adjacent protected routes reuse the same trusted inventory.
  - D053 — expose sign-out inside the protected mobile shell and surface invalid-session through explicit sign-in metadata.
patterns_established:
  - Shared cross-surface trust helpers belong in a pure workspace package, not under `apps/web/src`.
  - Mobile protected routes should resolve access only from a previously shaped trusted inventory snapshot, not ad hoc calendar probes.
  - Mobile auth/bootstrap and shell health should stay observable through explicit `data-testid` and `data-*` surfaces.
  - Seeded Playwright proof plus Capacitor sync should be treated as part of slice completion for new mobile runtime surfaces.
observability_surfaces:
  - `apps/mobile/src/routes/signin/+page.svelte` auth metadata surfaces (`mobile-auth-state`, `mobile-auth-config-error`, `data-signin-flow`).
  - `apps/mobile/src/lib/components/MobileShell.svelte` shell status and sign-out surfaces (`mobile-shell-status`, `mobile-shell-signout`, `data-shell-bootstrap`).
  - `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` denied-route diagnostics (`calendar-route-state`, denied reason, failure phase, attempted id).
  - `apps/mobile/tests/e2e/auth-scope.spec.ts` assertions covering permitted access, denied states, reload continuity, sign-out closure, and invalid-session rejection.
  - `pnpm --dir apps/mobile cap:sync` output and generated `apps/mobile/ios` project files as native packaging evidence.
drill_down_paths:
  - .gsd/milestones/M003/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M003/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M003/slices/S01/tasks/T03-SUMMARY.md
  - .gsd/milestones/M003/slices/S01/tasks/T04-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-21T08:56:46.150Z
blocker_discovered: false
---

# S01: Mobile shell, auth, and trusted calendar scope

**Converted `apps/mobile` from a starter shell into a real first-class Caluno entry surface with shared trusted-scope helpers, client-validated Supabase auth bootstrap, mobile-native groups/calendar routes, truthful denied states, end-to-end auth/scope proof, and the first successful Capacitor iOS sync.**

## What Happened

S01 established the real mobile foundation for M003 without forking the trust model that already works on web. The slice first extracted the pure auth/scope/app-shell/public-env helpers into `@repo/caluno-core`, leaving Svelte-only runtime integration in thin app-local wrappers so both `apps/web` and `apps/mobile` consume one source of truth for denial semantics and scope shaping. On top of that shared contract, the mobile app now bootstraps auth through a singleton client-side session store that treats cached Supabase data as untrusted until `getSession()` and `getUser()` both succeed, and it exposes explicit signed-out, bootstrapping, invalid-session, and config-error surfaces instead of opening protected routes optimistically.

With trusted auth in place, the slice shipped a phone-first shell for `/groups` and `/calendars/[calendarId]`. The mobile shell loads only permitted memberships, groups, calendars, and join-code metadata through authenticated Supabase reads backed by existing RLS, caches the shaped snapshot per user, and resolves primary-calendar access only from that inventory. The calendar route rejects malformed ids as `calendar-id-invalid`, collapses real-but-out-of-scope ids to `calendar-missing`, and never probes arbitrary calendar existence. Runtime observability is built into the UI: auth phase, sign-in surface state, shell bootstrap mode, denied reason, failure phase, and attempted calendar id are all visible through stable `data-testid`/`data-*` surfaces instead of blank screens or ambiguous failures.

The slice closed with real proof, not just component confidence. Mobile unit coverage now proves the shared contract, auth bootstrap behavior, and trusted shell/route shaping; web auth/protected-route regressions still pass against the shared package; a seeded Playwright harness proves Bob-style sign-in, permitted calendar access, out-of-scope denial, malformed-id denial, reload continuity, sign-out closure, and malformed persisted-session rejection; and `apps/mobile` now has a synced iOS Capacitor target so the shell is packaged into a native project rather than remaining a browser-only facade. Downstream slices inherit a trustworthy mobile substrate instead of having to rebuild auth, scope resolution, or proof infrastructure.

## Verification

All slice-plan verification checks passed.

1. `pnpm --dir apps/mobile exec vitest run tests/trusted-core.unit.test.ts tests/auth-bootstrap.unit.test.ts tests/shell-scope.unit.test.ts` — pass (18 tests / 3 files). This re-proved shared trusted-scope helpers, client-validated auth bootstrap, and mobile shell/calendar denied-state logic.
2. `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/routes/protected-routes.unit.test.ts` — pass (27 tests / 2 files). This confirmed the shared extraction did not fork existing web auth or protected-route denial behavior.
3. `npx --yes supabase db reset --local --yes && pnpm --dir apps/mobile exec playwright test tests/e2e/auth-scope.spec.ts` — pass (3 Playwright specs). This proved seeded sign-in, permitted Alpha calendar access, `calendar-missing` denial for Beta, `calendar-id-invalid` denial for malformed ids, reload continuity, sign-out closure, and invalid-session fail-closed behavior.
4. `pnpm --dir apps/mobile check && pnpm --dir apps/mobile build && sh -c 'test -d apps/mobile/ios || pnpm --dir apps/mobile cap:add:ios; pnpm --dir apps/mobile cap:sync'` — pass. `svelte-check` reported 0 errors/0 warnings, production build succeeded, and Capacitor synced web assets into `apps/mobile/ios` successfully.

Observability/diagnostic surfaces confirmed during verification:
- `mobile-auth-state`, `mobile-auth-config-error`, and `data-signin-flow` expose signed-out, invalid-session, and config-error entry states.
- `mobile-shell-status`, `data-shell-bootstrap`, `data-onboarding-state`, and `mobile-shell-signout` expose shell health and account-control state inside protected routes.
- `calendar-route-state` exposes denied reason, failure phase, and attempted calendar id for malformed and out-of-scope route proof.
- Playwright retained explicit assertions against those surfaces, so failures stay attributable to named phases instead of generic missing-content states.

## Requirements Advanced

- R002 — Extended the proven permitted-scope and fail-closed denied-route contract onto mobile by reusing shared helpers and proving out-of-scope/malformed calendar behavior in unit and Playwright coverage.
- R009 — Turned `apps/mobile` into a real Caluno auth/scope shell with mobile-specific UI flows, shared domain contracts, real E2E proof, and native Capacitor packaging instead of a thin starter wrapper.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

Used the real Supabase SSR cookie persistence path, not `localStorage`, for malformed-session proof because the mobile client persists auth in cookies. Packaging proof also uses the workspace-local Capacitor binary path that actually resolves inside this monorepo.

## Known Limitations

This slice stops at mobile shell/auth/scope. It does not yet provide offline calendar reopening, pending edit queues, shift editing, Find time, or notification delivery. Live authenticated proof assumes local Supabase env and seeded users are available.

## Follow-ups

S02 should build on the new shell/auth substrate to add mobile calendar continuity and offline editing. S03 should reuse the trusted shell and shared contract package for mobile Find time handoff. S04/S05 should build notification controls and final assembled proof on top of the existing sign-in/scope observability surfaces and Playwright harness.

## Files Created/Modified

- `packages/caluno-core/src/access.ts` — Shared access and denial-contract logic moved into the new cross-surface workspace package.
- `packages/caluno-core/src/app-shell.ts` — Shared app-shell shaping and denied-reason helpers extracted for both web and mobile consumption.
- `packages/caluno-core/src/route-contract.ts` — Shared route contract helpers centralized for mobile/web parity.
- `packages/caluno-core/src/supabase.ts` — Shared public Supabase env validation helpers added to the pure workspace package.
- `apps/mobile/src/lib/auth/mobile-session.ts` — Singleton client-side auth bootstrap and sign-in/sign-out authority for mobile protected routes.
- `apps/mobile/src/lib/shell/load-app-shell.ts` — Trusted mobile inventory loader and per-user shell snapshot cache added.
- `apps/mobile/src/lib/components/MobileShell.svelte` — Protected mobile shell UI with visible shell state and sign-out action.
- `apps/mobile/src/routes/groups/+page.svelte` — Phone-first groups route wired to trusted shell inventory and primary-calendar landing.
- `apps/mobile/src/routes/calendars/[calendarId]/+page.svelte` — Protected calendar route wired to truthful permitted/denied mobile states and diagnostics.
- `apps/mobile/src/routes/signin/+page.svelte` — Explicit mobile sign-in surface with reason-coded auth entry diagnostics.
- `apps/mobile/tests/trusted-core.unit.test.ts` — Mobile-local regression proof for shared trusted-scope helpers.
- `apps/mobile/tests/auth-bootstrap.unit.test.ts` — Unit coverage for mobile auth bootstrap, sign-in, and invalid-session handling.
- `apps/mobile/tests/shell-scope.unit.test.ts` — Unit coverage for mobile shell shaping, primary-calendar routing, and denied-state behavior.
- `apps/mobile/tests/e2e/auth-scope.spec.ts` — Seeded end-to-end proof for mobile sign-in, permitted scope, denied scope, reload, sign-out, and invalid sessions.
- `apps/mobile/playwright.config.ts` — Dedicated mobile Playwright harness configured around local Supabase and mobile Vite runtime.
- `apps/mobile/ios/App/App.xcodeproj/project.pbxproj` — First generated iOS Capacitor project added as native packaging baseline.
- `apps/mobile/ios/App/App/AppDelegate.swift` — Initial Capacitor iOS app delegate generated during native bootstrap.
- `.gsd/PROJECT.md` — Project state refreshed to reflect S01 completion and the new mobile substrate.
