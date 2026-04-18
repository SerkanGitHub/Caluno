# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: find-time.spec.ts >> permitted member can enter find-time from the calendar board and browse truthful named windows
- Location: tests/e2e/find-time.spec.ts:15:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 4
+ Received  + 4

@@ -2,10 +2,10 @@
    "availableMembers": Array [
      "Alice Owner",
      "Bob Member",
      "Dana Multi-Group",
    ],
-   "endAt": "2026-04-15T01:00:00.000Z",
-   "spanEndAt": "2026-04-15T08:30:00.000Z",
-   "spanStartAt": "2026-04-15T00:00:00.000Z",
-   "startAt": "2026-04-15T00:00:00.000Z",
+   "endAt": "2026-04-16T16:00:00.000Z",
+   "spanEndAt": "2026-05-15T00:00:00.000Z",
+   "spanStartAt": "2026-04-16T15:00:00.000Z",
+   "startAt": "2026-04-16T15:00:00.000Z",
  }
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
        - paragraph [ref=e17]: Found 9 truthful windows for the requested duration.
      - article [ref=e18]:
        - generic [ref=e19]: Search diagnostics
        - strong [ref=e20]: ready
        - paragraph [ref=e21]: Found 9 truthful windows for the requested duration.
        - code [ref=e22]: none
      - article [ref=e23]:
        - generic [ref=e24]: Trusted scope
        - strong [ref=e25]: 2026-04-15 → 2026-05-15
        - paragraph [ref=e26]: 60 minute search over 3 named members.
        - code [ref=e27]: 9 windows
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
        - paragraph [ref=e37]: Browse truthful windows from named member availability. Every card below is shaped from the protected server contract for the next 30 days only.
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
        - strong [ref=e67]: 9 truthful windows
        - paragraph [ref=e68]: Exact cards show the requested slot first, then the wider continuous span that still remains free for the same member set.
      - article [ref=e69]:
        - generic [ref=e70]: Roster names
        - strong [ref=e71]: Alice Owner · Bob Member · Dana Multi-Group
        - paragraph [ref=e72]: Only names already authorized for this calendar scope appear in the browse list.
    - generic [ref=e73]:
      - article [ref=e74]:
        - generic [ref=e75]:
          - generic [ref=e76]:
            - paragraph [ref=e77]: Window 1
            - heading "Thu, Apr 16, 2026 · 15:00–16:00 UTC" [level=3] [ref=e78]
          - generic [ref=e79]: 3 free / 0 busy
        - generic [ref=e80]:
          - generic [ref=e81]:
            - generic [ref=e82]: Exact slot
            - strong [ref=e83]: Thu, Apr 16, 2026 15:00 → Thu, Apr 16, 2026 16:00 UTC
          - generic [ref=e84]:
            - generic [ref=e85]: Continuous span
            - strong [ref=e86]: Thu, Apr 16, 2026 15:00 → Fri, May 15, 2026 00:00 UTC
          - generic [ref=e87]:
            - generic [ref=e88]: Span length
            - strong [ref=e89]: 40860 minutes
        - generic [ref=e90]:
          - paragraph [ref=e91]: Available members
          - list [ref=e92]:
            - listitem [ref=e93]: Alice Owner
            - listitem [ref=e94]: Bob Member
            - listitem [ref=e95]: Dana Multi-Group
      - article [ref=e96]:
        - generic [ref=e97]:
          - generic [ref=e98]:
            - paragraph [ref=e99]: Window 2
            - heading "Wed, Apr 15, 2026 · 15:00–16:00 UTC" [level=3] [ref=e100]
          - generic [ref=e101]: 3 free / 0 busy
        - generic [ref=e102]:
          - generic [ref=e103]:
            - generic [ref=e104]: Exact slot
            - strong [ref=e105]: Wed, Apr 15, 2026 15:00 → Wed, Apr 15, 2026 16:00 UTC
          - generic [ref=e106]:
            - generic [ref=e107]: Continuous span
            - strong [ref=e108]: Wed, Apr 15, 2026 15:00 → Thu, Apr 16, 2026 08:30 UTC
          - generic [ref=e109]:
            - generic [ref=e110]: Span length
            - strong [ref=e111]: 1050 minutes
        - generic [ref=e112]:
          - paragraph [ref=e113]: Available members
          - list [ref=e114]:
            - listitem [ref=e115]: Alice Owner
            - listitem [ref=e116]: Bob Member
            - listitem [ref=e117]: Dana Multi-Group
      - article [ref=e118]:
        - generic [ref=e119]:
          - generic [ref=e120]:
            - paragraph [ref=e121]: Window 3
            - heading "Wed, Apr 15, 2026 · 00:00–01:00 UTC" [level=3] [ref=e122]
          - generic [ref=e123]: 3 free / 0 busy
        - generic [ref=e124]:
          - generic [ref=e125]:
            - generic [ref=e126]: Exact slot
            - strong [ref=e127]: Wed, Apr 15, 2026 00:00 → Wed, Apr 15, 2026 01:00 UTC
          - generic [ref=e128]:
            - generic [ref=e129]: Continuous span
            - strong [ref=e130]: Wed, Apr 15, 2026 00:00 → Wed, Apr 15, 2026 08:30 UTC
          - generic [ref=e131]:
            - generic [ref=e132]: Span length
            - strong [ref=e133]: 510 minutes
        - generic [ref=e134]:
          - paragraph [ref=e135]: Available members
          - list [ref=e136]:
            - listitem [ref=e137]: Alice Owner
            - listitem [ref=e138]: Bob Member
            - listitem [ref=e139]: Dana Multi-Group
      - article [ref=e140]:
        - generic [ref=e141]:
          - generic [ref=e142]:
            - paragraph [ref=e143]: Window 4
            - heading "Thu, Apr 16, 2026 · 09:00–10:00 UTC" [level=3] [ref=e144]
          - generic [ref=e145]: 3 free / 0 busy
        - generic [ref=e146]:
          - generic [ref=e147]:
            - generic [ref=e148]: Exact slot
            - strong [ref=e149]: Thu, Apr 16, 2026 09:00 → Thu, Apr 16, 2026 10:00 UTC
          - generic [ref=e150]:
            - generic [ref=e151]: Continuous span
            - strong [ref=e152]: Thu, Apr 16, 2026 09:00 → Thu, Apr 16, 2026 12:00 UTC
          - generic [ref=e153]:
            - generic [ref=e154]: Span length
            - strong [ref=e155]: 180 minutes
        - generic [ref=e156]:
          - paragraph [ref=e157]: Available members
          - list [ref=e158]:
            - listitem [ref=e159]: Alice Owner
            - listitem [ref=e160]: Bob Member
            - listitem [ref=e161]: Dana Multi-Group
      - article [ref=e162]:
        - generic [ref=e163]:
          - generic [ref=e164]:
            - paragraph [ref=e165]: Window 5
            - heading "Wed, Apr 15, 2026 · 11:00–12:00 UTC" [level=3] [ref=e166]
          - generic [ref=e167]: 3 free / 0 busy
        - generic [ref=e168]:
          - generic [ref=e169]:
            - generic [ref=e170]: Exact slot
            - strong [ref=e171]: Wed, Apr 15, 2026 11:00 → Wed, Apr 15, 2026 12:00 UTC
          - generic [ref=e172]:
            - generic [ref=e173]: Continuous span
            - strong [ref=e174]: Wed, Apr 15, 2026 11:00 → Wed, Apr 15, 2026 13:00 UTC
          - generic [ref=e175]:
            - generic [ref=e176]: Span length
            - strong [ref=e177]: 120 minutes
        - generic [ref=e178]:
          - paragraph [ref=e179]: Available members
          - list [ref=e180]:
            - listitem [ref=e181]: Alice Owner
            - listitem [ref=e182]: Bob Member
            - listitem [ref=e183]: Dana Multi-Group
      - article [ref=e184]:
        - generic [ref=e185]:
          - generic [ref=e186]:
            - paragraph [ref=e187]: Window 6
            - heading "Wed, Apr 15, 2026 · 08:30–09:30 UTC" [level=3] [ref=e188]
          - generic [ref=e189]: 2 free / 1 busy
        - generic [ref=e190]:
          - generic [ref=e191]:
            - generic [ref=e192]: Exact slot
            - strong [ref=e193]: Wed, Apr 15, 2026 08:30 → Wed, Apr 15, 2026 09:30 UTC
          - generic [ref=e194]:
            - generic [ref=e195]: Continuous span
            - strong [ref=e196]: Wed, Apr 15, 2026 08:30 → Wed, Apr 15, 2026 11:00 UTC
          - generic [ref=e197]:
            - generic [ref=e198]: Span length
            - strong [ref=e199]: 150 minutes
        - generic [ref=e200]:
          - paragraph [ref=e201]: Available members
          - list [ref=e202]:
            - listitem [ref=e203]: Bob Member
            - listitem [ref=e204]: Dana Multi-Group
      - article [ref=e205]:
        - generic [ref=e206]:
          - generic [ref=e207]:
            - paragraph [ref=e208]: Window 7
            - heading "Wed, Apr 15, 2026 · 13:00–14:00 UTC" [level=3] [ref=e209]
          - generic [ref=e210]: 2 free / 1 busy
        - generic [ref=e211]:
          - generic [ref=e212]:
            - generic [ref=e213]: Exact slot
            - strong [ref=e214]: Wed, Apr 15, 2026 13:00 → Wed, Apr 15, 2026 14:00 UTC
          - generic [ref=e215]:
            - generic [ref=e216]: Continuous span
            - strong [ref=e217]: Wed, Apr 15, 2026 13:00 → Wed, Apr 15, 2026 15:00 UTC
          - generic [ref=e218]:
            - generic [ref=e219]: Span length
            - strong [ref=e220]: 120 minutes
        - generic [ref=e221]:
          - paragraph [ref=e222]: Available members
          - list [ref=e223]:
            - listitem [ref=e224]: Alice Owner
            - listitem [ref=e225]: Dana Multi-Group
      - article [ref=e226]:
        - generic [ref=e227]:
          - generic [ref=e228]:
            - paragraph [ref=e229]: Window 8
            - heading "Thu, Apr 16, 2026 · 12:00–13:00 UTC" [level=3] [ref=e230]
          - generic [ref=e231]: 2 free / 1 busy
        - generic [ref=e232]:
          - generic [ref=e233]:
            - generic [ref=e234]: Exact slot
            - strong [ref=e235]: Thu, Apr 16, 2026 12:00 → Thu, Apr 16, 2026 13:00 UTC
          - generic [ref=e236]:
            - generic [ref=e237]: Continuous span
            - strong [ref=e238]: Thu, Apr 16, 2026 12:00 → Thu, Apr 16, 2026 13:00 UTC
          - generic [ref=e239]:
            - generic [ref=e240]: Span length
            - strong [ref=e241]: 60 minutes
        - generic [ref=e242]:
          - paragraph [ref=e243]: Available members
          - list [ref=e244]:
            - listitem [ref=e245]: Alice Owner
            - listitem [ref=e246]: Bob Member
      - article [ref=e247]:
        - generic [ref=e248]:
          - generic [ref=e249]:
            - paragraph [ref=e250]: Window 9
            - heading "Thu, Apr 16, 2026 · 13:00–14:00 UTC" [level=3] [ref=e251]
          - generic [ref=e252]: 1 free / 2 busy
        - generic [ref=e253]:
          - generic [ref=e254]:
            - generic [ref=e255]: Exact slot
            - strong [ref=e256]: Thu, Apr 16, 2026 13:00 → Thu, Apr 16, 2026 14:00 UTC
          - generic [ref=e257]:
            - generic [ref=e258]: Continuous span
            - strong [ref=e259]: Thu, Apr 16, 2026 13:00 → Thu, Apr 16, 2026 15:00 UTC
          - generic [ref=e260]:
            - generic [ref=e261]: Span length
            - strong [ref=e262]: 120 minutes
        - generic [ref=e263]:
          - paragraph [ref=e264]: Available members
          - list [ref=e265]:
            - listitem [ref=e266]: Alice Owner
    - generic [ref=e267]:
      - generic [ref=e268]:
        - generic [ref=e269]:
          - paragraph [ref=e270]: Visible calendar inventory
          - heading "Jump only within the calendars your session can already prove." [level=3] [ref=e271]
        - generic [ref=e272]: 2 visible
      - generic [ref=e273]:
        - link "Alpha shared Default calendar • find-time" [ref=e274] [cursor=pointer]:
          - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=60&start=2026-04-15
          - strong [ref=e275]: Alpha shared
          - generic [ref=e276]: Default calendar • find-time
        - link "Alpha backlog Secondary calendar • find-time" [ref=e277] [cursor=pointer]:
          - /url: /calendars/aaaaaaaa-aaaa-1111-1111-222222222222/find-time?duration=60&start=2026-04-15
          - strong [ref=e278]: Alpha backlog
          - generic [ref=e279]: Secondary calendar • find-time
```

# Test source

```ts
  1   | import {
  2   |   expect,
  3   |   openCalendarWeek,
  4   |   openFindTimeRoute,
  5   |   readFindTimeWindowSnapshot,
  6   |   seededCalendars,
  7   |   seededFindTime,
  8   |   seededUsers,
  9   |   signInThroughUi,
  10  |   test
  11  | } from './fixtures';
  12  | 
  13  | test.describe.configure({ mode: 'serial' });
  14  | 
  15  | test('permitted member can enter find-time from the calendar board and browse truthful named windows', async ({
  16  |   page,
  17  |   flow
  18  | }) => {
  19  |   await test.step('phase: sign in as the seeded Alpha member and open the permitted calendar board', async () => {
  20  |     flow.mark('login', seededUsers.alphaMember.email);
  21  |     await signInThroughUi(page, seededUsers.alphaMember);
  22  |     await openCalendarWeek({
  23  |       page,
  24  |       flow,
  25  |       calendarId: seededCalendars.alphaShared,
  26  |       visibleWeekStart: seededScheduleStart(),
  27  |       phase: 'open-alpha-calendar'
  28  |     });
  29  |     await expect(page.getByTestId('find-time-entrypoint')).toBeVisible();
  30  |   });
  31  | 
  32  |   await test.step('phase: follow the real calendar entrypoint into the find-time route', async () => {
  33  |     flow.mark('calendar-entrypoint', seededCalendars.alphaShared);
  34  |     await page.getByTestId('find-time-entrypoint').click();
  35  | 
  36  |     await expect(page).toHaveURL(new RegExp(`/calendars/${seededCalendars.alphaShared}/find-time`));
  37  |     await expect(page.getByTestId('find-time-shell')).toBeVisible();
  38  |     await expect(page.getByTestId('find-time-duration-input')).toHaveValue('60');
  39  |   });
  40  | 
  41  |   await test.step('phase: search the seeded day range and verify exact server-shaped windows', async () => {
  42  |     await openFindTimeRoute({
  43  |       page,
  44  |       flow,
  45  |       calendarId: seededCalendars.alphaShared,
  46  |       durationMinutes: seededFindTime.durationMinutes,
  47  |       start: seededFindTime.start,
  48  |       phase: 'find-time-search'
  49  |     });
  50  | 
  51  |     await expect(page).toHaveURL(
  52  |       new RegExp(`/calendars/${seededCalendars.alphaShared}/find-time\\?duration=${seededFindTime.durationMinutes}&start=${seededFindTime.start}`)
  53  |     );
  54  |     await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-status', 'ready');
  55  |     await expect(page.getByTestId('find-time-search-state')).toHaveAttribute('data-status', 'ready');
  56  |     await expect(page.getByTestId('find-time-summary')).toContainText('9 truthful windows');
  57  |     await expect(page.getByTestId('find-time-results')).toHaveAttribute('data-window-count', String(seededFindTime.alphaWindowCount));
  58  | 
  59  |     await expect(page.getByTestId('find-time-window-0')).toContainText('Alice Owner');
  60  |     await expect(page.getByTestId('find-time-window-1')).toContainText('Bob Member');
  61  |     await expect(page.getByTestId('find-time-window-1')).toContainText('Dana Multi-Group');
  62  |     await expect(page.getByTestId('find-time-window-8')).toContainText('Alice Owner');
  63  | 
> 64  |     await expect(await readFindTimeWindowSnapshot(page, 0)).toEqual(seededFindTime.firstWindow);
      |                                                             ^ Error: expect(received).toEqual(expected) // deep equality
  65  |     await expect(await readFindTimeWindowSnapshot(page, 1)).toEqual(seededFindTime.focusedWindow);
  66  |     await expect(await readFindTimeWindowSnapshot(page, 8)).toEqual(seededFindTime.lastWindow);
  67  |   });
  68  | });
  69  | 
  70  | test('unauthorized member gets an explicit denial on another group\'s find-time route', async ({ page, flow }) => {
  71  |   await test.step('phase: sign in as the seeded Alpha-only member', async () => {
  72  |     flow.mark('login', seededUsers.alphaMember.email);
  73  |     await signInThroughUi(page, seededUsers.alphaMember);
  74  |   });
  75  | 
  76  |   await test.step('phase: open the seeded Beta find-time route and verify denial surfaces', async () => {
  77  |     await openFindTimeRoute({
  78  |       page,
  79  |       flow,
  80  |       calendarId: seededCalendars.betaShared,
  81  |       durationMinutes: seededFindTime.durationMinutes,
  82  |       start: seededFindTime.start,
  83  |       phase: 'unauthorized-find-time'
  84  |     });
  85  | 
  86  |     const deniedState = page.getByTestId('find-time-denied-state');
  87  |     await expect(deniedState).toBeVisible();
  88  |     await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-status', 'denied');
  89  |     await expect(deniedState).toContainText('calendar-missing');
  90  |     await expect(deniedState).toContainText('calendar-lookup');
  91  |     await expect(deniedState).toContainText(seededCalendars.betaShared);
  92  |   });
  93  | });
  94  | 
  95  | test('offline entry from the calendar board fails closed on the find-time route', async ({ page, flow }) => {
  96  |   let warmedFindTimeUrl = '';
  97  | 
  98  |   await test.step('phase: sign in and capture the calendar board entrypoint while online', async () => {
  99  |     flow.mark('login', seededUsers.alphaMember.email);
  100 |     await signInThroughUi(page, seededUsers.alphaMember);
  101 |     await openCalendarWeek({
  102 |       page,
  103 |       flow,
  104 |       calendarId: seededCalendars.alphaShared,
  105 |       visibleWeekStart: seededScheduleStart(),
  106 |       phase: 'open-alpha-calendar'
  107 |     });
  108 |     await expect(page.getByTestId('offline-runtime-surface')).toBeVisible();
  109 |     warmedFindTimeUrl = (await page.getByTestId('find-time-entrypoint').getAttribute('href')) ?? '';
  110 |     expect(warmedFindTimeUrl).toContain(`/calendars/${seededCalendars.alphaShared}/find-time`);
  111 |   });
  112 | 
  113 |   await test.step('phase: force browser-offline semantics and verify the client load denies the entrypoint URL', async () => {
  114 |     await page.context().addInitScript(() => {
  115 |       Object.defineProperty(window.navigator, 'onLine', {
  116 |         configurable: true,
  117 |         get: () => false
  118 |       });
  119 |     });
  120 | 
  121 |     flow.mark('forced-offline-find-time', warmedFindTimeUrl);
  122 |     await page.goto(warmedFindTimeUrl);
  123 | 
  124 |     await expect(page).toHaveURL(new RegExp(`/calendars/${seededCalendars.alphaShared}/find-time`));
  125 |     await expect(page.getByTestId('find-time-shell-state')).toContainText('cached-offline');
  126 |     await expect(page.getByTestId('find-time-offline-state')).toBeVisible();
  127 |     await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-status', 'offline-unavailable');
  128 |     await expect(page.getByTestId('find-time-offline-state')).toContainText('fail-closed');
  129 |     await expect(page.getByTestId('find-time-offline-state')).toContainText('FIND_TIME_OFFLINE_UNAVAILABLE');
  130 |     await expect(page.getByTestId('find-time-results')).toHaveCount(0);
  131 |   });
  132 | });
  133 | 
  134 | function seededScheduleStart() {
  135 |   return '2026-04-13';
  136 | }
  137 | 
```