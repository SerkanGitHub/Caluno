---
estimated_steps: 4
estimated_files: 7
skills_used: []
---

# T02: Model groups, join onboarding, and calendar access in Supabase SQL

**Slice:** S01 — Auth, groups, and secure shared-calendar access
**Milestone:** M001

## Description

Define the actual security boundary for the product by moving schema authority into Supabase migrations, then make the shared `packages/db` surface compile-safe without pretending it owns the S01 access model. This task directly advances **R002** and **R012** by establishing the group/calendar membership model and the RLS contract that prevents cross-group leakage.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Local Supabase/Postgres runtime | Stop verification with a clear local-runtime failure and keep SQL artifacts deterministic on disk. | Mark policy proof as blocked and do not claim access enforcement is verified. | Fail the test/setup script and surface which migration or seed step produced invalid state. |
| Shared `packages/db` exports | Reduce the package to compile-safe helpers/types so downstream slices are not blocked by broken exports. | N/A | Remove or simplify malformed abstractions rather than layering more DB code on top of them. |

## Load Profile

- **Shared resources**: Postgres tables, indexes, RLS policy subqueries, and join-code redemption paths.
- **Per-operation cost**: one group/calendar membership lookup per protected access path plus seeded onboarding writes.
- **10x breakpoint**: poorly indexed membership checks or multi-table policy subqueries become the first bottleneck, so the schema must keep access checks narrow and indexable.

## Negative Tests

- **Malformed inputs**: blank/expired join codes, duplicate group membership creation, and guessed calendar IDs from another group.
- **Error paths**: migration failure, seed data drift, and policy denial when a user lacks membership.
- **Boundary conditions**: first calendar auto-created for a new group, a user in multiple groups, and a calendar with zero extra shares beyond group membership.

## Steps

1. Add `supabase/config.toml`, a first migration, and a seed file that model `profiles`, `groups`, `group_memberships`, `calendars`, and join-code/token onboarding with a default-calendar path for new groups.
2. Write RLS policies and any SQL helper functions so calendar visibility is derived from authenticated membership, never from client-submitted IDs alone.
3. Create `apps/web/tests/access/policy-contract.unit.test.ts` (and any supporting helpers) to lock the role/access contract and the denied-access expectations for unauthorized calendar IDs.
4. Repair `packages/db/src/tenant.ts` and related exports so the package compiles cleanly as an explicit-scope helper library without claiming schema ownership in S01.

## Must-Haves

- [ ] Supabase SQL is the single schema/RLS source of truth for S01.
- [ ] The access model supports separate group and calendar identities plus at least owner/member roles.
- [ ] Unauthorized calendar access is denied by the contract, not just hidden in the UI.
- [ ] `packages/db` no longer fails type-checks or misleads later slices about the active access model.

## Verification

- `pnpm exec tsc --pretty false --noEmit packages/db/src/tenant.ts && pnpm -C apps/web vitest run tests/access/policy-contract.unit.test.ts`
- `supabase db reset --local` applies the migration and seed without manual patching.

## Observability Impact

- Signals added/changed: deterministic denied-access outcomes from RLS and join-code redemption failures that can be inspected in seeded test scenarios.
- How a future agent inspects this: `supabase db reset --local`, the seed data, and `pnpm -C apps/web vitest run tests/access/policy-contract.unit.test.ts`.
- Failure state exposed: migration drift, missing seed rows, and unauthorized membership lookups become visible in test output instead of appearing as empty data.

## Inputs

- `packages/db/package.json`
- `packages/db/src/client.ts`
- `packages/db/src/index.ts`
- `packages/db/src/tenant.ts`
- `apps/web/src/hooks.server.ts`
- `.env.example`

## Expected Output

- `supabase/config.toml`
- `supabase/migrations/20260414_000001_auth_groups_access.sql`
- `supabase/seed.sql`
- `packages/db/src/client.ts`
- `packages/db/src/index.ts`
- `packages/db/src/tenant.ts`
- `apps/web/tests/access/policy-contract.unit.test.ts`
