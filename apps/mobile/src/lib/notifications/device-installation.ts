import { Preferences } from '@capacitor/preferences';
import {
  type DeviceNotificationInstallationSnapshot,
  type DeviceNotificationRegistration,
  type NotificationReasonCode
} from '$lib/notifications/types';

export type DeviceInstallationStorage = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  remove?: (key: string) => Promise<void>;
};

export type StoredDeviceInstallationRecord = DeviceNotificationInstallationSnapshot & {
  pushToken: string | null;
};

export type DeviceInstallationBootstrapResult =
  | {
      ok: true;
      installation: DeviceNotificationInstallationSnapshot;
      registration: {
        pushToken: string | null;
        pushProvider: string | null;
        devicePlatform: string | null;
      };
      persisted: boolean;
      created: boolean;
      repaired: boolean;
      tokenRotated: boolean;
    }
  | {
      ok: false;
      reason: NotificationReasonCode;
      detail: string;
    };

export const NOTIFICATION_INSTALLATION_STORAGE_KEY = 'caluno.mobile.notification-installation.v1';
export const MOBILE_NOTIFICATION_INSTALLATION_TIMEOUT_MS = 750;

const defaultStorage: DeviceInstallationStorage = {
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

export async function getOrCreateNotificationInstallation(
  params: {
    registration?: DeviceNotificationRegistration;
    storage?: DeviceInstallationStorage;
    timeoutMs?: number;
    now?: Date;
    generateInstallationId?: () => string;
  } = {}
): Promise<DeviceInstallationBootstrapResult> {
  const storage = params.storage ?? defaultStorage;
  const timeoutMs = params.timeoutMs ?? MOBILE_NOTIFICATION_INSTALLATION_TIMEOUT_MS;
  const now = params.now ?? new Date();
  const normalizedRegistration = normalizeNotificationRegistration(params.registration);

  if (!normalizedRegistration.ok) {
    return normalizedRegistration;
  }

  let raw: string | null;
  try {
    raw = await withTimeout(
      storage.get(NOTIFICATION_INSTALLATION_STORAGE_KEY),
      timeoutMs,
      'Reading the device notification installation timed out before bootstrap completed.'
    );
  } catch (error) {
    return installationFailure(resolveStorageReason(error), error, 'Reading the device notification installation failed before bootstrap completed.');
  }

  let parsed = materializeStoredNotificationInstallation(raw);
  let repaired = false;
  let created = false;

  if (!parsed.ok) {
    repaired = raw !== null;
    parsed = createStoredNotificationInstallation({
      now,
      registration: normalizedRegistration.value,
      generateInstallationId: params.generateInstallationId
    });
    created = true;

    if (!parsed.ok) {
      return parsed;
    }
  }

  const applied = applyNotificationRegistration(parsed.record, normalizedRegistration.value, now);
  const nextRaw = JSON.stringify(applied.record);
  const shouldPersist = raw !== nextRaw;

  if (!shouldPersist) {
    return {
      ok: true,
      installation: toNotificationInstallationSnapshot(applied.record),
      registration: {
        pushToken: applied.record.pushToken,
        pushProvider: applied.record.pushProvider,
        devicePlatform: applied.record.devicePlatform
      },
      persisted: false,
      created,
      repaired,
      tokenRotated: applied.tokenRotated
    };
  }

  try {
    await withTimeout(
      storage.set(NOTIFICATION_INSTALLATION_STORAGE_KEY, nextRaw),
      timeoutMs,
      'Persisting the device notification installation timed out before bootstrap completed.'
    );

    return {
      ok: true,
      installation: toNotificationInstallationSnapshot(applied.record),
      registration: {
        pushToken: applied.record.pushToken,
        pushProvider: applied.record.pushProvider,
        devicePlatform: applied.record.devicePlatform
      },
      persisted: true,
      created,
      repaired,
      tokenRotated: applied.tokenRotated
    };
  } catch (error) {
    return installationFailure(
      resolveStorageReason(error),
      error,
      'Persisting the device notification installation failed before bootstrap completed.'
    );
  }
}

export function materializeStoredNotificationInstallation(raw: string | null):
  | { ok: true; record: StoredDeviceInstallationRecord }
  | { ok: false; reason: NotificationReasonCode; detail: string } {
  if (!raw) {
    return {
      ok: false,
      reason: 'installation-unavailable',
      detail: 'No device notification installation has been persisted yet.'
    };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!isStoredDeviceInstallationRecord(parsed)) {
      return {
        ok: false,
        reason: 'storage-malformed',
        detail: 'The persisted device notification installation was malformed, so bootstrap must repair it before use.'
      };
    }

    return {
      ok: true,
      record: parsed
    };
  } catch {
    return {
      ok: false,
      reason: 'storage-malformed',
      detail: 'The persisted device notification installation could not be parsed, so bootstrap must repair it before use.'
    };
  }
}

export function normalizeNotificationRegistration(
  registration: DeviceNotificationRegistration | undefined
):
  | {
      ok: true;
      value: {
        pushToken?: string | null;
        pushProvider?: string | null;
        devicePlatform?: string | null;
      };
    }
  | {
      ok: false;
      reason: NotificationReasonCode;
      detail: string;
    } {
  if (!registration) {
    return {
      ok: true,
      value: {}
    };
  }

  const tokenProvided = Object.hasOwn(registration, 'pushToken');
  const providerProvided = Object.hasOwn(registration, 'pushProvider');
  const platformProvided = Object.hasOwn(registration, 'devicePlatform');

  const normalizedToken = normalizeOptionalString(registration.pushToken);
  const normalizedProvider = normalizeOptionalString(registration.pushProvider);
  const normalizedPlatform = normalizeOptionalString(registration.devicePlatform);

  if ((tokenProvided || providerProvided) && (!normalizedToken || !normalizedProvider)) {
    return {
      ok: false,
      reason: 'installation-registration-invalid',
      detail:
        'Push registration metadata was incomplete, so notification installation bootstrap refused to persist a partial token/provider pair.'
    };
  }

  return {
    ok: true,
    value: {
      ...(tokenProvided || providerProvided ? { pushToken: normalizedToken, pushProvider: normalizedProvider } : {}),
      ...(platformProvided ? { devicePlatform: normalizedPlatform } : {})
    }
  };
}

function createStoredNotificationInstallation(params: {
  now: Date;
  registration: {
    pushToken?: string | null;
    pushProvider?: string | null;
    devicePlatform?: string | null;
  };
  generateInstallationId?: () => string;
}):
  | { ok: true; record: StoredDeviceInstallationRecord }
  | { ok: false; reason: NotificationReasonCode; detail: string } {
  const installationId = generateInstallationId(params.generateInstallationId);
  if (!installationId) {
    return {
      ok: false,
      reason: 'installation-unavailable',
      detail: 'A stable device notification installation id could not be generated.'
    };
  }

  const timestamp = params.now.toISOString();
  const registrationProvided = Object.hasOwn(params.registration, 'pushToken') && Object.hasOwn(params.registration, 'pushProvider');

  return {
    ok: true,
    record: {
      installationId,
      pushToken: registrationProvided ? (params.registration.pushToken ?? null) : null,
      pushProvider: registrationProvided ? (params.registration.pushProvider ?? null) : null,
      devicePlatform: params.registration.devicePlatform ?? null,
      tokenLastRotatedAt: registrationProvided ? timestamp : null,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  };
}

function applyNotificationRegistration(
  record: StoredDeviceInstallationRecord,
  registration: {
    pushToken?: string | null;
    pushProvider?: string | null;
    devicePlatform?: string | null;
  },
  now: Date
) {
  const nextRecord: StoredDeviceInstallationRecord = { ...record };
  let changed = false;
  let tokenRotated = false;

  if (Object.hasOwn(registration, 'devicePlatform') && registration.devicePlatform !== record.devicePlatform) {
    nextRecord.devicePlatform = registration.devicePlatform ?? null;
    changed = true;
  }

  if (Object.hasOwn(registration, 'pushToken') && Object.hasOwn(registration, 'pushProvider')) {
    if (registration.pushToken !== record.pushToken || registration.pushProvider !== record.pushProvider) {
      nextRecord.pushToken = registration.pushToken ?? null;
      nextRecord.pushProvider = registration.pushProvider ?? null;
      nextRecord.tokenLastRotatedAt = now.toISOString();
      changed = true;
      tokenRotated = registration.pushToken !== record.pushToken && registration.pushToken !== null;
    }
  }

  if (changed) {
    nextRecord.updatedAt = now.toISOString();
  }

  return {
    record: nextRecord,
    changed,
    tokenRotated
  };
}

function toNotificationInstallationSnapshot(record: StoredDeviceInstallationRecord): DeviceNotificationInstallationSnapshot {
  return {
    installationId: record.installationId,
    pushProvider: record.pushProvider,
    devicePlatform: record.devicePlatform,
    tokenLastRotatedAt: record.tokenLastRotatedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function installationFailure(reason: NotificationReasonCode, error: unknown, fallbackDetail: string): Extract<DeviceInstallationBootstrapResult, { ok: false }> {
  return {
    ok: false,
    reason,
    detail: error instanceof Error ? error.message : fallbackDetail
  };
}

function resolveStorageReason(error: unknown): NotificationReasonCode {
  if (error instanceof Error && /timed out/i.test(error.message)) {
    return 'storage-timeout';
  }

  return 'storage-unavailable';
}

function generateInstallationId(generate?: () => string) {
  try {
    const value = generate ? generate() : globalThis.crypto?.randomUUID?.();
    return isUuidLike(value) ? value : null;
  } catch {
    return null;
  }
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function isStoredDeviceInstallationRecord(value: unknown): value is StoredDeviceInstallationRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<StoredDeviceInstallationRecord>;
  const hasConsistentRegistration =
    (candidate.pushToken === null && candidate.pushProvider === null) ||
    (isNonEmptyString(candidate.pushToken) && isNonEmptyString(candidate.pushProvider));

  return (
    isUuidLike(candidate.installationId) &&
    hasConsistentRegistration &&
    (candidate.devicePlatform === null || candidate.devicePlatform === undefined || isNonEmptyString(candidate.devicePlatform)) &&
    (candidate.tokenLastRotatedAt === null || candidate.tokenLastRotatedAt === undefined || isIsoTimestamp(candidate.tokenLastRotatedAt)) &&
    isIsoTimestamp(candidate.createdAt) &&
    isIsoTimestamp(candidate.updatedAt)
  );
}

function isUuidLike(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
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
