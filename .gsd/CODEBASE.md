# Codebase Map

Generated: 2026-04-14T22:36:10Z | Files: 120 | Described: 0/120
<!-- gsd:codebase-meta {"generatedAt":"2026-04-14T22:36:10Z","fingerprint":"b9b32b78be0c41431ecd878f3088f2546ce79cf3","fileCount":120,"truncated":false} -->

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
- `apps/web/svelte.config.js`
- `apps/web/tsconfig.json`
- `apps/web/vite.config.ts`

### apps/web/.svelte-kit/
- `apps/web/.svelte-kit/ambient.d.ts`
- `apps/web/.svelte-kit/non-ambient.d.ts`
- `apps/web/.svelte-kit/tsconfig.json`

### apps/web/.svelte-kit/generated/
- `apps/web/.svelte-kit/generated/root.js`
- `apps/web/.svelte-kit/generated/root.svelte`

### apps/web/.svelte-kit/generated/client/
- `apps/web/.svelte-kit/generated/client/app.js`
- `apps/web/.svelte-kit/generated/client/matchers.js`

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

### apps/web/.svelte-kit/types/
- `apps/web/.svelte-kit/types/route_meta_data.json`

### apps/web/.svelte-kit/types/src/routes/
- `apps/web/.svelte-kit/types/src/routes/$types.d.ts`
- `apps/web/.svelte-kit/types/src/routes/proxy+layout.server.ts`

### apps/web/.svelte-kit/types/src/routes/(app)/
- `apps/web/.svelte-kit/types/src/routes/(app)/$types.d.ts`
- `apps/web/.svelte-kit/types/src/routes/(app)/proxy+layout.server.ts`

### apps/web/.svelte-kit/types/src/routes/(app)/calendars/[calendarId]/
- `apps/web/.svelte-kit/types/src/routes/(app)/calendars/[calendarId]/$types.d.ts`
- `apps/web/.svelte-kit/types/src/routes/(app)/calendars/[calendarId]/proxy+page.server.ts`

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

### apps/web/src/lib/access/
- `apps/web/src/lib/access/contract.ts`

### apps/web/src/lib/schedule/
- `apps/web/src/lib/schedule/recurrence.ts`
- `apps/web/src/lib/schedule/types.ts`

### apps/web/src/lib/server/
- `apps/web/src/lib/server/app-shell.ts`
- `apps/web/src/lib/server/auth-flow.ts`

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

### apps/web/src/routes/(app)/calendars/[calendarId]/
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`

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

### apps/web/tests/access/
- `apps/web/tests/access/policy-contract.unit.test.ts`

### apps/web/tests/auth/
- `apps/web/tests/auth/session.unit.test.ts`

### apps/web/tests/e2e/
- `apps/web/tests/e2e/auth-groups-access.spec.ts`
- `apps/web/tests/e2e/fixtures.ts`

### apps/web/tests/routes/
- `apps/web/tests/routes/protected-routes.unit.test.ts`

### apps/web/tests/schedule/
- `apps/web/tests/schedule/recurrence.unit.test.ts`

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
