# Codebase Map

Generated: 2026-04-17T22:36:57Z | Files: 292 | Described: 0/292
<!-- gsd:codebase-meta {"generatedAt":"2026-04-17T22:36:57Z","fingerprint":"9f66965d54a59445a76773f74f45f7656d6e612c","fileCount":292,"truncated":false} -->

### (root)/
- `.dockerignore`
- `.env.example`
- `.gitattributes`
- `.gitignore`
- `.npmrc`
- `.nvmrc`
- `.prettierignore`
- `.prettierrc`
- `AGENTS.md`
- `CLAUDE.md`
- `docker-compose.yml`
- `gsd-memory-logger.js`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `README.md`
- `setup-agent-env.sh`
- `turbo.json`

### .artifacts/browser/2026-04-14T21-47-36-677Z-t03-browser-proof/
- `.artifacts/browser/2026-04-14T21-47-36-677Z-t03-browser-proof/accessibility.md`
- `.artifacts/browser/2026-04-14T21-47-36-677Z-t03-browser-proof/console.json`
- `.artifacts/browser/2026-04-14T21-47-36-677Z-t03-browser-proof/dialog.json`
- `.artifacts/browser/2026-04-14T21-47-36-677Z-t03-browser-proof/network.json`
- `.artifacts/browser/2026-04-14T21-47-36-677Z-t03-browser-proof/pages.json`
- `.artifacts/browser/2026-04-14T21-47-36-677Z-t03-browser-proof/summary.json`
- `.artifacts/browser/2026-04-14T21-47-36-677Z-t03-browser-proof/timeline.json`

### apps/mobile/
- `apps/mobile/capacitor.config.ts`
- `apps/mobile/package.json`
- `apps/mobile/svelte.config.js`
- `apps/mobile/tsconfig.json`
- `apps/mobile/vite.config.ts`

### apps/mobile/.svelte-kit/
- `apps/mobile/.svelte-kit/ambient.d.ts`
- `apps/mobile/.svelte-kit/non-ambient.d.ts`
- `apps/mobile/.svelte-kit/tsconfig.json`

### apps/mobile/.svelte-kit/types/
- `apps/mobile/.svelte-kit/types/route_meta_data.json`

### apps/mobile/.svelte-kit/types/src/routes/
- `apps/mobile/.svelte-kit/types/src/routes/$types.d.ts`

### apps/mobile/src/
- `apps/mobile/src/app.css`
- `apps/mobile/src/app.html`

### apps/mobile/src/routes/
- `apps/mobile/src/routes/+layout.svelte`
- `apps/mobile/src/routes/+page.svelte`

### apps/web/
- `apps/web/package.json`
- `apps/web/playwright.config.ts`
- `apps/web/playwright.offline.config.ts`
- `apps/web/svelte.config.js`
- `apps/web/tsconfig.json`
- `apps/web/vite.config.ts`

### apps/web/.svelte-kit/
- `apps/web/.svelte-kit/ambient.d.ts`
- `apps/web/.svelte-kit/non-ambient.d.ts`
- `apps/web/.svelte-kit/tsconfig.json`

### apps/web/.svelte-kit/adapter-node/
- `apps/web/.svelte-kit/adapter-node/index.js`
- `apps/web/.svelte-kit/adapter-node/internal.js`
- `apps/web/.svelte-kit/adapter-node/manifest-full.js`
- `apps/web/.svelte-kit/adapter-node/manifest.js`
- `apps/web/.svelte-kit/adapter-node/remote-entry.js`

### apps/web/.svelte-kit/adapter-node/.vite/
- `apps/web/.svelte-kit/adapter-node/.vite/manifest.json`

### apps/web/.svelte-kit/adapter-node/_app/immutable/assets/
- `apps/web/.svelte-kit/adapter-node/_app/immutable/assets/_layout.B7uVVkJ2.css`

### apps/web/.svelte-kit/adapter-node/chunks/
- `apps/web/.svelte-kit/adapter-node/chunks/app-shell.js`
- `apps/web/.svelte-kit/adapter-node/chunks/attributes.js`
- `apps/web/.svelte-kit/adapter-node/chunks/auth-flow.js`
- `apps/web/.svelte-kit/adapter-node/chunks/contract.js`
- `apps/web/.svelte-kit/adapter-node/chunks/environment.js`
- `apps/web/.svelte-kit/adapter-node/chunks/exports.js`
- `apps/web/.svelte-kit/adapter-node/chunks/false.js`
- `apps/web/.svelte-kit/adapter-node/chunks/index.js`
- `apps/web/.svelte-kit/adapter-node/chunks/internal.js`
- `apps/web/.svelte-kit/adapter-node/chunks/recurrence.js`
- `apps/web/.svelte-kit/adapter-node/chunks/render-context.js`
- `apps/web/.svelte-kit/adapter-node/chunks/renderer.js`
- `apps/web/.svelte-kit/adapter-node/chunks/root.js`
- `apps/web/.svelte-kit/adapter-node/chunks/runtime.js`
- `apps/web/.svelte-kit/adapter-node/chunks/shared-server.js`
- `apps/web/.svelte-kit/adapter-node/chunks/shared.js`
- `apps/web/.svelte-kit/adapter-node/chunks/state.svelte.js`
- `apps/web/.svelte-kit/adapter-node/chunks/utils.js`

### apps/web/.svelte-kit/adapter-node/entries/
- `apps/web/.svelte-kit/adapter-node/entries/hooks.server.js`

### apps/web/.svelte-kit/adapter-node/entries/endpoints/(auth)/callback/
- `apps/web/.svelte-kit/adapter-node/entries/endpoints/(auth)/callback/_server.ts.js`

### apps/web/.svelte-kit/adapter-node/entries/endpoints/(auth)/logout/
- `apps/web/.svelte-kit/adapter-node/entries/endpoints/(auth)/logout/_server.ts.js`

### apps/web/.svelte-kit/adapter-node/entries/fallbacks/
- `apps/web/.svelte-kit/adapter-node/entries/fallbacks/error.svelte.js`
- `apps/web/.svelte-kit/adapter-node/entries/fallbacks/layout.svelte.js`

### apps/web/.svelte-kit/adapter-node/entries/pages/
- `apps/web/.svelte-kit/adapter-node/entries/pages/_layout.server.ts.js`
- `apps/web/.svelte-kit/adapter-node/entries/pages/_layout.svelte.js`
- `apps/web/.svelte-kit/adapter-node/entries/pages/_page.svelte.js`

### apps/web/.svelte-kit/adapter-node/entries/pages/(app)/
- `apps/web/.svelte-kit/adapter-node/entries/pages/(app)/_layout.server.ts.js`
- `apps/web/.svelte-kit/adapter-node/entries/pages/(app)/_layout.ts.js`

### apps/web/.svelte-kit/adapter-node/entries/pages/(app)/calendars/_calendarId_/
- `apps/web/.svelte-kit/adapter-node/entries/pages/(app)/calendars/_calendarId_/_page.server.ts.js`
- `apps/web/.svelte-kit/adapter-node/entries/pages/(app)/calendars/_calendarId_/_page.svelte.js`
- `apps/web/.svelte-kit/adapter-node/entries/pages/(app)/calendars/_calendarId_/_page.ts.js`

### apps/web/.svelte-kit/adapter-node/entries/pages/(app)/groups/
- `apps/web/.svelte-kit/adapter-node/entries/pages/(app)/groups/_page.server.ts.js`
- `apps/web/.svelte-kit/adapter-node/entries/pages/(app)/groups/_page.svelte.js`

### apps/web/.svelte-kit/adapter-node/entries/pages/(auth)/signin/
- `apps/web/.svelte-kit/adapter-node/entries/pages/(auth)/signin/_page.server.ts.js`
- `apps/web/.svelte-kit/adapter-node/entries/pages/(auth)/signin/_page.svelte.js`

### apps/web/.svelte-kit/adapter-node/nodes/
- `apps/web/.svelte-kit/adapter-node/nodes/0.js`
- `apps/web/.svelte-kit/adapter-node/nodes/1.js`
- `apps/web/.svelte-kit/adapter-node/nodes/2.js`
- `apps/web/.svelte-kit/adapter-node/nodes/3.js`
- `apps/web/.svelte-kit/adapter-node/nodes/4.js`
- `apps/web/.svelte-kit/adapter-node/nodes/5.js`
- `apps/web/.svelte-kit/adapter-node/nodes/6.js`

### apps/web/.svelte-kit/generated/
- `apps/web/.svelte-kit/generated/root.js`
- `apps/web/.svelte-kit/generated/root.svelte`

### apps/web/.svelte-kit/generated/client/
- `apps/web/.svelte-kit/generated/client/app.js`
- `apps/web/.svelte-kit/generated/client/matchers.js`

### apps/web/.svelte-kit/generated/client-optimized/
- `apps/web/.svelte-kit/generated/client-optimized/app.js`
- `apps/web/.svelte-kit/generated/client-optimized/matchers.js`

### apps/web/.svelte-kit/generated/client-optimized/nodes/
- `apps/web/.svelte-kit/generated/client-optimized/nodes/0.js`
- `apps/web/.svelte-kit/generated/client-optimized/nodes/1.js`
- `apps/web/.svelte-kit/generated/client-optimized/nodes/2.js`
- `apps/web/.svelte-kit/generated/client-optimized/nodes/3.js`
- `apps/web/.svelte-kit/generated/client-optimized/nodes/4.js`
- `apps/web/.svelte-kit/generated/client-optimized/nodes/5.js`
- `apps/web/.svelte-kit/generated/client-optimized/nodes/6.js`

### apps/web/.svelte-kit/generated/client/nodes/
- `apps/web/.svelte-kit/generated/client/nodes/0.js`
- `apps/web/.svelte-kit/generated/client/nodes/1.js`
- `apps/web/.svelte-kit/generated/client/nodes/2.js`
- `apps/web/.svelte-kit/generated/client/nodes/3.js`
- `apps/web/.svelte-kit/generated/client/nodes/4.js`
- `apps/web/.svelte-kit/generated/client/nodes/5.js`
- `apps/web/.svelte-kit/generated/client/nodes/6.js`

### apps/web/.svelte-kit/generated/server/
- `apps/web/.svelte-kit/generated/server/internal.js`

### apps/web/.svelte-kit/output/client/
- `apps/web/.svelte-kit/output/client/service-worker.js`

### apps/web/.svelte-kit/output/client/.vite/
- `apps/web/.svelte-kit/output/client/.vite/manifest.json`

### apps/web/.svelte-kit/output/client/_app/
- `apps/web/.svelte-kit/output/client/_app/version.json`

### apps/web/.svelte-kit/output/client/_app/immutable/assets/
- `apps/web/.svelte-kit/output/client/_app/immutable/assets/0.B7uVVkJ2.css`
- `apps/web/.svelte-kit/output/client/_app/immutable/assets/sqlite3.DGXXSD5r.wasm`

### apps/web/.svelte-kit/output/client/_app/immutable/chunks/
- `apps/web/.svelte-kit/output/client/_app/immutable/chunks/BFVfXAuL.js`
- `apps/web/.svelte-kit/output/client/_app/immutable/chunks/Bpvak2mh.js`
- `apps/web/.svelte-kit/output/client/_app/immutable/chunks/C_476Q2x.js`
- `apps/web/.svelte-kit/output/client/_app/immutable/chunks/C0IRkBfy.js`
- `apps/web/.svelte-kit/output/client/_app/immutable/chunks/CEVaURT-.js`
- `apps/web/.svelte-kit/output/client/_app/immutable/chunks/CZ5TP99Q.js`
- `apps/web/.svelte-kit/output/client/_app/immutable/chunks/CzBrKa3R.js`
- `apps/web/.svelte-kit/output/client/_app/immutable/chunks/D5EpjGQt.js`
- `apps/web/.svelte-kit/output/client/_app/immutable/chunks/DOMc5UJB.js`
- `apps/web/.svelte-kit/output/client/_app/immutable/chunks/DsnmJJEf.js`
- `apps/web/.svelte-kit/output/client/_app/immutable/chunks/DYBES7nT.js`
- `apps/web/.svelte-kit/output/client/_app/immutable/chunks/DYK4CpHh.js`
- `apps/web/.svelte-kit/output/client/_app/immutable/chunks/vOItGLpa.js`
- `apps/web/.svelte-kit/output/client/_app/immutable/chunks/Z3FZk6iU.js`

### apps/web/.svelte-kit/output/client/_app/immutable/entry/
- `apps/web/.svelte-kit/output/client/_app/immutable/entry/app.CzDoDn9w.js`
- `apps/web/.svelte-kit/output/client/_app/immutable/entry/start.BTFRMBBV.js`

### apps/web/.svelte-kit/output/client/_app/immutable/nodes/
- `apps/web/.svelte-kit/output/client/_app/immutable/nodes/0.DKts0e-T.js`
- `apps/web/.svelte-kit/output/client/_app/immutable/nodes/1.CWi7vlJ0.js`
- `apps/web/.svelte-kit/output/client/_app/immutable/nodes/2.B2WI7eqM.js`
- `apps/web/.svelte-kit/output/client/_app/immutable/nodes/3.D0-6ptpY.js`
- `apps/web/.svelte-kit/output/client/_app/immutable/nodes/4.CPsmWsw8.js`
- `apps/web/.svelte-kit/output/client/_app/immutable/nodes/5.B1OrzvUL.js`
- `apps/web/.svelte-kit/output/client/_app/immutable/nodes/6.Cjd7Twn1.js`

### apps/web/.svelte-kit/output/client/_app/immutable/workers/
- `apps/web/.svelte-kit/output/client/_app/immutable/workers/sqlite.worker-CI6M-LP8.js`
- `apps/web/.svelte-kit/output/client/_app/immutable/workers/sqlite3-opfs-async-proxy-BRz_lFSG.js`
- `apps/web/.svelte-kit/output/client/_app/immutable/workers/sqlite3-worker1-PxFADYt0.js`

### apps/web/.svelte-kit/output/client/_app/immutable/workers/assets/
- `apps/web/.svelte-kit/output/client/_app/immutable/workers/assets/sqlite3-DGXXSD5r.wasm`

### apps/web/.svelte-kit/output/server/
- `apps/web/.svelte-kit/output/server/index.js`
- `apps/web/.svelte-kit/output/server/internal.js`
- `apps/web/.svelte-kit/output/server/manifest-full.js`
- `apps/web/.svelte-kit/output/server/manifest.js`
- `apps/web/.svelte-kit/output/server/remote-entry.js`

### apps/web/.svelte-kit/output/server/.vite/
- `apps/web/.svelte-kit/output/server/.vite/manifest.json`

### apps/web/.svelte-kit/output/server/_app/immutable/assets/
- `apps/web/.svelte-kit/output/server/_app/immutable/assets/_layout.B7uVVkJ2.css`

### apps/web/.svelte-kit/output/server/chunks/
- `apps/web/.svelte-kit/output/server/chunks/app-shell.js`
- `apps/web/.svelte-kit/output/server/chunks/attributes.js`
- `apps/web/.svelte-kit/output/server/chunks/auth-flow.js`
- `apps/web/.svelte-kit/output/server/chunks/contract.js`
- `apps/web/.svelte-kit/output/server/chunks/environment.js`
- `apps/web/.svelte-kit/output/server/chunks/exports.js`
- `apps/web/.svelte-kit/output/server/chunks/false.js`
- `apps/web/.svelte-kit/output/server/chunks/index.js`
- `apps/web/.svelte-kit/output/server/chunks/internal.js`
- `apps/web/.svelte-kit/output/server/chunks/recurrence.js`
- `apps/web/.svelte-kit/output/server/chunks/render-context.js`
- `apps/web/.svelte-kit/output/server/chunks/renderer.js`
- `apps/web/.svelte-kit/output/server/chunks/root.js`
- `apps/web/.svelte-kit/output/server/chunks/runtime.js`
- `apps/web/.svelte-kit/output/server/chunks/shared-server.js`
- `apps/web/.svelte-kit/output/server/chunks/shared.js`
- `apps/web/.svelte-kit/output/server/chunks/state.svelte.js`
- `apps/web/.svelte-kit/output/server/chunks/utils.js`

### apps/web/.svelte-kit/output/server/entries/
- `apps/web/.svelte-kit/output/server/entries/hooks.server.js`

### apps/web/.svelte-kit/output/server/entries/endpoints/(auth)/callback/
- `apps/web/.svelte-kit/output/server/entries/endpoints/(auth)/callback/_server.ts.js`

### apps/web/.svelte-kit/output/server/entries/endpoints/(auth)/logout/
- `apps/web/.svelte-kit/output/server/entries/endpoints/(auth)/logout/_server.ts.js`

### apps/web/.svelte-kit/output/server/entries/fallbacks/
- `apps/web/.svelte-kit/output/server/entries/fallbacks/error.svelte.js`
- `apps/web/.svelte-kit/output/server/entries/fallbacks/layout.svelte.js`

### apps/web/.svelte-kit/output/server/entries/pages/
- `apps/web/.svelte-kit/output/server/entries/pages/_layout.server.ts.js`
- `apps/web/.svelte-kit/output/server/entries/pages/_layout.svelte.js`
- `apps/web/.svelte-kit/output/server/entries/pages/_page.svelte.js`

### apps/web/.svelte-kit/output/server/entries/pages/(app)/
- `apps/web/.svelte-kit/output/server/entries/pages/(app)/_layout.server.ts.js`
- `apps/web/.svelte-kit/output/server/entries/pages/(app)/_layout.ts.js`

### apps/web/.svelte-kit/output/server/entries/pages/(app)/calendars/_calendarId_/
- `apps/web/.svelte-kit/output/server/entries/pages/(app)/calendars/_calendarId_/_page.server.ts.js`
- `apps/web/.svelte-kit/output/server/entries/pages/(app)/calendars/_calendarId_/_page.svelte.js`
- `apps/web/.svelte-kit/output/server/entries/pages/(app)/calendars/_calendarId_/_page.ts.js`

### apps/web/.svelte-kit/output/server/entries/pages/(app)/groups/
- `apps/web/.svelte-kit/output/server/entries/pages/(app)/groups/_page.server.ts.js`
- `apps/web/.svelte-kit/output/server/entries/pages/(app)/groups/_page.svelte.js`

### apps/web/.svelte-kit/output/server/entries/pages/(auth)/signin/
- `apps/web/.svelte-kit/output/server/entries/pages/(auth)/signin/_page.server.ts.js`
- `apps/web/.svelte-kit/output/server/entries/pages/(auth)/signin/_page.svelte.js`

### apps/web/.svelte-kit/output/server/nodes/
- `apps/web/.svelte-kit/output/server/nodes/0.js`
- `apps/web/.svelte-kit/output/server/nodes/1.js`
- `apps/web/.svelte-kit/output/server/nodes/2.js`
- `apps/web/.svelte-kit/output/server/nodes/3.js`
- `apps/web/.svelte-kit/output/server/nodes/4.js`
- `apps/web/.svelte-kit/output/server/nodes/5.js`
- `apps/web/.svelte-kit/output/server/nodes/6.js`

### apps/web/.svelte-kit/types/
- `apps/web/.svelte-kit/types/route_meta_data.json`

### apps/web/.svelte-kit/types/src/routes/
- `apps/web/.svelte-kit/types/src/routes/$types.d.ts`
- `apps/web/.svelte-kit/types/src/routes/proxy+layout.server.ts`

### apps/web/.svelte-kit/types/src/routes/(app)/
- `apps/web/.svelte-kit/types/src/routes/(app)/$types.d.ts`
- `apps/web/.svelte-kit/types/src/routes/(app)/proxy+layout.server.ts`
- `apps/web/.svelte-kit/types/src/routes/(app)/proxy+layout.ts`

### apps/web/.svelte-kit/types/src/routes/(app)/calendars/[calendarId]/
- `apps/web/.svelte-kit/types/src/routes/(app)/calendars/[calendarId]/$types.d.ts`
- `apps/web/.svelte-kit/types/src/routes/(app)/calendars/[calendarId]/proxy+page.server.ts`
- `apps/web/.svelte-kit/types/src/routes/(app)/calendars/[calendarId]/proxy+page.ts`

### apps/web/.svelte-kit/types/src/routes/(app)/groups/
- `apps/web/.svelte-kit/types/src/routes/(app)/groups/$types.d.ts`
- `apps/web/.svelte-kit/types/src/routes/(app)/groups/proxy+page.server.ts`

### apps/web/.svelte-kit/types/src/routes/(auth)/callback/
- `apps/web/.svelte-kit/types/src/routes/(auth)/callback/$types.d.ts`

### apps/web/.svelte-kit/types/src/routes/(auth)/logout/
- `apps/web/.svelte-kit/types/src/routes/(auth)/logout/$types.d.ts`

### apps/web/.svelte-kit/types/src/routes/(auth)/signin/
- `apps/web/.svelte-kit/types/src/routes/(auth)/signin/$types.d.ts`
- `apps/web/.svelte-kit/types/src/routes/(auth)/signin/proxy+page.server.ts`

### apps/web/src/
- `apps/web/src/app.css`
- `apps/web/src/app.d.ts`
- `apps/web/src/app.html`
- `apps/web/src/hooks.server.ts`
- `apps/web/src/service-worker.ts`

### apps/web/src/lib/access/
- `apps/web/src/lib/access/contract.ts`

### apps/web/src/lib/components/calendar/
- `apps/web/src/lib/components/calendar/CalendarWeekBoard.svelte`
- `apps/web/src/lib/components/calendar/ShiftCard.svelte`
- `apps/web/src/lib/components/calendar/ShiftDayColumn.svelte`
- `apps/web/src/lib/components/calendar/ShiftEditorDialog.svelte`

### apps/web/src/lib/offline/
- `apps/web/src/lib/offline/app-shell-cache.ts`
- `apps/web/src/lib/offline/calendar-controller.ts`
- `apps/web/src/lib/offline/mutation-queue.ts`
- `apps/web/src/lib/offline/protected-routes.ts`
- `apps/web/src/lib/offline/repository.ts`
- `apps/web/src/lib/offline/runtime.ts`
- `apps/web/src/lib/offline/sqlite.worker.ts`
- `apps/web/src/lib/offline/sync-engine.ts`

### apps/web/src/lib/schedule/
- `apps/web/src/lib/schedule/board.ts`
- `apps/web/src/lib/schedule/conflicts.ts`
- `apps/web/src/lib/schedule/recurrence.ts`
- `apps/web/src/lib/schedule/route-contract.ts`
- `apps/web/src/lib/schedule/types.ts`

### apps/web/src/lib/server/
- `apps/web/src/lib/server/app-shell.ts`
- `apps/web/src/lib/server/auth-flow.ts`
- `apps/web/src/lib/server/schedule.ts`

### apps/web/src/lib/supabase/
- `apps/web/src/lib/supabase/client.ts`
- `apps/web/src/lib/supabase/config.ts`
- `apps/web/src/lib/supabase/server.ts`

### apps/web/src/routes/
- `apps/web/src/routes/+layout.server.ts`
- `apps/web/src/routes/+layout.svelte`
- `apps/web/src/routes/+page.svelte`

### apps/web/src/routes/(app)/
- `apps/web/src/routes/(app)/+layout.server.ts`
- `apps/web/src/routes/(app)/+layout.ts`

### apps/web/src/routes/(app)/calendars/[calendarId]/
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts`

### apps/web/src/routes/(app)/groups/
- `apps/web/src/routes/(app)/groups/+page.server.ts`
- `apps/web/src/routes/(app)/groups/+page.svelte`

### apps/web/src/routes/(auth)/callback/
- `apps/web/src/routes/(auth)/callback/+server.ts`

### apps/web/src/routes/(auth)/logout/
- `apps/web/src/routes/(auth)/logout/+server.ts`

### apps/web/src/routes/(auth)/signin/
- `apps/web/src/routes/(auth)/signin/+page.server.ts`
- `apps/web/src/routes/(auth)/signin/+page.svelte`

### apps/web/test-results/e2e/
- `apps/web/test-results/e2e/.last-run.json`

### apps/web/test-results/e2e-offline/
- `apps/web/test-results/e2e-offline/.last-run.json`

### apps/web/tests/access/
- `apps/web/tests/access/policy-contract.unit.test.ts`

### apps/web/tests/auth/
- `apps/web/tests/auth/session.unit.test.ts`

### apps/web/tests/e2e/
- `apps/web/tests/e2e/auth-groups-access.spec.ts`
- `apps/web/tests/e2e/calendar-offline.spec.ts`
- `apps/web/tests/e2e/calendar-shifts.spec.ts`
- `apps/web/tests/e2e/calendar-sync.spec.ts`
- `apps/web/tests/e2e/fixtures.ts`

### apps/web/tests/routes/
- `apps/web/tests/routes/protected-routes.unit.test.ts`

### apps/web/tests/schedule/
- `apps/web/tests/schedule/board.unit.test.ts`
- `apps/web/tests/schedule/conflicts.unit.test.ts`
- `apps/web/tests/schedule/offline-queue.unit.test.ts`
- `apps/web/tests/schedule/offline-store.unit.test.ts`
- `apps/web/tests/schedule/recurrence.unit.test.ts`
- `apps/web/tests/schedule/server-actions.unit.test.ts`
- `apps/web/tests/schedule/sync-engine.unit.test.ts`

### packages/db/
- `packages/db/package.json`

### packages/db/src/
- `packages/db/src/client.ts`
- `packages/db/src/index.ts`
- `packages/db/src/tenant.ts`

### packages/db/src/schema/
- `packages/db/src/schema/index.ts`

### packages/eslint-config/
- `packages/eslint-config/base.js`
- `packages/eslint-config/package.json`

### packages/typescript-config/
- `packages/typescript-config/base.json`
- `packages/typescript-config/package.json`

### packages/ui/
- `packages/ui/package.json`

### packages/ui/src/
- `packages/ui/src/globals.css`
- `packages/ui/src/index.ts`

### supabase/
- `supabase/.gitignore`
- `supabase/config.toml`
- `supabase/seed.sql`

### supabase/migrations/
- `supabase/migrations/20260414_000001_auth_groups_access.sql`
- `supabase/migrations/20260415_000002_schedule_shifts.sql`
- `supabase/migrations/20260416_000001_schedule_realtime.sql`
