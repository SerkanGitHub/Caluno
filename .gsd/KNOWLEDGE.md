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
