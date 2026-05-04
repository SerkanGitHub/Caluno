import { LocalNotifications } from '@capacitor/local-notifications';
import type { NotificationPermissionState, NotificationReasonCode } from '$lib/notifications/types';

export type MobileLocalNotificationReminder = {
  id: number;
  calendarId: string;
  shiftId: string;
  scheduledAt: string;
  title: string;
  body: string;
  targetPath: string;
};

export type MobilePendingLocalNotification = {
  id: number;
  calendarId: string;
  shiftId: string;
  scheduledAt: string | null;
  targetPath: string | null;
};

export type MobileLocalNotificationAction = {
  actionId: string;
  notificationId: number;
  targetPath: string | null;
};

export type MobileLocalNotificationsPlugin = {
  checkPermissions: () => Promise<unknown>;
  requestPermissions: () => Promise<unknown>;
  getPending: () => Promise<unknown>;
  schedule: (options: unknown) => Promise<unknown>;
  cancel: (options: unknown) => Promise<void>;
  addListener?: (
    eventName: 'localNotificationActionPerformed',
    listener: (event: unknown) => void
  ) => Promise<{ remove: () => Promise<void> }> | { remove: () => Promise<void> };
};

export type LocalNotificationPermissionResult =
  | {
      ok: true;
      permission: NotificationPermissionState;
      detail: string;
    }
  | {
      ok: false;
      permission: Extract<NotificationPermissionState, 'unknown' | 'unsupported'>;
      reason: NotificationReasonCode;
      detail: string;
    };

export type LocalNotificationPendingResult =
  | {
      ok: true;
      notifications: MobilePendingLocalNotification[];
      malformedCount: number;
    }
  | {
      ok: false;
      reason: NotificationReasonCode;
      detail: string;
    };

export type LocalNotificationScheduleResult =
  | {
      ok: true;
      scheduledIds: number[];
    }
  | {
      ok: false;
      reason: NotificationReasonCode;
      detail: string;
    };

export type LocalNotificationCancelResult =
  | {
      ok: true;
      canceledIds: number[];
    }
  | {
      ok: false;
      reason: NotificationReasonCode;
      detail: string;
    };

export type MobileLocalNotificationsAdapter = {
  getPermissionState: (params?: { requestIfNeeded?: boolean }) => Promise<LocalNotificationPermissionResult>;
  listPending: () => Promise<LocalNotificationPendingResult>;
  scheduleReminders: (reminders: MobileLocalNotificationReminder[]) => Promise<LocalNotificationScheduleResult>;
  cancelNotifications: (ids: number[]) => Promise<LocalNotificationCancelResult>;
  subscribeToActions: (listener: (event: MobileLocalNotificationAction) => void) => Promise<() => Promise<void>>;
};

const DEFAULT_TIMEOUT_MS = 8_000;
const REMINDER_SOURCE = 'caluno-shift-reminder';

export function createMobileLocalNotificationsAdapter(options: {
  plugin?: MobileLocalNotificationsPlugin;
  timeoutMs?: number;
} = {}): MobileLocalNotificationsAdapter {
  const plugin = options.plugin ?? (LocalNotifications as MobileLocalNotificationsPlugin);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    async getPermissionState(params = {}) {
      const permissionResult = await readPermissionState(plugin, timeoutMs, params.requestIfNeeded ?? false);
      return permissionResult;
    },

    async listPending() {
      try {
        const raw = await withTimeout(
          plugin.getPending(),
          timeoutMs,
          'Reading pending local notifications timed out before reminder resync could inspect the device queue.'
        );
        return normalizePendingNotifications(raw);
      } catch (error) {
        return {
          ok: false,
          reason: resolveRuntimeReason(error, 'schedule-unavailable'),
          detail:
            error instanceof Error
              ? error.message
              : 'Reading pending local notifications failed before reminder resync could inspect the device queue.'
        } satisfies LocalNotificationPendingResult;
      }
    },

    async scheduleReminders(reminders) {
      if (reminders.length === 0) {
        return {
          ok: true,
          scheduledIds: []
        } satisfies LocalNotificationScheduleResult;
      }

      const notifications = reminders.map((reminder) => ({
        id: reminder.id,
        title: reminder.title,
        body: reminder.body,
        schedule: {
          at: new Date(reminder.scheduledAt),
          allowWhileIdle: true
        },
        extra: {
          source: REMINDER_SOURCE,
          calendarId: reminder.calendarId,
          shiftId: reminder.shiftId,
          targetPath: reminder.targetPath,
          triggerAt: reminder.scheduledAt
        }
      }));

      try {
        await withTimeout(
          plugin.schedule({ notifications }),
          timeoutMs,
          'Scheduling local reminder notifications timed out before the device queue could be updated.'
        );
        return {
          ok: true,
          scheduledIds: reminders.map((reminder) => reminder.id)
        } satisfies LocalNotificationScheduleResult;
      } catch (error) {
        return {
          ok: false,
          reason: resolveRuntimeReason(error, 'schedule-unavailable'),
          detail:
            error instanceof Error
              ? error.message
              : 'Scheduling local reminder notifications failed before the device queue could be updated.'
        } satisfies LocalNotificationScheduleResult;
      }
    },

    async cancelNotifications(ids) {
      if (ids.length === 0) {
        return {
          ok: true,
          canceledIds: []
        } satisfies LocalNotificationCancelResult;
      }

      try {
        await withTimeout(
          plugin.cancel({ notifications: ids.map((id) => ({ id })) }),
          timeoutMs,
          'Canceling local reminder notifications timed out before the device queue could be cleaned up.'
        );
        return {
          ok: true,
          canceledIds: ids
        } satisfies LocalNotificationCancelResult;
      } catch (error) {
        return {
          ok: false,
          reason: resolveRuntimeReason(error, 'schedule-unavailable'),
          detail:
            error instanceof Error
              ? error.message
              : 'Canceling local reminder notifications failed before the device queue could be cleaned up.'
        } satisfies LocalNotificationCancelResult;
      }
    },

    async subscribeToActions(listener) {
      if (!plugin.addListener) {
        return async () => {
          // No-op on unsupported environments.
        };
      }

      const handle = await plugin.addListener('localNotificationActionPerformed', (raw) => {
        const action = normalizeActionPerformedEvent(raw);
        if (!action) {
          return;
        }

        listener(action);
      });

      return async () => {
        await handle.remove();
      };
    }
  };
}

export function getMobileLocalNotificationsAdapter() {
  return createMobileLocalNotificationsAdapter();
}

async function readPermissionState(
  plugin: MobileLocalNotificationsPlugin,
  timeoutMs: number,
  requestIfNeeded: boolean
): Promise<LocalNotificationPermissionResult> {
  try {
    const checked = await withTimeout(
      plugin.checkPermissions(),
      timeoutMs,
      'Reading local notification permissions timed out before reminder resync could confirm device consent.'
    );
    const initial = normalizePermissionState(checked);

    if (initial === 'granted' || initial === 'denied' || initial === 'unsupported') {
      return {
        ok: true,
        permission: initial,
        detail: 'Local notification permission read completed successfully.'
      } satisfies LocalNotificationPermissionResult;
    }

    if (!requestIfNeeded) {
      return {
        ok: false,
        permission: 'unknown',
        reason: 'malformed-response',
        detail: 'The local notification permission response was malformed, so reminder resync failed closed.'
      } satisfies LocalNotificationPermissionResult;
    }

    const requested = await withTimeout(
      plugin.requestPermissions(),
      timeoutMs,
      'Requesting local notification permissions timed out before reminder resync could confirm device consent.'
    );
    const normalized = normalizePermissionState(requested);

    if (normalized === 'granted' || normalized === 'denied' || normalized === 'unsupported') {
      return {
        ok: true,
        permission: normalized,
        detail: 'Local notification permission request completed successfully.'
      } satisfies LocalNotificationPermissionResult;
    }

    return {
      ok: false,
      permission: 'unknown',
      reason: 'malformed-response',
      detail: 'The local notification permission response was malformed after requesting access, so reminder resync failed closed.'
    } satisfies LocalNotificationPermissionResult;
  } catch (error) {
    return {
      ok: false,
      permission: 'unsupported',
      reason: resolveRuntimeReason(error, 'schedule-unavailable'),
      detail:
        error instanceof Error
          ? error.message
          : 'Reading local notification permissions failed before reminder resync could confirm device consent.'
    } satisfies LocalNotificationPermissionResult;
  }
}

function normalizePermissionState(value: unknown): NotificationPermissionState | 'prompt' | 'malformed' {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 'malformed';
  }

  const candidate = value as { display?: unknown; granted?: unknown };
  if (candidate.display === 'granted' || candidate.display === 'denied') {
    return candidate.display;
  }

  if (candidate.display === 'prompt') {
    return 'prompt';
  }

  if (typeof candidate.granted === 'boolean') {
    return candidate.granted ? 'granted' : 'denied';
  }

  return 'malformed';
}

function normalizePendingNotifications(raw: unknown): LocalNotificationPendingResult {
  const pending = readPendingArray(raw);
  if (!pending) {
    return {
      ok: false,
      reason: 'malformed-response',
      detail: 'The pending local notification payload was malformed, so reminder resync rebuilt state from trusted week data only.'
    } satisfies LocalNotificationPendingResult;
  }

  const notifications: MobilePendingLocalNotification[] = [];
  let malformedCount = 0;

  for (const candidate of pending) {
    const normalized = normalizePendingNotification(candidate);
    if (normalized === 'ignore') {
      continue;
    }

    if (!normalized) {
      malformedCount += 1;
      continue;
    }

    notifications.push(normalized);
  }

  return {
    ok: true,
    notifications,
    malformedCount
  } satisfies LocalNotificationPendingResult;
}

function readPendingArray(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) {
    return raw;
  }

  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as { notifications?: unknown; pending?: unknown };
  if (Array.isArray(candidate.notifications)) {
    return candidate.notifications;
  }

  if (Array.isArray(candidate.pending)) {
    return candidate.pending;
  }

  return null;
}

function normalizePendingNotification(value: unknown): MobilePendingLocalNotification | 'ignore' | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as {
    id?: unknown;
    extra?: unknown;
    schedule?: { at?: unknown } | null;
  };
  const extra = readReminderExtra(candidate.extra);
  if (extra === 'ignore') {
    return 'ignore';
  }

  const id = normalizeNotificationId(candidate.id);
  if (id === null || !extra) {
    return null;
  }

  const scheduledAt = typeof candidate.schedule?.at === 'string' ? candidate.schedule.at : null;
  return {
    id,
    calendarId: extra.calendarId,
    shiftId: extra.shiftId,
    scheduledAt,
    targetPath: extra.targetPath
  } satisfies MobilePendingLocalNotification;
}

function readReminderExtra(value: unknown):
  | {
      calendarId: string;
      shiftId: string;
      targetPath: string | null;
      triggerAt: string;
    }
  | 'ignore'
  | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 'ignore';
  }

  const extra = value as {
    source?: unknown;
    calendarId?: unknown;
    shiftId?: unknown;
    targetPath?: unknown;
    triggerAt?: unknown;
  };

  if (extra.source !== REMINDER_SOURCE) {
    return 'ignore';
  }

  if (!isNonEmptyString(extra.calendarId) || !isNonEmptyString(extra.shiftId) || !isIsoTimestamp(extra.triggerAt)) {
    return null;
  }

  return {
    calendarId: extra.calendarId,
    shiftId: extra.shiftId,
    targetPath: isNonEmptyString(extra.targetPath) ? extra.targetPath : null,
    triggerAt: extra.triggerAt
  };
}

function normalizeActionPerformedEvent(raw: unknown): MobileLocalNotificationAction | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const candidate = raw as {
    actionId?: unknown;
    notification?: { id?: unknown; extra?: unknown } | null;
  };

  const notificationId = normalizeNotificationId(candidate.notification?.id);
  const extra = readReminderExtra(candidate.notification?.extra);
  if (!isNonEmptyString(candidate.actionId) || notificationId === null || extra === null || extra === 'ignore') {
    return null;
  }

  return {
    actionId: candidate.actionId,
    notificationId,
    targetPath: extra.targetPath
  } satisfies MobileLocalNotificationAction;
}

function normalizeNotificationId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number.parseInt(value, 10);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function resolveRuntimeReason(error: unknown, fallback: Extract<NotificationReasonCode, 'schedule-unavailable'>): NotificationReasonCode {
  if (error instanceof Error && /timed out/i.test(error.message)) {
    return 'timeout';
  }

  return fallback;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, detail: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return Promise.race([
    promise.finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    }),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(detail)), timeoutMs);
    })
  ]);
}
