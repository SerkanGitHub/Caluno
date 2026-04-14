# Project Knowledge

*Append-only register of project-specific rules, patterns, and lessons learned. Read at the start of every unit. Append when discovering recurring issues, non-obvious patterns, or rules that future agents should follow.*

## Patterns & Rules

## 2026-04-14: Use `pnpm --dir apps/web exec ...` for direct app-local CLIs

**Context:** Running app-scoped tools like Vitest inside `apps/web` during auto-mode verification.
**Rule/Pattern:** Prefer `pnpm --dir apps/web exec vitest run ...` (or the package script via `pnpm --dir apps/web test -- ...`) instead of `pnpm -C apps/web vitest run ...`.
**Rationale:** In this workspace, `pnpm -C apps/web vitest run ...` is parsed as a pnpm subcommand lookup and fails with `Command "apps/web" not found`, while `--dir ... exec ...` reliably scopes execution to the web app.

## Lessons Learned

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