import { Preferences } from '@capacitor/preferences';
import type { MobileSupabaseDataClient } from '$lib/supabase/client';
import {
  getOrCreateNotificationInstallation,
  type DeviceInstallationStorage
} from '$lib/notifications/device-installation';
import {
  isNotificationReasonCode,
  isNotificationRemoteSubscriptionStatus,
  type DeviceCalendarNotificationPreference,
  type DeviceNotificationRegistration,
  type DeviceNotificationInstallationSnapshot,
  type NotificationReasonCode,
  type NotificationTransportSnapshot
} from '$lib/notifications/types';

export type MobileNotificationTransport = {
  loadPreferences: (params?: {
    registration?: DeviceNotificationRegistration;
    permittedCalendarIds?: string[] | null;
  }) => Promise<NotificationTransportSnapshot>;
  updatePreference: (params: {
    calendarId: string;
    desiredEnabled: boolean;
    remoteSubscription: DeviceCalendarNotificationPreference['remoteSubscription'];
    remoteSubscriptionReason?: NotificationReasonCode | null;
    registration?: DeviceNotificationRegistration;
    permittedCalendarIds?: string[] | null;
  }) => Promise<NotificationPreferenceWriteResult>;
};

export type NotificationPreferenceWriteResult =
  | ({
      ok: true;
    } & Omit<NotificationTransportSnapshot, 'ok'> & {
      preference: DeviceCalendarNotificationPreference;
    })
  | ({
      ok: false;
    } & Omit<NotificationTransportSnapshot, 'ok'> & {
      preference: null;
    });

type SupabaseResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

type InstallationRpcRow = {
  installation_id: string;
  push_provider: string | null;
  device_platform: string | null;
  token_last_rotated_at: string | null;
  created_at: string;
  updated_at: string;
};

type PreferenceRpcRow = {
  installation_id: string;
  calendar_id: string;
  desired_enabled: boolean;
  remote_subscription_status: DeviceCalendarNotificationPreference['remoteSubscription'];
  remote_subscription_reason: NotificationReasonCode | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
};

type StoredNotificationPreferenceCache = {
  installationId: string;
  cachedAt: string;
  preferences: DeviceCalendarNotificationPreference[];
};

const DEFAULT_TIMEOUT_MS = 8_000;
const NOTIFICATION_PREFERENCE_CACHE_KEY = 'caluno.mobile.notification-preferences.v1';
const defaultPreferenceCacheStorage: DeviceInstallationStorage = {
  async get(key) {
    const result = await Preferences.get({ key });
    return result.value ?? null;
  },
  async set(key, value) {
    await Preferences.set({ key, value });
  },
  async remove(key) {
    await Preferences.remove({ key });
  }
};

export function createMobileNotificationTransport(options: {
  client: MobileSupabaseDataClient;
  permittedCalendarIds?: string[] | null;
  installationStorage?: DeviceInstallationStorage;
  timeoutMs?: number;
}): MobileNotificationTransport {
  return {
    loadPreferences(params) {
      return loadDeviceNotificationPreferences({
        client: options.client,
        timeoutMs: options.timeoutMs,
        installationStorage: options.installationStorage,
        permittedCalendarIds: params?.permittedCalendarIds ?? options.permittedCalendarIds,
        registration: params?.registration
      });
    },
    updatePreference(params) {
      return updateDeviceNotificationPreference({
        client: options.client,
        timeoutMs: options.timeoutMs,
        installationStorage: options.installationStorage,
        permittedCalendarIds: params.permittedCalendarIds ?? options.permittedCalendarIds,
        calendarId: params.calendarId,
        desiredEnabled: params.desiredEnabled,
        remoteSubscription: params.remoteSubscription,
        remoteSubscriptionReason: params.remoteSubscriptionReason ?? null,
        registration: params.registration
      });
    }
  };
}

export async function loadDeviceNotificationPreferences(params: {
  client: MobileSupabaseDataClient;
  permittedCalendarIds?: string[] | null;
  registration?: DeviceNotificationRegistration;
  installationStorage?: DeviceInstallationStorage;
  timeoutMs?: number;
}): Promise<NotificationTransportSnapshot> {
  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const scope = normalizePermittedCalendarIds(params.permittedCalendarIds);

  if (!scope.ok) {
    return transportFailure({
      reason: scope.reason,
      detail: scope.detail,
      installation: null,
      installationStatus: 'unavailable'
    });
  }

  const installation = await getOrCreateNotificationInstallation({
    registration: params.registration,
    storage: params.installationStorage
  });

  if (!installation.ok) {
    return transportFailure({
      reason: installation.reason,
      detail: installation.detail,
      installation: null,
      installationStatus: 'unavailable'
    });
  }

  const registrationResult = await registerNotificationInstallation({
    client: params.client,
    installation: installation.installation,
    registration: installation.registration,
    timeoutMs
  });

  if (!registrationResult.ok) {
    return transportFailure({
      reason: registrationResult.reason,
      detail: registrationResult.detail,
      installation: installation.installation,
      installationStatus: 'ready'
    });
  }

  const listResult = await safeSupabaseCall<PreferenceRpcRow[]>(
    params.client.rpc('list_device_calendar_notification_preferences', {
      p_installation_id: registrationResult.installation.installationId,
      p_calendar_ids: scope.calendarIds
    }) as unknown as Promise<SupabaseResult<PreferenceRpcRow[]>>,
    timeoutMs,
    'The device notification preference load timed out before trusted per-calendar state could be returned.'
  );

  if (!listResult.ok) {
    return transportFailure({
      reason: listResult.reason,
      detail: listResult.detail,
      installation: registrationResult.installation,
      installationStatus: 'ready'
    });
  }

  const preferences = normalizeNotificationPreferenceRows(listResult.data, scope.calendarIds, registrationResult.installation.installationId);
  if (!preferences.ok) {
    return transportFailure({
      reason: preferences.reason,
      detail: preferences.detail,
      installation: registrationResult.installation,
      installationStatus: 'ready'
    });
  }

  const cachedPreferences = await readCachedNotificationPreferences({
    storage: params.installationStorage,
    installationId: registrationResult.installation.installationId,
    permittedCalendarIds: scope.calendarIds,
    timeoutMs
  });
  const resolvedPreferences = preferences.rows.length > 0 ? preferences.rows : (cachedPreferences ?? []);

  if (resolvedPreferences.length > 0) {
    await writeCachedNotificationPreferences({
      storage: params.installationStorage,
      installationId: registrationResult.installation.installationId,
      preferences: resolvedPreferences,
      timeoutMs
    });
  }

  return {
    ok: true,
    installationStatus: 'ready',
    phase: 'ready',
    reason: null,
    detail:
      preferences.rows.length === 0 && resolvedPreferences.length > 0
        ? 'Trusted per-device notification preferences were recovered from device cache after the server returned an empty preference set.'
        : 'Trusted per-device notification preferences loaded successfully.',
    installation: registrationResult.installation,
    preferences: resolvedPreferences
  };
}

export async function updateDeviceNotificationPreference(params: {
  client: MobileSupabaseDataClient;
  calendarId: string;
  desiredEnabled: boolean;
  remoteSubscription: DeviceCalendarNotificationPreference['remoteSubscription'];
  remoteSubscriptionReason?: NotificationReasonCode | null;
  permittedCalendarIds?: string[] | null;
  registration?: DeviceNotificationRegistration;
  installationStorage?: DeviceInstallationStorage;
  timeoutMs?: number;
}): Promise<NotificationPreferenceWriteResult> {
  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const scope = normalizePermittedCalendarIds(params.permittedCalendarIds);

  if (!scope.ok) {
    return writeTransportFailure(scope.reason, scope.detail);
  }

  if (!isUuidLike(params.calendarId)) {
    return writeTransportFailure(
      'calendar-id-invalid',
      'The requested calendar id was malformed, so the notification preference write failed closed.'
    );
  }

  if (!scope.calendarIds.includes(params.calendarId)) {
    return writeTransportFailure(
      'calendar-out-of-scope',
      'The requested calendar was outside the trusted mobile shell inventory, so the notification preference write was rejected.'
    );
  }

  if (!isNotificationRemoteSubscriptionStatus(params.remoteSubscription)) {
    return writeTransportFailure(
      'malformed-response',
      'The requested remote subscription status was invalid, so the notification preference write was rejected.'
    );
  }

  if (params.remoteSubscription === 'provider-unconfigured' && params.remoteSubscriptionReason !== 'provider-unconfigured') {
    return writeTransportFailure(
      'provider-unconfigured',
      'Provider-unconfigured notification state must carry the provider-unconfigured reason code.'
    );
  }

  if (
    params.remoteSubscriptionReason !== null &&
    params.remoteSubscriptionReason !== undefined &&
    !isNotificationReasonCode(params.remoteSubscriptionReason)
  ) {
    return writeTransportFailure(
      'malformed-response',
      'The requested notification reason code was invalid, so the preference write was rejected.'
    );
  }

  const installation = await getOrCreateNotificationInstallation({
    registration: params.registration,
    storage: params.installationStorage
  });

  if (!installation.ok) {
    return writeTransportFailure(installation.reason, installation.detail);
  }

  const registrationResult = await registerNotificationInstallation({
    client: params.client,
    installation: installation.installation,
    registration: installation.registration,
    timeoutMs
  });

  if (!registrationResult.ok) {
    return writeTransportFailure(registrationResult.reason, registrationResult.detail, installation.installation);
  }

  const writeResult = await safeSupabaseCall<PreferenceRpcRow[]>(
    params.client.rpc('set_device_calendar_notification_preference', {
      p_installation_id: registrationResult.installation.installationId,
      p_calendar_id: params.calendarId,
      p_desired_enabled: params.desiredEnabled,
      p_remote_subscription_status: params.remoteSubscription,
      p_remote_subscription_reason: params.remoteSubscriptionReason ?? null
    }) as unknown as Promise<SupabaseResult<PreferenceRpcRow[]>>,
    timeoutMs,
    'The device notification preference write timed out before trusted per-calendar state could be confirmed.'
  );

  if (!writeResult.ok) {
    return writeTransportFailure(writeResult.reason, writeResult.detail, registrationResult.installation);
  }

  const normalized = normalizeNotificationPreferenceRows(writeResult.data, [params.calendarId], registrationResult.installation.installationId);
  if (!normalized.ok || normalized.rows.length !== 1) {
    return writeTransportFailure(
      normalized.ok ? 'malformed-response' : normalized.reason,
      normalized.ok
        ? 'The notification preference write returned an unexpected row shape, so the device stayed fail closed.'
        : normalized.detail,
      registrationResult.installation
    );
  }

  const preference = normalized.rows[0];
  await upsertCachedNotificationPreference({
    storage: params.installationStorage,
    installationId: registrationResult.installation.installationId,
    preference,
    timeoutMs
  });

  return {
    ok: true,
    installationStatus: 'ready',
    phase: preference.remoteSubscription === 'syncing' ? 'syncing-preference' : 'ready',
    reason: preference.remoteSubscriptionReason,
    detail: 'Trusted per-device notification preference wrote successfully.',
    installation: registrationResult.installation,
    preferences: [preference],
    preference
  };
}

async function registerNotificationInstallation(params: {
  client: MobileSupabaseDataClient;
  installation: DeviceNotificationInstallationSnapshot;
  registration: {
    pushToken: string | null;
    pushProvider: string | null;
    devicePlatform: string | null;
  };
  timeoutMs: number;
}): Promise<
  | { ok: true; installation: DeviceNotificationInstallationSnapshot }
  | { ok: false; reason: NotificationReasonCode; detail: string }
> {
  const result = await safeSupabaseCall<InstallationRpcRow[]>(
    params.client.rpc('register_notification_installation', {
      p_installation_id: params.installation.installationId,
      p_push_token: params.registration.pushToken,
      p_push_provider: params.registration.pushProvider,
      p_device_platform: params.registration.devicePlatform
    }) as unknown as Promise<SupabaseResult<InstallationRpcRow[]>>,
    params.timeoutMs,
    'The device notification installation registration timed out before trusted persistence could confirm the installation.'
  );

  if (!result.ok) {
    return result;
  }

  const normalized = normalizeInstallationRows(result.data, params.installation.installationId);
  if (!normalized.ok) {
    return normalized;
  }

  return {
    ok: true,
    installation: normalized.installation
  };
}

function normalizePermittedCalendarIds(permittedCalendarIds: string[] | null | undefined):
  | { ok: true; calendarIds: string[] }
  | { ok: false; reason: NotificationReasonCode; detail: string } {
  if (permittedCalendarIds == null) {
    return {
      ok: false,
      reason: 'scope-unavailable',
      detail: 'Trusted calendar scope was unavailable, so the notification control plane stayed read only.'
    };
  }

  const unique = Array.from(new Set(permittedCalendarIds));
  if (!unique.every(isUuidLike)) {
    return {
      ok: false,
      reason: 'scope-unavailable',
      detail: 'Trusted calendar scope was malformed, so the notification control plane stayed fail closed.'
    };
  }

  return {
    ok: true,
    calendarIds: unique
  };
}

function normalizeInstallationRows(rows: unknown, installationId: string):
  | { ok: true; installation: DeviceNotificationInstallationSnapshot }
  | { ok: false; reason: NotificationReasonCode; detail: string } {
  if (!Array.isArray(rows) || rows.length !== 1 || !isInstallationRpcRow(rows[0]) || rows[0].installation_id !== installationId) {
    return {
      ok: false,
      reason: 'malformed-response',
      detail: 'The installation registration response was malformed, so the device refused to trust the server installation state.'
    };
  }

  const row = rows[0];
  return {
    ok: true,
    installation: {
      installationId: row.installation_id,
      pushProvider: row.push_provider,
      devicePlatform: row.device_platform,
      tokenLastRotatedAt: row.token_last_rotated_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  };
}

function normalizeNotificationPreferenceRows(
  rows: unknown,
  permittedCalendarIds: string[],
  installationId: string
):
  | { ok: true; rows: DeviceCalendarNotificationPreference[] }
  | { ok: false; reason: NotificationReasonCode; detail: string } {
  if (!Array.isArray(rows) || !rows.every(isPreferenceRpcRow)) {
    return {
      ok: false,
      reason: 'malformed-response',
      detail: 'The notification preference response was malformed, so the device refused to infer per-calendar state.'
    };
  }

  const seen = new Set<string>();
  const normalized: DeviceCalendarNotificationPreference[] = [];

  for (const row of rows) {
    if (row.installation_id !== installationId) {
      return {
        ok: false,
        reason: 'malformed-response',
        detail: 'A notification preference row referenced the wrong installation id, so the device failed closed.'
      };
    }

    if (!permittedCalendarIds.includes(row.calendar_id)) {
      return {
        ok: false,
        reason: 'calendar-out-of-scope',
        detail: 'A notification preference row escaped the trusted calendar scope, so the device failed closed.'
      };
    }

    if (seen.has(row.calendar_id)) {
      return {
        ok: false,
        reason: 'duplicate-preference-rows',
        detail: 'Multiple notification preference rows resolved for the same installation/calendar pair, so the device failed closed.'
      };
    }

    seen.add(row.calendar_id);
    normalized.push({
      installationId: row.installation_id,
      calendarId: row.calendar_id,
      desiredEnabled: row.desired_enabled,
      remoteSubscription: row.remote_subscription_status,
      remoteSubscriptionReason: row.remote_subscription_reason,
      syncedAt: row.synced_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  return {
    ok: true,
    rows: normalized
  };
}

async function readCachedNotificationPreferences(params: {
  storage?: DeviceInstallationStorage;
  installationId: string;
  permittedCalendarIds: string[];
  timeoutMs: number;
}): Promise<DeviceCalendarNotificationPreference[] | null> {
  const storage = params.storage ?? defaultPreferenceCacheStorage;

  try {
    const raw = await withTimeout(
      storage.get(NOTIFICATION_PREFERENCE_CACHE_KEY),
      params.timeoutMs,
      'Reading the device notification preference cache timed out.'
    );
    const record = materializeCachedNotificationPreferences(raw, params.installationId);
    if (!record) {
      return null;
    }

    return record.preferences
      .filter((preference) => params.permittedCalendarIds.includes(preference.calendarId))
      .sort((left, right) => left.calendarId.localeCompare(right.calendarId));
  } catch {
    return null;
  }
}

async function upsertCachedNotificationPreference(params: {
  storage?: DeviceInstallationStorage;
  installationId: string;
  preference: DeviceCalendarNotificationPreference;
  timeoutMs: number;
}): Promise<void> {
  const storage = params.storage ?? defaultPreferenceCacheStorage;
  let existing: DeviceCalendarNotificationPreference[] = [];

  try {
    const raw = await withTimeout(
      storage.get(NOTIFICATION_PREFERENCE_CACHE_KEY),
      params.timeoutMs,
      'Reading the device notification preference cache timed out.'
    );
    existing = materializeCachedNotificationPreferences(raw, params.installationId)?.preferences ?? [];
  } catch {
    existing = [];
  }

  const preferences = existing.filter((candidate) => candidate.calendarId !== params.preference.calendarId);
  preferences.push(params.preference);
  preferences.sort((left, right) => left.calendarId.localeCompare(right.calendarId));

  await writeCachedNotificationPreferences({
    storage: params.storage,
    installationId: params.installationId,
    preferences,
    timeoutMs: params.timeoutMs
  });
}

async function writeCachedNotificationPreferences(params: {
  storage?: DeviceInstallationStorage;
  installationId: string;
  preferences: DeviceCalendarNotificationPreference[];
  timeoutMs: number;
}): Promise<void> {
  const storage = params.storage ?? defaultPreferenceCacheStorage;
  const record: StoredNotificationPreferenceCache = {
    installationId: params.installationId,
    cachedAt: new Date().toISOString(),
    preferences: params.preferences
  };

  try {
    await withTimeout(
      storage.set(NOTIFICATION_PREFERENCE_CACHE_KEY, JSON.stringify(record)),
      params.timeoutMs,
      'Persisting the device notification preference cache timed out.'
    );
  } catch {
    // Cache failures should not block trusted preference reads or writes.
  }
}

function materializeCachedNotificationPreferences(
  raw: string | null,
  installationId: string
): StoredNotificationPreferenceCache | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!isStoredNotificationPreferenceCache(parsed) || parsed.installationId !== installationId) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function isStoredNotificationPreferenceCache(value: unknown): value is StoredNotificationPreferenceCache {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const cache = value as Partial<StoredNotificationPreferenceCache>;
  return (
    isUuidLike(cache.installationId) &&
    isIsoTimestamp(cache.cachedAt) &&
    Array.isArray(cache.preferences) &&
    cache.preferences.every(isStoredDeviceCalendarNotificationPreference)
  );
}

function isStoredDeviceCalendarNotificationPreference(value: unknown): value is DeviceCalendarNotificationPreference {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const preference = value as Partial<DeviceCalendarNotificationPreference>;
  return (
    isUuidLike(preference.installationId) &&
    isUuidLike(preference.calendarId) &&
    typeof preference.desiredEnabled === 'boolean' &&
    isNotificationRemoteSubscriptionStatus(preference.remoteSubscription) &&
    (preference.remoteSubscriptionReason === null ||
      preference.remoteSubscriptionReason === undefined ||
      isNotificationReasonCode(preference.remoteSubscriptionReason)) &&
    (preference.syncedAt === null || preference.syncedAt === undefined || isIsoTimestamp(preference.syncedAt)) &&
    isIsoTimestamp(preference.createdAt) &&
    isIsoTimestamp(preference.updatedAt)
  );
}

async function safeSupabaseCall<T>(
  promise: Promise<SupabaseResult<T>>,
  timeoutMs: number,
  timeoutDetail: string
): Promise<
  | { ok: true; data: T | null }
  | { ok: false; reason: NotificationReasonCode; detail: string }
> {
  try {
    const result = await withTimeout(promise, timeoutMs, timeoutDetail);
    if (result.error) {
      return {
        ok: false,
        reason: resolveRpcErrorReason(result.error.message),
        detail: result.error.message
      };
    }

    return {
      ok: true,
      data: result.data
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error && /timed out/i.test(error.message) ? 'timeout' : 'sync-failed',
      detail: error instanceof Error ? error.message : 'Trusted notification persistence failed unexpectedly.'
    };
  }
}

function resolveRpcErrorReason(message: string): NotificationReasonCode {
  if (/timeout/i.test(message)) {
    return 'timeout';
  }

  if (/DENIED|scope|permission|RLS/i.test(message)) {
    return 'persistence-denied';
  }

  if (/provider.?unconfigured/i.test(message)) {
    return 'provider-unconfigured';
  }

  return 'sync-failed';
}

function transportFailure(params: {
  reason: NotificationReasonCode;
  detail: string;
  installation: DeviceNotificationInstallationSnapshot | null;
  installationStatus: 'ready' | 'unavailable';
}): NotificationTransportSnapshot {
  return {
    ok: false,
    installationStatus: params.installationStatus,
    phase: 'degraded',
    reason: params.reason,
    detail: params.detail,
    installation: params.installation,
    preferences: []
  };
}

function writeTransportFailure(
  reason: NotificationReasonCode,
  detail: string,
  installation: DeviceNotificationInstallationSnapshot | null = null
): NotificationPreferenceWriteResult {
  return {
    ok: false,
    installationStatus: installation ? 'ready' : 'unavailable',
    phase: 'degraded',
    reason,
    detail,
    installation,
    preferences: [],
    preference: null
  };
}

function isInstallationRpcRow(value: unknown): value is InstallationRpcRow {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const row = value as Partial<InstallationRpcRow>;
  return (
    isUuidLike(row.installation_id) &&
    (row.push_provider === null || row.push_provider === undefined || isNonEmptyString(row.push_provider)) &&
    (row.device_platform === null || row.device_platform === undefined || isNonEmptyString(row.device_platform)) &&
    (row.token_last_rotated_at === null || row.token_last_rotated_at === undefined || isIsoTimestamp(row.token_last_rotated_at)) &&
    isIsoTimestamp(row.created_at) &&
    isIsoTimestamp(row.updated_at)
  );
}

function isPreferenceRpcRow(value: unknown): value is PreferenceRpcRow {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const row = value as Partial<PreferenceRpcRow>;
  return (
    isUuidLike(row.installation_id) &&
    isUuidLike(row.calendar_id) &&
    typeof row.desired_enabled === 'boolean' &&
    isNotificationRemoteSubscriptionStatus(row.remote_subscription_status) &&
    (row.remote_subscription_reason === null || row.remote_subscription_reason === undefined || isNotificationReasonCode(row.remote_subscription_reason)) &&
    (row.synced_at === null || row.synced_at === undefined || isIsoTimestamp(row.synced_at)) &&
    isIsoTimestamp(row.created_at) &&
    isIsoTimestamp(row.updated_at)
  );
}

function isUuidLike(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, detail: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const settled = Promise.resolve(promise);

  return Promise.race([
    settled.finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    }),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(detail)), timeoutMs);
    })
  ]);
}
