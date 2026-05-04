import {
  type CalendarNotificationState,
  type DeviceCalendarNotificationPreference,
  type NotificationLocalStateInput,
  type NotificationReasonCode,
  type NotificationTransportSnapshot
} from '$lib/notifications/types';

export function shapeCalendarNotificationState(params: {
  calendarId: string;
  transport: NotificationTransportSnapshot;
  local: NotificationLocalStateInput;
}): CalendarNotificationState {
  const preference = params.transport.preferences.find((candidate) => candidate.calendarId === params.calendarId) ?? null;
  const desiredEnabled = preference?.desiredEnabled ?? false;
  const remoteSubscription = resolveRemoteSubscription(preference, params.transport);
  const remoteReason = preference?.remoteSubscriptionReason ?? transportRemoteReason(params.transport);

  let phase = params.transport.phase;
  let reason = params.transport.reason;

  if (params.transport.ok) {
    phase = remoteSubscription === 'syncing' ? 'syncing-preference' : 'ready';
    reason = remoteReason;

    if (desiredEnabled && params.local.permission === 'denied') {
      phase = 'degraded';
      reason = params.local.localReason ?? 'permission-denied';
    } else if (desiredEnabled && params.local.localReminders === 'degraded') {
      phase = 'degraded';
      reason = params.local.localReason ?? 'schedule-unavailable';
    } else if (desiredEnabled && (remoteSubscription === 'degraded' || remoteSubscription === 'provider-unconfigured')) {
      phase = 'degraded';
      reason = remoteReason ?? params.transport.reason;
    }
  }

  return {
    calendarId: params.calendarId,
    desiredEnabled,
    permission: params.local.permission,
    localReminders: params.local.localReminders,
    localReason: params.local.localReason,
    installationStatus: params.transport.installationStatus,
    remoteSubscription,
    remoteReason,
    phase,
    reason,
    detail: params.transport.detail
  };
}

export function shapeCalendarNotificationCollection(params: {
  calendarIds: string[];
  transport: NotificationTransportSnapshot;
  localStates?: Record<string, NotificationLocalStateInput>;
}): Record<string, CalendarNotificationState> {
  return Object.fromEntries(
    params.calendarIds.map((calendarId) => [
      calendarId,
      shapeCalendarNotificationState({
        calendarId,
        transport: params.transport,
        local: params.localStates?.[calendarId] ?? {
          permission: 'unknown',
          localReminders: 'unknown',
          localReason: null
        }
      })
    ])
  );
}

export function resolveRemoteSubscription(
  preference: DeviceCalendarNotificationPreference | null,
  transport: NotificationTransportSnapshot
): DeviceCalendarNotificationPreference['remoteSubscription'] {
  if (preference) {
    return preference.remoteSubscription;
  }

  if (!transport.ok) {
    if (transport.reason === 'provider-unconfigured') {
      return 'provider-unconfigured';
    }

    return 'degraded';
  }

  return 'unsubscribed';
}

function transportRemoteReason(transport: NotificationTransportSnapshot): NotificationReasonCode | null {
  if (transport.reason === 'provider-unconfigured') {
    return 'provider-unconfigured';
  }

  return transport.ok ? null : transport.reason;
}
