---
id: T01
parent: S03
milestone: M001
key_files:
  - apps/web/package.json
  - pnpm-lock.yaml
  - apps/web/src/lib/offline/runtime.ts
  - apps/web/vite.config.ts
  - apps/web/src/hooks.server.ts
  - apps/web/src/routes/+layout.svelte
  - apps/web/src/service-worker.ts
  - apps/web/playwright.offline.config.ts
  - apps/web/tests/e2e/calendar-offline.spec.ts
key_decisions:
  - D017: offline continuity proof must run against a dedicated build+preview surface with explicit runtime status instead of a reused dev server.
duration: 
verification_result: passed
completed_at: 2026-04-15T08:02:07.037Z
blocker_discovered: false
---

# T01: Added the offline preview runtime with isolation headers, a scoped service worker, and a first preview-backed proof test.

**Added the offline preview runtime with isolation headers, a scoped service worker, and a first preview-backed proof test.**

## What Happened

I wired the first real offline substrate for the web app instead of leaving S03 to build on an assumed runtime. `apps/web/package.json` now includes `@sqlite.org/sqlite-wasm` so later tasks can bootstrap browser-local persistence against the intended worker-backed dependency. I added a shared offline runtime module and used it in `apps/web/vite.config.ts` and `apps/web/src/hooks.server.ts` so dev, preview, and SSR responses all emit the COOP/COEP header pair required for a cross-origin-isolated worker path. In `apps/web/src/service-worker.ts` I added a deliberately narrow caching strategy: build/static assets are cached as shell assets, while only explicit public/protected navigations (`/`, `/signin`, `/groups`, `/calendars/:id`) are cached after a successful same-origin HTML response, keeping cached reopen scoped to previously visited routes instead of inventing new authority. I updated `apps/web/src/routes/+layout.svelte` to register the service worker and expose an inspectable runtime surface for cross-origin isolation and service-worker lifecycle state, which gives later tasks and tests a stable way to tell whether offline prerequisites are actually active. I also created `apps/web/playwright.offline.config.ts` so offline proof runs against `vite build` plus `vite preview` on its own port with `reuseExistingServer: false`, and added `apps/web/tests/e2e/calendar-offline.spec.ts` to verify that preview-backed surface exposes the required headers and reaches a live service-worker state before route-level offline work lands.

## Verification

I ran `pnpm --dir apps/web check && pnpm --dir apps/web build`, which passed and emitted `.svelte-kit/output/client/service-worker.mjs`, confirming SvelteKit built the new worker. I then exercised the dedicated offline proof surface with `pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts`, which passed against the preview-backed server. I also verified the preview headers directly with `curl -fsSI http://127.0.0.1:4175/signin` under a managed preview process, confirming `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. In a real browser session against preview, the root runtime surface reported `data-cross-origin-isolated="isolated"`, `data-service-worker-status="ready"`, `data-service-worker-detail="activated"`, and `data-offline-proof-surface="service-worker-preview"` with no console or network failures.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm --dir apps/web check && pnpm --dir apps/web build` | 0 | ✅ pass | 4890ms |
| 2 | `curl -fsSI http://127.0.0.1:4175/signin && grep preview headers for COOP/COEP` | 0 | ✅ pass | 40ms |
| 3 | `pnpm --dir apps/web exec playwright test -c playwright.offline.config.ts tests/e2e/calendar-offline.spec.ts` | 0 | ✅ pass | 5410ms |

## Deviations

Added `apps/web/src/lib/offline/runtime.ts` as a shared constant/type module and added `apps/web/tests/e2e/calendar-offline.spec.ts` during T01 so the new runtime contract is inspectable and verified immediately instead of waiting for later slice tasks.

## Known Issues

None.

## Files Created/Modified

- `apps/web/package.json`
- `pnpm-lock.yaml`
- `apps/web/src/lib/offline/runtime.ts`
- `apps/web/vite.config.ts`
- `apps/web/src/hooks.server.ts`
- `apps/web/src/routes/+layout.svelte`
- `apps/web/src/service-worker.ts`
- `apps/web/playwright.offline.config.ts`
- `apps/web/tests/e2e/calendar-offline.spec.ts`
