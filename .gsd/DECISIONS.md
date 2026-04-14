# Architectural Decisions

*Append-only register of architectural and pattern decisions. Read during planning/research. Append during execution when meaningful decisions are made.*

## Decisions

*(No decisions recorded yet)*

---

**Format for new entries:**

```
## YYYY-MM-DD: Decision Title

**Context:** Brief description of the problem/choice
**Decision:** What was decided
**Rationale:** Why this choice was made
**Consequences:** Expected impacts, tradeoffs
```

---

## Decisions Table

| # | When | Scope | Decision | Choice | Rationale | Revisable? | Made By |
|---|------|-------|----------|--------|-----------|------------|---------|
| D001 | M001 | library | Authoritative implementation stack | Use the existing SvelteKit web app and SvelteKit + Capacitor mobile shell as the implementation stack; ignore the stale React Native / Flutter references in uploaded notes. | The repository already defines the real implementation path, and planning against it avoids fake architecture and unnecessary migration work. | Yes — only if the product direction later justifies an explicit stack migration. | human |
| D002 | M001 | architecture | Backend access pattern for the scheduling substrate | Use Supabase for auth, database, realtime, and RLS, with a thin SvelteKit server layer for privileged or composed operations only; do not add GraphQL in M001. | This keeps the backend simple, fits the chosen stack, preserves a strong auth/RLS story, and avoids inventing an extra API layer before the substrate exists. | Yes — revisit only if future milestones expose composition needs Supabase plus thin server routes cannot handle cleanly. | human |
| D003 | M001 | architecture | Sync authority model | Clients are local-first, but the server is canonical after reconnect. | Caluno needs real offline continuity, but shared schedules become untrustworthy if reconciliation is left ambiguous across devices or collaborators. | Yes — revisit only if later evidence shows a different conflict model is necessary. | human |
| D004 | M001 | architecture | Primary proof surface for the first milestone | M001 is web-first for proof and verification, because the browser is the available realistic test surface. | The user needs to simulate and validate the substrate in the browser now, and does not have reliable phone hardware available for device-first proof. | Yes — later milestones should rebalance toward mobile parity once the substrate exists. | human |
| D005 | M001 | library | Web local persistence direction | Use browser SQLite/WASM as the planned web local store for M001 behind repository boundaries. | This keeps the web proof surface closer to the long-term offline model while remaining browser-testable in the first milestone. | Yes — if implementation evidence shows another browser-local persistence layer is materially more reliable or simpler without changing domain seams. | human |
| D006 | M001/S01 planning | architecture | Schema authority for M001/S01 auth and access work | Use `supabase/migrations` and `supabase/seed.sql` as the authoritative schema and RLS source for S01; keep `packages/db` compile-safe but non-authoritative until a later slice or milestone explicitly assigns shared DB package ownership. | The repo has no working shared DB layer today, `packages/db` currently contains a broken tenant helper, and secure access in this slice depends on real Supabase auth/RLS behavior. A single SQL source of truth avoids split ownership while still leaving `packages/db` available for narrow helpers and types. | Yes | agent |
| D007 | M001/S01/T03 | architecture | How protected calendar routes derive permitted scope in the web app shell | Load memberships and permitted calendars once in the protected `(app)` layout, then have `/calendars/[calendarId]` resolve access only from that trusted parent scope and render an explicit denied surface when the id is outside it. | This avoids duplicated nested queries at the slice's 10x breakpoint, keeps route authorization tied to already-trusted server data instead of ad hoc per-page lookups, and guarantees guessed or stale calendar ids fail closed with a visible reason/phase instead of silent empty data. | Yes | agent |
