# M001 Discussion Log

## Exchange — 2026-04-14T20:01:28.390Z

### Storage

Which local storage model should I plan for in M001?

- **Shared SQLite (Recommended)** — Use SQLite semantics across platforms, with native SQLite on mobile and a browser SQLite-compatible layer on web.
- **Hybrid local stores** — Use native SQLite on mobile but a different local store on web behind the same repository contract.
- **Server-first cache** — Keep offline support lighter and let the server remain the main source of truth with thinner local persistence.

**Selected:** Shared SQLite (Recommended)

### API Shape

Which backend access pattern should I plan for?

- **Supabase + thin server (Recommended)** — Use Supabase for auth, database, realtime and keep SvelteKit server routes for privileged or composed operations only.
- **SvelteKit API first** — Route most app traffic through SvelteKit server endpoints, with Supabase sitting behind that layer.
- **Add GraphQL layer** — Introduce a dedicated GraphQL API as the main contract despite the current repo not being set up for it yet.

**Selected:** Supabase + thin server (Recommended)

### Sync

How should I treat sync authority in M001?

- **Server canonical (Recommended)** — Clients work local-first, but Supabase remains the canonical source and reconciliation authority once online.
- **Client-biased merge** — Favor local edits more aggressively and resolve more conflicts on-device before syncing upstream.
- **Manual conflict flow** — Raise more explicit conflicts to users instead of resolving most of them automatically.

**Selected:** Server canonical (Recommended)

---
## Exchange — 2026-04-14T20:29:51.786Z

### Depth Check

Did I capture the depth right for Caluno and M001?

- **Yes, you got it (Recommended)** — Proceed with the confirmed product depth, milestone boundary, and architecture choices.
- **Not quite — let me clarify** — I need to correct or sharpen something before you write the milestone artifacts.

**Selected:** Yes, you got it (Recommended)

---
