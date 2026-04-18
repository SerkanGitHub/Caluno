# S03: Suggestion-to-create handoff — UAT

**Milestone:** M002
**Written:** 2026-04-18T21:13:30.320Z

# UAT — S03 Suggestion-to-create handoff

## Preconditions

- Local Supabase seed is loaded with the Alpha shared calendar (`aaaaaaaa-aaaa-1111-1111-111111111111`) and the seeded member `bob@example.com / password123`.
- The web app is running against the local environment used by the automated proof.
- The Alpha member has permission to access the Alpha shared calendar but not the Beta shared calendar.

## Test Case 1 — Top-pick suggestion opens the existing create dialog on the slot-derived week

1. Sign in as `bob@example.com`.
   - Expected: The protected groups shell renders and the Alpha Team calendar is available.
2. Navigate to `/calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=60&start=2026-04-01`.
   - Expected: The route reaches `ready` state and shows Top picks plus browse results.
3. Inspect the first Top pick CTA and confirm it targets the calendar route with `create=1`, `prefillStartAt`, `prefillEndAt`, `source=find-time`, and a `start=` value matching the chosen slot week rather than the original search anchor week.
   - Expected: The CTA is present and its target week is `2026-04-13`, not `2026-03-30`.
4. Click the first Top pick CTA.
   - Expected: The app lands on `/calendars/aaaaaaaa-aaaa-1111-1111-111111111111?start=2026-04-13` after arrival cleanup, the week board shows `2026-04-13` as the visible week, and the create dialog is already open.
5. Review the open dialog.
   - Expected: A visible `From Find time` cue is shown, the create dialog source is `find-time`, and the `Start`/`End` datetime-local fields exactly match the chosen suggestion slot.

## Test Case 2 — Browse suggestion can create a real shift and does not reopen after reload

1. While signed in as the Alpha member, open `/calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=60&start=2026-04-13`.
   - Expected: The route shows ready results and browse CTAs are visible.
2. Click the browse CTA for `find-time-browse-window-2`.
   - Expected: The calendar route opens on the suggestion’s target week, the create dialog is open on arrival, and the URL is cleaned down to `?start=<target-week>`.
3. In the existing create dialog, enter the title `Find time browse handoff` and submit.
   - Expected: The dialog submits through the normal calendar create path and a new shift card titled `Find time browse handoff` appears on the intended board day from the chosen suggestion start date.
4. Reload the calendar route.
   - Expected: The newly created shift remains visible, the create dialog does not reopen automatically, and the `From Find time` cue is no longer present.

## Test Case 3 — Malformed or partial handoff URLs fail closed

1. While authenticated on the Alpha calendar, manually open a malformed destination URL such as `/calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-17T14:00:00.000Z&source=find-time` (missing `prefillEndAt`).
   - Expected: The calendar board still loads normally inside the authorized calendar, but the create dialog does not auto-open and no prefill cue appears.
2. Repeat with an invalid or mismatched payload, for example an end-before-start window or a `start=` week that does not match the supplied slot.
   - Expected: The route ignores the handoff safely, keeps the normal visible week logic, and exposes no partial prefill state.

## Test Case 4 — Unauthorized calendar access still denies the route explicitly

1. Sign in as `bob@example.com`.
2. Navigate directly to `/calendars/bbbbbbbb-bbbb-2222-2222-222222222222/find-time?duration=60&start=2026-04-13`.
   - Expected: The page renders the explicit denied surface, includes the attempted calendar id, and does not expose any find-time results or create-handoff state.
3. Navigate directly to `/calendars/bbbbbbbb-bbbb-2222-2222-222222222222?start=2026-04-13`.
   - Expected: The calendar route also renders an explicit denied surface and does not expose any board data from the unauthorized calendar.

## Test Case 5 — Offline `/find-time` entry stays fail closed

1. Warm the Alpha calendar route and capture the find-time entry link while online.
   - Expected: The protected calendar board is visible and the find-time entrypoint exists.
2. Simulate browser-offline navigation and open the warmed `/find-time` URL.
   - Expected: The protected shell can boot from cached scope, but the find-time route reports `offline-unavailable`, shows a fail-closed message, and renders no Top picks or browse results.

## Edge Cases To Confirm

- The destination URL preserves only the slot-derived `start=` week after arrival; `create`, `prefillStartAt`, `prefillEndAt`, and `source` are removed.
- Edit and move dialogs do not inherit the create-prefill cue or values.
- Suggestion CTAs expose only timing/source data; no roster names, blocked-member explanations, or other schedule details are placed into the URL.
- Reloading or submitting later writes from the calendar route does not re-trigger the same suggestion handoff.
