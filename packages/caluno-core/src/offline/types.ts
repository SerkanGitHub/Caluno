import type { CalendarShift, VisibleWeek } from '../schedule/types';

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
  deleteLocalMutation: (scope: OfflineScheduleScope, mutationId: string) => Promise<OfflineRepositoryWriteResult>;
  clearLocalMutations: (scope: OfflineScheduleScope) => Promise<OfflineRepositoryWriteResult>;
  close: () => Promise<void>;
};
