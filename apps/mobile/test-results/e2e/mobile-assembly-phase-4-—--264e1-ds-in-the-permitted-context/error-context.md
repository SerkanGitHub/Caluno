# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile-assembly.spec.ts >> phase 4 — notification delivery reaches the enabled calendar and a safe tap lands in the permitted context
- Location: tests/e2e/mobile-assembly.spec.ts:239:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - paragraph [ref=e6]: Caluno pocket shell
      - generic [ref=e7]:
        - generic [ref=e8]: Bob Member
        - button "Sign out" [ref=e9] [cursor=pointer]
    - generic [ref=e10]:
      - heading "Trusted groups, cut for a phone." [level=1] [ref=e11]
      - paragraph [ref=e12]: Your mobile shell opens only the memberships, calendars, and join-code metadata already proven online or previously stored inside trusted continuity.
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
    - paragraph [ref=e26]: "Last trusted refresh: 2026-04-15T07:00:00.000Z"
  - generic [ref=e27]:
    - generic [ref=e28]:
      - article [ref=e29]:
        - generic [ref=e30]:
          - paragraph [ref=e31]: Pocket overview
          - heading "Your first tap can be the right calendar." [level=2] [ref=e32]
        - paragraph [ref=e33]: The shared primary-calendar helper already picked the first truthful landing target for this session.
        - generic [ref=e34]:
          - link "Open Alpha shared" [ref=e35] [cursor=pointer]:
            - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111
          - link "Account state" [ref=e36] [cursor=pointer]:
            - /url: /signin
      - article [ref=e37]:
        - generic [ref=e38]: Trusted inventory
        - strong [ref=e39]: 1 groups / 2 calendars
        - paragraph [ref=e40]: All navigation below comes directly from the shaped app-shell inventory, not from route guessing.
    - article [ref=e42]:
      - generic [ref=e43]:
        - generic [ref=e44]:
          - paragraph [ref=e45]: Member scope
          - heading "Alpha Team" [level=3] [ref=e46]
        - generic [ref=e47]: unavailable
      - generic [ref=e48]:
        - article [ref=e49]:
          - link "Alpha shared Default calendar" [ref=e50] [cursor=pointer]:
            - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111
            - strong [ref=e51]: Alpha shared
            - generic [ref=e52]: Default calendar
          - generic [ref=e53]:
            - generic [ref=e54]:
              - generic [ref=e55]:
                - paragraph [ref=e56]: Calm notifications
                - heading "Alpha shared" [level=3] [ref=e57]
                - paragraph [ref=e58]: This calendar is trying to keep both local reminders and shared-calendar changes in sync.
              - generic [ref=e59]:
                - switch "Toggle calm notifications for Alpha shared" [checked] [ref=e60] [cursor=pointer]
                - generic [ref=e63]: "On"
            - generic [ref=e64]:
              - article [ref=e65]:
                - generic [ref=e66]: Permission
                - strong [ref=e67]: granted
              - article [ref=e68]:
                - generic [ref=e69]: Local reminders
                - strong [ref=e70]: ready
              - article [ref=e71]:
                - generic [ref=e72]: Shared changes
                - strong [ref=e73]: subscribed
              - article [ref=e74]:
                - generic [ref=e75]: Phase
                - strong [ref=e76]: ready
            - generic [ref=e77]:
              - generic [ref=e78]: "reason: none"
              - generic [ref=e79]: "reminders: 10"
              - generic [ref=e80]: "registration: registered"
              - generic [ref=e81]: "last sync: 2026-04-15T07:00:00.000Z"
            - paragraph [ref=e82]: Trusted per-device notification preferences loaded successfully.
        - article [ref=e83]:
          - link "Alpha backlog Secondary calendar" [ref=e84] [cursor=pointer]:
            - /url: /calendars/aaaaaaaa-aaaa-1111-1111-222222222222
            - strong [ref=e85]: Alpha backlog
            - generic [ref=e86]: Secondary calendar
          - generic [ref=e87]:
            - generic [ref=e88]:
              - generic [ref=e89]:
                - paragraph [ref=e90]: Calm notifications
                - heading "Alpha backlog" [level=3] [ref=e91]
                - paragraph [ref=e92]: This calendar will stay quiet until you enable both reminder and shared-change delivery.
              - generic [ref=e93]:
                - switch "Toggle calm notifications for Alpha backlog" [ref=e94] [cursor=pointer]
                - generic [ref=e97]: "Off"
            - generic [ref=e98]:
              - article [ref=e99]:
                - generic [ref=e100]: Permission
                - strong [ref=e101]: granted
              - article [ref=e102]:
                - generic [ref=e103]: Local reminders
                - strong [ref=e104]: ready
              - article [ref=e105]:
                - generic [ref=e106]: Shared changes
                - strong [ref=e107]: unsubscribed
              - article [ref=e108]:
                - generic [ref=e109]: Phase
                - strong [ref=e110]: ready
            - generic [ref=e111]:
              - generic [ref=e112]: "reason: none"
              - generic [ref=e113]: "reminders: 0"
              - generic [ref=e114]: "registration: registered"
              - generic [ref=e115]: "last sync: 2026-04-15T07:00:00.000Z"
            - paragraph [ref=e116]: Trusted per-device notification preferences loaded successfully.
  - navigation "Primary mobile navigation" [ref=e117]:
    - link "Groups" [ref=e118] [cursor=pointer]:
      - /url: /groups
    - link "Alpha shared" [ref=e119] [cursor=pointer]:
      - /url: /calendars/aaaaaaaa-aaaa-1111-1111-111111111111
    - link "Account" [ref=e120] [cursor=pointer]:
      - /url: /signin
```

# Test source

```ts
  219 |   ).toBeVisible();
  220 | 
  221 |   // Reload must clear handoff params and keep the shift visible
  222 |   await page.reload();
  223 |   await expect(page).toHaveURL(new RegExp(`/calendars/${calendarId}\\?start=${warmWeekStart}$`));
  224 |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-create-prefill-status', 'none');
  225 |   await expect(page.getByTestId('create-shift-editor')).toHaveCount(0);
  226 |   await expect(
  227 |     page
  228 |       .getByTestId(topPickDayColumn)
  229 |       .locator('[data-testid^="shift-card-"]')
  230 |       .filter({ hasText: assemblyShiftTitle })
  231 |       .first()
  232 |   ).toBeVisible();
  233 | });
  234 | 
  235 | // ---------------------------------------------------------------------------
  236 | // Phase 4: notification delivery and safe tap landing
  237 | // ---------------------------------------------------------------------------
  238 | 
  239 | test('phase 4 — notification delivery reaches the enabled calendar and a safe tap lands in the permitted context', async ({
  240 |   page
  241 | }) => {
  242 |   let desiredEnabled = false;
  243 | 
  244 |   // Stub preference RPCs so the notification layer has a clean slate
  245 |   await stubSupabaseRpc(page, 'list_device_calendar_notification_preferences', () => ({
  246 |     data: desiredEnabled
  247 |       ? [preferenceRow({ calendarId, desiredEnabled: true, remoteSubscriptionStatus: 'subscribed' })]
  248 |       : []
  249 |   }));
  250 |   await stubSupabaseRpc(page, 'set_device_calendar_notification_preference', () => {
  251 |     desiredEnabled = true;
  252 |     return {
  253 |       data: [preferenceRow({ calendarId, desiredEnabled: true, remoteSubscriptionStatus: 'subscribed' })]
  254 |     };
  255 |   });
  256 | 
  257 |   // Intercept shared-change dispatch so we can assert delivery shape
  258 |   const dispatch = await interceptCalendarChangeDispatch(page);
  259 | 
  260 |   await signInThroughUi(page, seededUsers.alphaMember);
  261 |   await openCalendar(page, {
  262 |     calendarId,
  263 |     weekStart: warmWeekStart,
  264 |     expectedName: 'Alpha shared'
  265 |   });
  266 | 
  267 |   // Enable notifications for the permitted calendar
  268 |   await page.goto('/groups');
  269 |   await expect(page.getByTestId('groups-shell')).toHaveAttribute('data-shell-bootstrap', 'ready');
  270 |   await setSimulatedNotificationPermissions(page, 'granted');
  271 |   await setNotificationToggleValue(page, calendarId, true);
  272 | 
  273 |   await waitForNotificationToggleState(page, calendarId, {
  274 |     enabled: 'true',
  275 |     permission: 'granted',
  276 |     localReminders: 'ready',
  277 |     remoteSubscription: 'subscribed',
  278 |     phase: 'ready',
  279 |     reason: 'none'
  280 |   });
  281 |   // Backlog calendar must stay quiet
  282 |   await waitForNotificationToggleState(page, backlogCalendarId, {
  283 |     enabled: 'false',
  284 |     remoteSubscription: 'unsubscribed'
  285 |   });
  286 | 
  287 |   // Simulate a shared-change dispatch for the enabled calendar (simulating what
  288 |   // a mutation on the transport layer would produce after a successful write)
  289 |   await page.evaluate(
  290 |     async ({ origin, cId }) => {
  291 |       await fetch(`${origin}/functions/v1/notify-calendar-change`, {
  292 |         method: 'POST',
  293 |         headers: { 'Content-Type': 'application/json' },
  294 |         body: JSON.stringify({
  295 |           calendarId: cId,
  296 |           changeType: 'create',
  297 |           shiftId: 'assembly-shift-id',
  298 |           occurredAt: new Date().toISOString(),
  299 |           targetPath: `/calendars/${cId}`
  300 |         })
  301 |       });
  302 |     },
  303 |     { origin: supabaseApiOrigin, cId: calendarId }
  304 |   );
  305 | 
  306 |   // Delivery must be captured for the enabled calendar
  307 |   const delivered = dispatch.getDelivered(calendarId);
  308 |   expect(delivered.length).toBeGreaterThan(0);
  309 |   expect(delivered[0].calendarId).toBe(calendarId);
  310 |   expect(delivered[0].changeType).toBe('create');
  311 |   expect(delivered[0].targetPath).toMatch(new RegExp(`/calendars/${calendarId}`));
  312 | 
  313 |   // Disabled calendar must receive nothing
  314 |   expect(dispatch.getDelivered(backlogCalendarId)).toHaveLength(0);
  315 | 
  316 |   // Per-calendar reminder inventory must be non-empty for the enabled calendar
  317 |   const sharedReminders = await getPendingRemindersForCalendar(page, calendarId);
  318 |   expect(sharedReminders.length).toBeGreaterThan(0);
> 319 |   expect(sharedReminders.every((r) => r.calendarId === calendarId)).toBe(true);
      |                                                                     ^ Error: expect(received).toBe(expected) // Object.is equality
  320 | 
  321 |   const backlogReminders = await getPendingRemindersForCalendar(page, backlogCalendarId);
  322 |   expect(backlogReminders).toHaveLength(0);
  323 | 
  324 |   // Navigate back to the calendar before triggering the notification tap
  325 |   await openCalendar(page, {
  326 |     calendarId,
  327 |     weekStart: warmWeekStart,
  328 |     expectedName: 'Alpha shared'
  329 |   });
  330 | 
  331 |   // A safe local notification tap must navigate into the permitted calendar context
  332 |   await triggerSimulatedLocalNotificationAction(page, {
  333 |     targetPath: `/calendars/${calendarId}`,
  334 |     calendarId
  335 |   });
  336 | 
  337 |   await expect(page).toHaveURL(new RegExp(`/calendars/${calendarId}$`));
  338 |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-notification-route-result', 'navigated');
  339 |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-notification-route-reason', 'none');
  340 |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-denied-reason', 'none');
  341 |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-route-mode', 'trusted-online');
  342 | });
  343 | 
  344 | // ---------------------------------------------------------------------------
  345 | // Phase 5 (negative): broken continuity, wrong scope, and malformed params
  346 | //   all stop the tracer bullet at the actual broken contract
  347 | // ---------------------------------------------------------------------------
  348 | 
  349 | test('phase 5 — offline find-time stays fail-closed and out-of-scope tap is rejected', async ({ page }) => {
  350 |   await signInThroughUi(page, seededUsers.alphaMember);
  351 |   await openCalendar(page, {
  352 |     calendarId,
  353 |     weekStart: warmWeekStart,
  354 |     expectedName: 'Alpha shared'
  355 |   });
  356 | 
  357 |   // Offline find-time must produce offline-unavailable, not stale results
  358 |   const findTimeHref = await page.getByTestId('find-time-entrypoint').getAttribute('href');
  359 |   await setSimulatedConnectivity(page, false);
  360 |   await page.goto(findTimeHref ?? `/calendars/${calendarId}/find-time?duration=60&start=${warmWeekStart}`);
  361 | 
  362 |   await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-status', 'offline-unavailable');
  363 |   await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-reason', 'FIND_TIME_OFFLINE');
  364 |   await expect(page.getByTestId('find-time-top-picks')).toHaveCount(0);
  365 |   await expect(page.getByTestId('find-time-browse-results')).toHaveCount(0);
  366 | 
  367 |   // Restore connectivity before testing tap rejection
  368 |   await setSimulatedConnectivity(page, true);
  369 |   await openCalendar(page, {
  370 |     calendarId,
  371 |     weekStart: warmWeekStart,
  372 |     expectedName: 'Alpha shared'
  373 |   });
  374 | 
  375 |   // A local notification tap targeting an out-of-scope calendar must be rejected
  376 |   await triggerSimulatedLocalNotificationAction(page, {
  377 |     targetPath: `/calendars/${seededCalendars.betaShared}`,
  378 |     calendarId: seededCalendars.betaShared
  379 |   });
  380 |   await expect(page).toHaveURL(new RegExp(`/calendars/${calendarId}`));
  381 |   await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-notification-route-result', 'path-rejected');
  382 | 
  383 |   // A tap with a null target must also be rejected without navigating away
  384 |   const urlBefore = page.url();
  385 |   await triggerSimulatedLocalNotificationAction(page, {
  386 |     targetPath: null
  387 |   });
  388 |   await expect(page).toHaveURL(urlBefore);
  389 | });
  390 | 
```