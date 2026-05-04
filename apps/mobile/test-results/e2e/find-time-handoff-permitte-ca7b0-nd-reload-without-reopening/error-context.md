# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: find-time-handoff.spec.ts >> permitted member can enter from the real board, verify ranked results, hand a chosen slot into create, and reload without reopening
- Location: tests/e2e/find-time-handoff.spec.ts:28:1

# Error details

```
Error: expect(received).toMatchObject(expected)

- Expected  - 3
+ Received  + 3

@@ -3,14 +3,14 @@
      "Alice Owner",
      "Bob Member",
      "Dana Multi-Group",
    ],
    "blockedMembers": Array [],
-   "endAt": "2026-04-16T16:00:00.000Z",
+   "endAt": "2026-04-16T17:00:00.000Z",
    "handoffReady": "true",
    "leadingConstraints": Array [],
    "rank": "1",
    "spanEndAt": "2026-05-15T00:00:00.000Z",
-   "spanStartAt": "2026-04-16T15:00:00.000Z",
-   "startAt": "2026-04-16T15:00:00.000Z",
+   "spanStartAt": "2026-04-16T16:00:00.000Z",
+   "startAt": "2026-04-16T16:00:00.000Z",
    "trailingConstraints": Array [],
  }
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e5]:
        - paragraph [ref=e6]: Caluno pocket shell
        - generic [ref=e7]:
          - generic [ref=e8]: Bob Member
          - button "Sign out" [ref=e9] [cursor=pointer]
      - generic [ref=e10]:
        - heading "Alpha shared · Find time" [level=1] [ref=e11]
        - paragraph [ref=e12]: Phone-first find-time stays live-backed when trusted connectivity is available and fails closed when scope or network truth is not trustworthy.
      - generic [ref=e13]:
        - article [ref=e14]:
          - generic [ref=e15]: Shell state
          - strong [ref=e16]: trusted-ready
        - article [ref=e17]:
          - generic [ref=e18]: Route mode
          - strong [ref=e19]: trusted-online
        - article [ref=e20]:
          - generic [ref=e21]: Snapshot origin
          - strong [ref=e22]: trusted-online
        - article [ref=e23]:
          - generic [ref=e24]: Onboarding
          - strong [ref=e25]: ready
      - paragraph [ref=e26]: Found 12 truthful windows, including 3 top picks.
      - paragraph [ref=e27]: "Last trusted refresh: 2026-04-15T07:00:00.000Z"
    - generic [ref=e28]:
      - generic [ref=e30]:
        - generic [ref=e31]:
          - generic [ref=e32]:
            - paragraph [ref=e33]: Live mobile find-time
            - heading "Alpha shared" [level=2] [ref=e34]
            - paragraph [ref=e35]: Search a trusted 30-day horizon, keep Top picks distinct from browse windows, and expose stable route diagnostics for denied, timeout, malformed, and offline states.
          - generic [ref=e36]:
            - generic [ref=e37]: trusted-online
            - generic [ref=e38]: capacitor-network
            - generic [ref=e39]: ready
            - generic [ref=e40]: 3 top picks
        - generic [ref=e41]:
          - generic [ref=e42]:
            - paragraph [ref=e43]: Search the trusted horizon
            - heading "Duration and anchor stay explicit." [level=3] [ref=e44]
            - paragraph [ref=e45]: Invalid inputs, no-results, query failures, and malformed responses stay attributable through deterministic status codes instead of a generic empty state.
          - generic [ref=e46]:
            - generic [ref=e47]:
              - generic [ref=e48]: Duration (minutes)
              - spinbutton "Duration (minutes)" [ref=e49]: "60"
            - generic [ref=e50]:
              - generic [ref=e51]: Search from (UTC day)
              - textbox "Search from (UTC day)" [ref=e52]: 2026-04-15
            - generic "Duration presets" [ref=e53]:
              - link "30 min" [ref=e54] [cursor=pointer]:
                - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=30&start=2026-04-15
              - link "60 min" [ref=e55] [cursor=pointer]:
                - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=60&start=2026-04-15
              - link "90 min" [ref=e56] [cursor=pointer]:
                - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=90&start=2026-04-15
              - link "120 min" [ref=e57] [cursor=pointer]:
                - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=120&start=2026-04-15
            - button "Refresh truthful windows" [ref=e58] [cursor=pointer]
        - generic [ref=e59]:
          - article [ref=e60]:
            - generic [ref=e61]: Route status
            - strong [ref=e62]: ready
            - paragraph [ref=e63]: Found 12 truthful windows, including 3 top picks.
          - article [ref=e64]:
            - generic [ref=e65]: Search range
            - strong [ref=e66]: 12 truthful windows
            - paragraph [ref=e67]: 60 minute duration over 3 named members · 2026-04-15 → 2026-05-15.
        - generic [ref=e68]:
          - generic [ref=e69]:
            - generic [ref=e70]:
              - generic [ref=e71]:
                - paragraph [ref=e72]: Top picks
                - heading "Highest-confidence shared windows." [level=3] [ref=e73]
                - paragraph [ref=e74]: Shortlist cards carry the heavier explanation load before the lighter browse inventory.
              - generic [ref=e75]: "3"
            - generic [ref=e76]:
              - article [ref=e77]:
                - generic [ref=e78]:
                  - generic [ref=e79]:
                    - paragraph [ref=e80]: Top pick 1
                    - heading "Thu, Apr 16 · 16:00–17:00 UTC" [level=4] [ref=e81]
                  - generic [ref=e82]: 3 free / 0 blocked
                - paragraph [ref=e83]: All 3 named members stay free across this exact slot.
                - generic [ref=e84]:
                  - generic [ref=e85]:
                    - paragraph [ref=e86]: Who is free
                    - paragraph [ref=e87]: Alice Owner · Bob Member · Dana Multi-Group
                  - generic [ref=e88]:
                    - paragraph [ref=e89]: Who is blocked
                    - paragraph [ref=e90]: All named members stay free across this exact slot.
                - generic [ref=e91]:
                  - generic [ref=e92]:
                    - paragraph [ref=e93]: Why earlier times fail
                    - paragraph [ref=e94]: No trusted busy interval pushes into the start edge for this shortlist slot.
                  - generic [ref=e95]:
                    - paragraph [ref=e96]: Why nearby later times fail
                    - paragraph [ref=e97]: No trusted busy interval pushes into the trailing edge for this shortlist slot.
                - link "Create from this slot" [ref=e99] [cursor=pointer]:
                  - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-16T16%3A00%3A00.000Z&prefillEndAt=2026-04-16T17%3A00%3A00.000Z&source=find-time
              - article [ref=e100]:
                - generic [ref=e101]:
                  - generic [ref=e102]:
                    - paragraph [ref=e103]: Top pick 2
                    - heading "Wed, Apr 15 · 18:00–19:00 UTC" [level=4] [ref=e104]
                  - generic [ref=e105]: 3 free / 0 blocked
                - paragraph [ref=e106]: All 3 named members stay free across this exact slot.
                - generic [ref=e107]:
                  - generic [ref=e108]:
                    - paragraph [ref=e109]: Who is free
                    - paragraph [ref=e110]: Alice Owner · Bob Member · Dana Multi-Group
                  - generic [ref=e111]:
                    - paragraph [ref=e112]: Who is blocked
                    - paragraph [ref=e113]: All named members stay free across this exact slot.
                - generic [ref=e114]:
                  - generic [ref=e115]:
                    - paragraph [ref=e116]: Why earlier times fail
                    - paragraph [ref=e117]: No trusted busy interval pushes into the start edge for this shortlist slot.
                  - generic [ref=e118]:
                    - paragraph [ref=e119]: Why nearby later times fail
                    - paragraph [ref=e120]: No trusted busy interval pushes into the trailing edge for this shortlist slot.
                - link "Create from this slot" [ref=e122] [cursor=pointer]:
                  - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-15T18%3A00%3A00.000Z&prefillEndAt=2026-04-15T19%3A00%3A00.000Z&source=find-time
              - article [ref=e123]:
                - generic [ref=e124]:
                  - generic [ref=e125]:
                    - paragraph [ref=e126]: Top pick 3
                    - heading "Wed, Apr 15 · 00:00–01:00 UTC" [level=4] [ref=e127]
                  - generic [ref=e128]: 3 free / 0 blocked
                - paragraph [ref=e129]: All 3 named members stay free across this exact slot.
                - generic [ref=e130]:
                  - generic [ref=e131]:
                    - paragraph [ref=e132]: Who is free
                    - paragraph [ref=e133]: Alice Owner · Bob Member · Dana Multi-Group
                  - generic [ref=e134]:
                    - paragraph [ref=e135]: Who is blocked
                    - paragraph [ref=e136]: All named members stay free across this exact slot.
                - generic [ref=e137]:
                  - generic [ref=e138]:
                    - paragraph [ref=e139]: Why earlier times fail
                    - paragraph [ref=e140]: No trusted busy interval pushes into the start edge for this shortlist slot.
                  - generic [ref=e141]:
                    - paragraph [ref=e142]: Why nearby later times fail
                    - paragraph [ref=e143]: No trusted busy interval pushes into the trailing edge for this shortlist slot.
                - link "Create from this slot" [ref=e145] [cursor=pointer]:
                  - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-15T00%3A00%3A00.000Z&prefillEndAt=2026-04-15T01%3A00%3A00.000Z&source=find-time
          - generic [ref=e146]:
            - generic [ref=e147]:
              - generic [ref=e148]:
                - paragraph [ref=e149]: Browse windows
                - heading "Compact follow-on inventory." [level=3] [ref=e150]
                - paragraph [ref=e151]: Browse cards stay truthful but lighter so scanning stays phone-first.
              - generic [ref=e152]: "9"
            - generic [ref=e153]:
              - article [ref=e154]:
                - generic [ref=e155]:
                  - generic [ref=e156]:
                    - paragraph [ref=e157]: Browse 1
                    - heading "Thu, Apr 16 · 09:00–10:00 UTC" [level=4] [ref=e158]
                  - generic [ref=e159]: 3 free / 0 blocked
                - paragraph [ref=e160]: Shared slot with no blocked roster members during the exact window.
                - generic [ref=e161]:
                  - generic [ref=e162]:
                    - paragraph [ref=e163]: Free
                    - paragraph [ref=e164]: Alice Owner · Bob Member · Dana Multi-Group
                  - generic [ref=e165]:
                    - paragraph [ref=e166]: Nearby edges
                    - paragraph [ref=e167]: "Before: No leading constraint summary."
                    - paragraph [ref=e168]: "After: No trailing constraint summary."
                - link "Create from this slot" [ref=e170] [cursor=pointer]:
                  - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-16T09%3A00%3A00.000Z&prefillEndAt=2026-04-16T10%3A00%3A00.000Z&source=find-time
              - article [ref=e171]:
                - generic [ref=e172]:
                  - generic [ref=e173]:
                    - paragraph [ref=e174]: Browse 2
                    - heading "Wed, Apr 15 · 11:00–12:00 UTC" [level=4] [ref=e175]
                  - generic [ref=e176]: 3 free / 0 blocked
                - paragraph [ref=e177]: Shared slot with no blocked roster members during the exact window.
                - generic [ref=e178]:
                  - generic [ref=e179]:
                    - paragraph [ref=e180]: Free
                    - paragraph [ref=e181]: Alice Owner · Bob Member · Dana Multi-Group
                  - generic [ref=e182]:
                    - paragraph [ref=e183]: Nearby edges
                    - paragraph [ref=e184]: "Before: No leading constraint summary."
                    - paragraph [ref=e185]: "After: No trailing constraint summary."
                - link "Create from this slot" [ref=e187] [cursor=pointer]:
                  - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-15T11%3A00%3A00.000Z&prefillEndAt=2026-04-15T12%3A00%3A00.000Z&source=find-time
              - article [ref=e188]:
                - generic [ref=e189]:
                  - generic [ref=e190]:
                    - paragraph [ref=e191]: Browse 3
                    - heading "Wed, Apr 15 · 15:00–16:00 UTC" [level=4] [ref=e192]
                  - generic [ref=e193]: 3 free / 0 blocked
                - paragraph [ref=e194]: Shared slot with no blocked roster members during the exact window.
                - generic [ref=e195]:
                  - generic [ref=e196]:
                    - paragraph [ref=e197]: Free
                    - paragraph [ref=e198]: Alice Owner · Bob Member · Dana Multi-Group
                  - generic [ref=e199]:
                    - paragraph [ref=e200]: Nearby edges
                    - paragraph [ref=e201]: "Before: No leading constraint summary."
                    - paragraph [ref=e202]: "After: No trailing constraint summary."
                - link "Create from this slot" [ref=e204] [cursor=pointer]:
                  - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-15T15%3A00%3A00.000Z&prefillEndAt=2026-04-15T16%3A00%3A00.000Z&source=find-time
              - article [ref=e205]:
                - generic [ref=e206]:
                  - generic [ref=e207]:
                    - paragraph [ref=e208]: Browse 4
                    - heading "Wed, Apr 15 · 08:30–09:30 UTC" [level=4] [ref=e209]
                  - generic [ref=e210]: 2 free / 1 blocked
                - paragraph [ref=e211]: 2 free • 1 blocked nearby.
                - generic [ref=e212]:
                  - generic [ref=e213]:
                    - paragraph [ref=e214]: Free
                    - paragraph [ref=e215]: Bob Member · Dana Multi-Group
                  - generic [ref=e216]:
                    - paragraph [ref=e217]: Nearby edges
                    - paragraph [ref=e218]: "Before: Alpha opening sweep (Alice Owner)"
                    - paragraph [ref=e219]: "After: Morning intake offline edit (Alice Owner)"
                - link "Create from this slot" [ref=e221] [cursor=pointer]:
                  - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-15T08%3A30%3A00.000Z&prefillEndAt=2026-04-15T09%3A30%3A00.000Z&source=find-time
              - article [ref=e222]:
                - generic [ref=e223]:
                  - generic [ref=e224]:
                    - paragraph [ref=e225]: Browse 5
                    - heading "Wed, Apr 15 · 13:00–14:00 UTC" [level=4] [ref=e226]
                  - generic [ref=e227]: 2 free / 1 blocked
                - paragraph [ref=e228]: 2 free • 1 blocked nearby.
                - generic [ref=e229]:
                  - generic [ref=e230]:
                    - paragraph [ref=e231]: Free
                    - paragraph [ref=e232]: Alice Owner · Dana Multi-Group
                  - generic [ref=e233]:
                    - paragraph [ref=e234]: Nearby edges
                    - paragraph [ref=e235]: "Before: Afternoon handoff (Bob Member)"
                    - paragraph [ref=e236]: "After: Afternoon handoff (Bob Member)"
                - link "Create from this slot" [ref=e238] [cursor=pointer]:
                  - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-15T13%3A00%3A00.000Z&prefillEndAt=2026-04-15T14%3A00%3A00.000Z&source=find-time
              - article [ref=e239]:
                - generic [ref=e240]:
                  - generic [ref=e241]:
                    - paragraph [ref=e242]: Browse 6
                    - heading "Wed, Apr 15 · 16:00–17:00 UTC" [level=4] [ref=e243]
                  - generic [ref=e244]: 2 free / 1 blocked
                - paragraph [ref=e245]: 2 free • 1 blocked nearby.
                - generic [ref=e246]:
                  - generic [ref=e247]:
                    - paragraph [ref=e248]: Free
                    - paragraph [ref=e249]: Alice Owner · Dana Multi-Group
                  - generic [ref=e250]:
                    - paragraph [ref=e251]: Nearby edges
                    - paragraph [ref=e252]: "Before: Offline opening backup (Bob Member)"
                    - paragraph [ref=e253]: "After: Offline opening backup (Bob Member)"
                - link "Create from this slot" [ref=e255] [cursor=pointer]:
                  - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-15T16%3A00%3A00.000Z&prefillEndAt=2026-04-15T17%3A00%3A00.000Z&source=find-time
              - article [ref=e256]:
                - generic [ref=e257]:
                  - generic [ref=e258]:
                    - paragraph [ref=e259]: Browse 7
                    - heading "Thu, Apr 16 · 15:00–16:00 UTC" [level=4] [ref=e260]
                  - generic [ref=e261]: 2 free / 1 blocked
                - paragraph [ref=e262]: 2 free • 1 blocked nearby.
                - generic [ref=e263]:
                  - generic [ref=e264]:
                    - paragraph [ref=e265]: Free
                    - paragraph [ref=e266]: Alice Owner · Dana Multi-Group
                  - generic [ref=e267]:
                    - paragraph [ref=e268]: Nearby edges
                    - paragraph [ref=e269]: "Before: Find time handoff coverage shift (Bob Member)"
                    - paragraph [ref=e270]: "After: No trailing constraint summary."
                - link "Create from this slot" [ref=e272] [cursor=pointer]:
                  - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-16T15%3A00%3A00.000Z&prefillEndAt=2026-04-16T16%3A00%3A00.000Z&source=find-time
              - article [ref=e273]:
                - generic [ref=e274]:
                  - generic [ref=e275]:
                    - paragraph [ref=e276]: Browse 8
                    - heading "Thu, Apr 16 · 12:00–13:00 UTC" [level=4] [ref=e277]
                  - generic [ref=e278]: 2 free / 1 blocked
                - paragraph [ref=e279]: 2 free • 1 blocked nearby.
                - generic [ref=e280]:
                  - generic [ref=e281]:
                    - paragraph [ref=e282]: Free
                    - paragraph [ref=e283]: Alice Owner · Bob Member
                  - generic [ref=e284]:
                    - paragraph [ref=e285]: Nearby edges
                    - paragraph [ref=e286]: "Before: Kitchen prep (Dana Multi-Group)"
                    - paragraph [ref=e287]: "After: Kitchen prep (Dana Multi-Group)"
                - link "Create from this slot" [ref=e289] [cursor=pointer]:
                  - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-16T12%3A00%3A00.000Z&prefillEndAt=2026-04-16T13%3A00%3A00.000Z&source=find-time
              - article [ref=e290]:
                - generic [ref=e291]:
                  - generic [ref=e292]:
                    - paragraph [ref=e293]: Browse 9
                    - heading "Thu, Apr 16 · 13:00–14:00 UTC" [level=4] [ref=e294]
                  - generic [ref=e295]: 1 free / 2 blocked
                - paragraph [ref=e296]: 1 free • 2 blocked nearby.
                - generic [ref=e297]:
                  - generic [ref=e298]:
                    - paragraph [ref=e299]: Free
                    - paragraph [ref=e300]: Alice Owner
                  - generic [ref=e301]:
                    - paragraph [ref=e302]: Nearby edges
                    - paragraph [ref=e303]: "Before: Supplier call (Bob Member) · Supplier call (Dana Multi-Group)"
                    - paragraph [ref=e304]: "After: Supplier call (Bob Member) · Supplier call (Dana Multi-Group)"
                - link "Create from this slot" [ref=e306] [cursor=pointer]:
                  - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-16T13%3A00%3A00.000Z&prefillEndAt=2026-04-16T14%3A00%3A00.000Z&source=find-time
      - generic [ref=e307]:
        - generic [ref=e308]:
          - generic [ref=e309]:
            - paragraph [ref=e310]: Trusted inventory
            - heading "Jump only within already-permitted calendars." [level=3] [ref=e311]
          - generic [ref=e312]: "2"
        - generic [ref=e313]:
          - link "Alpha shared Primary calendar · find-time" [ref=e314] [cursor=pointer]:
            - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=60&start=2026-04-15
            - strong [ref=e315]: Alpha shared
            - generic [ref=e316]: Primary calendar · find-time
          - link "Alpha backlog Secondary calendar · find-time" [ref=e317] [cursor=pointer]:
            - /url: /calendars/aaaaaaaa-aaaa-1111-1111-222222222222/find-time?duration=60&start=2026-04-15
            - strong [ref=e318]: Alpha backlog
            - generic [ref=e319]: Secondary calendar · find-time
    - navigation "Primary mobile navigation" [ref=e320]:
      - link "Groups" [ref=e321] [cursor=pointer]:
        - /url: /groups
      - link "Alpha shared" [ref=e322] [cursor=pointer]:
        - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111
      - link "Account" [ref=e323] [cursor=pointer]:
        - /url: /signin
  - generic [ref=e324]: Alpha shared · Find time • Caluno Mobile
```

# Test source

```ts
  1   | import {
  2   |   expect,
  3   |   expectedCreateShiftPrefillValues,
  4   |   openCalendar,
  5   |   openFindTimeRoute,
  6   |   readCreateSheetArrivalSnapshot,
  7   |   readFindTimeBrowseWindowCtaSnapshot,
  8   |   readFindTimeBrowseWindowSnapshot,
  9   |   readFindTimeTopPickCtaSnapshot,
  10  |   readFindTimeTopPickSnapshot,
  11  |   readVisibleWeekFromBoard,
  12  |   seededCalendars,
  13  |   seededFindTime,
  14  |   seededUsers,
  15  |   seededWeekStarts,
  16  |   setSimulatedConnectivity,
  17  |   signInThroughUi,
  18  |   submitHandoffBackedCreateForm,
  19  |   test
  20  | } from './fixtures';
  21  | 
  22  | test.describe.configure({ mode: 'serial' });
  23  | 
  24  | const calendarId = seededCalendars.alphaShared;
  25  | const visibleWeekStart = seededWeekStarts.alphaWarm;
  26  | const createdShiftTitle = 'Find time handoff coverage shift';
  27  | 
  28  | test('permitted member can enter from the real board, verify ranked results, hand a chosen slot into create, and reload without reopening', async ({
  29  |   page
  30  | }) => {
  31  |   await signInThroughUi(page, seededUsers.alphaMember);
  32  |   await openCalendar(page, {
  33  |     calendarId,
  34  |     weekStart: visibleWeekStart,
  35  |     expectedName: 'Alpha shared'
  36  |   });
  37  | 
  38  |   const entrypoint = page.getByTestId('find-time-entrypoint');
  39  |   await expect(entrypoint).toBeVisible();
  40  |   await expect(entrypoint).toHaveAttribute('data-entry-calendar-id', calendarId);
  41  |   await expect(entrypoint).toHaveAttribute('data-entry-week-start', visibleWeekStart);
  42  |   await expect(entrypoint).toHaveAttribute('data-entry-duration', seededFindTime.durationMinutes);
  43  | 
  44  |   await Promise.all([page.waitForURL(new RegExp(`/calendars/${calendarId}/find-time`)), entrypoint.click()]);
  45  |   await expect(page.getByTestId('find-time-shell')).toBeVisible();
  46  |   await expect(page.getByTestId('find-time-start-input')).toHaveValue(visibleWeekStart);
  47  |   await expect(page.getByTestId('find-time-duration-input')).toHaveValue(seededFindTime.durationMinutes);
  48  | 
  49  |   await page.getByTestId('find-time-start-input').fill(seededFindTime.start);
  50  |   await Promise.all([
  51  |     page.waitForURL(
  52  |       new RegExp(`/calendars/${calendarId}/find-time\\?duration=${seededFindTime.durationMinutes}&start=${seededFindTime.start}`)
  53  |     ),
  54  |     page.getByTestId('find-time-submit').click()
  55  |   ]);
  56  | 
  57  |   await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-status', 'ready');
  58  |   await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-reason', 'none');
  59  |   await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-top-pick-count', String(seededFindTime.topPickCount));
  60  |   await expect(page.getByTestId('find-time-search-state')).toHaveAttribute('data-status', 'ready');
  61  | 
  62  |   const liveWindowCount = Number.parseInt(
  63  |     (await page.getByTestId('find-time-results').getAttribute('data-window-count')) ?? '0',
  64  |     10
  65  |   );
  66  |   const liveBrowseCount = Number.parseInt(
  67  |     (await page.getByTestId('find-time-route-state').getAttribute('data-browse-count')) ?? '0',
  68  |     10
  69  |   );
  70  | 
  71  |   expect(liveWindowCount).toBeGreaterThanOrEqual(seededFindTime.topPickCount + 1);
  72  |   expect(liveBrowseCount).toBeGreaterThanOrEqual(1);
  73  |   expect(liveWindowCount).toBe(seededFindTime.topPickCount + liveBrowseCount);
  74  | 
  75  |   await expect(page.getByTestId('find-time-summary')).toContainText(`${liveWindowCount} truthful windows`);
  76  |   await expect(page.getByTestId('find-time-results')).toHaveAttribute('data-top-pick-count', String(seededFindTime.topPickCount));
  77  |   await expect(page.getByTestId('find-time-results')).toHaveAttribute('data-browse-count', String(liveBrowseCount));
  78  | 
  79  |   await expect(
  80  |     page.evaluate(() => {
  81  |       const topPicks = document.querySelector('[data-testid="find-time-top-picks"]');
  82  |       const browse = document.querySelector('[data-testid="find-time-browse-results"]');
  83  | 
  84  |       if (!topPicks || !browse) {
  85  |         return false;
  86  |       }
  87  | 
  88  |       return Boolean(topPicks.compareDocumentPosition(browse) & Node.DOCUMENT_POSITION_FOLLOWING);
  89  |     })
  90  |   ).resolves.toBe(true);
  91  | 
> 92  |   await expect(await readFindTimeTopPickSnapshot(page, 0)).toMatchObject({
      |                                                            ^ Error: expect(received).toMatchObject(expected)
  93  |     ...seededFindTime.topPicks[0],
  94  |     handoffReady: 'true'
  95  |   });
  96  |   await expect(await readFindTimeTopPickSnapshot(page, 1)).toMatchObject({
  97  |     rank: '2',
  98  |     handoffReady: 'true'
  99  |   });
  100 |   await expect(await readFindTimeTopPickSnapshot(page, 2)).toMatchObject({
  101 |     rank: '3',
  102 |     handoffReady: 'true'
  103 |   });
  104 | 
  105 |   const focusedBrowseCard = page
  106 |     .locator(
  107 |       `[data-testid^="find-time-browse-window-"][data-start-at="${seededFindTime.focusedBrowseWindow.startAt}"][data-end-at="${seededFindTime.focusedBrowseWindow.endAt}"]`
  108 |     )
  109 |     .first();
  110 |   await expect(focusedBrowseCard).toBeVisible();
  111 |   const focusedBrowseTestId = await focusedBrowseCard.getAttribute('data-testid');
  112 |   const focusedBrowseIndex = Number.parseInt((focusedBrowseTestId ?? '').replace('find-time-browse-window-', ''), 10);
  113 | 
  114 |   expect(Number.isFinite(focusedBrowseIndex), 'expected the seeded browse window to expose a deterministic test id').toBe(true);
  115 |   await expect(await readFindTimeBrowseWindowSnapshot(page, focusedBrowseIndex)).toMatchObject({
  116 |     rank: seededFindTime.focusedBrowseWindow.rank,
  117 |     startAt: seededFindTime.focusedBrowseWindow.startAt,
  118 |     endAt: seededFindTime.focusedBrowseWindow.endAt,
  119 |     spanStartAt: seededFindTime.focusedBrowseWindow.spanStartAt,
  120 |     spanEndAt: seededFindTime.focusedBrowseWindow.spanEndAt,
  121 |     availableMembers: seededFindTime.focusedBrowseWindow.availableMembers,
  122 |     blockedMembers: seededFindTime.focusedBrowseWindow.blockedMembers,
  123 |     leadingConstraints: seededFindTime.focusedBrowseWindow.leadingConstraints,
  124 |     trailingConstraints: [expect.stringContaining('Alice Owner:Morning intake')],
  125 |     handoffReady: 'true'
  126 |   });
  127 | 
  128 |   const chosenSuggestion = await readFindTimeTopPickCtaSnapshot(page, 0);
  129 |   await expect(chosenSuggestion).toMatchObject({
  130 |     source: 'find-time',
  131 |     targetWeekStart: visibleWeekStart,
  132 |     startAt: seededFindTime.topPicks[0].startAt,
  133 |     endAt: seededFindTime.topPicks[0].endAt,
  134 |     label: 'Create from this slot'
  135 |   });
  136 |   await expect(await readFindTimeBrowseWindowCtaSnapshot(page, focusedBrowseIndex)).toMatchObject({
  137 |     source: 'find-time',
  138 |     targetWeekStart: visibleWeekStart,
  139 |     startAt: seededFindTime.focusedBrowseWindow.startAt,
  140 |     endAt: seededFindTime.focusedBrowseWindow.endAt,
  141 |     label: 'Create from this slot'
  142 |   });
  143 | 
  144 |   await page.getByTestId('find-time-top-pick-0-cta').click();
  145 | 
  146 |   const visibleWeek = await readVisibleWeekFromBoard(page);
  147 |   expect(visibleWeek.visibleWeekStart).toBe(visibleWeekStart);
  148 |   expect(visibleWeek.boardWeekStart).toBe(visibleWeekStart);
  149 | 
  150 |   const arrival = await readCreateSheetArrivalSnapshot(page);
  151 |   const expectedPrefillValues = expectedCreateShiftPrefillValues(chosenSuggestion);
  152 | 
  153 |   expect(arrival.open).toBe(true);
  154 |   expect(arrival.routePrefillStatus).toBe('accepted');
  155 |   expect(arrival.routePrefillSource).toBe('find-time');
  156 |   expect(arrival.routePrefillStart).toBe(chosenSuggestion.startAt);
  157 |   expect(arrival.routePrefillEnd).toBe(chosenSuggestion.endAt);
  158 |   expect(arrival.openOnArrival).toBe('true');
  159 |   expect(arrival.createSource).toBe('find-time');
  160 |   expect(arrival.prefillSource).toBe('find-time');
  161 |   expect(arrival.prefillStart).toBe(chosenSuggestion.startAt);
  162 |   expect(arrival.prefillEnd).toBe(chosenSuggestion.endAt);
  163 |   expect(arrival.startValue).toBe(expectedPrefillValues.startValue);
  164 |   expect(arrival.endValue).toBe(expectedPrefillValues.endValue);
  165 | 
  166 |   await expect
  167 |     .poll(() => page.url(), {
  168 |       message: 'expected the calendar route to strip one-shot handoff params after the first arrival render'
  169 |     })
  170 |     .toBe(`http://127.0.0.1:4173/calendars/${calendarId}?start=${visibleWeekStart}`);
  171 | 
  172 |   await submitHandoffBackedCreateForm(page, { title: createdShiftTitle });
  173 |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-pending-count', '0');
  174 |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-retryable-count', '0');
  175 |   await expect(
  176 |     page.getByTestId('day-column-2026-04-16').locator('[data-testid^="shift-card-"]').filter({ hasText: createdShiftTitle }).first()
  177 |   ).toBeVisible();
  178 | 
  179 |   await page.reload();
  180 |   await expect(page).toHaveURL(new RegExp(`/calendars/${calendarId}\\?start=${visibleWeekStart}$`));
  181 |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-create-prefill-status', 'none');
  182 |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-create-prefill-source', 'none');
  183 |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-create-prefill-start', 'none');
  184 |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-create-prefill-end', 'none');
  185 |   await expect(page.getByTestId('create-shift-editor')).toHaveCount(0);
  186 |   await expect(page.getByTestId('create-prefill-source')).toHaveCount(0);
  187 |   await expect(
  188 |     page.getByTestId('day-column-2026-04-16').locator('[data-testid^="shift-card-"]').filter({ hasText: createdShiftTitle }).first()
  189 |   ).toBeVisible();
  190 | });
  191 | 
  192 | test('out-of-scope mobile find-time routes stay explicitly denied with zero result cards', async ({ page }) => {
```