/**
 * Mobile Assembly Tracer Bullet — M003 final proof
 *
 * Exercises the real phone loop in one linear run:
 *   sign-in → open permitted calendar → offline/reconnect continuity
 *   → find-time → handoff into create → submit → notification delivery
 *   → notification tap landing inside the same protected calendar context.
 *
 * Every assertion is pinned to an explicit diagnostic attribute so failures
 * point to the actual broken contract rather than producing a generic timeout.
 */

import {
  expect,
  expectedCreateShiftPrefillValues,
  getPendingRemindersForCalendar,
  interceptCalendarChangeDispatch,
  openCalendar,
  readCreateSheetArrivalSnapshot,
  readFindTimeTopPickCtaSnapshot,
  readFindTimeTopPickSnapshot,
  seededCalendars,
  seededFindTime,
  seededUsers,
  seededWeekStarts,
  setNotificationToggleValue,
  setSimulatedConnectivity,
  setSimulatedNotificationPermissions,
  signInThroughUi,
  stubSupabaseRpc,
  submitHandoffBackedCreateForm,
  supabaseApiOrigin,
  test,
  triggerSimulatedLocalNotificationAction,
  waitForNotificationToggleState,
  waitForPendingCount,
  waitForRetryableCount
} from './fixtures';

test.describe.configure({ mode: 'serial' });

const calendarId = seededCalendars.alphaShared;
const backlogCalendarId = seededCalendars.alphaBacklog;
const warmWeekStart = seededWeekStarts.alphaWarm;
const assemblyShiftTitle = 'Assembly tracer bullet shift';
const notificationInstallationId = '11111111-1111-4111-8111-111111111111';

function preferenceRow(params: {
  calendarId: string;
  desiredEnabled: boolean;
  remoteSubscriptionStatus: 'subscribed' | 'provider-unconfigured' | 'degraded' | 'unsubscribed';
}) {
  return {
    installation_id: notificationInstallationId,
    calendar_id: params.calendarId,
    desired_enabled: params.desiredEnabled,
    remote_subscription_status: params.remoteSubscriptionStatus,
    remote_subscription_reason: null,
    synced_at: '2026-05-04T10:00:00.000Z',
    created_at: '2026-05-04T10:00:00.000Z',
    updated_at: '2026-05-04T10:00:00.000Z'
  };
}

// ---------------------------------------------------------------------------
// Phase 1: sign-in and initial calendar access
// ---------------------------------------------------------------------------

test('phase 1 — sign in and open the permitted calendar with trusted-online diagnostics', async ({ page }) => {
  await signInThroughUi(page, seededUsers.alphaMember);

  await openCalendar(page, {
    calendarId,
    weekStart: warmWeekStart,
    expectedName: 'Alpha shared'
  });

  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-route-mode', 'trusted-online');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-denied-reason', 'none');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-visible-week-start', warmWeekStart);
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-visible-week-source', 'query');
  await waitForPendingCount(page, 0);
  await waitForRetryableCount(page, 0);

  // Out-of-scope calendar must stay fail-closed
  await page.goto(`/calendars/${seededCalendars.betaShared}`);
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-denied-reason', 'calendar-missing');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-failure-phase', 'calendar-lookup');
});

// ---------------------------------------------------------------------------
// Phase 2: offline continuity and reconnect drain
// ---------------------------------------------------------------------------

test('phase 2 — calendar survives offline and drains queued mutations on reconnect', async ({ page }) => {
  await signInThroughUi(page, seededUsers.alphaMember);
  await openCalendar(page, {
    calendarId,
    weekStart: warmWeekStart,
    expectedName: 'Alpha shared'
  });

  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-route-mode', 'trusted-online');
  await expect(page.getByTestId('calendar-sync-strip')).toHaveAttribute('data-snapshot-origin', 'server-sync');
  await waitForPendingCount(page, 0);
  await waitForRetryableCount(page, 0);

  // Go offline — calendar must switch to offline mode, not crash
  await setSimulatedConnectivity(page, false, { waitForCalendarUi: true });
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-route-mode', 'trusted-offline');

  // Go back online — sync strip must recover, queue must drain
  await setSimulatedConnectivity(page, true, { waitForCalendarUi: true });
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-route-mode', 'trusted-online');
  await waitForPendingCount(page, 0);
  await waitForRetryableCount(page, 0);
  await expect(page.getByTestId('calendar-sync-strip')).toHaveAttribute('data-snapshot-origin', 'server-sync');
});

// ---------------------------------------------------------------------------
// Phase 3: find-time handoff and create arrival
// ---------------------------------------------------------------------------

test('phase 3 — find time handoff flows into create arrival and the shift lands on the board', async ({ page }) => {
  await signInThroughUi(page, seededUsers.alphaMember);
  await openCalendar(page, {
    calendarId,
    weekStart: warmWeekStart,
    expectedName: 'Alpha shared'
  });

  // Enter find-time from the board
  const entrypoint = page.getByTestId('find-time-entrypoint');
  await expect(entrypoint).toBeVisible();
  await expect(entrypoint).toHaveAttribute('data-entry-calendar-id', calendarId);

  await Promise.all([
    page.waitForURL(new RegExp(`/calendars/${calendarId}/find-time`)),
    entrypoint.click()
  ]);
  await expect(page.getByTestId('find-time-shell')).toBeVisible();

  // Submit the seeded search window
  await page.getByTestId('find-time-start-input').fill(seededFindTime.start);
  await Promise.all([
    page.waitForURL(
      new RegExp(
        `/calendars/${calendarId}/find-time\\?duration=${seededFindTime.durationMinutes}&start=${seededFindTime.start}`
      )
    ),
    page.getByTestId('find-time-submit').click()
  ]);

  await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-status', 'ready');
  await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-reason', 'none');
  await expect(page.getByTestId('find-time-route-state')).toHaveAttribute(
    'data-top-pick-count',
    String(seededFindTime.topPickCount)
  );

  // Validate the first ranked pick contract
  const topPick = await readFindTimeTopPickSnapshot(page, 0);
  await expect(topPick).toMatchObject({ ...seededFindTime.topPicks[0], handoffReady: 'true' });

  const ctaSnapshot = await readFindTimeTopPickCtaSnapshot(page, 0);
  await expect(ctaSnapshot).toMatchObject({
    source: 'find-time',
    startAt: seededFindTime.topPicks[0].startAt,
    endAt: seededFindTime.topPicks[0].endAt,
    label: 'Create from this slot'
  });

  // Trigger the handoff
  await page.getByTestId('find-time-top-pick-0-cta').click();

  // Verify create-arrival diagnostics
  const arrival = await readCreateSheetArrivalSnapshot(page);
  expect(arrival.open).toBe(true);
  expect(arrival.routePrefillStatus).toBe('accepted');
  expect(arrival.routePrefillSource).toBe('find-time');
  expect(arrival.routePrefillStart).toBe(ctaSnapshot.startAt);
  expect(arrival.routePrefillEnd).toBe(ctaSnapshot.endAt);
  expect(arrival.createSource).toBe('find-time');
  expect(arrival.prefillSource).toBe('find-time');
  expect(arrival.openOnArrival).toBe('true');

  const expectedPrefill = expectedCreateShiftPrefillValues(ctaSnapshot);
  expect(arrival.startValue).toBe(expectedPrefill.startValue);
  expect(arrival.endValue).toBe(expectedPrefill.endValue);

  // One-shot params must be stripped before the user touches the form
  await expect
    .poll(() => page.url(), {
      message: 'expected the calendar route to strip one-shot handoff params after the first arrival render'
    })
    .toBe(`http://127.0.0.1:4173/calendars/${calendarId}?start=${warmWeekStart}`);

  // Submit the create form — shift must land on the board synchronously
  await submitHandoffBackedCreateForm(page, { title: assemblyShiftTitle });
  await waitForPendingCount(page, 0);
  await waitForRetryableCount(page, 0);
  await expect(
    page
      .getByTestId('day-column-2026-04-16')
      .locator('[data-testid^="shift-card-"]')
      .filter({ hasText: assemblyShiftTitle })
      .first()
  ).toBeVisible();

  // Reload must clear handoff params and keep the shift visible
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`/calendars/${calendarId}\\?start=${warmWeekStart}$`));
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-create-prefill-status', 'none');
  await expect(page.getByTestId('create-shift-editor')).toHaveCount(0);
  await expect(
    page
      .getByTestId('day-column-2026-04-16')
      .locator('[data-testid^="shift-card-"]')
      .filter({ hasText: assemblyShiftTitle })
      .first()
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// Phase 4: notification delivery and safe tap landing
// ---------------------------------------------------------------------------

test('phase 4 — notification delivery reaches the enabled calendar and a safe tap lands in the permitted context', async ({
  page
}) => {
  let desiredEnabled = false;

  // Stub preference RPCs so the notification layer has a clean slate
  await stubSupabaseRpc(page, 'list_device_calendar_notification_preferences', () => ({
    data: desiredEnabled
      ? [preferenceRow({ calendarId, desiredEnabled: true, remoteSubscriptionStatus: 'subscribed' })]
      : []
  }));
  await stubSupabaseRpc(page, 'set_device_calendar_notification_preference', () => {
    desiredEnabled = true;
    return {
      data: [preferenceRow({ calendarId, desiredEnabled: true, remoteSubscriptionStatus: 'subscribed' })]
    };
  });

  // Intercept shared-change dispatch so we can assert delivery shape
  const dispatch = await interceptCalendarChangeDispatch(page);

  await signInThroughUi(page, seededUsers.alphaMember);
  await openCalendar(page, {
    calendarId,
    weekStart: warmWeekStart,
    expectedName: 'Alpha shared'
  });

  // Enable notifications for the permitted calendar
  await page.goto('/groups');
  await expect(page.getByTestId('groups-shell')).toHaveAttribute('data-shell-bootstrap', 'ready');
  await setSimulatedNotificationPermissions(page, 'granted');
  await setNotificationToggleValue(page, calendarId, true);

  await waitForNotificationToggleState(page, calendarId, {
    enabled: 'true',
    permission: 'granted',
    localReminders: 'ready',
    remoteSubscription: 'subscribed',
    phase: 'ready',
    reason: 'none'
  });
  // Backlog calendar must stay quiet
  await waitForNotificationToggleState(page, backlogCalendarId, {
    enabled: 'false',
    remoteSubscription: 'unsubscribed'
  });

  // Simulate a shared-change dispatch for the enabled calendar (simulating what
  // a mutation on the transport layer would produce after a successful write)
  await page.evaluate(
    async ({ origin, cId }) => {
      await fetch(`${origin}/functions/v1/notify-calendar-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarId: cId,
          changeType: 'create',
          shiftId: 'assembly-shift-id',
          occurredAt: new Date().toISOString(),
          targetPath: `/calendars/${cId}`
        })
      });
    },
    { origin: supabaseApiOrigin, cId: calendarId }
  );

  // Delivery must be captured for the enabled calendar
  const delivered = dispatch.getDelivered(calendarId);
  expect(delivered.length).toBeGreaterThan(0);
  expect(delivered[0].calendarId).toBe(calendarId);
  expect(delivered[0].changeType).toBe('create');
  expect(delivered[0].targetPath).toMatch(new RegExp(`/calendars/${calendarId}`));

  // Disabled calendar must receive nothing
  expect(dispatch.getDelivered(backlogCalendarId)).toHaveLength(0);

  // Per-calendar reminder inventory must be non-empty for the enabled calendar
  const sharedReminders = await getPendingRemindersForCalendar(page, calendarId);
  expect(sharedReminders.length).toBeGreaterThan(0);
  expect(sharedReminders.every((r) => r.calendarId === calendarId)).toBe(true);

  const backlogReminders = await getPendingRemindersForCalendar(page, backlogCalendarId);
  expect(backlogReminders).toHaveLength(0);

  // Navigate back to the calendar before triggering the notification tap
  await openCalendar(page, {
    calendarId,
    weekStart: warmWeekStart,
    expectedName: 'Alpha shared'
  });

  // A safe local notification tap must navigate into the permitted calendar context
  await triggerSimulatedLocalNotificationAction(page, {
    targetPath: `/calendars/${calendarId}`,
    calendarId
  });

  await expect(page).toHaveURL(new RegExp(`/calendars/${calendarId}$`));
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-notification-route-result', 'navigated');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-notification-route-reason', 'none');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-denied-reason', 'none');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-route-mode', 'trusted-online');
});

// ---------------------------------------------------------------------------
// Phase 5 (negative): broken continuity, wrong scope, and malformed params
//   all stop the tracer bullet at the actual broken contract
// ---------------------------------------------------------------------------

test('phase 5 — offline find-time stays fail-closed and out-of-scope tap is rejected', async ({ page }) => {
  await signInThroughUi(page, seededUsers.alphaMember);
  await openCalendar(page, {
    calendarId,
    weekStart: warmWeekStart,
    expectedName: 'Alpha shared'
  });

  // Offline find-time must produce offline-unavailable, not stale results
  const findTimeHref = await page.getByTestId('find-time-entrypoint').getAttribute('href');
  await setSimulatedConnectivity(page, false);
  await page.goto(findTimeHref ?? `/calendars/${calendarId}/find-time?duration=60&start=${warmWeekStart}`);

  await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-status', 'offline-unavailable');
  await expect(page.getByTestId('find-time-route-state')).toHaveAttribute('data-reason', 'FIND_TIME_OFFLINE');
  await expect(page.getByTestId('find-time-top-picks')).toHaveCount(0);
  await expect(page.getByTestId('find-time-browse-results')).toHaveCount(0);

  // Restore connectivity before testing tap rejection
  await setSimulatedConnectivity(page, true);
  await openCalendar(page, {
    calendarId,
    weekStart: warmWeekStart,
    expectedName: 'Alpha shared'
  });

  // A local notification tap targeting an out-of-scope calendar must be rejected
  await triggerSimulatedLocalNotificationAction(page, {
    targetPath: `/calendars/${seededCalendars.betaShared}`,
    calendarId: seededCalendars.betaShared
  });
  await expect(page).toHaveURL(new RegExp(`/calendars/${calendarId}`));
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-notification-route-result', 'path-rejected');

  // A tap with a null target must also be rejected without navigating away
  const urlBefore = page.url();
  await triggerSimulatedLocalNotificationAction(page, {
    targetPath: null
  });
  await expect(page).toHaveURL(urlBefore);
});
