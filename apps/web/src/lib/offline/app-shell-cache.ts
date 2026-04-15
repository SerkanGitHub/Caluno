import type { AppCalendar, AppGroup, ViewerSummary } from '$lib/server/app-shell';

export const APP_SHELL_CACHE_STORAGE_KEY = 'caluno.offline.app-shell.v1';
export const APP_SHELL_CACHE_VERSION = 1;

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type CachedSessionContinuity = {
  userId: string;
  email: string;
  displayName: string;
  expiresAtMs: number;
  refreshedAt: string;
};

export type CachedCalendarScope = {
  id: string;
  groupId: string;
  name: string;
  isDefault: boolean;
};

export type CachedGroupScope = {
  id: string;
  name: string;
  role: 'owner' | 'member';
  calendarIds: string[];
};

export type CachedAppShellSnapshot = {
  version: typeof APP_SHELL_CACHE_VERSION;
  viewer: ViewerSummary;
  session: CachedSessionContinuity;
  groups: CachedGroupScope[];
  calendars: CachedCalendarScope[];
  primaryCalendarId: string | null;
  onboardingState: 'needs-group' | 'ready';
  refreshedAt: string;
};

export type CachedAppShellUnavailableReason =
  | 'storage-unavailable'
  | 'cache-missing'
  | 'cache-parse-failed'
  | 'cache-contract-invalid'
  | 'session-stale'
  | 'session-user-mismatch'
  | 'calendar-not-synced';

export type CachedAppShellLookup =
  | {
      status: 'available';
      snapshot: CachedAppShellSnapshot;
      requestedCalendar: CachedCalendarScope | null;
      requestedGroup: CachedGroupScope | null;
    }
  | {
      status: 'unavailable';
      reason: CachedAppShellUnavailableReason;
      detail: string;
    };

export function writeCachedAppShellSnapshot(
  params: {
    viewer: ViewerSummary;
    session: CachedSessionContinuity;
    groups: AppGroup[];
    calendars: AppCalendar[];
    primaryCalendar: AppCalendar | null;
    onboardingState: 'needs-group' | 'ready';
    now?: Date;
  },
  storage = resolveStorageLike()
): CachedAppShellSnapshot | null {
  if (!storage) {
    return null;
  }

  const calendars = params.calendars.map((calendar) => ({
    id: calendar.id,
    groupId: calendar.groupId,
    name: calendar.name,
    isDefault: calendar.isDefault
  }));

  const groups = params.groups.map((group) => ({
    id: group.id,
    name: group.name,
    role: group.role,
    calendarIds: group.calendars.map((calendar) => calendar.id)
  }));

  const snapshot: CachedAppShellSnapshot = {
    version: APP_SHELL_CACHE_VERSION,
    viewer: {
      id: params.viewer.id,
      email: params.viewer.email,
      displayName: params.viewer.displayName
    },
    session: params.session,
    groups,
    calendars,
    primaryCalendarId: params.primaryCalendar?.id ?? null,
    onboardingState: params.onboardingState,
    refreshedAt: (params.now ?? new Date()).toISOString()
  };

  if (!isCachedAppShellSnapshot(snapshot)) {
    throw new Error('Refused to persist an invalid cached app-shell snapshot.');
  }

  storage.setItem(APP_SHELL_CACHE_STORAGE_KEY, JSON.stringify(snapshot));
  return snapshot;
}

export function readCachedAppShellSnapshot(
  params: {
    storage?: StorageLike | null;
    now?: Date;
    expectedUserId?: string | null;
    calendarId?: string | null;
  } = {}
): CachedAppShellLookup {
  const storage = params.storage ?? resolveStorageLike();

  if (!storage) {
    return unavailable(
      'storage-unavailable',
      'Browser-local storage is unavailable, so offline continuity stayed disabled.'
    );
  }

  const raw = storage.getItem(APP_SHELL_CACHE_STORAGE_KEY);
  if (!raw) {
    return unavailable('cache-missing', 'No trusted app-shell continuity snapshot has been stored on this browser yet.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    storage.removeItem(APP_SHELL_CACHE_STORAGE_KEY);
    return unavailable('cache-parse-failed', 'The cached app-shell snapshot was corrupt and was cleared instead of being trusted.');
  }

  if (!isCachedAppShellSnapshot(parsed)) {
    storage.removeItem(APP_SHELL_CACHE_STORAGE_KEY);
    return unavailable(
      'cache-contract-invalid',
      'The cached app-shell snapshot failed contract validation and was cleared instead of widening offline scope.'
    );
  }

  const snapshot = parsed;
  const nowMs = (params.now ?? new Date()).getTime();
  if (snapshot.session.expiresAtMs <= nowMs) {
    return unavailable('session-stale', 'The cached continuity session expired, so offline continuity failed closed.');
  }

  if (params.expectedUserId && snapshot.session.userId !== params.expectedUserId) {
    return unavailable(
      'session-user-mismatch',
      'The cached continuity session belongs to a different user, so the cached shell was not trusted.'
    );
  }

  const requestedCalendar = params.calendarId
    ? snapshot.calendars.find((calendar) => calendar.id === params.calendarId) ?? null
    : null;

  if (params.calendarId && !requestedCalendar) {
    return unavailable(
      'calendar-not-synced',
      'That calendar id was never synced into the trusted browser-local scope, so offline continuity failed closed.'
    );
  }

  const requestedGroup = requestedCalendar
    ? snapshot.groups.find((group) => group.id === requestedCalendar.groupId) ?? null
    : null;

  return {
    status: 'available',
    snapshot,
    requestedCalendar,
    requestedGroup
  };
}

export function clearCachedAppShellSnapshot(storage = resolveStorageLike()): void {
  storage?.removeItem(APP_SHELL_CACHE_STORAGE_KEY);
}

export function resolveStorageLike(): StorageLike | null {
  const candidate = globalThis.localStorage;
  if (!candidate) {
    return null;
  }

  return candidate;
}

export function isCachedAppShellSnapshot(value: unknown): value is CachedAppShellSnapshot {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<CachedAppShellSnapshot>;
  if (candidate.version !== APP_SHELL_CACHE_VERSION) {
    return false;
  }

  if (!isViewerSummary(candidate.viewer) || !isCachedSessionContinuity(candidate.session)) {
    return false;
  }

  if (!Array.isArray(candidate.groups) || !candidate.groups.every(isCachedGroupScope)) {
    return false;
  }

  if (!Array.isArray(candidate.calendars) || !candidate.calendars.every(isCachedCalendarScope)) {
    return false;
  }

  if (candidate.primaryCalendarId !== null && typeof candidate.primaryCalendarId !== 'string') {
    return false;
  }

  if (candidate.onboardingState !== 'needs-group' && candidate.onboardingState !== 'ready') {
    return false;
  }

  if (!isIsoTimestamp(candidate.refreshedAt)) {
    return false;
  }

  const calendarIds = new Set(candidate.calendars.map((calendar) => calendar.id));
  for (const group of candidate.groups) {
    if (!group.calendarIds.every((calendarId) => calendarIds.has(calendarId))) {
      return false;
    }
  }

  if (candidate.primaryCalendarId && !calendarIds.has(candidate.primaryCalendarId)) {
    return false;
  }

  return candidate.session.userId === candidate.viewer.id;
}

function unavailable(reason: CachedAppShellUnavailableReason, detail: string): CachedAppShellLookup {
  return {
    status: 'unavailable',
    reason,
    detail
  };
}

function isCachedSessionContinuity(value: unknown): value is CachedSessionContinuity {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<CachedSessionContinuity>;
  return (
    isNonEmptyString(candidate.userId) &&
    isNonEmptyString(candidate.email) &&
    isNonEmptyString(candidate.displayName) &&
    typeof candidate.expiresAtMs === 'number' &&
    Number.isFinite(candidate.expiresAtMs) &&
    isIsoTimestamp(candidate.refreshedAt)
  );
}

function isCachedCalendarScope(value: unknown): value is CachedCalendarScope {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<CachedCalendarScope>;
  return (
    isNonEmptyString(candidate.id) &&
    isNonEmptyString(candidate.groupId) &&
    isNonEmptyString(candidate.name) &&
    typeof candidate.isDefault === 'boolean'
  );
}

function isCachedGroupScope(value: unknown): value is CachedGroupScope {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<CachedGroupScope>;
  return (
    isNonEmptyString(candidate.id) &&
    isNonEmptyString(candidate.name) &&
    (candidate.role === 'owner' || candidate.role === 'member') &&
    Array.isArray(candidate.calendarIds) &&
    candidate.calendarIds.every(isNonEmptyString)
  );
}

function isViewerSummary(value: unknown): value is ViewerSummary {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ViewerSummary>;
  return isNonEmptyString(candidate.id) && isNonEmptyString(candidate.email) && isNonEmptyString(candidate.displayName);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}
