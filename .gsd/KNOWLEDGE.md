# Project Knowledge

*Append-only register of project-specific rules, patterns, and lessons learned. Read at the start of every unit. Append when discovering recurring issues, non-obvious patterns, or rules that future agents should follow.*

## Patterns & Rules

## 2026-04-14: Use `pnpm --dir apps/web exec ...` for direct app-local CLIs

**Context:** Running app-scoped tools like Vitest inside `apps/web` during auto-mode verification.
**Rule/Pattern:** Prefer `pnpm --dir apps/web exec vitest run ...` (or the package script via `pnpm --dir apps/web test -- ...`) instead of `pnpm -C apps/web vitest run ...`.
**Rationale:** In this workspace, `pnpm -C apps/web vitest run ...` is parsed as a pnpm subcommand lookup and fails with `Command "apps/web" not found`, while `--dir ... exec ...` reliably scopes execution to the web app.

## Lessons Learned

## 2026-04-14: Let a freshly started Vite auth page settle before Playwright sign-in input on cold runs

**Context:** The first Playwright scenario hit `/signin` immediately after the Playwright `webServer` started a fresh `vite dev` instance.
**Rule/Pattern:** On cold E2E runs against the web dev server, wait briefly after the sign-in shell becomes visible before filling and submitting credentials, or the hydrated page can reset the email field and trip native form validation before the POST is sent.
**Rationale:** The issue reproduces only on cold-start browser proof, not on a warmed local session, and the retained trace makes it look like an auth failure when the actual break is a pre-submit input reset.

## 2026-04-14: Normalize direct SQL-seeded `auth.users` token fields for local GoTrue password login

**Context:** Local Supabase browser/auth verification after inserting dev users directly in `supabase/seed.sql`.
**Rule/Pattern:** When seeding `auth.users` via SQL instead of the admin API, coalesce nullable token fields like `confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change_token_current`, `reauthentication_token`, and `phone_change_token` to empty strings.
**Rationale:** Current local GoTrue scans at least `confirmation_token` into a plain string during password login; leaving it `NULL` turns a normal sign-in into `500: Database error querying schema` before the app code runs.

## 2026-04-14: In `RETURNS TABLE` PL/pgSQL functions, prefer `ON CONFLICT ON CONSTRAINT ...`

**Context:** `public.redeem_group_join_code(text)` returns table columns named `group_id`, `calendar_id`, and `role`.
**Rule/Pattern:** Inside PL/pgSQL functions with output column names that overlap table columns, use `ON CONFLICT ON CONSTRAINT group_memberships_pkey` instead of `ON CONFLICT (group_id, user_id)`.
**Rationale:** The output-column names behave like variables inside the function body, and unqualified conflict-column references can become ambiguous at runtime even though the SQL looks otherwise valid.

---

**Format for new entries:**

```
## YYYY-MM-DD: Title

**Context:** Situation where this applies
**Rule/Pattern:** What to do/avoid
**Rationale:** Why this matters
```

## 2026-04-15: Supabase RLS can allow inserts while `insert().select()` still fails on newly created schedule rows

**Context:** Trusted schedule create actions inserting into `public.shift_series` and `public.shifts` under authenticated local Supabase RLS.
**Rule/Pattern:** For create paths that must return deterministic ids, generate ids in the trusted server action and insert without chaining `.select()` unless the policy has been proven to allow representation reads on fresh rows in the same request.
**Rationale:** In this project's local Supabase setup, authenticated inserts succeeded, but the immediate `.select()` representation triggered `42501 new row violates row-level security policy`, which made otherwise valid creates look like write failures.

## 2026-04-15: Quote or expand test globs before using `pnpm --dir apps/web exec ...`

**Context:** Slice verification for Vitest used `pnpm --dir apps/web exec vitest run tests/routes/protected-routes.unit.test.ts tests/schedule/*.unit.test.ts` from the repo root.
**Rule/Pattern:** When running app-local commands through `pnpm --dir apps/web exec ...`, either quote the glob for the child CLI to resolve or pass explicit file paths instead of relying on shell expansion from the repo root.
**Rationale:** The shell expands globs before `pnpm --dir` changes directories, so repo-root execution can silently skip intended `apps/web/tests/...` matches even though the command looks app-scoped.

## 2026-04-15: Import `rrule` through the package default in Vite SSR paths

**Context:** The schedule recurrence helpers run in SvelteKit/Vite SSR as well as tests, and direct named imports from `rrule` broke the calendar route during browser verification.
**Rule/Pattern:** In this repo, import `rrule` as the package default (for example `import rrulePkg from 'rrule'; const { RRule } = rrulePkg;`) for server-rendered schedule code instead of relying on named ESM imports.
**Rationale:** The dependency currently resolves through a CommonJS-compatible path in the web app's SSR environment; using the package default avoids runtime import shape mismatches that only surface once the protected calendar route renders for real.

## 2026-04-15: For one-off schedule creates, leave recurrence interval blank unless a cadence is selected

**Context:** Local-first and server-backed shift create forms both post recurrence fields through the shared `normalizeShiftDraft()` recurrence validator.
**Rule/Pattern:** Default `recurrenceInterval` to an empty string for one-off shift forms, and only send an interval value once a recurrence cadence has actually been selected.
**Rationale:** The shared validator treats any supplied interval as recurrence input; posting `interval=1` with an empty cadence turns a normal one-off create into `RECURRENCE_CADENCE_REQUIRED` even though the user did not ask for recurrence.

## 2026-04-15: Exclude `@sqlite.org/sqlite-wasm` from Vite optimizeDeps and prefer the library's wrapped worker bootstrap

**Context:** S03 offline repository startup under Vite/Playwright hit export-shape mismatches and repeated `sqlite3.wasm` 404s while trying to use a project-owned worker bootstrap.
**Rule/Pattern:** In this repo, add `@sqlite.org/sqlite-wasm` to `optimizeDeps.exclude` and prefer the package-supported wrapped worker promiser path for browser SQLite startup before reaching for custom worker wiring.
**Rationale:** Vite prebundling and custom worker bootstrapping can hide the package's real browser export/asset behavior; the library-supported path avoids missing wasm asset resolution and is more stable across dev and preview proof surfaces.

## 2026-04-15: Reconnect drain tests must inject a deterministic controller clock

**Context:** S04 reconnect-drain proof relies on queue entries being processed in `createdAt` order, but multiple local mutations can otherwise share near-identical real timestamps during unit tests.
**Rule/Pattern:** When a test needs to prove a specific offline queue drain order, pass a deterministic `now` function into `createCalendarController()` instead of relying on wall-clock timing.
**Rationale:** The queue sorts by `createdAt` and then random operation id, so wall-clock-driven tests can accidentally assert against UUID tie-breaks rather than the intended replay sequence.

## 2026-04-15: Supabase migration filenames here must use a unique leading numeric version, not just a different suffix

**Context:** Adding a second `20260415_...` migration for schedule realtime caused `supabase db reset --local` to fail with a duplicate `schema_migrations` primary key, and renaming to another `20260415...` variant changed ordering unexpectedly.
**Rule/Pattern:** In this repo's local Supabase workflow, give every migration a unique leading numeric version that also preserves dependency order (for example move the next migration to `20260416_...` rather than relying on a later `_000003` suffix under the same date prefix).
**Rationale:** The local Supabase migration ledger keys on the leading numeric version, so same-date prefixes can collide or sort differently than expected even when the suffixes look unique.

## 2026-04-15: Browser-proof shift editors here can reset uncontrolled fields between interactions, so E2E form helpers should submit the full payload atomically

**Context:** Playwright browser proof for the shared calendar create/edit dialogs in S04/T04.
**Rule/Pattern:** For these calendar shift editor dialogs, prefer a test helper that writes the complete form payload and then calls `form.requestSubmit()` in one step instead of relying on long click/fill sequences across title, time, and recurrence controls.
**Rationale:** The current dialog markup uses uncontrolled inputs with static defaults; route or layout rerenders during automation can silently reset title/time/radio state between user-like interactions, which makes browser proof look flaky even when the underlying route action is the real surface under test.

## 2026-04-16: Local browser proof for `apps/web` needs public Supabase env before any route can render

**Context:** Manual browser verification against `pnpm --dir apps/web dev` during S05/T01.
**Rule/Pattern:** Before using the local web dev server for browser proof in this repo, ensure `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` are present in the web app environment.
**Rationale:** The SvelteKit server hook constructs the Supabase server client on every request; when those public env vars are missing, even `/` fails with a 500 before the app shell or protected calendar route can render.

## 2026-04-16: Preview-backed offline proof needs both asset isolation headers and the project sqlite worker entrypoint

**Context:** S05/T02 browser proof for cached-offline, reconnect, and realtime flows against `vite preview`.
**Rule/Pattern:** In `apps/web`, keep the Vite dev/preview asset responses stamped with the worker isolation headers and bootstrap the offline repository through `src/lib/offline/sqlite.worker.ts` instead of relying on `sqlite3Worker1Promiser()`'s default worker.
**Rationale:** The protected route HTML can have COEP/COOP while Vite-served worker assets still miss those headers, and the library default worker can resolve `sqlite3.wasm` to a preview-broken path. When that happens the SQLite worker never initializes, `controllerState` stays null, and every offline/realtime proof falsely looks like a route/test problem.

## 2026-04-16: When multi-session realtime proof fails, extract both Playwright flow attachments before changing assertions

**Context:** S06/T02 isolated `calendar-sync.spec.ts` reruns where the writer's create succeeds but the collaborator never reaches `data-remote-refresh-state="applied"`.
**Rule/Pattern:** Before weakening or widening the collaborator assertions, inspect both `flow-diagnostics` attachments from the retained Playwright trace and compare primary vs collaborator `realtimeChannelState`, `realtimeRefreshState`, `realtimeReason`, conflict counts, and console warnings.
**Rationale:** The retained trace can show whether the failure is assertion drift or a real delivery gap. In this repo the decisive evidence was that the collaborator stayed `ready + idle` on the original 1-pair baseline while the writer rendered the new 3-pair board, so the bug moved from test timing suspicion to the actual Supabase realtime delivery contract.

## 2026-04-16: A calendar realtime channel stuck at `subscribing` can be caused by a Svelte effect loop before any subscribe callback fires

**Context:** S06/T03 browser investigation of `calendar-sync.spec.ts` after the collaborator channel never reached `ready` on the trusted shared-week route.
**Rule/Pattern:** When the route-level realtime diagnostics stay at `subscribing` with no timeout/error reason, check browser console/page errors for `effect_update_depth_exceeded` and audit the calendar route's `$effect` blocks for retained-state writes that re-trigger mount logic.
**Rationale:** In this repo, the browser proof could look like a Supabase realtime transport failure even though the page was also hitting a reactive update loop during calendar mount; without checking the console, the investigation stays trapped on backend hypotheses while the subscription is being recreated before it can acknowledge.

## 2026-04-17: Do not detach Supabase Realtime methods before calling them

**Context:** S06 realtime auth hardening where `calendar-sync.spec.ts` kept failing with `REALTIME_AUTH_APPLY_FAILED` and details like `Cannot read properties of undefined (reading '_performAuth')`.
**Rule/Pattern:** In this repo, call `client.realtime.setAuth(...)` directly instead of storing `const setAuth = client.realtime?.setAuth` and invoking the detached reference later.
**Rationale:** Supabase Realtime methods depend on their instance binding. Detaching `setAuth` loses `this`, which turns a valid browser session into a misleading auth-apply failure and keeps the channel stuck in retrying.

## 2026-04-17: Shared calendar E2E helpers must match visible shift cards by exact card heading, not substring text

**Context:** S06 browser-proof hardening where collaborator overlap assertions accidentally matched conflict-summary text inside the wrong card and where nested editor headings caused strict-mode `h3` collisions.
**Rule/Pattern:** When resolving a shift card in Playwright, scope to visible `shift-card-*` nodes and compare the card's primary heading text exactly; do not rely on `hasText` substring matching alone.
**Rationale:** Conflict warnings and nested dialogs reuse shift titles in surrounding text, so substring-only matching can return the wrong card and make overlap assertions look nondeterministic even when the board data is correct.

## 2026-04-17: In combined preview-backed browser proof, choose the overlap scenario from live conflict summaries before asserting collaborator refresh

**Context:** M001 milestone closeout after `calendar-offline.spec.ts` mutates the seeded Alpha week before `calendar-sync.spec.ts` runs in the same clean-reset Playwright command.
**Rule/Pattern:** For collaborator overlap proof in this repo, detect the current conflict-bearing day from the rendered board/day conflict summaries and build the next create/assertion flow from that visible state instead of assuming the original seeded Thursday overlap is still present.
**Rationale:** Earlier specs can legitimately move or delete seeded shifts while still preserving a valid conflict baseline elsewhere in the week; deriving the scenario from the live board removes false failures caused by stale fixture assumptions without weakening the proof.

## 2026-04-18: Vitest can silently ignore nonexistent explicit file arguments in app-scoped verification commands

**Context:** M002/S01/T01 slice-level verification used `pnpm --dir apps/web exec vitest run ...` with a mix of existing and not-yet-created test files.
**Rule/Pattern:** When a slice verification command names future test files explicitly, separately confirm those files exist (for example with `test -f` or `rg --files`) instead of assuming a green Vitest exit means every named file actually ran.
**Rationale:** In this repo's current Vitest invocation path, the command can succeed while running only the existing files, which can create a false sense that broader slice verification already covers future-task artifacts.

## 2026-04-18: For browser-load offline proof, prefer forcing `navigator.onLine = false` over Playwright context-offline when the route still needs network to boot

**Context:** M002/S01/T03 needed to prove `/calendars/[calendarId]/find-time` renders an explicit `offline-unavailable` state from its browser `+page.ts` load.
**Rule/Pattern:** When the goal is to verify a client-side offline branch on a protected SvelteKit route, first load the route or its entrypoint online, then use `context.addInitScript()` to override `navigator.onLine` for the next navigation instead of immediately calling `context.setOffline(true)`.
**Rationale:** Playwright's full context-offline mode can turn the next navigation into `chrome-error://chromewebdata/` before the route's browser load runs, which tests raw network failure rather than the app's intended fail-closed client logic.
