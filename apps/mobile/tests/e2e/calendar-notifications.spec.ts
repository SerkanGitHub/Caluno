import type { Page } from '@playwright/test';
import {
  expect,
  getSimulatedPendingNotificationCount,
  openCalendar,
  seededCalendars,
  seededUsers,
  seededWeekStarts,
  setNotificationToggleValue,
  setSimulatedNotificationPermissions,
  signInThroughUi,
  stubSupabaseRpc,
  test,
  triggerSimulatedLocalNotificationAction,
  triggerSimulatedPushNotificationAction,
  waitForNotificationToggleState
} from './fixtures';

const sharedCalendarId = seededCalendars.alphaShared;
const backlogCalendarId = seededCalendars.alphaBacklog;
const warmWeekStart = seededWeekStarts.alphaWarm;
const notificationInstallationId = '11111111-1111-4111-8111-111111111111';

function preferenceRow(params: {
  calendarId: string;
  desiredEnabled: boolean;
  remoteSubscriptionStatus: 'subscribed' | 'provider-unconfigured' | 'degraded' | 'unsubscribed';
  remoteSubscriptionReason?: 'provider-unconfigured' | 'permission-denied' | null;
}) {
  return {
    installation_id: notificationInstallationId,
    calendar_id: params.calendarId,
    desired_enabled: params.desiredEnabled,
    remote_subscription_status: params.remoteSubscriptionStatus,
    remote_subscription_reason: params.remoteSubscriptionReason ?? null,
    synced_at: '2026-05-04T10:00:00.000Z',
    created_at: '2026-05-04T10:00:00.000Z',
    updated_at: '2026-05-04T10:00:00.000Z'
  };
}

async function warmSharedCalendar(page: Page) {
  await openCalendar(page, {
    calendarId: sharedCalendarId,
    weekStart: warmWeekStart,
    expectedName: 'Alpha shared'
  });
}

test.describe.configure({ mode: 'serial' });

test('renders exactly one notification toggle per permitted calendar and persists enabled state across reload', async ({ page }) => {
  let desiredEnabled = false;

  await stubSupabaseRpc(page, 'list_device_calendar_notification_preferences', () => ({
    data: desiredEnabled
      ? [
          preferenceRow({
            calendarId: sharedCalendarId,
            desiredEnabled: true,
            remoteSubscriptionStatus: 'subscribed'
          })
        ]
      : []
  }));
  await stubSupabaseRpc(page, 'set_device_calendar_notification_preference', () => {
    desiredEnabled = true;

    return {
      data: [
        preferenceRow({
          calendarId: sharedCalendarId,
          desiredEnabled: true,
          remoteSubscriptionStatus: 'subscribed'
        })
      ]
    };
  });

  await signInThroughUi(page, seededUsers.alphaMember);
  await warmSharedCalendar(page);

  await page.goto('/groups');
  await expect(page.getByTestId('groups-shell')).toHaveAttribute('data-shell-bootstrap', 'ready');
  await expect(page.locator('[data-testid="calendar-notification-toggle"]')).toHaveCount(2);
  await expect(page.locator(`[data-testid="calendar-notification-toggle"][data-calendar-id="${sharedCalendarId}"]`)).toHaveCount(1);
  await expect(page.locator(`[data-testid="calendar-notification-toggle"][data-calendar-id="${backlogCalendarId}"]`)).toHaveCount(1);
  await waitForNotificationToggleState(page, sharedCalendarId, {
    enabled: 'false',
    remoteSubscription: 'unsubscribed',
    phase: 'ready',
    reason: 'none'
  });
  await setNotificationToggleValue(page, sharedCalendarId, true);

  await waitForNotificationToggleState(page, sharedCalendarId, {
    enabled: 'true',
    permission: 'granted',
    localReminders: 'ready',
    remoteSubscription: 'subscribed',
    phase: 'ready',
    reason: 'none'
  });
  await waitForNotificationToggleState(page, backlogCalendarId, {
    enabled: 'false',
    remoteSubscription: 'unsubscribed'
  });
  await expect.poll(() => getSimulatedPendingNotificationCount(page)).toBeGreaterThan(0);

  await page.reload();
  await expect(page.getByTestId('groups-shell')).toHaveAttribute('data-shell-bootstrap', 'ready');
  await waitForNotificationToggleState(page, sharedCalendarId, {
    enabled: 'true',
    permission: 'granted',
    localReminders: 'ready',
    remoteSubscription: 'subscribed',
    phase: 'ready',
    reason: 'none'
  });
  await waitForNotificationToggleState(page, backlogCalendarId, {
    enabled: 'false',
    remoteSubscription: 'unsubscribed'
  });
});

test('keeps denied permissions explicit instead of collapsing the enabled toggle to off', async ({ page }) => {
  let desiredEnabled = false;

  await stubSupabaseRpc(page, 'list_device_calendar_notification_preferences', () => ({
    data: desiredEnabled
      ? [
          preferenceRow({
            calendarId: sharedCalendarId,
            desiredEnabled: true,
            remoteSubscriptionStatus: 'degraded',
            remoteSubscriptionReason: 'permission-denied'
          })
        ]
      : []
  }));
  await stubSupabaseRpc(page, 'set_device_calendar_notification_preference', () => {
    desiredEnabled = true;

    return {
      data: [
        preferenceRow({
          calendarId: sharedCalendarId,
          desiredEnabled: true,
          remoteSubscriptionStatus: 'degraded',
          remoteSubscriptionReason: 'permission-denied'
        })
      ]
    };
  });

  await setSimulatedNotificationPermissions(page, {
    local: 'denied',
    push: 'denied'
  });

  await signInThroughUi(page, seededUsers.alphaMember);
  await warmSharedCalendar(page);
  await page.goto('/groups');
  await waitForNotificationToggleState(page, sharedCalendarId, {
    enabled: 'false',
    remoteSubscription: 'unsubscribed',
    phase: 'ready',
    reason: 'none'
  });

  await setNotificationToggleValue(page, sharedCalendarId, true);

  await waitForNotificationToggleState(page, sharedCalendarId, {
    enabled: 'true',
    permission: 'denied',
    localReminders: 'blocked',
    remoteSubscription: 'degraded',
    phase: 'degraded',
    reason: 'permission-denied'
  });

  await page.reload();
  await waitForNotificationToggleState(page, sharedCalendarId, {
    enabled: 'true',
    permission: 'denied',
    localReminders: 'blocked',
    remoteSubscription: 'degraded',
    phase: 'degraded',
    reason: 'permission-denied'
  });
});

test('surfaces provider-unconfigured remote state explicitly when shared-change delivery is unavailable', async ({ page }) => {
  let desiredEnabled = false;

  await stubSupabaseRpc(page, 'list_device_calendar_notification_preferences', () => ({
    data: desiredEnabled
      ? [
          preferenceRow({
            calendarId: sharedCalendarId,
            desiredEnabled: true,
            remoteSubscriptionStatus: 'provider-unconfigured',
            remoteSubscriptionReason: 'provider-unconfigured'
          })
        ]
      : []
  }));
  await stubSupabaseRpc(page, 'set_device_calendar_notification_preference', () => {
    desiredEnabled = true;

    return {
      data: [
        preferenceRow({
          calendarId: sharedCalendarId,
          desiredEnabled: true,
          remoteSubscriptionStatus: 'provider-unconfigured',
          remoteSubscriptionReason: 'provider-unconfigured'
        })
      ]
    };
  });

  await signInThroughUi(page, seededUsers.alphaMember);
  await warmSharedCalendar(page);
  await page.goto('/groups');
  await waitForNotificationToggleState(page, sharedCalendarId, {
    enabled: 'false',
    remoteSubscription: 'unsubscribed',
    phase: 'ready',
    reason: 'none'
  });

  await setNotificationToggleValue(page, sharedCalendarId, true);

  await waitForNotificationToggleState(page, sharedCalendarId, {
    enabled: 'true',
    permission: 'granted',
    localReminders: 'ready',
    remoteSubscription: 'provider-unconfigured',
    phase: 'degraded',
    reason: 'provider-unconfigured'
  });

  await page.reload();
  await waitForNotificationToggleState(page, sharedCalendarId, {
    enabled: 'true',
    permission: 'granted',
    localReminders: 'ready',
    remoteSubscription: 'provider-unconfigured',
    phase: 'degraded',
    reason: 'provider-unconfigured'
  });
});

test('rejects unsafe notification targets and lands valid taps inside trusted calendar scope', async ({ page }) => {
  await signInThroughUi(page, seededUsers.alphaMember);
  await warmSharedCalendar(page);
  await page.goto('/groups');

  await triggerSimulatedPushNotificationAction(page, {
    targetPath: 'https://evil.test/phish'
  });
  await expect(page).toHaveURL(/\/groups$/);
  await expect(page.getByTestId('groups-shell')).toHaveAttribute('data-notification-route-result', 'path-rejected');
  await expect(page.getByTestId('groups-shell')).toHaveAttribute('data-notification-route-reason', 'path-rejected');

  await triggerSimulatedLocalNotificationAction(page, {
    targetPath: `/calendars/${sharedCalendarId}`,
    calendarId: sharedCalendarId
  });
  await expect(page).toHaveURL(new RegExp(`/calendars/${sharedCalendarId}$`));
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-notification-route-result', 'navigated');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-notification-route-reason', 'none');
  await expect(page.getByTestId('calendar-route-state')).toHaveAttribute('data-attempted-calendar-id', sharedCalendarId);
});
