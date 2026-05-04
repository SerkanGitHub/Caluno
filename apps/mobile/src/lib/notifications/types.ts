export const NOTIFICATION_REMOTE_SUBSCRIPTION_STATUSES = [
  'unknown',
  'unsubscribed',
  'subscribed',
  'syncing',
  'degraded',
  'provider-unconfigured'
] as const;

export type NotificationRemoteSubscriptionStatus = (typeof NOTIFICATION_REMOTE_SUBSCRIPTION_STATUSES)[number];

export const NOTIFICATION_REASON_CODES = [
  'installation-unavailable',
  'installation-registration-invalid',
  'storage-timeout',
  'storage-unavailable',
  'storage-malformed',
  'scope-unavailable',
  'calendar-id-invalid',
  'calendar-out-of-scope',
  'sync-failed',
  'timeout',
  'malformed-response',
  'duplicate-preference-rows',
  'persistence-denied',
  'provider-unconfigured',
  'permission-denied',
  'schedule-unavailable'
] as const;

export type NotificationReasonCode = (typeof NOTIFICATION_REASON_CODES)[number];

export type NotificationPermissionState = 'unknown' | 'granted' | 'denied' | 'unsupported';
export type NotificationLocalReminderState = 'unknown' | 'ready' | 'blocked' | 'degraded';
export type NotificationInstallationBootstrapStatus = 'ready' | 'unavailable';
export type NotificationSyncPhase = 'idle' | 'bootstrapping-installation' | 'loading-preferences' | 'syncing-preference' | 'ready' | 'degraded';

export type DeviceNotificationInstallationSnapshot = {
  installationId: string;
  pushProvider: string | null;
  devicePlatform: string | null;
  tokenLastRotatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DeviceNotificationRegistration = {
  pushToken?: string | null;
  pushProvider?: string | null;
  devicePlatform?: string | null;
};

export type DeviceCalendarNotificationPreference = {
  installationId: string;
  calendarId: string;
  desiredEnabled: boolean;
  remoteSubscription: NotificationRemoteSubscriptionStatus;
  remoteSubscriptionReason: NotificationReasonCode | null;
  syncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationTransportSnapshot = {
  ok: boolean;
  installationStatus: NotificationInstallationBootstrapStatus;
  phase: NotificationSyncPhase;
  reason: NotificationReasonCode | null;
  detail: string;
  installation: DeviceNotificationInstallationSnapshot | null;
  preferences: DeviceCalendarNotificationPreference[];
};

export type NotificationLocalStateInput = {
  permission: NotificationPermissionState;
  localReminders: NotificationLocalReminderState;
  localReason: NotificationReasonCode | null;
};

export type CalendarNotificationState = NotificationLocalStateInput & {
  calendarId: string;
  desiredEnabled: boolean;
  installationStatus: NotificationInstallationBootstrapStatus;
  remoteSubscription: NotificationRemoteSubscriptionStatus;
  remoteReason: NotificationReasonCode | null;
  phase: NotificationSyncPhase;
  reason: NotificationReasonCode | null;
  detail: string;
};

export function isNotificationRemoteSubscriptionStatus(value: unknown): value is NotificationRemoteSubscriptionStatus {
  return typeof value === 'string' && NOTIFICATION_REMOTE_SUBSCRIPTION_STATUSES.includes(value as NotificationRemoteSubscriptionStatus);
}

export function isNotificationReasonCode(value: unknown): value is NotificationReasonCode {
  return typeof value === 'string' && NOTIFICATION_REASON_CODES.includes(value as NotificationReasonCode);
}
