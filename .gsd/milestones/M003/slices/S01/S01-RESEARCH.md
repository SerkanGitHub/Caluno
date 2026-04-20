# Slice Research — M003/S01

## Summary

This slice owns **R002** and **R009** in the currently loaded requirements set.

- **R002 risk:** mobile must preserve the same permission-bound calendar scope contract as web.
- **R009 risk:** `apps/mobile` is still a blank starter, so the first implementation choice will determine whether mobile becomes a real client or a thin wrapper.

Current state is stark:

- `apps/mobile` is only a static SvelteKit + Capacitor starter (`apps/mobile/src/routes/+page.svelte`).
- It has **no Supabase client**, **no auth flow**, **no mobile shell**, **no native platform folders**, and **no tests**.
- The trusted scope/auth behavior already exists on web, but it is split between:
  - **portable pure helpers** (`apps/web/src/lib/access/contract.ts`, `apps/web/src/lib/server/app-shell.ts`, `apps/web/src/lib/schedule/route-contract.ts`, `apps/web/src/lib/supabase/config.ts`)
  - **web-only SSR/cookie route code** (`apps/web/src/routes/(auth)/*`, `apps/web/src/routes/(app)/*`, `apps/web/src/lib/supabase/server.ts`)

The main implementation constraint is architectural:

- `apps/mobile` uses **`@sveltejs/adapter-static`** with SPA fallback (`apps/mobile/svelte.config.js`), so it **cannot reuse web server loads/actions/cookie auth directly**.
- Mobile must therefore use **client-side Supabase auth/session bootstrap + RLS-backed reads**, while preserving the same trusted-scope semantics as web.

## Requirement Targeting

### R002 — permission-bound shared calendar scope on mobile

Files proving the existing contract:

- `apps/web/src/lib/access/contract.ts`
- `apps/web/src/lib/server/app-shell.ts`
- `apps/web/src/lib/schedule/route-contract.ts`
- `apps/web/src/routes/(app)/+layout.server.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
- `supabase/migrations/20260414_000001_auth_groups_access.sql`

Important behavior to preserve:

1. Web first loads only the groups/calendars the authenticated user is allowed to see.
2. Calendar access is then resolved **against that permitted inventory**, not against arbitrary guessed ids.
3. Because of that, an existing calendar outside the user’s membership scope collapses into **`calendar-missing`**, not an existence leak.

That omission-based denial is already encoded in:

- `apps/web/tests/e2e/auth-groups-access.spec.ts`
- `apps/web/tests/routes/protected-routes.unit.test.ts`

The mobile app should preserve this by building the same permitted inventory first, then resolving route/screen access from that local trusted inventory.

### R009 — mobile as a first-class client, not a wrapper

The web app’s current shell is desktop-oriented (`apps/web/src/app.css`, `apps/web/src/routes/(app)/groups/+page.svelte`, `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`).

It should inform contract reuse, but **not** be copied as-is into mobile. The installed `frontend-design` skill is relevant here: it explicitly says to commit to an intentional visual direction and avoid generic wrapper UI / cookie-cutter patterns. For this slice, that means:

- do **not** mirror the two-column desktop shell
- do **not** ship a browser-looking port of the current web screens
- do reuse the trusted auth/scope logic and reason-code surfaces underneath

## Skill Discovery

Installed skill already relevant:

- `frontend-design` — use its rule to make the mobile shell intentionally mobile-specific rather than a generic responsive shrink of web.

Promising non-installed skills discovered:

- `npx skills add cap-go/capacitor-skills@capacitor-best-practices`
- `npx skills add supabase/agent-skills@supabase`
- `npx skills add spences10/svelte-skills-kit@sveltekit-structure`

I would only consider installing them if execution hits real Capacitor plugin setup or Supabase mobile-session issues.

## Implementation Landscape

| Path | What exists now | Why it matters for S01 |
|---|---|---|
| `apps/mobile/package.json` | Only `@capacitor/core` in runtime deps; scripts for `check`, `build`, `cap:sync`, `cap:add:ios`, `cap:add:android` | Mobile has no auth/data/plugin substrate yet |
| `apps/mobile/svelte.config.js` | Static adapter with `fallback: 'index.html'` | No server-side SvelteKit loads/actions on mobile |
| `apps/mobile/capacitor.config.ts` | Minimal app id/name/webDir only | Native shell exists in principle, but no plugin/native config yet |
| `apps/mobile/src/routes/+page.svelte` | Starter placeholder page | Confirms there is no product flow yet |
| `apps/web/src/lib/access/contract.ts` | Pure group/calendar access logic + join-code normalization | Best extraction candidate for shared trust/scope logic |
| `apps/web/src/lib/server/app-shell.ts` | Pure viewer/group/calendar shaping + denied-reason copy | Best extraction candidate for mobile shell state derivation |
| `apps/web/src/lib/schedule/route-contract.ts` | Pure visible-week + trusted-calendar resolution logic | Reusable contract helper; already browser-safe |
| `apps/web/src/lib/supabase/config.ts` | Public env loader | Mobile needs the same Supabase URL/key inputs |
| `apps/web/src/lib/supabase/server.ts` | `safeGetSession()` = `getSession()` + `getUser()` validation | This trust model should be mirrored client-side before opening mobile shell |
| `apps/web/src/routes/(auth)/signin/+page.server.ts` | Password sign-in via server action + redirect | Good copy/behavior reference, but not directly portable to static mobile |
| `apps/web/src/routes/(app)/+layout.server.ts` | Server loads memberships/groups/calendars/join codes | This query shape is the blueprint for mobile’s client-side shell bootstrap |
| `apps/web/src/routes/(app)/+layout.ts` | Persists trusted browser shell continuity snapshot | Shows where web continuity starts, but not needed for S01 mobile shell/auth/scope |
| `supabase/migrations/20260414_000001_auth_groups_access.sql` | RLS policies + grants for `groups`, `group_memberships`, `calendars`, `group_join_codes` | Mobile can read permitted scope directly with authenticated Supabase client |
| `apps/web/tests/auth/session.unit.test.ts` | Invalid vs authenticated session contract | Reuse as behavioral reference when designing mobile session bootstrap |
| `apps/web/tests/e2e/auth-groups-access.spec.ts` | Sign-in → permitted calendar → unauthorized denial proof | Best acceptance model for mobile S01 |

## Key Findings

### 1. The most reusable trust logic is already pure — but it is stranded inside `apps/web`

The following files are not tied to SSR and are good shared-core candidates:

- `apps/web/src/lib/access/contract.ts`
- `apps/web/src/lib/server/app-shell.ts`
- `apps/web/src/lib/schedule/route-contract.ts`
- `apps/web/src/lib/supabase/config.ts`

Right now there is **no shared workspace package** for app-domain contracts. Existing packages are `db`, `ui`, `eslint-config`, and `typescript-config`; none are the right place for trusted mobile/web domain helpers.

Practical implication for planning:

- avoid brittle cross-app relative imports from `apps/mobile` into `apps/web/src/...`
- prefer a new shared package/module if both surfaces will consume the same trust helpers
- refactor web to consume the extracted helpers first or in the same task, so drift does not begin on day one

### 2. Mobile cannot reuse web auth mechanics directly

Web auth is cookie/server-action based:

- `apps/web/src/routes/(auth)/signin/+page.server.ts`
- `apps/web/src/lib/supabase/server.ts`
- `apps/web/src/hooks.server.ts`

That stack depends on:

- server-side `locals.supabase`
- cookie-backed session management
- SSR redirects to `/signin`

`apps/mobile` is static, so the mobile equivalent must be:

- `@supabase/supabase-js` client auth
- client-side session bootstrap/store
- client-side guarded navigation/screen state
- explicit invalid-session handling before opening protected scope

The important pattern to keep is **not** “use cookies”; it is **“do not trust a cached session until it has been validated.”**

Web’s `safeGetSession()` does this by calling `getSession()` and then `getUser()`. Mobile should keep that same fail-closed posture.

### 3. S01 can avoid deep-link auth complexity if it sticks to the existing password flow

Capacitor docs confirm that later deep-link flows should use the App plugin (`appUrlOpen`, `getLaunchUrl`) and, if needed, the Browser plugin for external auth return paths.

But S01’s immediate product need is only **sign in**. The current web product already uses **email/password**. That means the simplest trustworthy mobile path is:

- use Supabase `signInWithPassword`
- avoid introducing Browser/App plugin auth complexity unless the implementation deliberately switches auth style

Deep-link handling is still relevant later for notification taps and any external auth flows, but it does **not** need to be front-loaded into this slice unless the implementation chooses OAuth/magic-link auth.

### 4. The web offline stack is not the right foundation for this slice

The web app’s continuity/runtime stack includes:

- `apps/web/src/service-worker.ts`
- `apps/web/src/lib/offline/runtime.ts`
- `apps/web/src/lib/offline/repository.ts`
- `apps/web/src/lib/offline/calendar-controller.ts`
- `apps/web/src/lib/offline/mutation-queue.ts`

This is browser/service-worker/worker/OPFS oriented. It is important for later M003 slices, but it is **not** the first thing to port for S01.

Planner guidance:

- do not pull offline queue/repository/service-worker work into S01
- do not let “future mobile offline” block “mobile auth + permitted scope”
- build the mobile shell/auth/scope foundation first, then attach continuity in a later slice

### 5. Native runtime proof is not ready out of the box

`apps/mobile` has scripts for native targets, but there are currently **no `ios/` or `android/` folders** under `apps/mobile`.

Implication:

- browser-shell proof is immediately possible
- real Capacitor runtime proof requires first-time platform bootstrap via the existing scripts

This matters for planning because “real mobile runtime” is part of the milestone bar, but the current repo is not yet at that stage.

### 6. Join/create onboarding exists on web, but it is not obviously required for this slice’s acceptance

Web already supports:

- create group: `apps/web/src/routes/(app)/groups/+page.server.ts`
- join group: `apps/web/src/routes/(app)/groups/+page.server.ts`
- owner/member shell UI: `apps/web/src/routes/(app)/groups/+page.svelte`

But the roadmap line for S01 is narrower:

> sign in on mobile, land in a native-feeling shell, see only permitted calendars, and hit truthful denied states when scope is invalid

So the planner should treat **group create/join** as optional unless execution shows they are needed to reach a credible landing shell. A read-only “open permitted scope” slice is enough to satisfy the stated outcome.

## Natural Seams / Build Order

### Seam 1 — Shared trusted core extraction

Build/prove first because it reduces drift risk for everything after it.

Likely contents:

- access contract helpers
- app-shell shaping helpers
- denied-state copy/helpers
- Supabase public env loader
- possibly a browser-safe session-validation helper interface

Success condition:

- web still passes existing auth/protected-route tests after extraction
- mobile can import the same trust/scope logic without reaching into `apps/web/src`

### Seam 2 — Mobile auth/session substrate

After shared core exists, add the minimum mobile runtime pieces:

- Supabase browser client for `apps/mobile`
- mobile auth store/bootstrap
- sign-in screen using password auth
- invalid-session / signed-out / loading states

Success condition:

- seeded user can sign in on mobile browser shell
- invalid session does not open protected shell

### Seam 3 — Mobile shell + permitted inventory

Then implement mobile-native shell screens/state:

- shell bootstrap query for memberships/groups/calendars/join codes mirroring `apps/web/src/routes/(app)/+layout.server.ts`
- viewer/group/calendar presentation using mobile-specific layout
- primary calendar landing
- explicit denied surface for malformed or out-of-scope calendar ids

Success condition:

- only permitted calendars render
- unauthorized existing calendar ids still collapse to the same fail-closed denial semantics as web

### Seam 4 — Real-runtime proof surface

Only after the browser shell path exists:

- `cap:sync`
- add platform(s)
- verify sign-in + permitted inventory + denied route on a simulator/device

## Recommendation

1. **Do not implement S01 by porting web routes wholesale into `apps/mobile`.**
   - Reuse contracts, not screens.
2. **Extract shared trust/scope helpers before or alongside mobile work.**
   - This is the cleanest way to satisfy R009’s “same substrate” requirement.
3. **Use direct authenticated Supabase client reads on mobile for scope inventory.**
   - RLS already exists for `groups`, `group_memberships`, `calendars`, `group_join_codes`.
4. **Keep the auth flow to password sign-in for this slice unless there is a strong reason not to.**
   - It matches current web behavior and avoids unnecessary deep-link/plugin complexity.
5. **Make the shell intentionally mobile-specific.**
   - Follow the `frontend-design` skill rule: deliberate visual direction, no generic web-wrapper layout, no desktop-shell shrink.
6. **Explicitly defer offline continuity, notifications, and deep-link tap routing.**
   - Those are real milestone concerns, but they are not the right first cut for S01.

## Don’t Hand-Roll

- Don’t invent a second authorization model for mobile. Use Supabase auth + existing RLS.
- Don’t hand-roll a fake calendar-scope denial by probing arbitrary ids. Resolve against trusted permitted inventory.
- Don’t hand-roll cross-app imports from `apps/mobile` into `apps/web/src`. Extract shared code instead.
- Don’t hand-roll a wrapper UI from the web shell. Treat mobile as its own product surface.

## Verification

Baseline checks I ran during research:

- `pnpm --dir apps/mobile check` ✅
- `pnpm --dir apps/mobile build` ✅
- `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/routes/protected-routes.unit.test.ts --reporter=dot` ✅

Recommended verification for implementation tasks:

### Contract / regression

- `pnpm --dir apps/web exec vitest run tests/auth/session.unit.test.ts tests/routes/protected-routes.unit.test.ts`
- Any new shared-core tests added during extraction

### Mobile shell build sanity

- `pnpm --dir apps/mobile check`
- `pnpm --dir apps/mobile build`

### Browser-shell proof

Use the same seeded identities already used by web E2E fixtures (`apps/web/tests/e2e/fixtures.ts`):

- permitted member: `bob@example.com / password123`
- no-membership user: `erin@example.com / password123`
- permitted calendar id: `aaaaaaaa-aaaa-1111-1111-111111111111`
- out-of-scope calendar id: `bbbbbbbb-bbbb-2222-2222-222222222222`

Proof steps:

1. Sign in as Bob.
2. Confirm only Alpha scope appears.
3. Open the permitted calendar and confirm it lands in the protected mobile shell.
4. Attempt the Beta calendar id and confirm fail-closed denial.
5. Reload/restart and confirm invalid/stale session does not silently reopen protected scope.

### Real Capacitor runtime proof

Once implementation exists:

- `pnpm --dir apps/mobile cap:sync`
- `pnpm --dir apps/mobile cap:add:ios` and/or `pnpm --dir apps/mobile cap:add:android` (first-time bootstrap)
- Repeat the same sign-in / permitted-scope / denied-route proof on simulator/device

## Sources

Internal files read:

- `apps/mobile/package.json`
- `apps/mobile/svelte.config.js`
- `apps/mobile/capacitor.config.ts`
- `apps/mobile/src/routes/+page.svelte`
- `apps/mobile/src/routes/+layout.svelte`
- `apps/mobile/src/app.css`
- `apps/web/src/lib/access/contract.ts`
- `apps/web/src/lib/server/app-shell.ts`
- `apps/web/src/lib/schedule/route-contract.ts`
- `apps/web/src/lib/supabase/config.ts`
- `apps/web/src/lib/supabase/server.ts`
- `apps/web/src/lib/supabase/client.ts`
- `apps/web/src/routes/(auth)/signin/+page.server.ts`
- `apps/web/src/routes/(app)/+layout.server.ts`
- `apps/web/src/routes/(app)/+layout.ts`
- `apps/web/src/routes/(app)/groups/+page.svelte`
- `apps/web/src/routes/(app)/groups/+page.server.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.server.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.ts`
- `apps/web/src/routes/(app)/calendars/[calendarId]/+page.svelte`
- `apps/web/src/lib/offline/protected-routes.ts`
- `apps/web/src/lib/offline/app-shell-cache.ts`
- `apps/web/src/lib/offline/repository.ts`
- `apps/web/src/lib/offline/calendar-controller.ts`
- `apps/web/src/lib/offline/mutation-queue.ts`
- `apps/web/src/service-worker.ts`
- `apps/web/package.json`
- `apps/web/playwright.config.ts`
- `apps/web/playwright.offline.config.ts`
- `apps/web/tests/auth/session.unit.test.ts`
- `apps/web/tests/routes/protected-routes.unit.test.ts`
- `apps/web/tests/e2e/auth-groups-access.spec.ts`
- `apps/web/tests/e2e/fixtures.ts`
- `supabase/migrations/20260414_000001_auth_groups_access.sql`

External docs checked:

- Capacitor docs: App plugin `appUrlOpen` / `getLaunchUrl` for deep links
- Capacitor plugins docs: App + Browser plugin references for URL-open and external browser auth flows
