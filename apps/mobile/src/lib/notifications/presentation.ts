import type {
  MobileNotificationRuntimeCalendarState,
  NotificationRuntimeLocalSyncPhase,
  NotificationRuntimeRemoteRegistrationState
} from '$lib/notifications/runtime';
import {
  isNotificationReasonCode,
  isNotificationRemoteSubscriptionStatus,
  type NotificationLocalReminderState,
  type NotificationPermissionState,
  type NotificationReasonCode,
  type NotificationSyncPhase
} from '$lib/notifications/types';

export type CalendarNotificationPresentation = {
  calendarId: string;
  desiredEnabled: boolean;
  permission: NotificationPermissionState;
  localReminders: NotificationLocalReminderState;
  remoteSubscription: MobileNotificationRuntimeCalendarState['remoteSubscription'];
  phase: NotificationSyncPhase;
  reason: NotificationReasonCode | null;
  detail: string;
  installationStatus: MobileNotificationRuntimeCalendarState['installationStatus'];
  localSyncPhase: NotificationRuntimeLocalSyncPhase;
  localReminderCount: number;
  lastReminderResyncAt: string | null;
  remoteRegistration: NotificationRuntimeRemoteRegistrationState;
  readOnly: boolean;
  malformed: boolean;
  saving: boolean;
};

const NOTIFICATION_PERMISSIONS = ['unknown', 'granted', 'denied', 'unsupported'] as const satisfies NotificationPermissionState[];
const NOTIFICATION_LOCAL_STATES = ['unknown', 'ready', 'blocked', 'degraded'] as const satisfies NotificationLocalReminderState[];
const NOTIFICATION_SYNC_PHASES = [
  'idle',
  'bootstrapping-installation',
  'loading-preferences',
  'syncing-preference',
  'ready',
  'degraded'
] as const satisfies NotificationSyncPhase[];
const NOTIFICATION_INSTALLATION_STATUSES = ['ready', 'unavailable'] as const satisfies MobileNotificationRuntimeCalendarState['installationStatus'][];
const NOTIFICATION_LOCAL_SYNC_PHASES = ['idle', 'syncing', 'ready', 'degraded'] as const satisfies NotificationRuntimeLocalSyncPhase[];
const NOTIFICATION_REMOTE_REGISTRATION_STATES = [
  'unknown',
  'registered',
  'denied',
  'failed',
  'unsupported'
] as const satisfies NotificationRuntimeRemoteRegistrationState[];

export function presentCalendarNotificationState(params: {
  calendarId: string;
  state?: Partial<MobileNotificationRuntimeCalendarState> | null;
  interactive?: boolean;
  saving?: boolean;
  fallbackDetail?: string | null;
}): CalendarNotificationPresentation {
  const interactive = params.interactive ?? false;
  const saving = params.saving ?? false;
  const state = params.state ?? null;

  if (!state) {
    return {
      calendarId: params.calendarId,
      desiredEnabled: false,
      permission: 'unknown',
      localReminders: 'unknown',
      remoteSubscription: 'degraded',
      phase: interactive ? (saving ? 'syncing-preference' : 'loading-preferences') : 'degraded',
      reason: interactive ? null : 'scope-unavailable',
      detail:
        params.fallbackDetail ??
        (interactive
          ? 'Notification state is still loading for this calendar.'
          : 'Trusted notification scope is unavailable, so this control stayed read only.'),
      installationStatus: interactive ? 'ready' : 'unavailable',
      localSyncPhase: interactive ? 'syncing' : 'idle',
      localReminderCount: 0,
      lastReminderResyncAt: null,
      remoteRegistration: 'unknown',
      readOnly: true,
      malformed: false,
      saving
    } satisfies CalendarNotificationPresentation;
  }

  const malformed = !isValidNotificationState(state);
  const desiredEnabled = typeof state.desiredEnabled === 'boolean' ? state.desiredEnabled : false;
  const permission = includesValue(NOTIFICATION_PERMISSIONS, state.permission) ? state.permission : 'unknown';
  const localReminders = includesValue(NOTIFICATION_LOCAL_STATES, state.localReminders) ? state.localReminders : 'degraded';
  const remoteSubscription = isNotificationRemoteSubscriptionStatus(state.remoteSubscription)
    ? state.remoteSubscription
    : 'degraded';
  const phase = malformed
    ? 'degraded'
    : saving
      ? 'syncing-preference'
      : includesValue(NOTIFICATION_SYNC_PHASES, state.phase)
        ? state.phase
        : 'degraded';
  const reason = malformed
    ? 'malformed-response'
    : state.reason == null
      ? null
      : isNotificationReasonCode(state.reason)
        ? state.reason
        : 'malformed-response';

  return {
    calendarId: params.calendarId,
    desiredEnabled,
    permission,
    localReminders,
    remoteSubscription,
    phase,
    reason,
    detail:
      malformed
        ? 'Notification runtime state was malformed, so this control stayed degraded and read only.'
        : typeof state.detail === 'string' && state.detail.trim().length > 0
          ? state.detail
          : params.fallbackDetail ?? 'Notification state is available for this calendar.',
    installationStatus: includesValue(NOTIFICATION_INSTALLATION_STATUSES, state.installationStatus)
      ? state.installationStatus
      : interactive
        ? 'ready'
        : 'unavailable',
    localSyncPhase: includesValue(NOTIFICATION_LOCAL_SYNC_PHASES, state.localSyncPhase)
      ? state.localSyncPhase
      : saving
        ? 'syncing'
        : localReminders === 'ready'
          ? 'ready'
          : localReminders === 'degraded'
            ? 'degraded'
            : 'idle',
    localReminderCount: typeof state.localReminderCount === 'number' && state.localReminderCount >= 0 ? state.localReminderCount : 0,
    lastReminderResyncAt: typeof state.lastReminderResyncAt === 'string' ? state.lastReminderResyncAt : null,
    remoteRegistration: includesValue(NOTIFICATION_REMOTE_REGISTRATION_STATES, state.remoteRegistration)
      ? state.remoteRegistration
      : 'unknown',
    readOnly: malformed || !interactive || saving,
    malformed,
    saving
  } satisfies CalendarNotificationPresentation;
}

function isValidNotificationState(state: Partial<MobileNotificationRuntimeCalendarState>) {
  return (
    typeof state.desiredEnabled === 'boolean' &&
    includesValue(NOTIFICATION_PERMISSIONS, state.permission) &&
    includesValue(NOTIFICATION_LOCAL_STATES, state.localReminders) &&
    isNotificationRemoteSubscriptionStatus(state.remoteSubscription) &&
    includesValue(NOTIFICATION_SYNC_PHASES, state.phase) &&
    (state.reason == null || isNotificationReasonCode(state.reason))
  );
}

function includesValue<T extends string>(values: readonly T[], candidate: unknown): candidate is T {
  return typeof candidate === 'string' && values.includes(candidate as T);
}
