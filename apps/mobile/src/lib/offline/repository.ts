import { Preferences } from '@capacitor/preferences';
import type {
  OfflineMutationReadResult,
  OfflineRepositoryState,
  OfflineRepositoryWriteResult,
  OfflineScheduleMutationRecord,
  OfflineScheduleRepository,
  OfflineScheduleScope,
  OfflineScheduleWeekSnapshot,
  OfflineWeekSnapshotReadResult
} from '@repo/caluno-core/offline/types';

export type MobileOfflineWeekMetadata = {
  userId: string;
  calendarId: string;
  weekStart: string;
  syncedAt: string;
  source: 'trusted-online' | 'server-sync' | 'local-write';
};

export type MobileOfflineStorage = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
  keys: () => Promise<string[]>;
};

const STORAGE_TIMEOUT_MS = 750;
const WEEK_SNAPSHOT_PREFIX = 'caluno.mobile.week-snapshot.v1';
const WEEK_METADATA_PREFIX = 'caluno.mobile.week-metadata.v1';
const MUTATION_QUEUE_PREFIX = 'caluno.mobile.mutation-queue.v1';

const defaultStorage: MobileOfflineStorage = {
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

export function createMobileOfflineRepository(options: {
  storage?: MobileOfflineStorage;
  timeoutMs?: number;
} = {}): OfflineScheduleRepository {
  const storage = options.storage ?? defaultStorage;
  const timeoutMs = options.timeoutMs ?? STORAGE_TIMEOUT_MS;

  let state: OfflineRepositoryState | null = null;

  async function initialize(): Promise<OfflineRepositoryState> {
    try {
      await withTimeout(storage.keys(), timeoutMs, 'Reading mobile offline keys timed out during repository bootstrap.');
      state = {
        status: 'ready',
        engine: 'memory',
        persistence: 'persistent',
        database: 'capacitor-preferences',
        sqliteVersion: null
      };
      return state;
    } catch (error) {
      state = {
        status: 'unavailable',
        engine: 'memory',
        reason: isTimeoutError(error) ? 'repository-open-timeout' : 'repository-open-failed',
        detail:
          error instanceof Error
            ? error.message
            : 'Opening the mobile offline repository failed before device persistence could be inspected.'
      };
      return state;
    }
  }

  return {
    initialize,
    inspect() {
      return state;
    },
    async getWeekSnapshot(scope) {
      if (!isOfflineScheduleScope(scope)) {
        return malformedWeek('The requested offline week scope was malformed, so the trusted snapshot stayed hidden.');
      }

      const key = buildWeekSnapshotKey(scope);
      let raw: string | null;
      try {
        raw = await withTimeout(storage.get(key), timeoutMs, 'Reading the stored offline week snapshot timed out.');
      } catch (error) {
        return unavailableWeek(error);
      }

      if (!raw) {
        return {
          status: 'missing',
          reason: 'snapshot-missing'
        } satisfies OfflineWeekSnapshotReadResult;
      }

      try {
        const parsed = JSON.parse(raw);
        if (!isOfflineScheduleWeekSnapshot(parsed) || !sameScope(parsed.scope, scope)) {
          await safeRemove(storage, key, timeoutMs);
          return malformedWeek(
            'The stored offline week snapshot failed contract validation, so cached week continuity failed closed.'
          );
        }

        return {
          status: 'available',
          snapshot: parsed
        } satisfies OfflineWeekSnapshotReadResult;
      } catch {
        await safeRemove(storage, key, timeoutMs);
        return malformedWeek('The stored offline week snapshot was corrupt and was cleared instead of being trusted.');
      }
    },
    async putWeekSnapshot(snapshot) {
      if (!isOfflineScheduleWeekSnapshot(snapshot)) {
        return invalidWrite('snapshot-invalid', 'Refused to persist a malformed mobile offline week snapshot.');
      }

      const key = buildWeekSnapshotKey(snapshot.scope);
      const metadataKey = buildWeekMetadataKey(snapshot.scope);
      const raw = JSON.stringify(snapshot);
      const metadata = JSON.stringify({
        userId: snapshot.scope.userId,
        calendarId: snapshot.scope.calendarId,
        weekStart: snapshot.scope.weekStart,
        syncedAt: snapshot.cachedAt,
        source: snapshot.origin === 'local-write' ? 'local-write' : 'server-sync'
      } satisfies MobileOfflineWeekMetadata);

      try {
        const existingRaw = await withTimeout(storage.get(key), timeoutMs, 'Reading the stored offline week snapshot timed out.');
        if (existingRaw !== raw) {
          await withTimeout(storage.set(key, raw), timeoutMs, 'Persisting the offline week snapshot timed out.');
        }

        const existingMetadata = await withTimeout(
          storage.get(metadataKey),
          timeoutMs,
          'Reading the stored offline week metadata timed out.'
        );
        if (existingMetadata !== metadata) {
          await withTimeout(storage.set(metadataKey, metadata), timeoutMs, 'Persisting the offline week metadata timed out.');
        }

        return { ok: true } satisfies OfflineRepositoryWriteResult;
      } catch (error) {
        return unavailableWrite('snapshot-invalid', error, 'Persisting the mobile offline week snapshot failed.');
      }
    },
    async deleteWeekSnapshot(scope) {
      if (!isOfflineScheduleScope(scope)) {
        return invalidWrite('snapshot-invalid', 'Refused to delete a malformed mobile offline week scope.');
      }

      try {
        await withTimeout(storage.remove(buildWeekSnapshotKey(scope)), timeoutMs, 'Deleting the offline week snapshot timed out.');
        await withTimeout(storage.remove(buildWeekMetadataKey(scope)), timeoutMs, 'Deleting the offline week metadata timed out.');
        return { ok: true } satisfies OfflineRepositoryWriteResult;
      } catch (error) {
        return unavailableWrite('repository-unavailable', error, 'Deleting the mobile offline week snapshot failed.');
      }
    },
    async listLocalMutations(scope) {
      if (!isOfflineScheduleScope(scope)) {
        return malformedMutations('The requested offline mutation scope was malformed, so queued work stayed hidden.');
      }

      const key = buildMutationQueueKey(scope);
      let raw: string | null;
      try {
        raw = await withTimeout(storage.get(key), timeoutMs, 'Reading the stored offline mutation queue timed out.');
      } catch (error) {
        return unavailableMutations(error);
      }

      if (!raw) {
        return {
          status: 'available',
          mutations: []
        } satisfies OfflineMutationReadResult;
      }

      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.every((value) => isOfflineScheduleMutationRecord(value) && sameScope(value.scope, scope))) {
          await safeRemove(storage, key, timeoutMs);
          return malformedMutations(
            'The stored offline mutation queue failed contract validation, so queued work was cleared instead of being replayed.'
          );
        }

        return {
          status: 'available',
          mutations: parsed.sort(compareMutations)
        } satisfies OfflineMutationReadResult;
      } catch {
        await safeRemove(storage, key, timeoutMs);
        return malformedMutations('The stored offline mutation queue was corrupt and was cleared instead of being replayed.');
      }
    },
    async putLocalMutation(mutation) {
      if (!isOfflineScheduleMutationRecord(mutation)) {
        return invalidWrite('mutation-invalid', 'Refused to persist a malformed mobile offline mutation record.');
      }

      const loaded = await this.listLocalMutations(mutation.scope);
      if (loaded.status !== 'available') {
        return {
          ok: false,
          reason: loaded.reason === 'mutation-invalid' ? 'mutation-invalid' : 'repository-unavailable',
          detail: loaded.detail
        } satisfies OfflineRepositoryWriteResult;
      }

      const nextMutations = upsertMutation(loaded.mutations, mutation);
      return writeMutationQueue(storage, mutation.scope, nextMutations, timeoutMs);
    },
    async deleteLocalMutation(scope, mutationId) {
      if (!isOfflineScheduleScope(scope) || !isNonEmptyString(mutationId)) {
        return invalidWrite('mutation-invalid', 'Refused to delete a malformed mobile offline mutation reference.');
      }

      const loaded = await this.listLocalMutations(scope);
      if (loaded.status !== 'available') {
        return {
          ok: false,
          reason: loaded.reason === 'mutation-invalid' ? 'mutation-invalid' : 'repository-unavailable',
          detail: loaded.detail
        } satisfies OfflineRepositoryWriteResult;
      }

      const nextMutations = loaded.mutations.filter((mutation) => mutation.id !== mutationId);
      return writeMutationQueue(storage, scope, nextMutations, timeoutMs);
    },
    async clearLocalMutations(scope) {
      if (!isOfflineScheduleScope(scope)) {
        return invalidWrite('mutation-invalid', 'Refused to clear a malformed mobile offline mutation scope.');
      }

      try {
        await withTimeout(storage.remove(buildMutationQueueKey(scope)), timeoutMs, 'Clearing the offline mutation queue timed out.');
        return { ok: true } satisfies OfflineRepositoryWriteResult;
      } catch (error) {
        return unavailableWrite('repository-unavailable', error, 'Clearing the mobile offline mutation queue failed.');
      }
    },
    async close() {
      state = null;
    }
  };
}

const mobileOfflineRepository = createMobileOfflineRepository();

export function getMobileOfflineRepository() {
  return mobileOfflineRepository;
}

export async function rememberSyncedCalendarWeek(
  metadata: MobileOfflineWeekMetadata,
  options: {
    storage?: MobileOfflineStorage;
    timeoutMs?: number;
  } = {}
): Promise<OfflineRepositoryWriteResult> {
  if (!isMobileOfflineWeekMetadata(metadata)) {
    return invalidWrite('snapshot-invalid', 'Refused to persist malformed mobile week continuity metadata.');
  }

  const storage = options.storage ?? defaultStorage;
  const timeoutMs = options.timeoutMs ?? STORAGE_TIMEOUT_MS;
  const key = buildWeekMetadataKey({
    userId: metadata.userId,
    calendarId: metadata.calendarId,
    weekStart: metadata.weekStart
  });
  const raw = JSON.stringify(metadata);

  try {
    const existing = await withTimeout(storage.get(key), timeoutMs, 'Reading the stored mobile week continuity metadata timed out.');
    if (existing !== raw) {
      await withTimeout(storage.set(key, raw), timeoutMs, 'Persisting the mobile week continuity metadata timed out.');
    }

    return { ok: true } satisfies OfflineRepositoryWriteResult;
  } catch (error) {
    return unavailableWrite('repository-unavailable', error, 'Persisting the mobile week continuity metadata failed.');
  }
}

export async function hasSyncedCalendarContinuity(
  params: { userId: string; calendarId: string },
  options: {
    storage?: MobileOfflineStorage;
    timeoutMs?: number;
  } = {}
): Promise<
  | { ok: true; hasWeek: boolean; latestSyncedAt: string | null }
  | { ok: false; detail: string }
> {
  if (!isNonEmptyString(params.userId) || !isNonEmptyString(params.calendarId)) {
    return {
      ok: false,
      detail: 'The requested mobile continuity scope was malformed, so cached calendar reopen failed closed.'
    };
  }

  const storage = options.storage ?? defaultStorage;
  const timeoutMs = options.timeoutMs ?? STORAGE_TIMEOUT_MS;
  const prefix = buildWeekMetadataPrefix(params.userId, params.calendarId);

  let keys: string[];
  try {
    keys = await withTimeout(storage.keys(), timeoutMs, 'Listing stored mobile week continuity keys timed out.');
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : 'Listing stored mobile week continuity keys failed.'
    };
  }

  const candidateKeys = keys.filter((key) => key.startsWith(prefix));
  if (candidateKeys.length === 0) {
    return {
      ok: true,
      hasWeek: false,
      latestSyncedAt: null
    };
  }

  let latestSyncedAt: string | null = null;

  for (const key of candidateKeys) {
    try {
      const raw = await withTimeout(storage.get(key), timeoutMs, 'Reading stored mobile week continuity metadata timed out.');
      if (!raw) {
        continue;
      }

      const parsed = JSON.parse(raw);
      if (!isMobileOfflineWeekMetadata(parsed)) {
        await safeRemove(storage, key, timeoutMs);
        continue;
      }

      if (parsed.syncedAt > (latestSyncedAt ?? '')) {
        latestSyncedAt = parsed.syncedAt;
      }
    } catch (error) {
      return {
        ok: false,
        detail: error instanceof Error ? error.message : 'Reading stored mobile week continuity metadata failed.'
      };
    }
  }

  return {
    ok: true,
    hasWeek: latestSyncedAt !== null,
    latestSyncedAt
  };
}

export async function clearMobileContinuityRepository(options: {
  storage?: MobileOfflineStorage;
  timeoutMs?: number;
} = {}): Promise<void> {
  const storage = options.storage ?? defaultStorage;
  const timeoutMs = options.timeoutMs ?? STORAGE_TIMEOUT_MS;

  let keys: string[];
  try {
    keys = await withTimeout(storage.keys(), timeoutMs, 'Listing mobile continuity keys timed out during clear.');
  } catch {
    return;
  }

  const removable = keys.filter(
    (key) =>
      key.startsWith(WEEK_METADATA_PREFIX) ||
      key.startsWith(WEEK_SNAPSHOT_PREFIX) ||
      key.startsWith(MUTATION_QUEUE_PREFIX)
  );

  await Promise.all(removable.map((key) => safeRemove(storage, key, timeoutMs)));
}

function buildWeekSnapshotKey(scope: OfflineScheduleScope) {
  return `${WEEK_SNAPSHOT_PREFIX}:${scope.userId}:${scope.calendarId}:${scope.weekStart}`;
}

function buildWeekMetadataPrefix(userId: string, calendarId: string) {
  return `${WEEK_METADATA_PREFIX}:${userId}:${calendarId}:`;
}

function buildWeekMetadataKey(scope: OfflineScheduleScope) {
  return `${WEEK_METADATA_PREFIX}:${scope.userId}:${scope.calendarId}:${scope.weekStart}`;
}

function buildMutationQueueKey(scope: OfflineScheduleScope) {
  return `${MUTATION_QUEUE_PREFIX}:${scope.userId}:${scope.calendarId}:${scope.weekStart}`;
}

function compareMutations(left: OfflineScheduleMutationRecord, right: OfflineScheduleMutationRecord) {
  return left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
}

function upsertMutation(
  mutations: OfflineScheduleMutationRecord[],
  nextMutation: OfflineScheduleMutationRecord
): OfflineScheduleMutationRecord[] {
  const next = mutations.filter((mutation) => mutation.id !== nextMutation.id);
  next.push(nextMutation);
  return next.sort(compareMutations);
}

async function writeMutationQueue(
  storage: MobileOfflineStorage,
  scope: OfflineScheduleScope,
  mutations: OfflineScheduleMutationRecord[],
  timeoutMs: number
): Promise<OfflineRepositoryWriteResult> {
  try {
    const key = buildMutationQueueKey(scope);
    if (mutations.length === 0) {
      await withTimeout(storage.remove(key), timeoutMs, 'Clearing the offline mutation queue timed out.');
      return { ok: true } satisfies OfflineRepositoryWriteResult;
    }

    const raw = JSON.stringify(mutations);
    const existing = await withTimeout(storage.get(key), timeoutMs, 'Reading the stored offline mutation queue timed out.');
    if (existing !== raw) {
      await withTimeout(storage.set(key, raw), timeoutMs, 'Persisting the offline mutation queue timed out.');
    }

    return { ok: true } satisfies OfflineRepositoryWriteResult;
  } catch (error) {
    return unavailableWrite('repository-unavailable', error, 'Persisting the mobile offline mutation queue failed.');
  }
}

function sameScope(left: OfflineScheduleScope, right: OfflineScheduleScope) {
  return left.userId === right.userId && left.calendarId === right.calendarId && left.weekStart === right.weekStart;
}

function malformedWeek(detail: string): Extract<OfflineWeekSnapshotReadResult, { status: 'malformed' }> {
  return {
    status: 'malformed',
    reason: 'snapshot-invalid',
    detail
  };
}

function unavailableWeek(error: unknown): Extract<OfflineWeekSnapshotReadResult, { status: 'unavailable' }> {
  return {
    status: 'unavailable',
    reason: 'repository-unavailable',
    detail: error instanceof Error ? error.message : 'Reading the mobile offline week snapshot failed.'
  };
}

function malformedMutations(detail: string): Extract<OfflineMutationReadResult, { status: 'malformed' }> {
  return {
    status: 'malformed',
    reason: 'mutation-invalid',
    detail
  };
}

function unavailableMutations(error: unknown): Extract<OfflineMutationReadResult, { status: 'unavailable' }> {
  return {
    status: 'unavailable',
    reason: 'repository-unavailable',
    detail: error instanceof Error ? error.message : 'Reading the mobile offline mutation queue failed.'
  };
}

function invalidWrite(
  reason: Extract<OfflineRepositoryWriteResult, { ok: false }>['reason'],
  detail: string
): Extract<OfflineRepositoryWriteResult, { ok: false }> {
  return {
    ok: false,
    reason,
    detail
  };
}

function unavailableWrite(
  reason: Extract<OfflineRepositoryWriteResult, { ok: false }>['reason'],
  error: unknown,
  fallback: string
): Extract<OfflineRepositoryWriteResult, { ok: false }> {
  return {
    ok: false,
    reason,
    detail: error instanceof Error ? error.message : fallback
  };
}

async function safeRemove(storage: MobileOfflineStorage, key: string, timeoutMs: number) {
  try {
    await withTimeout(storage.remove(key), timeoutMs, 'Removing malformed mobile offline persistence timed out.');
  } catch {
    // Fail closed.
  }
}

function isTimeoutError(error: unknown) {
  return error instanceof Error && /timed out/i.test(error.message);
}

function isOfflineScheduleScope(value: unknown): value is OfflineScheduleScope {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<OfflineScheduleScope>;
  return (
    isNonEmptyString(candidate.userId) &&
    isNonEmptyString(candidate.calendarId) &&
    /^\d{4}-\d{2}-\d{2}$/.test(candidate.weekStart ?? '')
  );
}

function isOfflineScheduleWeekSnapshot(value: unknown): value is OfflineScheduleWeekSnapshot {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<OfflineScheduleWeekSnapshot>;
  return (
    isOfflineScheduleScope(candidate.scope) &&
    isVisibleWeek(candidate.visibleWeek) &&
    Array.isArray(candidate.shifts) &&
    candidate.shifts.every(isCalendarShift) &&
    isIsoTimestamp(candidate.cachedAt) &&
    (candidate.origin === 'server-sync' || candidate.origin === 'local-write')
  );
}

function isOfflineScheduleMutationRecord(value: unknown): value is OfflineScheduleMutationRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<OfflineScheduleMutationRecord>;
  return (
    isNonEmptyString(candidate.id) &&
    isOfflineScheduleScope(candidate.scope) &&
    (candidate.action === 'create' || candidate.action === 'edit' || candidate.action === 'move' || candidate.action === 'delete') &&
    (candidate.shiftId === null || isNonEmptyString(candidate.shiftId)) &&
    isPlainObject(candidate.payload) &&
    isIsoTimestamp(candidate.createdAt)
  );
}

function isMobileOfflineWeekMetadata(value: unknown): value is MobileOfflineWeekMetadata {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<MobileOfflineWeekMetadata>;
  return (
    isNonEmptyString(candidate.userId) &&
    isNonEmptyString(candidate.calendarId) &&
    /^\d{4}-\d{2}-\d{2}$/.test(candidate.weekStart ?? '') &&
    isIsoTimestamp(candidate.syncedAt) &&
    (candidate.source === 'trusted-online' || candidate.source === 'server-sync' || candidate.source === 'local-write')
  );
}

function isVisibleWeek(value: unknown) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as {
    start?: unknown;
    endExclusive?: unknown;
    startAt?: unknown;
    endAt?: unknown;
    requestedStart?: unknown;
    source?: unknown;
    reason?: unknown;
    dayKeys?: unknown;
  };

  return (
    /^\d{4}-\d{2}-\d{2}$/.test(String(candidate.start ?? '')) &&
    /^\d{4}-\d{2}-\d{2}$/.test(String(candidate.endExclusive ?? '')) &&
    isIsoTimestamp(candidate.startAt) &&
    isIsoTimestamp(candidate.endAt) &&
    (candidate.requestedStart === null || candidate.requestedStart === undefined || /^\d{4}-\d{2}-\d{2}$/.test(String(candidate.requestedStart))) &&
    (candidate.source === 'query' || candidate.source === 'default' || candidate.source === 'fallback-invalid') &&
    (candidate.reason === null || candidate.reason === 'VISIBLE_WEEK_START_INVALID') &&
    Array.isArray(candidate.dayKeys) &&
    candidate.dayKeys.every((dayKey) => /^\d{4}-\d{2}-\d{2}$/.test(String(dayKey)))
  );
}

function isCalendarShift(value: unknown) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as {
    id?: unknown;
    calendarId?: unknown;
    seriesId?: unknown;
    title?: unknown;
    startAt?: unknown;
    endAt?: unknown;
    occurrenceIndex?: unknown;
    sourceKind?: unknown;
  };

  return (
    isNonEmptyString(candidate.id) &&
    isNonEmptyString(candidate.calendarId) &&
    typeof candidate.title === 'string' &&
    isIsoTimestamp(candidate.startAt) &&
    isIsoTimestamp(candidate.endAt) &&
    (candidate.seriesId === null || typeof candidate.seriesId === 'string') &&
    (candidate.occurrenceIndex === null || typeof candidate.occurrenceIndex === 'number') &&
    (candidate.sourceKind === 'single' || candidate.sourceKind === 'series')
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
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
