# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: find-time.spec.ts >> permitted member sees ranked top picks before the lighter browse inventory on the real find-time route
- Location: tests/e2e/find-time.spec.ts:21:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByTestId('find-time-summary')
Expected substring: "10 truthful windows"
Received string:    "Window inventory 8 truthful windows Top picks stay high-density, while browse cards remain lighter-weight for scanning the rest of the truthful inventory."
Timeout: 10000ms

Call log:
  - Expect "toContainText" with timeout 10000ms
  - waiting for getByTestId('find-time-summary')
    14 × locator resolved to <article data-testid="find-time-summary" class="status-card tone-neutral">…</article>
       - unexpected value "Window inventory 8 truthful windows Top picks stay high-density, while browse cards remain lighter-weight for scanning the rest of the truthful inventory."

```

# Page snapshot

```yaml
- main [ref=e4]:
  - complementary [ref=e5]:
    - paragraph [ref=e6]: Truthful availability search
    - heading "Bob Member" [level=1] [ref=e7]
    - paragraph [ref=e8]: Search windows come from the trusted roster and member-attributed busy intervals already authorized for this calendar.
    - generic [ref=e9]:
      - article [ref=e10]:
        - generic [ref=e11]: Protected shell
        - strong [ref=e12]: trusted-online
        - paragraph [ref=e13]: Protected navigation and calendar scope came from the trusted server load.
      - article [ref=e14]:
        - generic [ref=e15]: Find-time route
        - strong [ref=e16]: Truthful results
        - paragraph [ref=e17]: Found 8 truthful windows, including 3 top picks.
      - article [ref=e18]:
        - generic [ref=e19]: Search diagnostics
        - strong [ref=e20]: ready
        - paragraph [ref=e21]: Found 8 truthful windows, including 3 top picks.
        - code [ref=e22]: none
      - article [ref=e23]:
        - generic [ref=e24]: Trusted scope
        - strong [ref=e25]: 2026-04-15 → 2026-05-15
        - paragraph [ref=e26]: 60 minute search over 3 named members.
        - code [ref=e27]: 8 windows
    - navigation [ref=e28]:
      - link "Back to calendar board" [ref=e29] [cursor=pointer]:
        - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111
      - link "Open groups" [ref=e30] [cursor=pointer]:
        - /url: /groups
      - link "Sign out" [ref=e31] [cursor=pointer]:
        - /url: /logout
  - generic [ref=e32]:
    - generic [ref=e33]:
      - generic [ref=e34]:
        - paragraph [ref=e35]: Alpha Team
        - heading "Alpha shared" [level=2] [ref=e36]
        - paragraph [ref=e37]: Review ranked top picks before the lighter browse list. Every explanation below is shaped by the protected server contract for the next 30 days only.
      - generic [ref=e38]:
        - generic [ref=e39]: Default calendar
        - generic [ref=e40]: member access
        - generic [ref=e41]: ready
        - generic [ref=e42]: 3 named members
    - generic [ref=e43]:
      - generic [ref=e44]:
        - paragraph [ref=e45]: Search the protected 30-day horizon
        - heading "Move the window, keep the scope." [level=3] [ref=e46]
        - paragraph [ref=e47]: Duration and start anchor stay explicit. Invalid values, empty results, and query failures never collapse into the same UI state.
      - generic [ref=e48]:
        - generic [ref=e49]:
          - generic [ref=e50]:
            - generic [ref=e51]: Duration (minutes)
            - spinbutton "Duration (minutes)" [ref=e52]: "60"
          - generic [ref=e53]:
            - generic [ref=e54]: Search from (UTC day)
            - textbox "Search from (UTC day)" [ref=e55]: 2026-04-15
        - generic "Duration presets" [ref=e56]:
          - link "30 min" [ref=e57] [cursor=pointer]:
            - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=30&start=2026-04-15
          - link "60 min" [ref=e58] [cursor=pointer]:
            - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=60&start=2026-04-15
          - link "90 min" [ref=e59] [cursor=pointer]:
            - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=90&start=2026-04-15
          - link "120 min" [ref=e60] [cursor=pointer]:
            - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=120&start=2026-04-15
        - generic [ref=e61]:
          - button "Refresh truthful windows" [ref=e62] [cursor=pointer]
          - link "Back to board" [ref=e63] [cursor=pointer]:
            - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111
    - generic [ref=e64]:
      - article [ref=e65]:
        - generic [ref=e66]: Window inventory
        - strong [ref=e67]: 8 truthful windows
        - paragraph [ref=e68]: Top picks stay high-density, while browse cards remain lighter-weight for scanning the rest of the truthful inventory.
      - article [ref=e69]:
        - generic [ref=e70]: Roster names
        - strong [ref=e71]: Alice Owner · Bob Member · Dana Multi-Group
        - paragraph [ref=e72]: Only names already authorized for this calendar scope appear in these recommendation surfaces.
    - generic [ref=e73]:
      - generic [ref=e74]:
        - generic [ref=e75]:
          - generic [ref=e76]:
            - paragraph [ref=e77]: Top picks
            - heading "Ranked before truncation." [level=3] [ref=e78]
            - paragraph [ref=e79]: "These cards keep the richer explanation layer: who is free, who is blocked, and what nearby busy edges explain the adjacent exclusions."
          - generic [ref=e80]: 3 surfaced
        - generic [ref=e81]:
          - article [ref=e82]:
            - generic [ref=e83]:
              - generic [ref=e84]:
                - generic [ref=e85]:
                  - paragraph [ref=e86]: Top pick 1
                  - generic [ref=e87]: 3 shared • 39180 slack min • 0 edge pressure
                - heading "Fri, Apr 17, 2026 · 18:00–19:00 UTC" [level=4] [ref=e88]
                - paragraph [ref=e89]: All 3 named members stay free across this slot and the nearby edges remain unconstrained.
              - generic [ref=e90]:
                - generic [ref=e91]: 3 free
                - generic [ref=e92]: 0 blocked nearby
            - generic [ref=e93]:
              - generic [ref=e94]:
                - generic [ref=e95]: Exact slot
                - strong [ref=e96]: Fri, Apr 17, 2026 18:00 → Fri, Apr 17, 2026 19:00 UTC
              - generic [ref=e97]:
                - generic [ref=e98]: Continuous span
                - strong [ref=e99]: Fri, Apr 17, 2026 18:00 → Fri, May 15, 2026 00:00 UTC
              - generic [ref=e100]:
                - generic [ref=e101]: Span slack
                - strong [ref=e102]: 39180 minutes
            - generic [ref=e103]:
              - generic [ref=e104]:
                - paragraph [ref=e105]: Who is free
                - list [ref=e106]:
                  - listitem [ref=e107]: Alice Owner
                  - listitem [ref=e108]: Bob Member
                  - listitem [ref=e109]: Dana Multi-Group
              - generic [ref=e110]:
                - paragraph [ref=e111]: Who is blocked
                - paragraph [ref=e112]: All named members stay free across this exact slot.
            - generic [ref=e113]:
              - generic [ref=e114]:
                - paragraph [ref=e115]: Why earlier times fail
                - paragraph [ref=e116]: No trusted busy interval pushes into the start edge for this shortlist slot.
              - generic [ref=e117]:
                - paragraph [ref=e118]: Why nearby later times fail
                - paragraph [ref=e119]: No trusted busy interval pushes into the trailing edge for this shortlist slot.
            - link "Create from this slot" [ref=e121] [cursor=pointer]:
              - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-17T18%3A00%3A00.000Z&prefillEndAt=2026-04-17T19%3A00%3A00.000Z&source=find-time
          - article [ref=e122]:
            - generic [ref=e123]:
              - generic [ref=e124]:
                - generic [ref=e125]:
                  - paragraph [ref=e126]: Top pick 2
                  - generic [ref=e127]: 3 shared • 1470 slack min • 0 edge pressure
                - heading "Thu, Apr 16, 2026 · 14:30–15:30 UTC" [level=4] [ref=e128]
                - paragraph [ref=e129]: All 3 named members stay free across this slot and the nearby edges remain unconstrained.
              - generic [ref=e130]:
                - generic [ref=e131]: 3 free
                - generic [ref=e132]: 0 blocked nearby
            - generic [ref=e133]:
              - generic [ref=e134]:
                - generic [ref=e135]: Exact slot
                - strong [ref=e136]: Thu, Apr 16, 2026 14:30 → Thu, Apr 16, 2026 15:30 UTC
              - generic [ref=e137]:
                - generic [ref=e138]: Continuous span
                - strong [ref=e139]: Thu, Apr 16, 2026 14:30 → Fri, Apr 17, 2026 16:00 UTC
              - generic [ref=e140]:
                - generic [ref=e141]: Span slack
                - strong [ref=e142]: 1470 minutes
            - generic [ref=e143]:
              - generic [ref=e144]:
                - paragraph [ref=e145]: Who is free
                - list [ref=e146]:
                  - listitem [ref=e147]: Alice Owner
                  - listitem [ref=e148]: Bob Member
                  - listitem [ref=e149]: Dana Multi-Group
              - generic [ref=e150]:
                - paragraph [ref=e151]: Who is blocked
                - paragraph [ref=e152]: All named members stay free across this exact slot.
            - generic [ref=e153]:
              - generic [ref=e154]:
                - paragraph [ref=e155]: Why earlier times fail
                - paragraph [ref=e156]: No trusted busy interval pushes into the start edge for this shortlist slot.
              - generic [ref=e157]:
                - paragraph [ref=e158]: Why nearby later times fail
                - paragraph [ref=e159]: No trusted busy interval pushes into the trailing edge for this shortlist slot.
            - link "Create from this slot" [ref=e161] [cursor=pointer]:
              - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-16T14%3A30%3A00.000Z&prefillEndAt=2026-04-16T15%3A30%3A00.000Z&source=find-time
          - article [ref=e162]:
            - generic [ref=e163]:
              - generic [ref=e164]:
                - generic [ref=e165]:
                  - paragraph [ref=e166]: Top pick 3
                  - generic [ref=e167]: 3 shared • 1185 slack min • 0 edge pressure
                - heading "Wed, Apr 15, 2026 · 11:45–12:45 UTC" [level=4] [ref=e168]
                - paragraph [ref=e169]: All 3 named members stay free across this slot and the nearby edges remain unconstrained.
              - generic [ref=e170]:
                - generic [ref=e171]: 3 free
                - generic [ref=e172]: 0 blocked nearby
            - generic [ref=e173]:
              - generic [ref=e174]:
                - generic [ref=e175]: Exact slot
                - strong [ref=e176]: Wed, Apr 15, 2026 11:45 → Wed, Apr 15, 2026 12:45 UTC
              - generic [ref=e177]:
                - generic [ref=e178]: Continuous span
                - strong [ref=e179]: Wed, Apr 15, 2026 11:45 → Thu, Apr 16, 2026 08:30 UTC
              - generic [ref=e180]:
                - generic [ref=e181]: Span slack
                - strong [ref=e182]: 1185 minutes
            - generic [ref=e183]:
              - generic [ref=e184]:
                - paragraph [ref=e185]: Who is free
                - list [ref=e186]:
                  - listitem [ref=e187]: Alice Owner
                  - listitem [ref=e188]: Bob Member
                  - listitem [ref=e189]: Dana Multi-Group
              - generic [ref=e190]:
                - paragraph [ref=e191]: Who is blocked
                - paragraph [ref=e192]: All named members stay free across this exact slot.
            - generic [ref=e193]:
              - generic [ref=e194]:
                - paragraph [ref=e195]: Why earlier times fail
                - paragraph [ref=e196]: No trusted busy interval pushes into the start edge for this shortlist slot.
              - generic [ref=e197]:
                - paragraph [ref=e198]: Why nearby later times fail
                - paragraph [ref=e199]: No trusted busy interval pushes into the trailing edge for this shortlist slot.
            - link "Create from this slot" [ref=e201] [cursor=pointer]:
              - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-15T11%3A45%3A00.000Z&prefillEndAt=2026-04-15T12%3A45%3A00.000Z&source=find-time
      - generic [ref=e202]:
        - generic [ref=e203]:
          - generic [ref=e204]:
            - paragraph [ref=e205]: Browse all ranked windows
            - heading "Lighter follow-on inventory." [level=3] [ref=e206]
            - paragraph [ref=e207]: Browse cards stay truthful but compact so the shortlist can carry the heavier explanation load.
          - generic [ref=e208]: 5 remaining
        - generic [ref=e209]:
          - article [ref=e210]:
            - generic [ref=e211]:
              - generic [ref=e212]:
                - paragraph [ref=e213]: Browse 1
                - heading "Wed, Apr 15, 2026 · 00:00–01:00 UTC" [level=4] [ref=e214]
              - generic [ref=e215]: 3 free / 0 blocked
            - paragraph [ref=e216]: Shared slot with no blocked roster members during the exact window.
            - generic [ref=e217]:
              - generic [ref=e218]:
                - generic [ref=e219]: Exact slot
                - strong [ref=e220]: Wed, Apr 15, 2026 00:00 → Wed, Apr 15, 2026 01:00 UTC
              - generic [ref=e221]:
                - generic [ref=e222]: Span
                - strong [ref=e223]: 510 minutes
            - generic [ref=e224]:
              - generic [ref=e225]:
                - paragraph [ref=e226]: Free
                - paragraph [ref=e227]: Alice Owner · Bob Member · Dana Multi-Group
              - generic [ref=e228]:
                - paragraph [ref=e229]: Nearby edges
                - paragraph [ref=e230]: "Before: No leading constraint summary."
                - paragraph [ref=e231]: "After: No trailing constraint summary."
            - link "Create from this slot" [ref=e233] [cursor=pointer]:
              - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-15T00%3A00%3A00.000Z&prefillEndAt=2026-04-15T01%3A00%3A00.000Z&source=find-time
          - article [ref=e234]:
            - generic [ref=e235]:
              - generic [ref=e236]:
                - paragraph [ref=e237]: Browse 2
                - heading "Thu, Apr 16, 2026 · 09:00–10:00 UTC" [level=4] [ref=e238]
              - generic [ref=e239]: 3 free / 0 blocked
            - paragraph [ref=e240]: Shared slot with no blocked roster members during the exact window.
            - generic [ref=e241]:
              - generic [ref=e242]:
                - generic [ref=e243]: Exact slot
                - strong [ref=e244]: Thu, Apr 16, 2026 09:00 → Thu, Apr 16, 2026 10:00 UTC
              - generic [ref=e245]:
                - generic [ref=e246]: Span
                - strong [ref=e247]: 180 minutes
            - generic [ref=e248]:
              - generic [ref=e249]:
                - paragraph [ref=e250]: Free
                - paragraph [ref=e251]: Alice Owner · Bob Member · Dana Multi-Group
              - generic [ref=e252]:
                - paragraph [ref=e253]: Nearby edges
                - paragraph [ref=e254]: "Before: No leading constraint summary."
                - paragraph [ref=e255]: "After: No trailing constraint summary."
            - link "Create from this slot" [ref=e257] [cursor=pointer]:
              - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-16T09%3A00%3A00.000Z&prefillEndAt=2026-04-16T10%3A00%3A00.000Z&source=find-time
          - article [ref=e258]:
            - generic [ref=e259]:
              - generic [ref=e260]:
                - paragraph [ref=e261]: Browse 3
                - heading "Wed, Apr 15, 2026 · 09:45–10:45 UTC" [level=4] [ref=e262]
              - generic [ref=e263]: 2 free / 1 blocked
            - paragraph [ref=e264]: 2 free • 1 blocked nearby.
            - generic [ref=e265]:
              - generic [ref=e266]:
                - generic [ref=e267]: Exact slot
                - strong [ref=e268]: Wed, Apr 15, 2026 09:45 → Wed, Apr 15, 2026 10:45 UTC
              - generic [ref=e269]:
                - generic [ref=e270]: Span
                - strong [ref=e271]: 120 minutes
            - generic [ref=e272]:
              - generic [ref=e273]:
                - paragraph [ref=e274]: Free
                - paragraph [ref=e275]: Bob Member · Dana Multi-Group
              - generic [ref=e276]:
                - paragraph [ref=e277]: Nearby edges
                - paragraph [ref=e278]: "Before: Morning intake offline revised (Alice Owner)"
                - paragraph [ref=e279]: "After: Morning intake offline revised (Alice Owner)"
            - link "Create from this slot" [ref=e281] [cursor=pointer]:
              - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-15T09%3A45%3A00.000Z&prefillEndAt=2026-04-15T10%3A45%3A00.000Z&source=find-time
          - article [ref=e282]:
            - generic [ref=e283]:
              - generic [ref=e284]:
                - paragraph [ref=e285]: Browse 4
                - heading "Thu, Apr 16, 2026 · 12:00–13:00 UTC" [level=4] [ref=e286]
              - generic [ref=e287]: 2 free / 1 blocked
            - paragraph [ref=e288]: 2 free • 1 blocked nearby.
            - generic [ref=e289]:
              - generic [ref=e290]:
                - generic [ref=e291]: Exact slot
                - strong [ref=e292]: Thu, Apr 16, 2026 12:00 → Thu, Apr 16, 2026 13:00 UTC
              - generic [ref=e293]:
                - generic [ref=e294]: Span
                - strong [ref=e295]: 90 minutes
            - generic [ref=e296]:
              - generic [ref=e297]:
                - paragraph [ref=e298]: Free
                - paragraph [ref=e299]: Alice Owner · Bob Member
              - generic [ref=e300]:
                - paragraph [ref=e301]: Nearby edges
                - paragraph [ref=e302]: "Before: Kitchen prep (Dana Multi-Group)"
                - paragraph [ref=e303]: "After: Kitchen prep (Dana Multi-Group)"
            - link "Create from this slot" [ref=e305] [cursor=pointer]:
              - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-16T12%3A00%3A00.000Z&prefillEndAt=2026-04-16T13%3A00%3A00.000Z&source=find-time
          - article [ref=e306]:
            - generic [ref=e307]:
              - generic [ref=e308]:
                - paragraph [ref=e309]: Browse 5
                - heading "Fri, Apr 17, 2026 · 16:00–17:00 UTC" [level=4] [ref=e310]
              - generic [ref=e311]: 1 free / 2 blocked
            - paragraph [ref=e312]: 1 free • 2 blocked nearby.
            - generic [ref=e313]:
              - generic [ref=e314]:
                - generic [ref=e315]: Exact slot
                - strong [ref=e316]: Fri, Apr 17, 2026 16:00 → Fri, Apr 17, 2026 17:00 UTC
              - generic [ref=e317]:
                - generic [ref=e318]: Span
                - strong [ref=e319]: 120 minutes
            - generic [ref=e320]:
              - generic [ref=e321]:
                - paragraph [ref=e322]: Free
                - paragraph [ref=e323]: Alice Owner
              - generic [ref=e324]:
                - paragraph [ref=e325]: Nearby edges
                - paragraph [ref=e326]: "Before: Supplier call (Bob Member) · Supplier call (Dana Multi-Group)"
                - paragraph [ref=e327]: "After: Supplier call (Bob Member) · Supplier call (Dana Multi-Group)"
            - link "Create from this slot" [ref=e329] [cursor=pointer]:
              - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-17T16%3A00%3A00.000Z&prefillEndAt=2026-04-17T17%3A00%3A00.000Z&source=find-time
    - generic [ref=e330]:
      - generic [ref=e331]:
        - generic [ref=e332]:
          - paragraph [ref=e333]: Visible calendar inventory
          - heading "Jump only within the calendars your session can already prove." [level=3] [ref=e334]
        - generic [ref=e335]: 2 visible
      - generic [ref=e336]:
        - link "Alpha shared Default calendar • find-time" [ref=e337] [cursor=pointer]:
          - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=60&start=2026-04-15
          - strong [ref=e338]: Alpha shared
          - generic [ref=e339]: Default calendar • find-time
        - link "Alpha backlog Secondary calendar • find-time" [ref=e340] [cursor=pointer]:
          - /url: /calendars/aaaaaaaa-aaaa-1111-1111-222222222222/find-time?duration=60&start=2026-04-15
          - strong [ref=e341]: Alpha backlog
          - generic [ref=e342]: Secondary calendar • find-time
```

# Test source

```ts
  1   | import {
  2   |   expect,
  3   |   expectedCreateShiftPrefillValues,
  4   |   openCalendarWeek,
  5   |   openFindTimeRoute,
  6   |   readCreateShiftPrefillSnapshot,
  7   |   readFindTimeBrowseWindowCtaSnapshot,
  8   |   readFindTimeBrowseWindowSnapshot,
  9   |   readFindTimeTopPickCtaSnapshot,
  10  |   readFindTimeTopPickSnapshot,
  11  |   readVisibleWeekFromBoard,
  12  |   seededCalendars,
  13  |   seededFindTime,
  14  |   seededUsers,
  15  |   signInThroughUi,
  16  |   test
  17  | } from './fixtures';
  18  | 
  19  | test.describe.configure({ mode: 'serial' });
  20  | 
  21  | test('permitted member sees ranked top picks before the lighter browse inventory on the real find-time route', async ({
  22  |   page,
  23  |   flow
  24  | }) => {
  25  |   await test.step('phase: sign in as the seeded Alpha member and open the permitted calendar board', async () => {
  26  |     flow.mark('login', seededUsers.alphaMember.email);
  27  |     await signInThroughUi(page, seededUsers.alphaMember);
  28  |     await openCalendarWeek({
  29  |       page,
  30  |       flow,
  31  |       calendarId: seededCalendars.alphaShared,
  32  |       visibleWeekStart: seededScheduleStart(),
  33  |       phase: 'open-alpha-calendar'
  34  |     });
  35  |     await expect(page.getByTestId('find-time-entrypoint')).toBeVisible();
  36  |   });
  37  | 
  38  |   await test.step('phase: follow the real calendar entrypoint into the find-time route', async () => {
  39  |     flow.mark('calendar-entrypoint', seededCalendars.alphaShared);
  40  |     await page.getByTestId('find-time-entrypoint').click();
  41  | 
  42  |     await expect(page).toHaveURL(new RegExp(`/calendars/${seededCalendars.alphaShared}/find-time`));
  43  |     await expect(page.getByTestId('find-time-shell')).toBeVisible();
  44  |     await expect(page.getByTestId('find-time-duration-input')).toHaveValue('60');
  45  |   });
  46  | 
  47  |   await test.step('phase: search the seeded day range and verify shortlist order plus explanation density', async () => {
  48  |     await openFindTimeRoute({
  49  |       page,
  50  |       flow,
  51  |       calendarId: seededCalendars.alphaShared,
  52  |       durationMinutes: seededFindTime.durationMinutes,
  53  |       start: seededFindTime.start,
  54  |       phase: 'find-time-search'
  55  |     });
  56  | 
  57  |     await expect(page).toHaveURL(
  58  |       new RegExp(`/calendars/${seededCalendars.alphaShared}/find-time\\?duration=${seededFindTime.durationMinutes}&start=${seededFindTime.start}`)
  59  |     );
  60  |     await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-status', 'ready');
  61  |     await expect(page.getByTestId('find-time-search-state')).toHaveAttribute('data-status', 'ready');
> 62  |     await expect(page.getByTestId('find-time-summary')).toContainText(`${seededFindTime.alphaWindowCount} truthful windows`);
      |                                                         ^ Error: expect(locator).toContainText(expected) failed
  63  |     await expect(page.getByTestId('find-time-results')).toHaveAttribute('data-window-count', String(seededFindTime.alphaWindowCount));
  64  |     await expect(page.getByTestId('find-time-results')).toHaveAttribute('data-top-pick-count', String(seededFindTime.topPickCount));
  65  |     await expect(page.getByTestId('find-time-results')).toHaveAttribute('data-browse-count', String(seededFindTime.browseCount));
  66  | 
  67  |     await expect(
  68  |       page.evaluate(() => {
  69  |         const topPicks = document.querySelector('[data-testid="find-time-top-picks"]');
  70  |         const browse = document.querySelector('[data-testid="find-time-browse-results"]');
  71  | 
  72  |         if (!topPicks || !browse) {
  73  |           return false;
  74  |         }
  75  | 
  76  |         return Boolean(topPicks.compareDocumentPosition(browse) & Node.DOCUMENT_POSITION_FOLLOWING);
  77  |       })
  78  |     ).resolves.toBe(true);
  79  | 
  80  |     await expect(page.getByTestId('find-time-top-picks')).toBeVisible();
  81  |     await expect(page.getByTestId('find-time-browse-results')).toBeVisible();
  82  | 
  83  |     await expect(await readFindTimeTopPickSnapshot(page, 0)).toEqual(seededFindTime.topPicks[0]);
  84  |     await expect(await readFindTimeTopPickSnapshot(page, 1)).toEqual(seededFindTime.topPicks[1]);
  85  |     await expect(await readFindTimeTopPickSnapshot(page, 2)).toEqual(seededFindTime.topPicks[2]);
  86  | 
  87  |     const focusedBrowseCard = page
  88  |       .locator(
  89  |         `[data-testid^="find-time-browse-window-"][data-start-at="${seededFindTime.focusedBrowseWindow.startAt}"][data-end-at="${seededFindTime.focusedBrowseWindow.endAt}"]`
  90  |       )
  91  |       .first();
  92  |     await expect(focusedBrowseCard).toBeVisible();
  93  |     const focusedBrowseTestId = await focusedBrowseCard.getAttribute('data-testid');
  94  |     const focusedBrowseIndex = Number.parseInt(
  95  |       (focusedBrowseTestId ?? '').replace('find-time-browse-window-', ''),
  96  |       10
  97  |     );
  98  | 
  99  |     expect(Number.isFinite(focusedBrowseIndex), 'expected the focused browse window to expose its deterministic data-testid').toBe(true);
  100 | 
  101 |     await expect(await readFindTimeTopPickCtaSnapshot(page, 0)).toMatchObject({
  102 |       source: 'find-time',
  103 |       targetWeekStart: '2026-04-13',
  104 |       startAt: seededFindTime.topPicks[0].startAt,
  105 |       endAt: seededFindTime.topPicks[0].endAt,
  106 |       label: 'Create from this slot'
  107 |     });
  108 |     await expect(await readFindTimeBrowseWindowCtaSnapshot(page, focusedBrowseIndex)).toMatchObject({
  109 |       source: 'find-time',
  110 |       targetWeekStart: '2026-04-13',
  111 |       startAt: seededFindTime.focusedBrowseWindow.startAt,
  112 |       endAt: seededFindTime.focusedBrowseWindow.endAt,
  113 |       label: 'Create from this slot'
  114 |     });
  115 | 
  116 |     await expect(page.getByTestId('find-time-top-pick-0-free-members')).toContainText('Alice Owner');
  117 |     await expect(page.getByTestId('find-time-top-pick-0-free-members')).toContainText('Bob Member');
  118 |     await expect(page.getByTestId('find-time-top-pick-0-free-members')).toContainText('Dana Multi-Group');
  119 |     await expect(page.getByTestId('find-time-top-pick-0-blocked-members')).toContainText(
  120 |       'All named members stay free across this exact slot.'
  121 |     );
  122 |     await expect(page.getByTestId('find-time-top-pick-0-nearby-leading')).toContainText(
  123 |       'No trusted busy interval pushes into the start edge for this shortlist slot.'
  124 |     );
  125 |     await expect(page.getByTestId('find-time-top-pick-0-nearby-trailing')).toContainText(
  126 |       'No trusted busy interval pushes into the trailing edge for this shortlist slot.'
  127 |     );
  128 | 
  129 |     await expect(page.getByTestId('find-time-browse-window-0')).not.toContainText('Who is blocked');
  130 |     await expect(page.getByTestId('find-time-browse-window-0')).not.toContainText('Why earlier times fail');
  131 | 
  132 |     const focusedBrowseSnapshot = await readFindTimeBrowseWindowSnapshot(page, focusedBrowseIndex);
  133 |     expect(focusedBrowseSnapshot.startAt).toBe(seededFindTime.focusedBrowseWindow.startAt);
  134 |     expect(focusedBrowseSnapshot.endAt).toBe(seededFindTime.focusedBrowseWindow.endAt);
  135 |     await expect(page.getByTestId(`find-time-browse-window-${focusedBrowseIndex}-cta`)).toBeVisible();
  136 |   });
  137 | });
  138 | 
  139 | test('suggestion handoff lands on the chosen slot week, opens the prefilled create dialog, and strips one-shot URL state on arrival', async ({
  140 |   page,
  141 |   flow
  142 | }) => {
  143 |   const earlierAnchorStart = '2026-04-01';
  144 |   const earlierAnchorWeekStart = '2026-03-30';
  145 | 
  146 |   await test.step('phase: sign in and open truthful find-time results from the permitted Alpha calendar', async () => {
  147 |     flow.mark('login', seededUsers.alphaMember.email);
  148 |     await signInThroughUi(page, seededUsers.alphaMember);
  149 |     await openFindTimeRoute({
  150 |       page,
  151 |       flow,
  152 |       calendarId: seededCalendars.alphaShared,
  153 |       durationMinutes: seededFindTime.durationMinutes,
  154 |       start: earlierAnchorStart,
  155 |       phase: 'find-time-handoff-source'
  156 |     });
  157 | 
  158 |     await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-status', 'ready');
  159 |     await expect(page.getByTestId('find-time-results')).toBeVisible();
  160 |   });
  161 | 
  162 |   let chosenSuggestion: Awaited<ReturnType<typeof readFindTimeTopPickCtaSnapshot>> | undefined;
```