# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile-assembly.spec.ts >> phase 3 — find time handoff flows into create arrival and the shift lands on the board
- Location: tests/e2e/mobile-assembly.spec.ts:124:1

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
      - paragraph [ref=e26]: Found 10 truthful windows, including 3 top picks.
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
            - paragraph [ref=e63]: Found 10 truthful windows, including 3 top picks.
          - article [ref=e64]:
            - generic [ref=e65]: Search range
            - strong [ref=e66]: 10 truthful windows
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
                    - heading "Wed, Apr 15 · 15:00–16:00 UTC" [level=4] [ref=e104]
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
                  - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-15T15%3A00%3A00.000Z&prefillEndAt=2026-04-15T16%3A00%3A00.000Z&source=find-time
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
              - generic [ref=e152]: "7"
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
                    - heading "Wed, Apr 15 · 08:30–09:30 UTC" [level=4] [ref=e192]
                  - generic [ref=e193]: 2 free / 1 blocked
                - paragraph [ref=e194]: 2 free • 1 blocked nearby.
                - generic [ref=e195]:
                  - generic [ref=e196]:
                    - paragraph [ref=e197]: Free
                    - paragraph [ref=e198]: Bob Member · Dana Multi-Group
                  - generic [ref=e199]:
                    - paragraph [ref=e200]: Nearby edges
                    - paragraph [ref=e201]: "Before: Alpha opening sweep (Alice Owner)"
                    - paragraph [ref=e202]: "After: Morning intake (Alice Owner)"
                - link "Create from this slot" [ref=e204] [cursor=pointer]:
                  - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-15T08%3A30%3A00.000Z&prefillEndAt=2026-04-15T09%3A30%3A00.000Z&source=find-time
              - article [ref=e205]:
                - generic [ref=e206]:
                  - generic [ref=e207]:
                    - paragraph [ref=e208]: Browse 4
                    - heading "Wed, Apr 15 · 13:00–14:00 UTC" [level=4] [ref=e209]
                  - generic [ref=e210]: 2 free / 1 blocked
                - paragraph [ref=e211]: 2 free • 1 blocked nearby.
                - generic [ref=e212]:
                  - generic [ref=e213]:
                    - paragraph [ref=e214]: Free
                    - paragraph [ref=e215]: Alice Owner · Dana Multi-Group
                  - generic [ref=e216]:
                    - paragraph [ref=e217]: Nearby edges
                    - paragraph [ref=e218]: "Before: Afternoon handoff (Bob Member)"
                    - paragraph [ref=e219]: "After: Afternoon handoff (Bob Member)"
                - link "Create from this slot" [ref=e221] [cursor=pointer]:
                  - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-15T13%3A00%3A00.000Z&prefillEndAt=2026-04-15T14%3A00%3A00.000Z&source=find-time
              - article [ref=e222]:
                - generic [ref=e223]:
                  - generic [ref=e224]:
                    - paragraph [ref=e225]: Browse 5
                    - heading "Thu, Apr 16 · 15:00–16:00 UTC" [level=4] [ref=e226]
                  - generic [ref=e227]: 2 free / 1 blocked
                - paragraph [ref=e228]: 2 free • 1 blocked nearby.
                - generic [ref=e229]:
                  - generic [ref=e230]:
                    - paragraph [ref=e231]: Free
                    - paragraph [ref=e232]: Alice Owner · Dana Multi-Group
                  - generic [ref=e233]:
                    - paragraph [ref=e234]: Nearby edges
                    - paragraph [ref=e235]: "Before: Find time handoff coverage shift (Bob Member)"
                    - paragraph [ref=e236]: "After: No trailing constraint summary."
                - link "Create from this slot" [ref=e238] [cursor=pointer]:
                  - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-16T15%3A00%3A00.000Z&prefillEndAt=2026-04-16T16%3A00%3A00.000Z&source=find-time
              - article [ref=e239]:
                - generic [ref=e240]:
                  - generic [ref=e241]:
                    - paragraph [ref=e242]: Browse 6
                    - heading "Thu, Apr 16 · 12:00–13:00 UTC" [level=4] [ref=e243]
                  - generic [ref=e244]: 2 free / 1 blocked
                - paragraph [ref=e245]: 2 free • 1 blocked nearby.
                - generic [ref=e246]:
                  - generic [ref=e247]:
                    - paragraph [ref=e248]: Free
                    - paragraph [ref=e249]: Alice Owner · Bob Member
                  - generic [ref=e250]:
                    - paragraph [ref=e251]: Nearby edges
                    - paragraph [ref=e252]: "Before: Kitchen prep (Dana Multi-Group)"
                    - paragraph [ref=e253]: "After: Kitchen prep (Dana Multi-Group)"
                - link "Create from this slot" [ref=e255] [cursor=pointer]:
                  - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-16T12%3A00%3A00.000Z&prefillEndAt=2026-04-16T13%3A00%3A00.000Z&source=find-time
              - article [ref=e256]:
                - generic [ref=e257]:
                  - generic [ref=e258]:
                    - paragraph [ref=e259]: Browse 7
                    - heading "Thu, Apr 16 · 13:00–14:00 UTC" [level=4] [ref=e260]
                  - generic [ref=e261]: 1 free / 2 blocked
                - paragraph [ref=e262]: 1 free • 2 blocked nearby.
                - generic [ref=e263]:
                  - generic [ref=e264]:
                    - paragraph [ref=e265]: Free
                    - paragraph [ref=e266]: Alice Owner
                  - generic [ref=e267]:
                    - paragraph [ref=e268]: Nearby edges
                    - paragraph [ref=e269]: "Before: Supplier call (Bob Member) · Supplier call (Dana Multi-Group)"
                    - paragraph [ref=e270]: "After: Supplier call (Bob Member) · Supplier call (Dana Multi-Group)"
                - link "Create from this slot" [ref=e272] [cursor=pointer]:
                  - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111?create=1&start=2026-04-13&prefillStartAt=2026-04-16T13%3A00%3A00.000Z&prefillEndAt=2026-04-16T14%3A00%3A00.000Z&source=find-time
      - generic [ref=e273]:
        - generic [ref=e274]:
          - generic [ref=e275]:
            - paragraph [ref=e276]: Trusted inventory
            - heading "Jump only within already-permitted calendars." [level=3] [ref=e277]
          - generic [ref=e278]: "2"
        - generic [ref=e279]:
          - link "Alpha shared Primary calendar · find-time" [ref=e280] [cursor=pointer]:
            - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111/find-time?duration=60&start=2026-04-15
            - strong [ref=e281]: Alpha shared
            - generic [ref=e282]: Primary calendar · find-time
          - link "Alpha backlog Secondary calendar · find-time" [ref=e283] [cursor=pointer]:
            - /url: /calendars/aaaaaaaa-aaaa-1111-1111-222222222222/find-time?duration=60&start=2026-04-15
            - strong [ref=e284]: Alpha backlog
            - generic [ref=e285]: Secondary calendar · find-time
    - navigation "Primary mobile navigation" [ref=e286]:
      - link "Groups" [ref=e287] [cursor=pointer]:
        - /url: /groups
      - link "Alpha shared" [ref=e288] [cursor=pointer]:
        - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111
      - link "Account" [ref=e289] [cursor=pointer]:
        - /url: /signin
  - generic [ref=e290]: Alpha shared · Find time • Caluno Mobile
```

# Test source

```ts
  63  | }
  64  | 
  65  | // ---------------------------------------------------------------------------
  66  | // Phase 1: sign-in and initial calendar access
  67  | // ---------------------------------------------------------------------------
  68  | 
  69  | test('phase 1 — sign in and open the permitted calendar with trusted-online diagnostics', async ({ page }) => {
  70  |   await signInThroughUi(page, seededUsers.alphaMember);
  71  | 
  72  |   await openCalendar(page, {
  73  |     calendarId,
  74  |     weekStart: warmWeekStart,
  75  |     expectedName: 'Alpha shared'
  76  |   });
  77  | 
  78  |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-route-mode', 'trusted-online');
  79  |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-denied-reason', 'none');
  80  |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-visible-week-start', warmWeekStart);
  81  |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-visible-week-source', 'query');
  82  |   await waitForPendingCount(page, 0);
  83  |   await waitForRetryableCount(page, 0);
  84  | 
  85  |   // Out-of-scope calendar must stay fail-closed
  86  |   await page.goto(`/calendars/${seededCalendars.betaShared}`);
  87  |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-denied-reason', 'calendar-missing');
  88  |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-failure-phase', 'calendar-lookup');
  89  | });
  90  | 
  91  | // ---------------------------------------------------------------------------
  92  | // Phase 2: offline continuity and reconnect drain
  93  | // ---------------------------------------------------------------------------
  94  | 
  95  | test('phase 2 — calendar survives offline and drains queued mutations on reconnect', async ({ page }) => {
  96  |   await signInThroughUi(page, seededUsers.alphaMember);
  97  |   await openCalendar(page, {
  98  |     calendarId,
  99  |     weekStart: warmWeekStart,
  100 |     expectedName: 'Alpha shared'
  101 |   });
  102 | 
  103 |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-route-mode', 'trusted-online');
  104 |   await expect(page.getByTestId('calendar-sync-strip')).toHaveAttribute('data-snapshot-origin', 'server-sync');
  105 |   await waitForPendingCount(page, 0);
  106 |   await waitForRetryableCount(page, 0);
  107 | 
  108 |   // Go offline — calendar must switch to offline mode, not crash
  109 |   await setSimulatedConnectivity(page, false, { waitForCalendarUi: true });
  110 |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-route-mode', 'trusted-offline');
  111 | 
  112 |   // Go back online — sync strip must recover, queue must drain
  113 |   await setSimulatedConnectivity(page, true, { waitForCalendarUi: true });
  114 |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-route-mode', 'trusted-online');
  115 |   await waitForPendingCount(page, 0);
  116 |   await waitForRetryableCount(page, 0);
  117 |   await expect(page.getByTestId('calendar-sync-strip')).toHaveAttribute('data-snapshot-origin', 'server-sync');
  118 | });
  119 | 
  120 | // ---------------------------------------------------------------------------
  121 | // Phase 3: find-time handoff and create arrival
  122 | // ---------------------------------------------------------------------------
  123 | 
  124 | test('phase 3 — find time handoff flows into create arrival and the shift lands on the board', async ({ page }) => {
  125 |   await signInThroughUi(page, seededUsers.alphaMember);
  126 |   await openCalendar(page, {
  127 |     calendarId,
  128 |     weekStart: warmWeekStart,
  129 |     expectedName: 'Alpha shared'
  130 |   });
  131 | 
  132 |   // Enter find-time from the board
  133 |   const entrypoint = page.getByTestId('find-time-entrypoint');
  134 |   await expect(entrypoint).toBeVisible();
  135 |   await expect(entrypoint).toHaveAttribute('data-entry-calendar-id', calendarId);
  136 | 
  137 |   await Promise.all([
  138 |     page.waitForURL(new RegExp(`/calendars/${calendarId}/find-time`)),
  139 |     entrypoint.click()
  140 |   ]);
  141 |   await expect(page.getByTestId('find-time-shell')).toBeVisible();
  142 | 
  143 |   // Submit the seeded search window
  144 |   await page.getByTestId('find-time-start-input').fill(seededFindTime.start);
  145 |   await Promise.all([
  146 |     page.waitForURL(
  147 |       new RegExp(
  148 |         `/calendars/${calendarId}/find-time\\?duration=${seededFindTime.durationMinutes}&start=${seededFindTime.start}`
  149 |       )
  150 |     ),
  151 |     page.getByTestId('find-time-submit').click()
  152 |   ]);
  153 | 
  154 |   await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-status', 'ready');
  155 |   await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-reason', 'none');
  156 |   await expect(page.getByTestId('find-time-route-state')).toHaveAttribute(
  157 |     'data-top-pick-count',
  158 |     String(seededFindTime.topPickCount)
  159 |   );
  160 | 
  161 |   // Validate the first ranked pick contract
  162 |   const topPick = await readFindTimeTopPickSnapshot(page, 0);
> 163 |   await expect(topPick).toMatchObject({ ...seededFindTime.topPicks[0], handoffReady: 'true' });
      |                         ^ Error: expect(received).toMatchObject(expected)
  164 | 
  165 |   const ctaSnapshot = await readFindTimeTopPickCtaSnapshot(page, 0);
  166 |   await expect(ctaSnapshot).toMatchObject({
  167 |     source: 'find-time',
  168 |     startAt: seededFindTime.topPicks[0].startAt,
  169 |     endAt: seededFindTime.topPicks[0].endAt,
  170 |     label: 'Create from this slot'
  171 |   });
  172 | 
  173 |   // Trigger the handoff
  174 |   await page.getByTestId('find-time-top-pick-0-cta').click();
  175 | 
  176 |   // Verify create-arrival diagnostics
  177 |   const arrival = await readCreateSheetArrivalSnapshot(page);
  178 |   expect(arrival.open).toBe(true);
  179 |   expect(arrival.routePrefillStatus).toBe('accepted');
  180 |   expect(arrival.routePrefillSource).toBe('find-time');
  181 |   expect(arrival.routePrefillStart).toBe(ctaSnapshot.startAt);
  182 |   expect(arrival.routePrefillEnd).toBe(ctaSnapshot.endAt);
  183 |   expect(arrival.createSource).toBe('find-time');
  184 |   expect(arrival.prefillSource).toBe('find-time');
  185 |   expect(arrival.openOnArrival).toBe('true');
  186 | 
  187 |   const expectedPrefill = expectedCreateShiftPrefillValues(ctaSnapshot);
  188 |   expect(arrival.startValue).toBe(expectedPrefill.startValue);
  189 |   expect(arrival.endValue).toBe(expectedPrefill.endValue);
  190 | 
  191 |   // One-shot params must be stripped before the user touches the form
  192 |   await expect
  193 |     .poll(() => page.url(), {
  194 |       message: 'expected the calendar route to strip one-shot handoff params after the first arrival render'
  195 |     })
  196 |     .toBe(`http://127.0.0.1:4173/calendars/${calendarId}?start=${warmWeekStart}`);
  197 | 
  198 |   // Submit the create form — shift must land on the board synchronously
  199 |   await submitHandoffBackedCreateForm(page, { title: assemblyShiftTitle });
  200 |   await waitForPendingCount(page, 0);
  201 |   await waitForRetryableCount(page, 0);
  202 |   await expect(
  203 |     page
  204 |       .getByTestId('day-column-2026-04-16')
  205 |       .locator('[data-testid^="shift-card-"]')
  206 |       .filter({ hasText: assemblyShiftTitle })
  207 |       .first()
  208 |   ).toBeVisible();
  209 | 
  210 |   // Reload must clear handoff params and keep the shift visible
  211 |   await page.reload();
  212 |   await expect(page).toHaveURL(new RegExp(`/calendars/${calendarId}\\?start=${warmWeekStart}$`));
  213 |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-create-prefill-status', 'none');
  214 |   await expect(page.getByTestId('create-shift-editor')).toHaveCount(0);
  215 |   await expect(
  216 |     page
  217 |       .getByTestId('day-column-2026-04-16')
  218 |       .locator('[data-testid^="shift-card-"]')
  219 |       .filter({ hasText: assemblyShiftTitle })
  220 |       .first()
  221 |   ).toBeVisible();
  222 | });
  223 | 
  224 | // ---------------------------------------------------------------------------
  225 | // Phase 4: notification delivery and safe tap landing
  226 | // ---------------------------------------------------------------------------
  227 | 
  228 | test('phase 4 — notification delivery reaches the enabled calendar and a safe tap lands in the permitted context', async ({
  229 |   page
  230 | }) => {
  231 |   let desiredEnabled = false;
  232 | 
  233 |   // Stub preference RPCs so the notification layer has a clean slate
  234 |   await stubSupabaseRpc(page, 'list_device_calendar_notification_preferences', () => ({
  235 |     data: desiredEnabled
  236 |       ? [preferenceRow({ calendarId, desiredEnabled: true, remoteSubscriptionStatus: 'subscribed' })]
  237 |       : []
  238 |   }));
  239 |   await stubSupabaseRpc(page, 'set_device_calendar_notification_preference', () => {
  240 |     desiredEnabled = true;
  241 |     return {
  242 |       data: [preferenceRow({ calendarId, desiredEnabled: true, remoteSubscriptionStatus: 'subscribed' })]
  243 |     };
  244 |   });
  245 | 
  246 |   // Intercept shared-change dispatch so we can assert delivery shape
  247 |   const dispatch = await interceptCalendarChangeDispatch(page);
  248 | 
  249 |   await signInThroughUi(page, seededUsers.alphaMember);
  250 |   await openCalendar(page, {
  251 |     calendarId,
  252 |     weekStart: warmWeekStart,
  253 |     expectedName: 'Alpha shared'
  254 |   });
  255 | 
  256 |   // Enable notifications for the permitted calendar
  257 |   await page.goto('/groups');
  258 |   await expect(page.getByTestId('groups-shell')).toHaveAttribute('data-shell-bootstrap', 'ready');
  259 |   await setSimulatedNotificationPermissions(page, 'granted');
  260 |   await setNotificationToggleValue(page, calendarId, true);
  261 | 
  262 |   await waitForNotificationToggleState(page, calendarId, {
  263 |     enabled: 'true',
```