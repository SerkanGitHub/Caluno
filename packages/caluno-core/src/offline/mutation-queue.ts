import type { CalendarShift } from '../schedule/types';
import type {
  OfflineRepositoryWriteResult,
  OfflineScheduleMutationRecord,
  OfflineScheduleRepository,
  OfflineScheduleScope
} from './types';

export type OfflineMutationSyncState = 'pending-server' | 'retryable';

export type OfflineMutationFields = {
  title: string;
  startAt: string;
  endAt: string;
  recurrenceCadence?: string;
  recurrenceInterval?: string;
  repeatCount?: string;
  repeatUntil?: string;
};

export type OfflineShiftMutationFields = OfflineMutationFields & {
  shiftId: string;
};

export type OfflineCreateMutationPayload = {
  kind: 'create';
  fields: OfflineMutationFields;
  createdShifts: CalendarShift[];
};

export type OfflineEditMutationPayload = {
  kind: 'edit';
  fields: OfflineShiftMutationFields;
  previousShift: CalendarShift;
  nextShift: CalendarShift;
};

export type OfflineMoveMutationPayload = {
  kind: 'move';
  fields: OfflineShiftMutationFields;
  previousShift: CalendarShift;
  nextShift: CalendarShift;
};

export type OfflineDeleteMutationPayload = {
  kind: 'delete';
  fields: OfflineShiftMutationFields;
  deletedShift: CalendarShift;
};

export type OfflineMutationPayload =
  | OfflineCreateMutationPayload
  | OfflineEditMutationPayload
  | OfflineMoveMutationPayload
  | OfflineDeleteMutationPayload;

export type OfflineMutationQueueEntry = {
  id: string;
  scope: OfflineScheduleScope;
  action: 'create' | 'edit' | 'move' | 'delete';
  shiftId: string | null;
  createdAt: string;
  syncState: OfflineMutationSyncState;
  errorReason: string | null;
  errorDetail: string | null;
  payload: OfflineMutationPayload;
};

export type OfflineMutationQueueReadResult =
  | {
      status: 'available';
      entries: OfflineMutationQueueEntry[];
    }
  | {
      status: 'malformed';
      reason: 'queue-entry-invalid';
      detail: string;
    }
  | {
      status: 'unavailable';
      reason: 'repository-unavailable';
      detail: string;
    };

export type OfflineMutationQueueWriteResult =
  | {
      ok: true;
      entry?: OfflineMutationQueueEntry;
    }
  | {
      ok: false;
      reason: 'queue-entry-invalid' | 'repository-unavailable';
      detail: string;
    };

export type OfflineMutationQueue = {
  read: (scope: OfflineScheduleScope) => Promise<OfflineMutationQueueReadResult>;
  enqueue: (entry: OfflineMutationQueueEntry) => Promise<OfflineMutationQueueWriteResult>;
  update: (entry: OfflineMutationQueueEntry) => Promise<OfflineMutationQueueWriteResult>;
  markRetryable: (params: {
    scope: OfflineScheduleScope;
    entryId: string;
    reason: string;
    detail: string;
  }) => Promise<OfflineMutationQueueWriteResult>;
  acknowledge: (scope: OfflineScheduleScope, entryId: string) => Promise<OfflineMutationQueueWriteResult>;
  clear: (scope: OfflineScheduleScope) => Promise<OfflineMutationQueueWriteResult>;
};

export function createOfflineMutationQueue(options: {
  repository: OfflineScheduleRepository;
}): OfflineMutationQueue {
  const { repository } = options;

  return {
    async read(scope) {
      const result = await repository.listLocalMutations(scope);

      if (result.status === 'unavailable') {
        return result;
      }

      if (result.status === 'malformed') {
        return {
          status: 'malformed',
          reason: 'queue-entry-invalid',
          detail: result.detail
        } satisfies OfflineMutationQueueReadResult;
      }

      const entries: OfflineMutationQueueEntry[] = [];
      for (const mutation of result.mutations) {
        const entry = fromRepositoryMutation(mutation);
        if (!entry) {
          return {
            status: 'malformed',
            reason: 'queue-entry-invalid',
            detail:
              'A stored offline mutation queue entry failed contract validation, so retry state was withheld instead of replaying guessed sync work.'
          } satisfies OfflineMutationQueueReadResult;
        }

        entries.push(entry);
      }

      return {
        status: 'available',
        entries: entries.sort(compareQueueEntries)
      };
    },

    async enqueue(entry) {
      return writeQueueEntry(repository.putLocalMutation(toRepositoryMutation(entry)), entry);
    },

    async update(entry) {
      return writeQueueEntry(repository.putLocalMutation(toRepositoryMutation(entry)), entry);
    },

    async markRetryable({ scope, entryId, reason, detail }) {
      const loaded = await this.read(scope);
      if (loaded.status !== 'available') {
        return queueWriteFailure(loaded.reason, loaded.detail);
      }

      const current = loaded.entries.find((entry) => entry.id === entryId);
      if (!current) {
        return queueWriteFailure(
          'queue-entry-invalid',
          'The offline mutation queue entry could not be found for retry state update.'
        );
      }

      const nextEntry: OfflineMutationQueueEntry = {
        ...current,
        syncState: 'retryable',
        errorReason: reason,
        errorDetail: detail
      };

      return this.update(nextEntry);
    },

    async acknowledge(scope, entryId) {
      if (!isOfflineScheduleScope(scope) || !isNonEmptyString(entryId)) {
        return queueWriteFailure('queue-entry-invalid', 'Refused to acknowledge a malformed offline mutation reference.');
      }

      return writeQueueEntry(repository.deleteLocalMutation(scope, entryId));
    },

    async clear(scope) {
      if (!isOfflineScheduleScope(scope)) {
        return queueWriteFailure('queue-entry-invalid', 'Refused to clear a malformed offline mutation scope.');
      }

      return writeQueueEntry(repository.clearLocalMutations(scope));
    }
  };
}

function writeQueueEntry(
  writePromise: Promise<OfflineRepositoryWriteResult>,
  entry?: OfflineMutationQueueEntry
): Promise<OfflineMutationQueueWriteResult> {
  return writePromise.then((result) => {
    if (!result.ok) {
      return queueWriteFailure(
        result.reason === 'mutation-invalid' ? 'queue-entry-invalid' : 'repository-unavailable',
        result.detail
      );
    }

    return entry ? { ok: true, entry } : { ok: true };
  });
}

function queueWriteFailure(
  reason: Extract<OfflineMutationQueueWriteResult, { ok: false }>['reason'],
  detail: string
): OfflineMutationQueueWriteResult {
  return {
    ok: false,
    reason,
    detail
  };
}

function toRepositoryMutation(entry: OfflineMutationQueueEntry): OfflineScheduleMutationRecord {
  return {
    id: entry.id,
    scope: entry.scope,
    action: entry.action,
    shiftId: entry.shiftId,
    createdAt: entry.createdAt,
    payload: {
      syncState: entry.syncState,
      errorReason: entry.errorReason,
      errorDetail: entry.errorDetail,
      payload: entry.payload
    }
  };
}

function fromRepositoryMutation(record: OfflineScheduleMutationRecord): OfflineMutationQueueEntry | null {
  if (!isPlainObject(record.payload)) {
    return null;
  }

  const syncState = record.payload.syncState;
  const errorReason = record.payload.errorReason;
  const errorDetail = record.payload.errorDetail;
  const payload = record.payload.payload;

  if (
    (syncState !== 'pending-server' && syncState !== 'retryable') ||
    (errorReason !== null && typeof errorReason !== 'string') ||
    (errorDetail !== null && typeof errorDetail !== 'string')
  ) {
    return null;
  }

  if (!isOfflineMutationPayload(payload, record.action)) {
    return null;
  }

  return {
    id: record.id,
    scope: record.scope,
    action: record.action,
    shiftId: record.shiftId,
    createdAt: record.createdAt,
    syncState,
    errorReason,
    errorDetail,
    payload
  };
}

function isOfflineMutationPayload(
  value: unknown,
  action: OfflineMutationQueueEntry['action']
): value is OfflineMutationPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.kind !== action) {
    return false;
  }

  switch (action) {
    case 'create':
      return isOfflineMutationFields(candidate.fields) && Array.isArray(candidate.createdShifts) && candidate.createdShifts.every(isCalendarShift);
    case 'edit':
    case 'move':
      return (
        isOfflineShiftMutationFields(candidate.fields) &&
        isCalendarShift(candidate.previousShift) &&
        isCalendarShift(candidate.nextShift)
      );
    case 'delete':
      return isOfflineShiftMutationFields(candidate.fields) && isCalendarShift(candidate.deletedShift);
  }
}

function isOfflineMutationFields(value: unknown): value is OfflineMutationFields {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<OfflineMutationFields>;
  return (
    typeof candidate.title === 'string' &&
    typeof candidate.startAt === 'string' &&
    typeof candidate.endAt === 'string' &&
    (candidate.recurrenceCadence === undefined || typeof candidate.recurrenceCadence === 'string') &&
    (candidate.recurrenceInterval === undefined || typeof candidate.recurrenceInterval === 'string') &&
    (candidate.repeatCount === undefined || typeof candidate.repeatCount === 'string') &&
    (candidate.repeatUntil === undefined || typeof candidate.repeatUntil === 'string')
  );
}

function isOfflineShiftMutationFields(value: unknown): value is OfflineShiftMutationFields {
  if (!isOfflineMutationFields(value)) {
    return false;
  }

  const candidate = value as Partial<OfflineShiftMutationFields>;
  return typeof candidate.shiftId === 'string' && candidate.shiftId.trim().length > 0;
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

function isCalendarShift(value: unknown): value is CalendarShift {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<CalendarShift>;
  return (
    isNonEmptyString(candidate.id) &&
    isNonEmptyString(candidate.calendarId) &&
    typeof candidate.title === 'string' &&
    typeof candidate.startAt === 'string' &&
    typeof candidate.endAt === 'string' &&
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

export function compareQueueEntries(left: OfflineMutationQueueEntry, right: OfflineMutationQueueEntry): number {
  return left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
}
