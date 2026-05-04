import type { OfflineScheduleWeekSnapshot } from '@repo/caluno-core/offline/types';
import type { MobilePendingLocalNotification, MobileLocalNotificationReminder } from '$lib/notifications/local-notifications';

export const SHIFT_REMINDER_LEAD_TIME_MS = 0;

export type ReminderScheduleBuildResult = {
  reminders: MobileLocalNotificationReminder[];
  invalidShiftCount: number;
};

export type ReminderScheduleDiff = {
  desiredReminders: MobileLocalNotificationReminder[];
  idsToCancel: number[];
  remindersToSchedule: MobileLocalNotificationReminder[];
};

export function buildReminderSchedule(params: {
  installationId: string;
  calendarId: string;
  snapshots: OfflineScheduleWeekSnapshot[];
  now: Date;
  reminderLeadTimeMs?: number;
}): ReminderScheduleBuildResult {
  const reminderLeadTimeMs = params.reminderLeadTimeMs ?? SHIFT_REMINDER_LEAD_TIME_MS;
  const remindersByFingerprint = new Map<string, MobileLocalNotificationReminder>();
  let invalidShiftCount = 0;

  for (const snapshot of params.snapshots) {
    if (snapshot.scope.calendarId !== params.calendarId) {
      continue;
    }

    for (const shift of snapshot.shifts) {
      if (shift.calendarId !== params.calendarId || !isNonEmptyString(shift.id)) {
        invalidShiftCount += 1;
        continue;
      }

      const triggerAtMs = Date.parse(shift.startAt) - reminderLeadTimeMs;
      if (!Number.isFinite(triggerAtMs)) {
        invalidShiftCount += 1;
        continue;
      }

      if (triggerAtMs <= params.now.getTime()) {
        continue;
      }

      const scheduledAt = new Date(triggerAtMs).toISOString();
      const fingerprint = `${shift.id}:${scheduledAt}`;
      remindersByFingerprint.set(fingerprint, {
        id: createDeterministicReminderId({
          installationId: params.installationId,
          calendarId: params.calendarId,
          shiftId: shift.id,
          triggerAt: scheduledAt
        }),
        calendarId: params.calendarId,
        shiftId: shift.id,
        scheduledAt,
        title: shift.title || 'Upcoming shift',
        body: buildReminderBody(shift.startAt),
        targetPath: `/calendars/${params.calendarId}`
      });
    }
  }

  return {
    reminders: Array.from(remindersByFingerprint.values()).sort(compareReminders),
    invalidShiftCount
  } satisfies ReminderScheduleBuildResult;
}

export function diffReminderSchedule(params: {
  calendarId: string;
  desiredReminders: MobileLocalNotificationReminder[];
  pendingNotifications: MobilePendingLocalNotification[];
}): ReminderScheduleDiff {
  const pendingForCalendar = params.pendingNotifications.filter((notification) => notification.calendarId === params.calendarId);
  const desiredIds = new Set(params.desiredReminders.map((reminder) => reminder.id));
  const idsToCancel = Array.from(
    new Set(
      pendingForCalendar
        .filter((pending) => !desiredIds.has(pending.id))
        .map((pending) => pending.id)
    )
  ).sort((left, right) => left - right);

  const existingIds = new Set(pendingForCalendar.map((pending) => pending.id));
  const remindersToSchedule = params.desiredReminders.filter((reminder) => !existingIds.has(reminder.id));

  return {
    desiredReminders: params.desiredReminders,
    idsToCancel,
    remindersToSchedule
  } satisfies ReminderScheduleDiff;
}

export function createDeterministicReminderId(params: {
  installationId: string;
  calendarId: string;
  shiftId: string;
  triggerAt: string;
}): number {
  const input = `${params.installationId}:${params.calendarId}:${params.shiftId}:${params.triggerAt}`;
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0) % 2_147_483_647 || 1;
}

function buildReminderBody(startAt: string) {
  const date = new Date(startAt);
  if (Number.isNaN(date.getTime())) {
    return 'Your shift is coming up.';
  }

  return `Starts at ${date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  })}.`;
}

function compareReminders(left: MobileLocalNotificationReminder, right: MobileLocalNotificationReminder) {
  return (
    left.scheduledAt.localeCompare(right.scheduledAt) ||
    left.shiftId.localeCompare(right.shiftId) ||
    left.id - right.id
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
