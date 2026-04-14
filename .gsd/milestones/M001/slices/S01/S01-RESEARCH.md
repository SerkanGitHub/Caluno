# S01 — Research

**Date:** 2026-04-14

## Summary

This slice owns the front door and data boundary requirements: **R001**, **R002**, and **R012**. The repo is currently a very thin starter, not a partially-built auth app. `apps/web/src/routes/+page.svelte` is still the starter landing page, there is no `src/lib/`, no `hooks.server.ts`, no protected route tree, no Supabase client code, no database schema, no migrations, no tests, and no browser verification harness. The only relevant backend seam is `packages/db`, but it is not production-ready yet: `packages/db/src/client.ts` is a stub, `packages/db/src/schema/index.ts` is empty, and `packages/db/src/tenant.ts` currently contains a duplicate `tenantDb` implementation plus undeclared Drizzle dependencies, so it does not type-check.

The right approach is to make S01 establish the **auth/session/access contract** for every downstream slice rather than trying to jump straight into schedule data. Build a real Supabase-backed SvelteKit auth boundary first: request-scoped server client in `hooks.server.ts`, trusted user resolution in server load/actions, group + membership + calendar schema with RLS, and a protected browser route that resolves only the current user’s permitted calendars. Keep the SvelteKit server thin and use it only where composition or privilege is needed (group creation, join-code redemption, access guard composition). Reads of permitted calendars should rely on RLS, not ad-hoc app-side filtering.

One important modeling constraint: the existing `packages/db/src/tenant.ts` shows the repo likes explicit data boundaries, but its `tenant_id` helper is **not** the final access model for this slice. Caluno needs many-to-many group/calendar membership, so planner/executor work should treat that file as a style hint (explicit scoping) rather than the actual security architecture. Also, the loaded `frontend-design` skill is relevant only at the surface layer: auth, join, and access-denied screens should be deliberate and stress-friendly rather than starter-generic, but UI polish should not come before the auth/RLS seams exist.

## Recommendation

Implement S01 in four layers, in order:

1. **Platform/auth bootstrap** — add Supabase dependencies, env contract, request-scoped server client, browser client, `App.Locals`, and root layout data flow.
2. **Access model** — add minimal schema for profiles, groups, memberships, calendars, and calendar access; write RLS policies that derive access from authenticated membership rather than trusting client-submitted IDs.
3. **Browser flows** — add sign-in/sign-out, create-group, join-group, permitted-calendar list, and access-denied behavior.
4. **Verification seam** — add at least one automated browser proof plus one DB/policy/unit check so downstream slices inherit a trustworthy auth/access foundation.

For M001 scope, keep collaboration onboarding intentionally narrow: prefer a simple join code or invite token flow over a full admin/invite-management subsystem. Also keep **groups** and **calendars** as separate tables even if the first UI creates one default calendar per group. Downstream slices need stable calendar identifiers independent of the group entity.

## Implementation Landscape

### Key Files

- `apps/web/src/routes/+page.svelte` — current web starter page; replace with either a session-aware landing route or redirect into the authenticated app shell.
- `apps/web/src/routes/+layout.svelte` — current top-level wrapper; likely becomes the root client layout that consumes session/user/calendar-scope data from new server/client load files.
- `apps/web/src/hooks.server.ts` **(new)** — highest-leverage SvelteKit auth seam; create the request-scoped Supabase server client here, populate `event.locals`, and centralize trusted auth/session handling.
- `apps/web/src/app.d.ts` **(new)** — declare `App.Locals` / `App.PageData` types for `supabase`, `session`, `user`, and permitted-calendar scope.
- `apps/web/src/lib/supabase/server.ts` **(new)** — server-only Supabase client factory for hooks, server loads, and form actions.
- `apps/web/src/lib/supabase/client.ts` **(new)** — browser client factory for auth state changes and authenticated browser reads.
- `apps/web/src/routes/+layout.server.ts` **(new)** — root server load to expose trusted user/session and maybe lightweight membership summary to the app.
- `apps/web/src/routes/+layout.ts` **(new)** — optional client layout to keep browser auth state synchronized after sign-in/sign-out.
- `apps/web/src/routes/(auth)/**` **(new)** — login/signup/callback/logout surfaces. Keep these isolated from the authenticated app shell.
- `apps/web/src/routes/(app)/**` **(new)** — protected app area for groups, join flow, and permitted calendar selection.
- `packages/db/src/client.ts` — currently `unknown`; either wire this to the actual DB client or keep DB access local to Supabase until the package has a real owner. Do not build more logic on the stub as-is.
- `packages/db/src/schema/index.ts` — currently empty; good place for shared table/type definitions if the team wants DB shapes in-repo.
- `packages/db/src/tenant.ts` — currently broken and conceptually narrower than the slice needs. Either repair it as a generic explicit-scope helper or leave it out of S01 execution; do not force group membership into a fake single-tenant abstraction.
- `apps/web/package.json` — needs Supabase/auth/testing dependencies and probably new scripts for unit/browser verification.
- `.env.example` — currently empty; should document required public/server Supabase env keys without adding secrets.
- `supabase/migrations/*` **(new, if Supabase CLI is adopted)** — best location for schema and RLS SQL. There is no Supabase directory yet.
- `playwright.config.*` / `apps/web/tests/**` **(new)** — there is no browser harness yet; add one if S01 needs durable browser proof instead of manual-only validation.

### Build Order

1. **Fix the foundation first**
   - Add missing dependencies and env contract.
   - Decide whether `packages/db` is active in this slice or whether Supabase SQL/schema lives directly beside the web app for now.
   - Repair or explicitly avoid `packages/db/src/tenant.ts`; it currently fails `tsc --noEmit` because of duplicate exports and missing Drizzle packages.

2. **Stand up SvelteKit auth plumbing**
   - Add `hooks.server.ts`, typed locals, root loads, and auth callback/logout routes.
   - Prove trusted user resolution works end-to-end before adding group logic.
   - This is the main unblocker for every downstream slice because S02-S05 all consume authenticated identity and permitted calendar scope.

3. **Add schema + RLS before building the UI flow**
   - Model `groups`, `group_memberships`, `calendars`, and either `calendar_memberships` or a policy path that derives calendar access from group membership.
   - Decide the minimal role set now (e.g. owner/member, maybe admin) so later slices do not need a breaking access rewrite.
   - Keep calendar identity distinct from group identity even if the first flow auto-creates one calendar.

4. **Build browser flows around the real access model**
   - Create group.
   - Join group via code/token.
   - List only permitted calendars.
   - Show access-denied / empty-state surfaces.
   - Do not let the browser route load a calendar by raw ID unless server/RLS-backed access is already enforced.

5. **Add proof surfaces last, but within S01**
   - One browser flow should prove: sign in → create/join group → see allowed calendars.
   - One negative proof should show that direct access to a non-permitted calendar is denied cleanly.

### Verification Approach

Current useful commands:

- `pnpm -C apps/web check` — already passes today and should keep passing as routes/auth plumbing land.
- `pnpm exec tsc --pretty false --noEmit packages/db/src/tenant.ts` — currently fails; use this as a concrete regression check if `packages/db` is touched.

Commands the planner should add as part of S01 if it wants durable proof:

- `pnpm exec vitest run` — for access helpers / role resolution / route guard logic.
- `pnpm exec playwright test` — for browser auth + create/join + permitted-calendar access proof.

Observable behaviors to verify:

- Authenticated user can sign in and reach the protected app shell.
- New user can create a group and receives/uses a join path with minimal admin complexity.
- Member sees only calendars granted through group membership.
- Direct navigation or query attempts against a disallowed calendar return an access-denied result, not silent empty data.
- Sign-out removes access from the browser session cleanly.
- Cached-session contract is established at the auth boundary, even if the full offline reopen proof lands in S03.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| SvelteKit auth/session propagation | `@supabase/ssr` + SvelteKit `hooks.server.ts` / `locals` | This is the documented path for request-scoped cookie/session handling; hand-rolled cookie parsing will drift from Supabase auth behavior. |
| Shared-calendar authorization | Supabase RLS policies based on authenticated membership | App-side filtering is not a security boundary. The DB must reject cross-group/calendar access even if a client submits a guessed ID. |
| Protected-route enforcement | SvelteKit server loads + redirects/error responses | Route guards belong in server load/actions, not only in client navigation state. |

## Constraints

- `apps/web` is still a bare starter: only `+layout.svelte` and `+page.svelte` exist under `src/routes/`.
- There is currently no `src/lib/`, no hooks file, no auth callback route, and no protected route structure.
- `packages/db/src/client.ts` is a stub, `packages/db/src/schema/index.ts` is empty, and `packages/db/src/tenant.ts` is both conceptually incomplete for group access and currently uncompilable.
- `packages/db/package.json` declares no dependencies today, so any Drizzle-based use must also add package dependencies.
- `.env.example` is empty, so the env contract for Supabase is not documented yet.
- There is no existing Supabase CLI directory, migration folder, Playwright config, or Vitest setup in the repo.
- TypeScript is strict in the Svelte apps; any auth/session typing shortcuts will spill into route code quickly.

## Common Pitfalls

- **Treating `group_id` like a single-tenant boundary** — a user can belong to multiple groups/calendars, so reuse the explicit-scoping philosophy from `tenant.ts` but do not collapse the actual access model into one `tenant_id` shortcut.
- **Trusting browser-filtered access** — only RLS-backed queries or server-composed checks should determine calendar visibility. Never trust a client-provided calendar ID by itself.
- **Trusting `auth.getSession()` as server truth** — Supabase docs warn that server code must use trusted user validation (`getUser()`/equivalent trusted auth path), not unverified session data read from storage/cookies.
- **Overbuilding invite/admin flows in S01** — the milestone only needs collaboration to become real. A simple join code/token is enough if it preserves access guarantees.
- **Coupling group and calendar too tightly** — downstream slices need calendar-scoped IDs and permissions even if the first group creates only one default calendar.
- **Leaving `packages/db` half-active** — either make it compile and own the shared schema seam, or keep S01 logic closer to Supabase/web code. A broken shared package will slow every later slice.

## Open Risks

- The repo currently lacks any existing Supabase or test harness integration, so S01 may spend meaningful effort on platform bootstrap before feature logic starts.
- The team needs to choose where schema authority lives in M001: `packages/db` vs. Supabase SQL/migrations. The wrong partial choice will create duplicate sources of truth.
- Cached-session continuity is owned here at the contract level, but the full offline data proof arrives later; planner should avoid falsely claiming offline readiness from auth persistence alone.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Supabase | `supabase/agent-skills@supabase` | available via `npx skills add supabase/agent-skills@supabase` |
| Supabase/Postgres policy work | `supabase/agent-skills@supabase-postgres-best-practices` | available via `npx skills add supabase/agent-skills@supabase-postgres-best-practices` |
| SvelteKit | `spences10/svelte-skills-kit@sveltekit-structure` | available via `npx skills add spences10/svelte-skills-kit@sveltekit-structure` |
| Frontend auth/access surfaces | `frontend-design` | installed |

## Sources

- Supabase’s SvelteKit SSR docs confirm the intended pattern is a request-scoped server client initialized in `hooks.server.ts`, with cookie-backed session handling that flows through the SvelteKit stack. (source: [with-sveltekit.mdx](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/getting-started/tutorials/with-sveltekit.mdx))
- Supabase docs explicitly warn not to trust `auth.getSession()` in server code because it reads from storage/cookies without guaranteed server revalidation; trusted user checks must come from `getUser()` or equivalent verified auth paths. (source: [get_session_warning.mdx](https://github.com/supabase/supabase/blob/master/apps/docs/content/_partials/get_session_warning.mdx))
- SvelteKit docs reinforce that auth belongs in `handle`/`locals` and protected server loads, which fits the slice’s thin-server recommendation. (source: [hooks.md](https://github.com/sveltejs/kit/blob/main/documentation/docs/30-advanced/20-hooks.md))
- Supabase RLS examples show the correct security posture: policies enforce access from authenticated identity and membership subqueries in Postgres, not from client-side filtering. (source: [row-level-security.mdx](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/database/postgres/row-level-security.mdx))
