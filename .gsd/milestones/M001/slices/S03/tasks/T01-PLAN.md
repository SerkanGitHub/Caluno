---
estimated_steps: 5
estimated_files: 6
skills_used:
  - debug-like-expert
---

# T01: Wire the offline runtime substrate and preview proof surface

**Slice:** S03 — Offline local persistence with cached-session continuity
**Milestone:** M001

## Description

Establish the runtime prerequisites for real offline continuity before any route fallback or local mutation work lands. This task advances **R004** by adding the browser-local SQLite/WASM dependency, cross-origin-isolation headers, a SvelteKit service worker, and a preview-backed Playwright surface that can prove offline reopen after cache warm-up.

This task must preserve the S01/S02 trust boundary. Service-worker caching may accelerate reopen and asset availability, but it must not become implicit authorization and it does not replace the explicit local repository path needed for offline writes.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| `@sqlite.org/sqlite-wasm` runtime/worker bootstrap | Stop the task, fix dependency wiring or worker loading, and do not let later tasks plan against a fake in-memory fallback disguised as persistent storage. | Treat startup as incomplete and rerun only after confirming the worker can initialize deterministically. | Reject the bootstrap result and surface capability detection as unsupported rather than guessing at persistence behavior. |
| SvelteKit service worker build output | Keep offline reopen disabled until the service worker compiles and caches the intended shell/assets cleanly. | Treat the cache warm-up as incomplete and do not claim offline reopen proof. | Refuse to cache ambiguous route/data payloads; cache only explicit app-shell assets and known protected entrypoints. |
| Preview-backed Playwright server | Keep offline/browser-cache proof blocked until preview starts successfully. | Fail the proof setup and retry only after confirming the preview server is healthy. | Reject unexpected headers/runtime behavior and fix config instead of weakening the proof surface. |

## Load Profile

- **Shared resources**: service-worker cache storage, browser worker initialization, and preview server responses with COOP/COEP headers.
- **Per-operation cost**: one worker bootstrap, one service-worker install/activate cycle, and a small protected-shell asset cache.
- **10x breakpoint**: cache growth and worker boot failures show up first if asset selection is too broad or headers are inconsistent across dev/preview/server responses.

## Negative Tests

- **Malformed inputs**: missing or wrong isolation headers, service-worker requests for uncached assets, and preview startup with incomplete public env.
- **Error paths**: worker init failure, service-worker build failure, and preview server launch failure.
- **Boundary conditions**: first load before cache warm-up, subsequent reopen after assets are cached, and browsers that cannot use the preferred persistence mode.

## Steps

1. Add the browser-local SQLite/WASM dependency in `apps/web/package.json` and update `pnpm-lock.yaml`.
2. Configure `apps/web/vite.config.ts` and `apps/web/src/hooks.server.ts` so dev, preview, and app responses include the headers required for the worker-backed persistence path.
3. Create `apps/web/src/service-worker.ts` to cache the app shell and previously visited protected assets needed for offline reopen, without treating cached responses as new authority.
4. Add `apps/web/playwright.offline.config.ts` so offline/browser-cache proof runs against `vite build` + preview instead of the default dev server.
5. Keep the proof surface honest: no silent fallback to a dev-only route that cannot exercise service-worker or offline-reopen behavior.

## Must-Haves

- [ ] `apps/web/package.json` includes the browser-local SQLite/WASM dependency required by S03.
- [ ] Dev, preview, and app responses expose the isolation headers needed for worker-backed persistence.
- [ ] `apps/web/src/service-worker.ts` caches the shell/assets needed for offline reopen without widening authorization.
- [ ] `apps/web/playwright.offline.config.ts` exists as the dedicated offline/browser-cache proof surface.

## Verification

- `pnpm --dir apps/web check && pnpm --dir apps/web build`
- Confirm the build emits the service worker and the preview-backed Playwright config is ready for later offline proof.

## Observability Impact

- Signals added/changed: service-worker install/activate status and preview/offline test entrypoints become explicit runtime surfaces.
- How a future agent inspects this: run `pnpm --dir apps/web build`, inspect preview headers, and use `playwright.offline.config.ts` instead of the default dev-server config when debugging offline reopen.
- Failure state exposed: missing isolation headers, worker bootstrap failure, or incomplete cache warm-up block the slice before route-level work begins.

## Inputs

- `apps/web/package.json` — current web dependencies and scripts.
- `apps/web/vite.config.ts` — existing Vite setup with no isolation headers yet.
- `apps/web/playwright.config.ts` — current online-only Playwright proof surface.
- `apps/web/src/hooks.server.ts` — current server response handling.

## Expected Output

- `apps/web/package.json` — includes the browser-local SQLite/WASM dependency.
- `pnpm-lock.yaml` — lockfile updated for the new dependency.
- `apps/web/vite.config.ts` — dev/preview headers configured for the worker-backed persistence path.
- `apps/web/src/hooks.server.ts` — app responses preserve the required isolation headers.
- `apps/web/src/service-worker.ts` — caches the shell/assets used for offline reopen.
- `apps/web/playwright.offline.config.ts` — preview-backed offline/browser-cache proof config.
