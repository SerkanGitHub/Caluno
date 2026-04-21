import { Preferences } from '@capacitor/preferences';
import {
  APP_SHELL_CACHE_STORAGE_KEY,
  clearCachedAppShellSnapshot,
  readCachedAppShellSnapshot,
  writeCachedAppShellSnapshot,
  type CachedAppShellLookup,
  type CachedAppShellSnapshot,
  type CachedAppShellUnavailableReason,
  type CachedSessionContinuity
} from '@repo/caluno-core/offline/app-shell-cache';
import type { AppCalendar, AppGroup, ViewerSummary } from '@repo/caluno-core/app-shell';

export type MobileContinuityUnavailableReason = CachedAppShellUnavailableReason | 'storage-timeout' | 'storage-write-failed';

export type MobileCachedAppShellLookup =
  | Extract<CachedAppShellLookup, { status: 'available' }>
  | {
      status: 'unavailable';
      reason: MobileContinuityUnavailableReason;
      detail: string;
    };

export type MobileAppShellPersistResult =
  | {
      ok: true;
      snapshot: CachedAppShellSnapshot;
      persisted: boolean;
    }
  | {
      ok: false;
      reason: MobileContinuityUnavailableReason;
      detail: string;
    };

export type MobileContinuityStorage = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
  keys?: () => Promise<string[]>;
};

export const MOBILE_CONTINUITY_TIMEOUT_MS = 750;

const defaultStorage: MobileContinuityStorage = {
  async get(key) {
    const result = await Preferences.get({ key });
    return result.value ?? null;
  },
  async set(key, value) {
    await Preferences.set({ key, value });
  },
  async remove(key) {
    await Preferences.remove({ key });
  },
  async keys() {
    const result = await Preferences.keys();
    return result.keys;
  }
};

export async function readMobileCachedAppShellSnapshot(
  params: {
    expectedUserId?: string | null;
    calendarId?: string | null;
    now?: Date;
    timeoutMs?: number;
    storage?: MobileContinuityStorage;
  } = {}
): Promise<MobileCachedAppShellLookup> {
  const storage = params.storage ?? defaultStorage;
  const timeoutMs = params.timeoutMs ?? MOBILE_CONTINUITY_TIMEOUT_MS;

  let raw: string | null;
  try {
    raw = await withTimeout(
      storage.get(APP_SHELL_CACHE_STORAGE_KEY),
      timeoutMs,
      'Reading the device continuity snapshot timed out, so cached mobile reopen stayed disabled.'
    );
  } catch (error) {
    return unavailableFromStorageError(error, 'Reading the device continuity snapshot failed, so cached mobile reopen stayed disabled.');
  }

  const memoryStorage = createSingleKeyStorage(APP_SHELL_CACHE_STORAGE_KEY, raw);
  const lookup = readCachedAppShellSnapshot({
    storage: memoryStorage,
    expectedUserId: params.expectedUserId,
    calendarId: params.calendarId,
    now: params.now
  });

  const nextRaw = memoryStorage.getItem(APP_SHELL_CACHE_STORAGE_KEY);
  if (raw !== nextRaw) {
    try {
      if (nextRaw === null) {
        await withTimeout(
          storage.remove(APP_SHELL_CACHE_STORAGE_KEY),
          timeoutMs,
          'Clearing the corrupt device continuity snapshot timed out, so cached mobile reopen stayed disabled.'
        );
      } else {
        await withTimeout(
          storage.set(APP_SHELL_CACHE_STORAGE_KEY, nextRaw),
          timeoutMs,
          'Refreshing the repaired device continuity snapshot timed out, so cached mobile reopen stayed disabled.'
        );
      }
    } catch {
      // The lookup result already failed closed; keep the rejection reason from the contract path.
    }
  }

  if (lookup.status === 'available') {
    return lookup;
  }

  return lookup;
}

export async function writeMobileCachedAppShellSnapshot(params: {
  viewer: ViewerSummary;
  session: CachedSessionContinuity;
  groups: AppGroup[];
  calendars: AppCalendar[];
  primaryCalendar: AppCalendar | null;
  onboardingState: 'needs-group' | 'ready';
  now?: Date;
  timeoutMs?: number;
  storage?: MobileContinuityStorage;
}): Promise<MobileAppShellPersistResult> {
  const storage = params.storage ?? defaultStorage;
  const timeoutMs = params.timeoutMs ?? MOBILE_CONTINUITY_TIMEOUT_MS;

  let existingRaw: string | null;
  try {
    existingRaw = await withTimeout(
      storage.get(APP_SHELL_CACHE_STORAGE_KEY),
      timeoutMs,
      'Reading the existing device continuity snapshot timed out before Caluno could persist the trusted shell.'
    );
  } catch (error) {
    return persistFailureFromStorageError(
      error,
      'Reading the existing device continuity snapshot failed before Caluno could persist the trusted shell.'
    );
  }

  const memoryStorage = createSingleKeyStorage(APP_SHELL_CACHE_STORAGE_KEY, existingRaw);
  const snapshot = writeCachedAppShellSnapshot(
    {
      viewer: params.viewer,
      session: params.session,
      groups: params.groups,
      calendars: params.calendars,
      primaryCalendar: params.primaryCalendar,
      onboardingState: params.onboardingState,
      now: params.now
    },
    memoryStorage
  );

  const nextRaw = memoryStorage.getItem(APP_SHELL_CACHE_STORAGE_KEY);
  if (!snapshot || nextRaw === null) {
    return {
      ok: false,
      reason: 'storage-write-failed',
      detail: 'The trusted shell snapshot could not be serialized for device continuity persistence.'
    };
  }

  if (nextRaw === existingRaw) {
    return {
      ok: true,
      snapshot,
      persisted: false
    };
  }

  try {
    await withTimeout(
      storage.set(APP_SHELL_CACHE_STORAGE_KEY, nextRaw),
      timeoutMs,
      'Persisting the trusted shell snapshot timed out, so cached mobile reopen stayed unavailable.'
    );

    return {
      ok: true,
      snapshot,
      persisted: true
    };
  } catch (error) {
    return persistFailureFromStorageError(
      error,
      'Persisting the trusted shell snapshot failed, so cached mobile reopen stayed unavailable.'
    );
  }
}

export async function clearMobileCachedAppShellSnapshot(params: {
  timeoutMs?: number;
  storage?: MobileContinuityStorage;
} = {}): Promise<void> {
  const storage = params.storage ?? defaultStorage;
  const timeoutMs = params.timeoutMs ?? MOBILE_CONTINUITY_TIMEOUT_MS;

  try {
    await withTimeout(
      storage.remove(APP_SHELL_CACHE_STORAGE_KEY),
      timeoutMs,
      'Clearing the device continuity snapshot timed out.'
    );
  } catch {
    // Fail closed. A later lookup will still reject stale or malformed data through the contract.
  }
}

export function materializePersistedAppShellRaw(
  raw: string | null,
  params: {
    expectedUserId?: string | null;
    calendarId?: string | null;
    now?: Date;
  } = {}
): MobileCachedAppShellLookup {
  const memoryStorage = createSingleKeyStorage(APP_SHELL_CACHE_STORAGE_KEY, raw);
  const lookup = readCachedAppShellSnapshot({
    storage: memoryStorage,
    expectedUserId: params.expectedUserId,
    calendarId: params.calendarId,
    now: params.now
  });

  if (lookup.status === 'available') {
    return lookup;
  }

  return lookup;
}

export function createSingleKeyStorage(key: string, initialValue: string | null) {
  let value = initialValue;

  return {
    getItem(requestedKey: string) {
      return requestedKey === key ? value : null;
    },
    setItem(requestedKey: string, nextValue: string) {
      if (requestedKey === key) {
        value = nextValue;
      }
    },
    removeItem(requestedKey: string) {
      if (requestedKey === key) {
        value = null;
      }
    }
  };
}

export function snapshotContinuityUnavailable(
  reason: MobileContinuityUnavailableReason,
  detail: string
): Extract<MobileCachedAppShellLookup, { status: 'unavailable' }> {
  return {
    status: 'unavailable',
    reason,
    detail
  };
}

function unavailableFromStorageError(error: unknown, fallbackDetail: string): Extract<MobileCachedAppShellLookup, { status: 'unavailable' }> {
  return snapshotContinuityUnavailable(resolveStorageErrorReason(error), error instanceof Error ? error.message : fallbackDetail);
}

function persistFailureFromStorageError(error: unknown, fallbackDetail: string): Extract<MobileAppShellPersistResult, { ok: false }> {
  return {
    ok: false,
    reason: resolveStorageErrorReason(error),
    detail: error instanceof Error ? error.message : fallbackDetail
  };
}

function resolveStorageErrorReason(error: unknown): MobileContinuityUnavailableReason {
  if (error instanceof Error && /timed out/i.test(error.message)) {
    return 'storage-timeout';
  }

  return 'storage-unavailable';
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

export type { CachedAppShellSnapshot, CachedSessionContinuity, ViewerSummary };
