import { browser } from '$app/environment';
import {
  sqlite3Worker1Promiser,
  type SqlValue,
  type Worker1Promiser
} from '@sqlite.org/sqlite-wasm';
import type { CalendarShift, VisibleWeek } from '$lib/server/schedule';
import type { StorageLike } from './app-shell-cache';

export const OFFLINE_REPOSITORY_MEMORY_STORAGE_KEY = 'caluno.offline.repository.memory.v1';
const SQLITE_DATABASE_FILENAME = 'file:caluno-offline-v1.sqlite3?vfs=opfs';

export type OfflineScheduleScope = {
  userId: string;
  calendarId: string;
  weekStart: string;
};

export type OfflineScheduleWeekSnapshot = {
  scope: OfflineScheduleScope;
  visibleWeek: VisibleWeek;
  shifts: CalendarShift[];
  cachedAt: string;
  origin: 'server-sync' | 'local-write';
};

export type OfflineScheduleMutationRecord = {
  id: string;
  scope: OfflineScheduleScope;
  action: 'create' | 'edit' | 'move' | 'delete';
  shiftId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type OfflineRepositoryState =
  | {
      status: 'ready';
      engine: 'sqlite-worker' | 'memory';
      persistence: 'persistent' | 'shared-memory';
      database: string;
      sqliteVersion: string | null;
    }
  | {
      status: 'unavailable';
      engine: 'sqlite-worker' | 'memory';
      reason: 'unsupported-browser' | 'repository-open-timeout' | 'repository-open-failed';
      detail: string;
    };

export type OfflineWeekSnapshotReadResult =
  | {
      status: 'available';
      snapshot: OfflineScheduleWeekSnapshot;
    }
  | {
      status: 'missing';
      reason: 'snapshot-missing';
    }
  | {
      status: 'malformed';
      reason: 'snapshot-invalid';
      detail: string;
    }
  | {
      status: 'unavailable';
      reason: 'repository-unavailable';
      detail: string;
    };

export type OfflineMutationReadResult =
  | {
      status: 'available';
      mutations: OfflineScheduleMutationRecord[];
    }
  | {
      status: 'malformed';
      reason: 'mutation-invalid';
      detail: string;
    }
  | {
      status: 'unavailable';
      reason: 'repository-unavailable';
      detail: string;
    };

export type OfflineRepositoryWriteResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: 'repository-unavailable' | 'snapshot-invalid' | 'mutation-invalid';
      detail: string;
    };

export type OfflineScheduleRepository = {
  initialize: () => Promise<OfflineRepositoryState>;
  inspect: () => OfflineRepositoryState | null;
  getWeekSnapshot: (scope: OfflineScheduleScope) => Promise<OfflineWeekSnapshotReadResult>;
  putWeekSnapshot: (snapshot: OfflineScheduleWeekSnapshot) => Promise<OfflineRepositoryWriteResult>;
  deleteWeekSnapshot: (scope: OfflineScheduleScope) => Promise<OfflineRepositoryWriteResult>;
  listLocalMutations: (scope: OfflineScheduleScope) => Promise<OfflineMutationReadResult>;
  putLocalMutation: (mutation: OfflineScheduleMutationRecord) => Promise<OfflineRepositoryWriteResult>;
  clearLocalMutations: (scope: OfflineScheduleScope) => Promise<OfflineRepositoryWriteResult>;
  close: () => Promise<void>;
};

type PersistedWeekRecord = {
  scope: OfflineScheduleScope;
  snapshotJson: string;
};

type PersistedMutationRecord = {
  id: string;
  scope: OfflineScheduleScope;
  mutationJson: string;
};

type RepositoryDriver = {
  engine: 'sqlite-worker' | 'memory';
  open: () => Promise<OfflineRepositoryState>;
  close: () => Promise<void>;
  getWeekRecord: (scope: OfflineScheduleScope) => Promise<PersistedWeekRecord | null>;
  putWeekRecord: (record: PersistedWeekRecord) => Promise<void>;
  deleteWeekRecord: (scope: OfflineScheduleScope) => Promise<void>;
  listMutationRecords: (scope: OfflineScheduleScope) => Promise<PersistedMutationRecord[]>;
  putMutationRecord: (record: PersistedMutationRecord) => Promise<void>;
  clearMutationRecords: (scope: OfflineScheduleScope) => Promise<void>;
};

export function createBrowserScheduleRepository(options: {
  openTimeoutMs?: number;
} = {}): OfflineScheduleRepository {
  return createOfflineScheduleRepository(() =>
    createSqliteWorkerRepositoryDriver({ openTimeoutMs: options.openTimeoutMs ?? 5_000 })
  );
}

export function createMemoryScheduleRepository(options: {
  storage: StorageLike;
  storageKey?: string;
}): OfflineScheduleRepository {
  return createOfflineScheduleRepository(() =>
    createMemoryRepositoryDriver({
      storage: options.storage,
      storageKey: options.storageKey ?? OFFLINE_REPOSITORY_MEMORY_STORAGE_KEY
    })
  );
}

export function createOfflineScheduleRepository(factory: () => RepositoryDriver): OfflineScheduleRepository {
  let driver: RepositoryDriver | null = null;
  let openPromise: Promise<OfflineRepositoryState> | null = null;
  let state: OfflineRepositoryState | null = null;

  async function ensureReady(): Promise<{ driver: RepositoryDriver; state: OfflineRepositoryState } | null> {
    if (driver && state?.status === 'ready') {
      return { driver, state };
    }

    if (!driver) {
      driver = factory();
    }

    openPromise ??= driver.open().then((nextState) => {
      state = nextState;
      return nextState;
    });

    const nextState = await openPromise;
    if (nextState.status !== 'ready') {
      return null;
    }

    return {
      driver,
      state: nextState
    };
  }

  return {
    async initialize() {
      const ready = await ensureReady();
      return ready?.state ??
        state ?? {
          status: 'unavailable',
          engine: driver?.engine ?? 'memory',
          reason: 'repository-open-failed',
          detail: 'The offline repository did not finish initializing.'
        };
    },

    inspect() {
      return state;
    },

    async getWeekSnapshot(scope) {
      if (!isOfflineScheduleScope(scope)) {
        return {
          status: 'malformed',
          reason: 'snapshot-invalid',
          detail: 'The requested week scope was malformed, so the repository refused the lookup.'
        } satisfies OfflineWeekSnapshotReadResult;
      }

      const ready = await ensureReady();
      if (!ready) {
        return unavailableWeekResult(state);
      }

      const record = await ready.driver.getWeekRecord(scope);
      if (!record) {
        return {
          status: 'missing',
          reason: 'snapshot-missing'
        };
      }

      try {
        const parsed = JSON.parse(record.snapshotJson);
        if (!isOfflineScheduleWeekSnapshot(parsed) || !scopesMatch(parsed.scope, scope)) {
          return {
            status: 'malformed',
            reason: 'snapshot-invalid',
            detail:
              'The stored week snapshot failed validation, so the repository refused to rehydrate guessed schedule data.'
          };
        }

        return {
          status: 'available',
          snapshot: parsed
        };
      } catch {
        return {
          status: 'malformed',
          reason: 'snapshot-invalid',
          detail: 'The stored week snapshot JSON was corrupt, so the repository failed closed.'
        };
      }
    },

    async putWeekSnapshot(snapshot) {
      if (!isOfflineScheduleWeekSnapshot(snapshot)) {
        return invalidWrite('snapshot-invalid', 'Refused to persist a malformed offline week snapshot.');
      }

      const ready = await ensureReady();
      if (!ready) {
        return unavailableWriteResult(state);
      }

      await ready.driver.putWeekRecord({
        scope: snapshot.scope,
        snapshotJson: JSON.stringify(snapshot)
      });

      return { ok: true };
    },

    async deleteWeekSnapshot(scope) {
      if (!isOfflineScheduleScope(scope)) {
        return invalidWrite('snapshot-invalid', 'Refused to delete a malformed offline week scope.');
      }

      const ready = await ensureReady();
      if (!ready) {
        return unavailableWriteResult(state);
      }

      await ready.driver.deleteWeekRecord(scope);
      return { ok: true };
    },

    async listLocalMutations(scope) {
      if (!isOfflineScheduleScope(scope)) {
        return {
          status: 'malformed',
          reason: 'mutation-invalid',
          detail: 'The requested mutation scope was malformed, so the repository refused the lookup.'
        } satisfies OfflineMutationReadResult;
      }

      const ready = await ensureReady();
      if (!ready) {
        return unavailableMutationResult(state);
      }

      const records = await ready.driver.listMutationRecords(scope);
      const mutations: OfflineScheduleMutationRecord[] = [];

      for (const record of records) {
        try {
          const parsed = JSON.parse(record.mutationJson);
          if (!isOfflineScheduleMutationRecord(parsed) || !scopesMatch(parsed.scope, scope)) {
            return {
              status: 'malformed',
              reason: 'mutation-invalid',
              detail:
                'A stored local mutation failed validation, so the repository refused to replay guessed offline writes.'
            };
          }

          mutations.push(parsed);
        } catch {
          return {
            status: 'malformed',
            reason: 'mutation-invalid',
            detail: 'A stored local mutation JSON payload was corrupt, so the repository failed closed.'
          };
        }
      }

      return {
        status: 'available',
        mutations
      };
    },

    async putLocalMutation(mutation) {
      if (!isOfflineScheduleMutationRecord(mutation)) {
        return invalidWrite('mutation-invalid', 'Refused to persist a malformed local mutation record.');
      }

      const ready = await ensureReady();
      if (!ready) {
        return unavailableWriteResult(state);
      }

      await ready.driver.putMutationRecord({
        id: mutation.id,
        scope: mutation.scope,
        mutationJson: JSON.stringify(mutation)
      });

      return { ok: true };
    },

    async clearLocalMutations(scope) {
      if (!isOfflineScheduleScope(scope)) {
        return invalidWrite('mutation-invalid', 'Refused to clear mutations for a malformed offline week scope.');
      }

      const ready = await ensureReady();
      if (!ready) {
        return unavailableWriteResult(state);
      }

      await ready.driver.clearMutationRecords(scope);
      return { ok: true };
    },

    async close() {
      if (driver) {
        await driver.close();
      }
      driver = null;
      openPromise = null;
      state = null;
    }
  };
}

function createSqliteWorkerRepositoryDriver(options: { openTimeoutMs: number }): RepositoryDriver {
  let worker: Worker | null = null;
  let promiser: Worker1Promiser | null = null;
  let openState: OfflineRepositoryState | null = null;

  return {
    engine: 'sqlite-worker',

    async open() {
      if (openState) {
        return openState;
      }

      if (!browser || typeof Worker !== 'function') {
        openState = {
          status: 'unavailable',
          engine: 'sqlite-worker',
          reason: 'unsupported-browser',
          detail: 'Worker-backed SQLite persistence requires a browser worker runtime.'
        };
        return openState;
      }

      try {
        worker = new Worker(new URL('./sqlite.worker.ts', import.meta.url), { type: 'module' });
        promiser = await withTimeout(
          sqlite3Worker1Promiser.v2({ worker }),
          options.openTimeoutMs,
          'Timed out while waiting for the SQLite worker bootstrap to become ready.'
        );

        const configResult = await withTimeout(
          promiser('config-get', {}),
          options.openTimeoutMs,
          'Timed out while reading the SQLite worker configuration.'
        );

        const openResult = await withTimeout(
          promiser('open', { filename: SQLITE_DATABASE_FILENAME }),
          options.openTimeoutMs,
          'Timed out while opening the persistent browser-local SQLite database.'
        );

        if (!openResult.result.persistent) {
          await this.close();
          openState = {
            status: 'unavailable',
            engine: 'sqlite-worker',
            reason: 'unsupported-browser',
            detail: 'Persistent OPFS storage is unavailable, so offline continuity stayed disabled.'
          };
          return openState;
        }

        await execSql(
          promiser,
          `
            CREATE TABLE IF NOT EXISTS week_snapshots (
              user_id TEXT NOT NULL,
              calendar_id TEXT NOT NULL,
              week_start TEXT NOT NULL,
              snapshot_json TEXT NOT NULL,
              PRIMARY KEY (user_id, calendar_id, week_start)
            );

            CREATE TABLE IF NOT EXISTS local_mutations (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              calendar_id TEXT NOT NULL,
              week_start TEXT NOT NULL,
              mutation_json TEXT NOT NULL,
              created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS local_mutations_scope_idx
              ON local_mutations (user_id, calendar_id, week_start, created_at);
          `
        );

        openState = {
          status: 'ready',
          engine: 'sqlite-worker',
          persistence: 'persistent',
          database: openResult.result.filename,
          sqliteVersion: configResult.result.version.libVersion
        };

        return openState;
      } catch (error) {
        await this.close();
        openState = classifyDriverOpenError(error, 'sqlite-worker');
        return openState;
      }
    },

    async close() {
      if (promiser) {
        try {
          await promiser('close', {});
        } catch {
          // best effort shutdown
        }
      }

      worker?.terminate();
      worker = null;
      promiser = null;
      openState = null;
    },

    async getWeekRecord(scope) {
      const readyPromiser = requirePromiser(promiser);
      const rows = await execRows(readyPromiser, {
        sql: `
          SELECT snapshot_json
          FROM week_snapshots
          WHERE user_id = :userId AND calendar_id = :calendarId AND week_start = :weekStart
          LIMIT 1
        `,
        bind: toNamedScopeBind(scope)
      });

      const snapshotJson = rows[0]?.snapshot_json;
      return typeof snapshotJson === 'string'
        ? {
            scope,
            snapshotJson
          }
        : null;
    },

    async putWeekRecord(record) {
      const readyPromiser = requirePromiser(promiser);
      await execSql(
        readyPromiser,
        `
          INSERT INTO week_snapshots (user_id, calendar_id, week_start, snapshot_json)
          VALUES (:userId, :calendarId, :weekStart, :snapshotJson)
          ON CONFLICT(user_id, calendar_id, week_start)
          DO UPDATE SET snapshot_json = excluded.snapshot_json
        `,
        {
          ...toNamedScopeBind(record.scope),
          ':snapshotJson': record.snapshotJson
        }
      );
    },

    async deleteWeekRecord(scope) {
      const readyPromiser = requirePromiser(promiser);
      await execSql(
        readyPromiser,
        `DELETE FROM week_snapshots WHERE user_id = :userId AND calendar_id = :calendarId AND week_start = :weekStart`,
        toNamedScopeBind(scope)
      );
    },

    async listMutationRecords(scope) {
      const readyPromiser = requirePromiser(promiser);
      const rows = await execRows(readyPromiser, {
        sql: `
          SELECT id, mutation_json
          FROM local_mutations
          WHERE user_id = :userId AND calendar_id = :calendarId AND week_start = :weekStart
          ORDER BY created_at ASC, id ASC
        `,
        bind: toNamedScopeBind(scope)
      });

      return rows
        .filter((row) => typeof row.id === 'string' && typeof row.mutation_json === 'string')
        .map((row) => ({
          id: row.id as string,
          scope,
          mutationJson: row.mutation_json as string
        }));
    },

    async putMutationRecord(record) {
      const readyPromiser = requirePromiser(promiser);
      const createdAt = extractCreatedAt(record.mutationJson);
      await execSql(
        readyPromiser,
        `
          INSERT INTO local_mutations (id, user_id, calendar_id, week_start, mutation_json, created_at)
          VALUES (:id, :userId, :calendarId, :weekStart, :mutationJson, :createdAt)
          ON CONFLICT(id)
          DO UPDATE SET
            user_id = excluded.user_id,
            calendar_id = excluded.calendar_id,
            week_start = excluded.week_start,
            mutation_json = excluded.mutation_json,
            created_at = excluded.created_at
        `,
        {
          ':id': record.id,
          ...toNamedScopeBind(record.scope),
          ':mutationJson': record.mutationJson,
          ':createdAt': createdAt
        }
      );
    },

    async clearMutationRecords(scope) {
      const readyPromiser = requirePromiser(promiser);
      await execSql(
        readyPromiser,
        `DELETE FROM local_mutations WHERE user_id = :userId AND calendar_id = :calendarId AND week_start = :weekStart`,
        toNamedScopeBind(scope)
      );
    }
  };
}

function createMemoryRepositoryDriver(options: {
  storage: StorageLike;
  storageKey: string;
}): RepositoryDriver {
  return {
    engine: 'memory',

    async open() {
      const store = readMemoryStore(options.storage, options.storageKey);
      writeMemoryStore(options.storage, options.storageKey, store);

      return {
        status: 'ready',
        engine: 'memory',
        persistence: 'shared-memory',
        database: options.storageKey,
        sqliteVersion: null
      };
    },

    async close() {
      // shared in-memory storage stays available across repository instances in tests
    },

    async getWeekRecord(scope) {
      const store = readMemoryStore(options.storage, options.storageKey);
      const snapshotJson = store.weekSnapshots[scopeKey(scope)] ?? null;
      return snapshotJson
        ? {
            scope,
            snapshotJson
          }
        : null;
    },

    async putWeekRecord(record) {
      const store = readMemoryStore(options.storage, options.storageKey);
      store.weekSnapshots[scopeKey(record.scope)] = record.snapshotJson;
      writeMemoryStore(options.storage, options.storageKey, store);
    },

    async deleteWeekRecord(scope) {
      const store = readMemoryStore(options.storage, options.storageKey);
      delete store.weekSnapshots[scopeKey(scope)];
      writeMemoryStore(options.storage, options.storageKey, store);
    },

    async listMutationRecords(scope) {
      const store = readMemoryStore(options.storage, options.storageKey);
      const prefix = `${scopeKey(scope)}::`;
      return Object.entries(store.localMutations)
        .filter(([key]) => key.startsWith(prefix))
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, mutationJson]) => ({
          id: key.slice(prefix.length),
          scope,
          mutationJson
        }));
    },

    async putMutationRecord(record) {
      const store = readMemoryStore(options.storage, options.storageKey);
      store.localMutations[mutationKey(record.scope, record.id)] = record.mutationJson;
      writeMemoryStore(options.storage, options.storageKey, store);
    },

    async clearMutationRecords(scope) {
      const store = readMemoryStore(options.storage, options.storageKey);
      const prefix = `${scopeKey(scope)}::`;
      for (const key of Object.keys(store.localMutations)) {
        if (key.startsWith(prefix)) {
          delete store.localMutations[key];
        }
      }
      writeMemoryStore(options.storage, options.storageKey, store);
    }
  };
}

async function execSql(promiser: Worker1Promiser, sql: string, bind?: Record<string, SqlValue>) {
  await promiser('exec', {
    sql,
    bind
  });
}

async function execRows(
  promiser: Worker1Promiser,
  params: {
    sql: string;
    bind?: Record<string, SqlValue>;
  }
): Promise<Array<Record<string, SqlValue>>> {
  const resultRows: Array<Record<string, SqlValue>> = [];
  await promiser('exec', {
    sql: params.sql,
    bind: params.bind,
    rowMode: 'object',
    resultRows,
    returnValue: 'resultRows'
  });
  return resultRows;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, detail: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new RepositoryOpenTimeoutError(detail)), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function classifyDriverOpenError(error: unknown, engine: 'sqlite-worker' | 'memory'): OfflineRepositoryState {
  if (error instanceof RepositoryOpenTimeoutError) {
    return {
      status: 'unavailable',
      engine,
      reason: 'repository-open-timeout',
      detail: error.message
    };
  }

  const detail = error instanceof Error ? error.message : 'Unknown repository bootstrap failure.';
  return {
    status: 'unavailable',
    engine,
    reason: 'repository-open-failed',
    detail
  };
}

function unavailableWeekResult(state: OfflineRepositoryState | null): OfflineWeekSnapshotReadResult {
  return {
    status: 'unavailable',
    reason: 'repository-unavailable',
    detail: state?.status === 'unavailable' ? state.detail : 'The offline repository is unavailable.'
  };
}

function unavailableMutationResult(state: OfflineRepositoryState | null): OfflineMutationReadResult {
  return {
    status: 'unavailable',
    reason: 'repository-unavailable',
    detail: state?.status === 'unavailable' ? state.detail : 'The offline repository is unavailable.'
  };
}

function unavailableWriteResult(state: OfflineRepositoryState | null): OfflineRepositoryWriteResult {
  return {
    ok: false,
    reason: 'repository-unavailable',
    detail: state?.status === 'unavailable' ? state.detail : 'The offline repository is unavailable.'
  };
}

function invalidWrite(
  reason: Extract<OfflineRepositoryWriteResult, { ok: false }>['reason'],
  detail: string
): OfflineRepositoryWriteResult {
  return {
    ok: false,
    reason,
    detail
  };
}

function requirePromiser(promiser: Worker1Promiser | null): Worker1Promiser {
  if (!promiser) {
    throw new Error('The SQLite worker repository was used before initialization completed.');
  }

  return promiser;
}

function readMemoryStore(storage: StorageLike, storageKey: string): MemoryStore {
  const raw = storage.getItem(storageKey);
  if (!raw) {
    return createEmptyMemoryStore();
  }

  try {
    const parsed = JSON.parse(raw);
    if (isMemoryStore(parsed)) {
      return parsed;
    }
  } catch {
    // fall through to reset the corrupt in-memory store shape for later explicit malformed row tests
  }

  return createEmptyMemoryStore();
}

function writeMemoryStore(storage: StorageLike, storageKey: string, store: MemoryStore) {
  storage.setItem(storageKey, JSON.stringify(store));
}

type MemoryStore = {
  weekSnapshots: Record<string, string>;
  localMutations: Record<string, string>;
};

function createEmptyMemoryStore(): MemoryStore {
  return {
    weekSnapshots: {},
    localMutations: {}
  };
}

function isMemoryStore(value: unknown): value is MemoryStore {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<MemoryStore>;
  return isStringRecord(candidate.weekSnapshots) && isStringRecord(candidate.localMutations);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.values(value as Record<string, unknown>).every((entry) => typeof entry === 'string')
  );
}

function extractCreatedAt(mutationJson: string): string {
  try {
    const parsed = JSON.parse(mutationJson);
    if (isOfflineScheduleMutationRecord(parsed)) {
      return parsed.createdAt;
    }
  } catch {
    // store a deterministic fallback and let read-time validation fail closed later
  }

  return new Date(0).toISOString();
}

function toNamedScopeBind(scope: OfflineScheduleScope): Record<string, SqlValue> {
  return {
    ':userId': scope.userId,
    ':calendarId': scope.calendarId,
    ':weekStart': scope.weekStart
  };
}

function scopeKey(scope: OfflineScheduleScope): string {
  return `${scope.userId}::${scope.calendarId}::${scope.weekStart}`;
}

function mutationKey(scope: OfflineScheduleScope, id: string): string {
  return `${scopeKey(scope)}::${id}`;
}

function scopesMatch(left: OfflineScheduleScope, right: OfflineScheduleScope): boolean {
  return left.userId === right.userId && left.calendarId === right.calendarId && left.weekStart === right.weekStart;
}

export function isOfflineScheduleWeekSnapshot(value: unknown): value is OfflineScheduleWeekSnapshot {
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

export function isOfflineScheduleMutationRecord(value: unknown): value is OfflineScheduleMutationRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<OfflineScheduleMutationRecord>;
  return (
    isNonEmptyString(candidate.id) &&
    isOfflineScheduleScope(candidate.scope) &&
    (candidate.action === 'create' ||
      candidate.action === 'edit' ||
      candidate.action === 'move' ||
      candidate.action === 'delete') &&
    (candidate.shiftId === null || typeof candidate.shiftId === 'string') &&
    isPlainObject(candidate.payload) &&
    isIsoTimestamp(candidate.createdAt)
  );
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

function isVisibleWeek(value: unknown): value is VisibleWeek {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<VisibleWeek>;
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(candidate.start ?? '') &&
    /^\d{4}-\d{2}-\d{2}$/.test(candidate.endExclusive ?? '') &&
    isIsoTimestamp(candidate.startAt) &&
    isIsoTimestamp(candidate.endAt) &&
    (candidate.requestedStart === null || typeof candidate.requestedStart === 'string') &&
    (candidate.source === 'query' || candidate.source === 'default' || candidate.source === 'fallback-invalid') &&
    (candidate.reason === null || candidate.reason === 'VISIBLE_WEEK_START_INVALID') &&
    Array.isArray(candidate.dayKeys) &&
    candidate.dayKeys.length === 7 &&
    candidate.dayKeys.every((dayKey) => /^\d{4}-\d{2}-\d{2}$/.test(dayKey))
  );
}

function isCalendarShift(value: unknown): value is CalendarShift {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<CalendarShift>;
  return (
    isNonEmptyString(candidate.id) &&
    isNonEmptyString(candidate.calendarId) &&
    (candidate.seriesId === null || typeof candidate.seriesId === 'string') &&
    isNonEmptyString(candidate.title) &&
    isIsoTimestamp(candidate.startAt) &&
    isIsoTimestamp(candidate.endAt) &&
    (candidate.occurrenceIndex === null || typeof candidate.occurrenceIndex === 'number') &&
    (candidate.sourceKind === 'single' || candidate.sourceKind === 'series')
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isIsoTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

class RepositoryOpenTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RepositoryOpenTimeoutError';
  }
}
