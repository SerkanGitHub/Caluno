# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-sync.spec.ts >> online collaborators see shared shift changes propagate live within the same trusted calendar week
- Location: tests/e2e/calendar-sync.spec.ts:65:1

# Error details

```
Error: expected day 2026-04-16 to show 1 overlap pair(s)

expect(received).toBe(expected) // Object.is equality

Expected: 1
Received: null

Call Log:
- Timeout 20000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- main [ref=e4]:
  - complementary [ref=e5]:
    - paragraph [ref=e6]: Trusted calendar scope
    - heading "Bob Member" [level=1] [ref=e7]
    - paragraph [ref=e8]: This route rendered from the trusted server contract, so calendar authority was revalidated before the week loaded.
    - generic [ref=e9]:
      - article [ref=e10]:
        - generic [ref=e11]: Route state
        - strong [ref=e12]: trusted-online
        - paragraph [ref=e13]: Week data and calendar scope came from the trusted server route.
      - article [ref=e14]:
        - generic [ref=e15]: Local-first state
        - strong [ref=e16]: online
        - paragraph [ref=e17]: The visible week is rendering from the trusted server snapshot, and offline continuity is cached on this browser.
        - code [ref=e18]: 0 pending / 0 retryable
      - article [ref=e19]:
        - generic [ref=e20]: Sync diagnostics
        - strong [ref=e21]: idle
        - paragraph [ref=e22]: Reconnect is idle. Trusted route actions already confirmed all drained work or nothing was pending.
        - code [ref=e23]: 2026-04-16T13:04:17.724Z
      - article [ref=e24]:
        - generic [ref=e25]: Realtime diagnostics
        - strong [ref=e26]: ready
        - paragraph [ref=e27]: Live change detection is connected for this calendar. Realtime signals trigger trusted refreshes instead of direct client writes.
        - code [ref=e28]: No shared shift signal received yet
        - paragraph [ref=e29]: Listening for shared shift changes on this calendar week.
      - article [ref=e30]:
        - generic [ref=e31]: Week scope
        - strong [ref=e32]: 2026-04-13
        - paragraph [ref=e33]: The requested visible week resolved successfully.
        - code [ref=e34]: server-sync
    - navigation [ref=e35]:
      - link "Back to groups" [ref=e36] [cursor=pointer]:
        - /url: /groups
      - link "Sign out" [ref=e37] [cursor=pointer]:
        - /url: /logout
  - generic [ref=e38]:
    - generic [ref=e39]:
      - paragraph [ref=e40]: Alpha Team
      - heading "Alpha shared" [level=2] [ref=e41]
      - paragraph [ref=e42]: "A calm week board for multi-shift days: local writes render immediately, while trusted server actions stay authoritative for confirmation."
      - generic [ref=e43]:
        - generic [ref=e44]: Default calendar
        - generic [ref=e45]: member access
        - generic [ref=e46]: 8 visible shifts
        - generic [ref=e47]: Trusted online
        - generic [ref=e48]: idle
        - generic [ref=e49]: realtime ready
    - generic [ref=e50]:
      - generic [ref=e51]:
        - generic [ref=e52]:
          - paragraph [ref=e53]: Protected week board
          - heading "Apr 13 — Apr 19, 2026" [level=2] [ref=e54]
          - paragraph [ref=e55]: Visible week chosen from the route query.
        - generic [ref=e56]:
          - generic [ref=e57]:
            - generic [ref=e58]: "Visible week start: 2026-04-13"
            - generic [ref=e59]: 8 shifts
            - generic [ref=e60]: UTC board
            - generic [ref=e61]: 1 overlap pair in view
            - generic [ref=e62]: Server-synced board
            - generic [ref=e63]: Online
            - generic [ref=e64]: Sync idle
            - generic [ref=e65]: Sync attempt recorded
            - generic [ref=e66]: No pending local writes
          - navigation "Visible week navigation" [ref=e67]:
            - link "Previous week" [ref=e68] [cursor=pointer]:
              - /url: "?start=2026-04-06"
            - link "Next week" [ref=e69] [cursor=pointer]:
              - /url: "?start=2026-04-20"
      - generic [ref=e70]:
        - group [ref=e71]:
          - generic "Plan a shift" [ref=e72] [cursor=pointer]
        - generic [ref=e73]:
          - paragraph [ref=e74]: Board rhythm
          - paragraph [ref=e75]: Local writes update the visible week immediately, stay queued when the server is unavailable, and keep the trusted server action as the confirmation path.
      - article [ref=e76]:
        - generic [ref=e77]: Visible-week conflict watch
        - strong [ref=e78]: 1 overlap pair in view
        - paragraph [ref=e79]: Fri, Apr 17 contains 2 conflicting visible shifts.
      - article [ref=e80]:
        - generic [ref=e81]: Board sync diagnostics
        - strong [ref=e82]: Sync idle
        - paragraph [ref=e83]:
          - text: "Last reconnect attempt:"
          - code [ref=e84]: 2026-04-16T13:04:17.724Z
      - article [ref=e85]:
        - generic [ref=e86]: Board realtime diagnostics
        - strong [ref=e87]: ready
        - paragraph [ref=e88]: No shared shift signal has touched this visible week yet.
        - paragraph [ref=e89]: Listening for shared shift changes on this calendar week.
      - generic [ref=e90]:
        - generic [ref=e91]:
          - generic [ref=e92]:
            - generic [ref=e93]:
              - paragraph [ref=e94]: Monday
              - heading "Apr 13" [level=3] [ref=e95]
            - generic [ref=e97]: 1 shift
          - article [ref=e99]:
            - generic [ref=e100]:
              - generic [ref=e101]:
                - paragraph [ref=e102]: Recurring series
                - heading "Alpha opening sweep" [level=3] [ref=e103]
              - generic [ref=e104]:
                - generic [ref=e105]: 08:30 → 09:00
                - generic [ref=e106]: Occurrence 1
            - generic [ref=e107]:
              - generic [ref=e108]:
                - text: Window
                - strong [ref=e109]: 08:30 → 09:00
              - generic [ref=e110]:
                - text: Duration
                - strong [ref=e111]: 0.5h block
              - generic [ref=e112]:
                - text: Shift id
                - code [ref=e113]: aaaaaaaa-8888-1111-1111-111111111111
            - generic [ref=e114]:
              - group [ref=e115]:
                - generic "Edit details" [ref=e116] [cursor=pointer]
              - group [ref=e117]:
                - generic "Move timing" [ref=e118] [cursor=pointer]
              - button "Delete shift" [ref=e120] [cursor=pointer]
        - generic [ref=e121]:
          - generic [ref=e122]:
            - generic [ref=e123]:
              - paragraph [ref=e124]: Tuesday
              - heading "Apr 14" [level=3] [ref=e125]
            - generic [ref=e127]: 1 shift
          - article [ref=e129]:
            - generic [ref=e130]:
              - generic [ref=e131]:
                - paragraph [ref=e132]: Recurring series
                - heading "Alpha opening sweep" [level=3] [ref=e133]
              - generic [ref=e134]:
                - generic [ref=e135]: 08:30 → 09:00
                - generic [ref=e136]: Occurrence 2
            - generic [ref=e137]:
              - generic [ref=e138]:
                - text: Window
                - strong [ref=e139]: 08:30 → 09:00
              - generic [ref=e140]:
                - text: Duration
                - strong [ref=e141]: 0.5h block
              - generic [ref=e142]:
                - text: Shift id
                - code [ref=e143]: aaaaaaaa-8888-1111-1111-222222222222
            - generic [ref=e144]:
              - group [ref=e145]:
                - generic "Edit details" [ref=e146] [cursor=pointer]
              - group [ref=e147]:
                - generic "Move timing" [ref=e148] [cursor=pointer]
              - button "Delete shift" [ref=e150] [cursor=pointer]
        - generic [ref=e151]:
          - generic [ref=e152]:
            - generic [ref=e153]:
              - paragraph [ref=e154]: Wednesday
              - heading "Apr 15" [level=3] [ref=e155]
            - generic [ref=e157]: 2 shifts
          - generic [ref=e158]:
            - article [ref=e159]:
              - generic [ref=e160]:
                - generic [ref=e161]:
                  - paragraph [ref=e162]: Recurring series
                  - heading "Alpha opening sweep" [level=3] [ref=e163]
                - generic [ref=e164]:
                  - generic [ref=e165]: 08:30 → 09:00
                  - generic [ref=e166]: Occurrence 3
              - generic [ref=e167]:
                - generic [ref=e168]:
                  - text: Window
                  - strong [ref=e169]: 08:30 → 09:00
                - generic [ref=e170]:
                  - text: Duration
                  - strong [ref=e171]: 0.5h block
                - generic [ref=e172]:
                  - text: Shift id
                  - code [ref=e173]: aaaaaaaa-8888-1111-1111-333333333333
              - generic [ref=e174]:
                - group [ref=e175]:
                  - generic "Edit details" [ref=e176] [cursor=pointer]
                - group [ref=e177]:
                  - generic "Move timing" [ref=e178] [cursor=pointer]
                - button "Delete shift" [ref=e180] [cursor=pointer]
            - article [ref=e181]:
              - generic [ref=e182]:
                - generic [ref=e183]:
                  - paragraph [ref=e184]: One-off shift
                  - heading "Morning intake offline revised" [level=3] [ref=e185]
                - generic [ref=e187]: 09:45 → 11:45
              - generic [ref=e188]:
                - generic [ref=e189]:
                  - text: Window
                  - strong [ref=e190]: 09:45 → 11:45
                - generic [ref=e191]:
                  - text: Duration
                  - strong [ref=e192]: 2h block
                - generic [ref=e193]:
                  - text: Shift id
                  - code [ref=e194]: aaaaaaaa-6666-1111-1111-111111111111
              - generic [ref=e195]:
                - group [ref=e196]:
                  - generic "Edit details" [ref=e197] [cursor=pointer]
                - group [ref=e198]:
                  - generic "Move timing" [ref=e199] [cursor=pointer]
                - button "Delete shift" [ref=e201] [cursor=pointer]
        - generic [ref=e202]:
          - generic [ref=e203]:
            - generic:
              - paragraph: Thursday
              - heading "Apr 16" [level=3]
            - generic [ref=e204]:
              - generic [ref=e205]: Today
              - generic [ref=e206]: 2 shifts
          - generic [ref=e207]:
            - article [ref=e208]:
              - generic [ref=e209]:
                - generic [ref=e210]:
                  - paragraph [ref=e211]: Recurring series
                  - heading "Alpha opening sweep" [level=3] [ref=e212]
                - generic [ref=e213]:
                  - generic [ref=e214]: 08:30 → 09:00
                  - generic [ref=e215]: Occurrence 4
              - generic [ref=e216]:
                - generic [ref=e217]:
                  - text: Window
                  - strong [ref=e218]: 08:30 → 09:00
                - generic [ref=e219]:
                  - text: Duration
                  - strong [ref=e220]: 0.5h block
                - generic [ref=e221]:
                  - text: Shift id
                  - code [ref=e222]: aaaaaaaa-8888-1111-1111-444444444444
              - generic [ref=e223]:
                - group [ref=e224]:
                  - generic "Edit details" [ref=e225] [cursor=pointer]
                - group [ref=e226]:
                  - generic "Move timing" [ref=e227] [cursor=pointer]
                - button "Delete shift" [ref=e229] [cursor=pointer]
            - article [ref=e230]:
              - generic [ref=e231]:
                - generic [ref=e232]:
                  - paragraph [ref=e233]: One-off shift
                  - heading "Kitchen prep" [level=3] [ref=e234]
                - generic [ref=e236]: 12:00 → 14:00
              - generic [ref=e237]:
                - generic [ref=e238]:
                  - text: Window
                  - strong [ref=e239]: 12:00 → 14:00
                - generic [ref=e240]:
                  - text: Duration
                  - strong [ref=e241]: 2h block
                - generic [ref=e242]:
                  - text: Shift id
                  - code [ref=e243]: aaaaaaaa-7777-1111-1111-111111111111
              - generic [ref=e244]:
                - group [ref=e245]:
                  - generic "Edit details" [ref=e246] [cursor=pointer]
                - group [ref=e247]:
                  - generic "Move timing" [ref=e248] [cursor=pointer]
                - button "Delete shift" [ref=e250] [cursor=pointer]
        - generic [ref=e251]:
          - generic [ref=e252]:
            - generic:
              - paragraph: Friday
              - heading "Apr 17" [level=3]
            - generic [ref=e253]:
              - generic [ref=e254]: 1 overlap pair
              - generic [ref=e255]: 2 shifts
          - generic [ref=e256]:
            - article [ref=e257]:
              - strong [ref=e258]: 1 overlap pair
              - paragraph [ref=e259]: Offline continuity overlap anchor (16:00 → 17:00) · Supplier call (16:00 → 18:00)
            - article [ref=e260]:
              - generic [ref=e261]:
                - generic [ref=e262]:
                  - paragraph [ref=e263]: One-off shift
                  - heading "Offline continuity overlap anchor" [level=3] [ref=e264]
                - generic [ref=e265]:
                  - generic [ref=e266]: 16:00 → 17:00
                  - generic [ref=e267]: Overlaps 1 visible shift
              - article [ref=e268]:
                - strong [ref=e269]: Overlaps 1 visible shift
                - paragraph [ref=e270]: Supplier call (16:00 → 18:00)
              - generic [ref=e271]:
                - generic [ref=e272]:
                  - text: Window
                  - strong [ref=e273]: 16:00 → 17:00
                - generic [ref=e274]:
                  - text: Duration
                  - strong [ref=e275]: 1h block
                - generic [ref=e276]:
                  - text: Shift id
                  - code [ref=e277]: 8d62c2ac-7c7d-4a60-8a51-8053ba934e8d
              - generic [ref=e278]:
                - group [ref=e279]:
                  - generic "Edit details" [ref=e280] [cursor=pointer]
                - group [ref=e281]:
                  - generic "Move timing" [ref=e282] [cursor=pointer]
                - button "Delete shift" [ref=e284] [cursor=pointer]
            - article [ref=e285]:
              - generic [ref=e286]:
                - generic [ref=e287]:
                  - paragraph [ref=e288]: One-off shift
                  - heading "Supplier call" [level=3] [ref=e289]
                - generic [ref=e290]:
                  - generic [ref=e291]: 16:00 → 18:00
                  - generic [ref=e292]: Overlaps 1 visible shift
              - article [ref=e293]:
                - strong [ref=e294]: Overlaps 1 visible shift
                - paragraph [ref=e295]: Offline continuity overlap anchor (16:00 → 17:00)
              - generic [ref=e296]:
                - generic [ref=e297]:
                  - text: Window
                  - strong [ref=e298]: 16:00 → 18:00
                - generic [ref=e299]:
                  - text: Duration
                  - strong [ref=e300]: 2h block
                - generic [ref=e301]:
                  - text: Shift id
                  - code [ref=e302]: aaaaaaaa-7777-1111-1111-222222222222
              - generic [ref=e303]:
                - group [ref=e304]:
                  - generic "Edit details" [ref=e305] [cursor=pointer]
                - group [ref=e306]:
                  - generic "Move timing" [ref=e307] [cursor=pointer]
                - button "Delete shift" [ref=e309] [cursor=pointer]
        - generic [ref=e310]:
          - generic [ref=e311]:
            - generic [ref=e312]:
              - paragraph [ref=e313]: Saturday
              - heading "Apr 18" [level=3] [ref=e314]
            - generic [ref=e316]: 0 shifts
          - article [ref=e317]:
            - paragraph [ref=e318]: Open capacity
            - heading "Nothing scheduled." [level=3] [ref=e319]
            - paragraph [ref=e320]: This day stays visible so users can add or move a shift here without losing week context.
        - generic [ref=e321]:
          - generic [ref=e322]:
            - generic [ref=e323]:
              - paragraph [ref=e324]: Sunday
              - heading "Apr 19" [level=3] [ref=e325]
            - generic [ref=e327]: 0 shifts
          - article [ref=e328]:
            - paragraph [ref=e329]: Open capacity
            - heading "Nothing scheduled." [level=3] [ref=e330]
            - paragraph [ref=e331]: This day stays visible so users can add or move a shift here without losing week context.
    - generic [ref=e332]:
      - generic [ref=e333]:
        - generic [ref=e334]:
          - paragraph [ref=e335]: Visible calendar inventory
          - heading "Only trusted calendars appear in navigation." [level=3] [ref=e336]
        - generic [ref=e337]: 2 visible
      - generic [ref=e338]:
        - link "Alpha shared Default calendar" [ref=e339] [cursor=pointer]:
          - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111
          - strong [ref=e340]: Alpha shared
          - generic [ref=e341]: Default calendar
        - link "Alpha backlog Secondary calendar" [ref=e342] [cursor=pointer]:
          - /url: /calendars/aaaaaaaa-aaaa-1111-1111-222222222222
          - strong [ref=e343]: Alpha backlog
          - generic [ref=e344]: Secondary calendar
```

# Test source

```ts
  862  |   shiftId: string;
  863  |   label: string | null;
  864  |   detail: string | null;
  865  |   overlapCount: number | null;
  866  | };
  867  | 
  868  | async function readCountAttribute(locator: Locator, attribute: string) {
  869  |   if ((await locator.count()) === 0) {
  870  |     return null;
  871  |   }
  872  | 
  873  |   const raw = await locator.getAttribute(attribute);
  874  |   if (!raw) {
  875  |     return null;
  876  |   }
  877  | 
  878  |   const parsed = Number.parseInt(raw, 10);
  879  |   return Number.isFinite(parsed) ? parsed : null;
  880  | }
  881  | 
  882  | export async function readBoardConflictSummary(page: Page): Promise<BoardConflictState> {
  883  |   const summary = page.getByTestId('board-conflict-summary');
  884  |   if ((await summary.count()) === 0) {
  885  |     return {
  886  |       visible: false,
  887  |       label: null,
  888  |       detail: null,
  889  |       dayCount: null,
  890  |       shiftCount: null,
  891  |       pairCount: null
  892  |     };
  893  |   }
  894  | 
  895  |   return {
  896  |     visible: await summary.isVisible(),
  897  |     label: ((await summary.locator('strong').textContent()) ?? '').trim() || null,
  898  |     detail: ((await summary.locator('p').textContent()) ?? '').trim() || null,
  899  |     dayCount: await readCountAttribute(summary, 'data-conflict-days'),
  900  |     shiftCount: await readCountAttribute(summary, 'data-conflict-shifts'),
  901  |     pairCount: await readCountAttribute(summary, 'data-conflict-pairs')
  902  |   };
  903  | }
  904  | 
  905  | export async function readDayConflictSummary(page: Page, dayKey: string): Promise<DayConflictState> {
  906  |   const summary = page.getByTestId(`day-conflict-summary-${dayKey}`);
  907  |   if ((await summary.count()) === 0) {
  908  |     return {
  909  |       visible: false,
  910  |       dayKey,
  911  |       label: null,
  912  |       detail: null,
  913  |       pairCount: null,
  914  |       shiftCount: null
  915  |     };
  916  |   }
  917  | 
  918  |   return {
  919  |     visible: await summary.isVisible(),
  920  |     dayKey,
  921  |     label: ((await summary.locator('strong').textContent()) ?? '').trim() || null,
  922  |     detail: ((await summary.locator('p').textContent()) ?? '').trim() || null,
  923  |     pairCount: await readCountAttribute(summary, 'data-conflict-pairs'),
  924  |     shiftCount: await readCountAttribute(summary, 'data-conflict-shifts')
  925  |   };
  926  | }
  927  | 
  928  | export async function readShiftConflictSummary(page: Page, shiftId: string): Promise<ShiftConflictState> {
  929  |   const summary = page.getByTestId(`shift-conflict-summary-${shiftId}`);
  930  |   if ((await summary.count()) === 0) {
  931  |     return {
  932  |       visible: false,
  933  |       shiftId,
  934  |       label: null,
  935  |       detail: null,
  936  |       overlapCount: null
  937  |     };
  938  |   }
  939  | 
  940  |   return {
  941  |     visible: await summary.isVisible(),
  942  |     shiftId,
  943  |     label: ((await summary.locator('strong').textContent()) ?? '').trim() || null,
  944  |     detail: ((await summary.locator('p').textContent()) ?? '').trim() || null,
  945  |     overlapCount: await readCountAttribute(summary, 'data-conflict-overlaps')
  946  |   };
  947  | }
  948  | 
  949  | export async function waitForBoardConflictPairs(page: Page, expectedPairCount: number | null, timeout = 20_000) {
  950  |   await expect
  951  |     .poll(async () => (await readBoardConflictSummary(page)).pairCount, {
  952  |       timeout,
  953  |       message:
  954  |         expectedPairCount === null
  955  |           ? 'expected the board conflict summary to stay absent'
  956  |           : `expected the board conflict summary to show ${expectedPairCount} overlap pair(s)`
  957  |     })
  958  |     .toBe(expectedPairCount);
  959  | }
  960  | 
  961  | export async function waitForDayConflictPairs(page: Page, dayKey: string, expectedPairCount: number | null, timeout = 20_000) {
> 962  |   await expect
       |   ^ Error: expected day 2026-04-16 to show 1 overlap pair(s)
  963  |     .poll(async () => (await readDayConflictSummary(page, dayKey)).pairCount, {
  964  |       timeout,
  965  |       message:
  966  |         expectedPairCount === null
  967  |           ? `expected day ${dayKey} to stay conflict-free`
  968  |           : `expected day ${dayKey} to show ${expectedPairCount} overlap pair(s)`
  969  |     })
  970  |     .toBe(expectedPairCount);
  971  | }
  972  | 
  973  | export async function waitForShiftConflictOverlaps(page: Page, shiftId: string, expectedOverlapCount: number | null, timeout = 20_000) {
  974  |   await expect
  975  |     .poll(async () => (await readShiftConflictSummary(page, shiftId)).overlapCount, {
  976  |       timeout,
  977  |       message:
  978  |         expectedOverlapCount === null
  979  |           ? `expected shift ${shiftId} to stay conflict-free`
  980  |           : `expected shift ${shiftId} to show ${expectedOverlapCount} visible overlap(s)`
  981  |     })
  982  |     .toBe(expectedOverlapCount);
  983  | }
  984  | 
  985  | export async function waitForQueueSummary(page: Page, expectedSummary: string | RegExp, timeout = 20_000) {
  986  |   const message = `expected queue summary to become ${String(expectedSummary)}`;
  987  | 
  988  |   if (expectedSummary instanceof RegExp) {
  989  |     await expect
  990  |       .poll(async () => (await readStateText(page, 'calendar-local-state', 'code')) ?? '', {
  991  |         timeout,
  992  |         message
  993  |       })
  994  |       .toMatch(expectedSummary);
  995  |     return;
  996  |   }
  997  | 
  998  |   await expect
  999  |     .poll(async () => await readStateText(page, 'calendar-local-state', 'code'), {
  1000 |       timeout,
  1001 |       message
  1002 |     })
  1003 |     .toBe(expectedSummary);
  1004 | }
  1005 | 
  1006 | export async function waitForLocalSnapshotStatus(page: Page, expectedStatus: 'ready' | 'failed' | 'idle', timeout = 20_000) {
  1007 |   await expect
  1008 |     .poll(async () => page.getByTestId('calendar-local-state').getAttribute('data-snapshot-status'), {
  1009 |       timeout,
  1010 |       message: `expected local snapshot status to become ${expectedStatus}`
  1011 |     })
  1012 |     .toBe(expectedStatus);
  1013 | }
  1014 | 
  1015 | export async function waitForSyncAttempt(page: Page, timeout = 20_000) {
  1016 |   await expect
  1017 |     .poll(async () => (await readStateText(page, 'calendar-sync-state', 'code')) ?? '', {
  1018 |       timeout,
  1019 |       message: 'expected reconnect diagnostics to record a last-attempt marker'
  1020 |     })
  1021 |     .not.toBe('No reconnect attempt yet');
  1022 | }
  1023 | 
  1024 | export async function waitForSyncPhase(page: Page, expectedPhase: string | RegExp, timeout = 20_000) {
  1025 |   const message = `expected sync phase to become ${String(expectedPhase)}`;
  1026 | 
  1027 |   if (expectedPhase instanceof RegExp) {
  1028 |     await expect
  1029 |       .poll(async () => (await readStateText(page, 'calendar-sync-state', 'strong')) ?? '', {
  1030 |         timeout,
  1031 |         message
  1032 |       })
  1033 |       .toMatch(expectedPhase);
  1034 |     return;
  1035 |   }
  1036 | 
  1037 |   await expect
  1038 |     .poll(async () => await readStateText(page, 'calendar-sync-state', 'strong'), {
  1039 |       timeout,
  1040 |       message
  1041 |     })
  1042 |     .toBe(expectedPhase);
  1043 | }
  1044 | 
  1045 | export async function waitForRealtimeChannelReady(page: Page, timeout = 20_000) {
  1046 |   await expect
  1047 |     .poll(async () => page.getByTestId('calendar-realtime-state').getAttribute('data-channel-state'), {
  1048 |       timeout,
  1049 |       message: 'expected the realtime channel state to reach ready'
  1050 |     })
  1051 |     .toBe('ready');
  1052 | }
  1053 | 
  1054 | export async function waitForRemoteRefreshApplied(page: Page, timeout = 20_000) {
  1055 |   await expect
  1056 |     .poll(async () => page.getByTestId('calendar-realtime-state').getAttribute('data-remote-refresh-state'), {
  1057 |       timeout,
  1058 |       message: 'expected realtime diagnostics to confirm a trusted refresh was applied'
  1059 |     })
  1060 |     .toBe('applied');
  1061 | }
  1062 | 
```