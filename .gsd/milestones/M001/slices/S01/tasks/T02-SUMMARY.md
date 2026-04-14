---
id: T02
parent: S01
milestone: M001
key_files:
  - supabase/migrations/20260414_000001_auth_groups_access.sql
  - supabase/seed.sql
  - apps/web/tests/access/policy-contract.unit.test.ts
  - packages/db/src/tenant.ts
  - packages/db/src/client.ts
  - packages/db/src/index.ts
  - .gsd/KNOWLEDGE.md
key_decisions:
  - Keep Supabase migrations/RPCs as the authoritative schema and RLS source for S01 instead of splitting ownership with `packages/db`.
  - Expose deterministic join-code failure reasons (`JOIN_CODE_REQUIRED`, `JOIN_CODE_INVALID`, `JOIN_CODE_EXPIRED`, `JOIN_CODE_REVOKED`) so later server/UI work can surface typed onboarding errors without leaking secrets.
duration: 
verification_result: passed
completed_at: 2026-04-14T21:23:42.165Z
blocker_discovered: false
---

# T02: Added the Supabase auth/group/calendar migration and seed fixtures, hardened join-code failure handling, and reduced @repo/db to a compile-safe helper surface.

**Added the Supabase auth/group/calendar migration and seed fixtures, hardened join-code failure handling, and reduced @repo/db to a compile-safe helper surface.**

## What Happened

Implemented the real S01 access boundary in Supabase SQL instead of leaving it implied in app code. The first migration now defines `profiles`, `groups`, `group_memberships`, `calendars`, and `group_join_codes`, plus helper functions for join-code normalization, membership-based calendar authorization, group creation with an auto-created default calendar, and join-code redemption. I tightened join onboarding failure visibility by making `redeem_group_join_code` raise distinct high-level errors for blank, invalid, expired, and revoked codes, and by only incrementing `consumed_count` when a new membership is actually inserted. I added `supabase/seed.sql` with five deterministic local users, two groups, multi-group membership coverage, three calendars, and active/expired/revoked join-code fixtures so later browser and RPC work has stable data to inspect. On the app side, `apps/web/tests/access/policy-contract.unit.test.ts` now locks both the in-memory access contract and the SQL source-of-truth markers in the migration/seed files, including unauthorized guessed-calendar denial and multi-group boundaries. In `packages/db`, I replaced the misleading tenant-only helper with a generic scoped helper, removed the root schema re-export, and kept the package honest as a compile-safe helper surface while Supabase SQL owns schema/RLS for S01.

## Verification

The task-level verification bar passed: `pnpm exec tsc --pretty false --noEmit packages/db/src/tenant.ts` succeeded after fixing the generic helper typing, `pnpm --dir apps/web exec vitest run tests/access/policy-contract.unit.test.ts` passed all 16 access/RLS contract tests, and `npx --yes supabase db reset --local` applied the migration plus the new seed file without manual intervention. I also ran two slice-level checks at this intermediate stage: `pnpm --dir apps/web check` passed with zero Svelte diagnostics, and `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/access/policy-contract.unit.test.ts` passed all 22 auth/access unit tests. A direct Postgres container query confirmed the seeded observability fixtures: Alpha Team has 3 memberships, Beta Team has 2, and the seeded join-code set includes active (`ALPHA123`, `BETA2024`), expired (`EXPIRE01`), and revoked (`REVOKED1`) scenarios. The slice-level Playwright proof was not claimed here because `apps/web/tests/e2e/auth-groups-access.spec.ts` does not exist yet in the current slice state.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm exec tsc --pretty false --noEmit packages/db/src/tenant.ts` | 0 | ✅ pass | 777ms |
| 2 | `pnpm --dir apps/web exec vitest run tests/access/policy-contract.unit.test.ts` | 0 | ✅ pass | 1314ms |
| 3 | `npx --yes supabase db reset --local` | 0 | ✅ pass | 26467ms |
| 4 | `pnpm --dir apps/web check` | 0 | ✅ pass | 2033ms |
| 5 | `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/access/policy-contract.unit.test.ts` | 0 | ✅ pass | 1330ms |
| 6 | `docker exec supabase_db_caluno psql -U postgres -d postgres -c "select g.name as group_name, count(*) as membership_count from public.group_memberships gm join public.groups g on g.id = gm.group_id group by g.name order by g.name;" && docker exec supabase_db_caluno psql -U postgres -d postgres -c "select code, expires_at is not null as has_expiry, revoked_at is not null as is_revoked from public.group_join_codes order by code;"` | 0 | ✅ pass | 0ms |

## Deviations

Used `pnpm --dir apps/web exec ...` instead of the plan’s bare `pnpm -C apps/web vitest run ...` form because the latter is not a valid invocation in this workspace, and used `npx --yes supabase db reset --local` because the Supabase CLI is available through `npx` rather than on PATH directly.

## Known Issues

Slice-level browser/E2E proof remains outstanding until a later task adds Playwright coverage at `apps/web/tests/e2e/auth-groups-access.spec.ts` and the corresponding UI flows.

## Files Created/Modified

- `supabase/migrations/20260414_000001_auth_groups_access.sql`
- `supabase/seed.sql`
- `apps/web/tests/access/policy-contract.unit.test.ts`
- `packages/db/src/tenant.ts`
- `packages/db/src/client.ts`
- `packages/db/src/index.ts`
- `.gsd/KNOWLEDGE.md`
