import { describe, expect, it } from 'vitest';
import { createCalendarController } from '../../src/lib/offline/calendar-controller';
import {
  drainReconnectQueue,
  type CalendarControllerServerOutcome
} from '@repo/caluno-core/offline/sync-engine';
import { createOfflineMutationQueue } from '@repo/caluno-core/offline/mutation-queue';
import {
  OFFLINE_REPOSITORY_MEMORY_STORAGE_KEY,
  createMemoryScheduleRepository,
  type OfflineScheduleRepository,
  type OfflineScheduleScope
} from '../../src/lib/offline/repository';
import type { StorageLike } from '../../src/lib/offline/app-shell-cache';
import type { CalendarScheduleView } from '../../src/lib/server/schedule';

function createStorage(): StorageLike {
  const values = new Map<string, string>();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

function createScope(): OfflineScheduleScope {
  return {
    userId: 'user-1',
    calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
    weekStart: '2026-04-20'
  };
}

function createInitialSchedule(): CalendarScheduleView {
  return {
    status: 'ready',
    reason: null,
    message: 'The requested visible week resolved successfully.',
    visibleWeek: {
      start: '2026-04-20',
      endExclusive: '2026-04-27',
      startAt: '2026-04-20T00:00:00.000Z',
      endAt: '2026-04-27T00:00:00.000Z',
      requestedStart: '2026-04-20',
      source: 'query',
      reason: null,
      dayKeys: ['2026-04-20', '2026-04-21', '2026-04-22', '2026-04-23', '2026-04-24', '2026-04-25', '2026-04-26']
    },
    days: [
      {
        dayKey: '2026-04-20',
        label: 'Mon, Apr 20',
        shifts: [
          {
            id: 'shift-alpha',
            calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
            seriesId: null,
            title: 'Alpha opening sweep',
            startAt: '2026-04-20T08:30:00.000Z',
            endAt: '2026-04-20T09:00:00.000Z',
            occurrenceIndex: null,
            sourceKind: 'single'
          }
        ]
      },
      { dayKey: '2026-04-21', label: 'Tue, Apr 21', shifts: [] },
      { dayKey: '2026-04-22', label: 'Wed, Apr 22', shifts: [] },
      { dayKey: '2026-04-23', label: 'Thu, Apr 23', shifts: [] },
      { dayKey: '2026-04-24', label: 'Fri, Apr 24', shifts: [] },
      { dayKey: '2026-04-25', label: 'Sat, Apr 25', shifts: [] },
      { dayKey: '2026-04-26', label: 'Sun, Apr 26', shifts: [] }
    ],
    totalShifts: 1,
    shiftIds: ['shift-alpha']
  };
}

function cloneSchedule<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createTrustedSchedule(options: {
  includeAlpha?: boolean;
  includeGamma?: boolean;
} = {}): CalendarScheduleView {
  const schedule = cloneSchedule(createInitialSchedule());
  const includeAlpha = options.includeAlpha ?? true;
  const includeGamma = options.includeGamma ?? false;

  schedule.days = schedule.days.map((day) => ({ ...day, shifts: [] }));

  if (includeAlpha) {
    schedule.days[0]?.shifts.push({
      id: 'shift-alpha',
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      seriesId: null,
      title: 'Alpha opening sweep',
      startAt: '2026-04-20T08:30:00.000Z',
      endAt: '2026-04-20T09:00:00.000Z',
      occurrenceIndex: null,
      sourceKind: 'single'
    });
  }

  if (includeGamma) {
    schedule.days[3]?.shifts.push({
      id: 'shift-gamma',
      calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
      seriesId: null,
      title: 'Gamma inventory handoff',
      startAt: '2026-04-23T14:00:00.000Z',
      endAt: '2026-04-23T15:00:00.000Z',
      occurrenceIndex: null,
      sourceKind: 'single'
    });
  }

  const shifts = schedule.days.flatMap((day) => day.shifts);
  schedule.totalShifts = shifts.length;
  schedule.shiftIds = shifts.map((shift) => shift.id);
  schedule.message = 'The trusted visible week refreshed successfully.';
  return schedule;
}

function createCreateFormData(): FormData {
  const formData = new FormData();
  formData.set('title', 'Offline prep');
  formData.set('startAt', '2026-04-21T09:00');
  formData.set('endAt', '2026-04-21T11:00');
  formData.set('recurrenceCadence', '');
  formData.set('recurrenceInterval', '');
  formData.set('repeatCount', '');
  formData.set('repeatUntil', '');
  return formData;
}

function createMoveFormData(): FormData {
  const formData = new FormData();
  formData.set('shiftId', 'shift-alpha');
  formData.set('title', 'Alpha opening sweep');
  formData.set('startAt', '2026-04-20T10:00');
  formData.set('endAt', '2026-04-20T11:00');
  return formData;
}

function createDeleteFormData(): FormData {
  const formData = new FormData();
  formData.set('shiftId', 'shift-alpha');
  formData.set('title', 'Alpha opening sweep');
  formData.set('startAt', '2026-04-20T08:30:00.000Z');
  formData.set('endAt', '2026-04-20T09:00:00.000Z');
  return formData;
}

function createReconnectSuccessOutcome(params: {
  action: 'create' | 'edit' | 'move' | 'delete';
  visibleWeekStart: string;
  shiftId: string | null;
  fields: Record<string, string>;
  affectedShiftIds: string[];
}): CalendarControllerServerOutcome {
  return {
    type: 'success',
    state: {
      action: params.action,
      status: 'success',
      reason:
        params.action === 'create'
          ? 'SHIFT_CREATED'
          : params.action === 'edit'
            ? 'SHIFT_UPDATED'
            : params.action === 'move'
              ? 'SHIFT_MOVED'
              : 'SHIFT_DELETED',
      message: 'The trusted server action confirmed the queued reconnect change.',
      visibleWeekStart: params.visibleWeekStart,
      shiftId: params.shiftId,
      seriesId: null,
      affectedShiftIds: params.affectedShiftIds,
      fields: params.fields
    }
  };
}

function createReconnectTimeoutOutcome(params: {
  action: 'create' | 'edit' | 'move' | 'delete';
  visibleWeekStart: string;
  shiftId: string | null;
  fields: Record<string, string>;
}): CalendarControllerServerOutcome {
  return {
    type: 'failure',
    state: {
      action: params.action,
      status: 'timeout',
      reason: `SCHEDULE_${params.action.toUpperCase()}_TIMEOUT`,
      message: 'The reconnect drain timed out before the trusted action confirmed the queued change.',
      visibleWeekStart: params.visibleWeekStart,
      shiftId: params.shiftId,
      seriesId: null,
      affectedShiftIds: [],
      fields: params.fields
    }
  };
}

function createTimeoutOutcome(): CalendarControllerServerOutcome {
  return {
    type: 'failure',
    state: {
      action: 'move',
      status: 'timeout',
      reason: 'SCHEDULE_MOVE_TIMEOUT',
      message: 'The server timed out before confirming the local move.',
      visibleWeekStart: '2026-04-20',
      shiftId: 'shift-alpha',
      seriesId: null,
      affectedShiftIds: [],
      fields: {
        shiftId: 'shift-alpha',
        title: 'Alpha opening sweep',
        startAt: '2026-04-20T10:00',
        endAt: '2026-04-20T11:00'
      }
    }
  };
}

describe('offline mutation queue and calendar controller', () => {
  it('persists a local create across controller reopen and keeps queue diagnostics visible', async () => {
    const storage = createStorage();
    const scope = createScope();

    const firstRepository = createMemoryScheduleRepository({ storage });
    const firstQueue = createOfflineMutationQueue({ repository: firstRepository });
    const firstController = createCalendarController({
      scope,
      initialSchedule: createInitialSchedule(),
      routeMode: 'cached-offline',
      repository: firstRepository,
      queue: firstQueue,
      isOnline: () => false
    });

    await firstController.initialize();
    const firstMutation = await firstController.beginMutation({
      action: 'create',
      formId: 'create:week',
      formData: createCreateFormData()
    });

    expect(firstMutation.submitOnline).toBe(false);

    const firstState = firstController.getState();
    const localShiftId = firstState.schedule.shiftIds.find((shiftId) => shiftId.startsWith('local-'));

    expect(firstState.schedule.totalShifts).toBe(2);
    expect(firstState.boardSource).toBe('cached-local');
    expect(firstState.queueLength).toBe(1);
    expect(firstState.pendingQueueLength).toBe(1);
    expect(localShiftId).toBeTruthy();
    expect(firstState.shiftDiagnostics[localShiftId as string]).toEqual([
      { label: 'Local only', tone: 'warning' },
      { label: 'Pending sync', tone: 'warning' }
    ]);

    await firstController.destroy();

    const reopenedRepository = createMemoryScheduleRepository({ storage });
    const reopenedQueue = createOfflineMutationQueue({ repository: reopenedRepository });
    const reopenedController = createCalendarController({
      scope,
      initialSchedule: createInitialSchedule(),
      routeMode: 'cached-offline',
      repository: reopenedRepository,
      queue: reopenedQueue,
      isOnline: () => false
    });

    await reopenedController.initialize();
    const reopenedState = reopenedController.getState();

    expect(reopenedState.schedule.totalShifts).toBe(2);
    expect(reopenedState.queueLength).toBe(1);
    expect(reopenedState.pendingQueueLength).toBe(1);
    expect(reopenedState.schedule.shiftIds).toContain(localShiftId as string);
    expect(reopenedState.shiftDiagnostics[localShiftId as string]).toEqual([
      { label: 'Local only', tone: 'warning' },
      { label: 'Pending sync', tone: 'warning' }
    ]);
  });

  it('surfaces malformed queued mutations instead of replaying guessed retry state', async () => {
    const storage = createStorage();
    const scope = createScope();

    storage.setItem(
      OFFLINE_REPOSITORY_MEMORY_STORAGE_KEY,
      JSON.stringify({
        weekSnapshots: {},
        localMutations: {
          [`${scope.userId}::${scope.calendarId}::${scope.weekStart}::mutation-1`]: JSON.stringify({
            id: 'mutation-1',
            scope,
            action: 'create',
            shiftId: null,
            createdAt: '2026-04-15T10:00:00.000Z',
            payload: {}
          })
        }
      })
    );

    const repository = createMemoryScheduleRepository({ storage });
    const queue = createOfflineMutationQueue({ repository });
    const controller = createCalendarController({
      scope,
      initialSchedule: createInitialSchedule(),
      routeMode: 'cached-offline',
      repository,
      queue,
      isOnline: () => false
    });

    await controller.initialize();
    const state = controller.getState();

    expect(state.queueState).toBe('malformed');
    expect(state.queueReason).toBe('queue-entry-invalid');
    expect(state.lastFailure).toEqual({
      reason: 'QUEUE_ENTRY_INVALID',
      detail:
        'A stored offline mutation queue entry failed contract validation, so retry state was withheld instead of replaying guessed sync work.'
    });
    expect(state.schedule.totalShifts).toBe(1);
    expect(state.queueLength).toBe(0);
  });

  it('marks local persistence failures explicitly without pretending the queue is current', async () => {
    const scope = createScope();

    const failingRepository: OfflineScheduleRepository = {
      initialize: async () => ({
        status: 'ready',
        engine: 'memory',
        persistence: 'shared-memory',
        database: 'failing-memory',
        sqliteVersion: null
      }),
      inspect: () => null,
      getWeekSnapshot: async () => ({ status: 'missing', reason: 'snapshot-missing' }),
      putWeekSnapshot: async () => ({
        ok: false,
        reason: 'repository-unavailable',
        detail: 'The browser-local snapshot write failed.'
      }),
      deleteWeekSnapshot: async () => ({ ok: true }),
      listLocalMutations: async () => ({ status: 'available', mutations: [] }),
      putLocalMutation: async () => ({ ok: true }),
      deleteLocalMutation: async () => ({ ok: true }),
      clearLocalMutations: async () => ({ ok: true }),
      close: async () => {}
    };

    const controller = createCalendarController({
      scope,
      initialSchedule: createInitialSchedule(),
      routeMode: 'cached-offline',
      repository: failingRepository,
      queue: createOfflineMutationQueue({ repository: failingRepository }),
      isOnline: () => false
    });

    await controller.initialize();
    await controller.beginMutation({
      action: 'create',
      formId: 'create:week',
      formData: createCreateFormData()
    });

    const state = controller.getState();
    expect(state.actionStates[0]).toMatchObject({
      status: 'local-write-failed',
      reason: 'LOCAL_PERSISTENCE_FAILED'
    });
    expect(state.lastFailure).toEqual({
      reason: 'REPOSITORY_UNAVAILABLE',
      detail: 'The browser-local snapshot write failed.'
    });
    expect(state.queueLength).toBe(0);
  });

  it('keeps timed-out server reconciliation in a retryable local state', async () => {
    const storage = createStorage();
    const scope = createScope();
    const repository = createMemoryScheduleRepository({ storage });
    const queue = createOfflineMutationQueue({ repository });
    const controller = createCalendarController({
      scope,
      initialSchedule: createInitialSchedule(),
      routeMode: 'trusted-online',
      repository,
      queue,
      isOnline: () => true
    });

    await controller.initialize();
    const beginResult = await controller.beginMutation({
      action: 'move',
      formId: 'move:shift-alpha',
      formData: createMoveFormData()
    });

    expect(beginResult.submitOnline).toBe(true);
    expect(beginResult.operationId).toBeTruthy();

    await controller.finalizeMutation(beginResult.operationId as string, createTimeoutOutcome());
    const state = controller.getState();

    expect(state.queueLength).toBe(1);
    expect(state.retryableQueueLength).toBe(1);
    expect(state.actionStates[0]).toMatchObject({
      status: 'timeout',
      reason: 'SCHEDULE_MOVE_TIMEOUT'
    });
    expect(state.shiftDiagnostics['shift-alpha']).toEqual([{ label: 'Retry needed', tone: 'danger' }]);
  });

  it('replays queued local mutations onto a refreshed trusted week during initialize', async () => {
    const storage = createStorage();
    const scope = createScope();

    const firstRepository = createMemoryScheduleRepository({ storage });
    const firstQueue = createOfflineMutationQueue({ repository: firstRepository });
    const firstController = createCalendarController({
      scope,
      initialSchedule: createInitialSchedule(),
      routeMode: 'cached-offline',
      repository: firstRepository,
      queue: firstQueue,
      isOnline: () => false
    });

    await firstController.initialize();
    await firstController.beginMutation({
      action: 'create',
      formId: 'create:week',
      formData: createCreateFormData()
    });
    await firstController.beginMutation({
      action: 'move',
      formId: 'move:shift-alpha',
      formData: createMoveFormData()
    });
    await firstController.destroy();

    const refreshedRepository = createMemoryScheduleRepository({ storage });
    const refreshedQueue = createOfflineMutationQueue({ repository: refreshedRepository });
    const refreshedController = createCalendarController({
      scope,
      initialSchedule: createTrustedSchedule({ includeAlpha: true, includeGamma: true }),
      routeMode: 'trusted-online',
      repository: refreshedRepository,
      queue: refreshedQueue,
      isOnline: () => true
    });

    await refreshedController.initialize();
    const state = refreshedController.getState();
    const inspection = refreshedController.inspectQueue();

    expect(state.boardSource).toBe('cached-local');
    expect(state.queueLength).toBe(2);
    expect(state.schedule.shiftIds).toHaveLength(3);
    expect(state.schedule.shiftIds[0]).toBe('shift-alpha');
    expect(state.schedule.shiftIds[1]).toMatch(/^local-/);
    expect(state.schedule.shiftIds[2]).toBe('shift-gamma');
    expect(state.schedule.days[0]?.shifts[0]).toMatchObject({
      id: 'shift-alpha',
      startAt: '2026-04-20T10:00:00.000Z',
      endAt: '2026-04-20T11:00:00.000Z'
    });
    expect(state.schedule.days[3]?.shifts[0]?.id).toBe('shift-gamma');
    expect(state.schedule.message).toContain('pending browser-local changes replayed');
    expect(inspection.queueState).toBe('ready');
    expect(inspection.entries).toHaveLength(2);
  });

  it('drains reconnect work to zero and returns the board to a server-synced state', async () => {
    const storage = createStorage();
    const scope = createScope();

    const firstRepository = createMemoryScheduleRepository({ storage });
    const firstQueue = createOfflineMutationQueue({ repository: firstRepository });
    const firstController = createCalendarController({
      scope,
      initialSchedule: createInitialSchedule(),
      routeMode: 'cached-offline',
      repository: firstRepository,
      queue: firstQueue,
      isOnline: () => false
    });

    await firstController.initialize();
    await firstController.beginMutation({
      action: 'move',
      formId: 'move:shift-alpha',
      formData: createMoveFormData()
    });
    await firstController.destroy();

    const refreshedRepository = createMemoryScheduleRepository({ storage });
    const refreshedQueue = createOfflineMutationQueue({ repository: refreshedRepository });
    const refreshedController = createCalendarController({
      scope,
      initialSchedule: createTrustedSchedule({ includeAlpha: true, includeGamma: true }),
      routeMode: 'trusted-online',
      repository: refreshedRepository,
      queue: refreshedQueue,
      isOnline: () => true
    });

    await refreshedController.initialize();
    const drainStart = refreshedController.beginReconnectDrain();
    const drainResult = await drainReconnectQueue({
      entries: drainStart.entries,
      visibleWeekStart: scope.weekStart,
      submitAction: async (request) =>
        createReconnectSuccessOutcome({
          action: request.action,
          visibleWeekStart: request.visibleWeekStart,
          shiftId: request.shiftId,
          fields: request.fields,
          affectedShiftIds: [request.shiftId ?? 'shift-alpha']
        }),
      onOutcome: async (entry, outcome) => {
        await refreshedController.finalizeMutation(entry.id, outcome);
      }
    });
    refreshedController.completeReconnectDrain({
      ...drainResult,
      attemptedAt: drainStart.attemptedAt
    });

    const state = refreshedController.getState();

    expect(drainResult.status).toBe('drained');
    expect(state.queueLength).toBe(0);
    expect(state.pendingQueueLength).toBe(0);
    expect(state.retryableQueueLength).toBe(0);
    expect(state.boardSource).toBe('server-sync');
    expect(state.syncPhase).toBe('idle');
    expect(state.lastSyncAttemptAt).toBe(drainStart.attemptedAt);
    expect(state.lastSyncError).toBeNull();
    expect(state.schedule.days[0]?.shifts[0]).toMatchObject({
      id: 'shift-alpha',
      startAt: '2026-04-20T10:00:00.000Z',
      endAt: '2026-04-20T11:00:00.000Z'
    });
  });

  it('stops reconnect drain on the first failure and preserves later queued work in order', async () => {
    const storage = createStorage();
    const scope = createScope();
    let nowTick = 0;
    const orderedNow = () => new Date(Date.parse('2026-04-15T10:00:00.000Z') + nowTick++ * 1000);

    const firstRepository = createMemoryScheduleRepository({ storage });
    const firstQueue = createOfflineMutationQueue({ repository: firstRepository });
    const firstController = createCalendarController({
      scope,
      initialSchedule: createInitialSchedule(),
      routeMode: 'cached-offline',
      repository: firstRepository,
      queue: firstQueue,
      isOnline: () => false,
      now: orderedNow
    });

    await firstController.initialize();
    await firstController.beginMutation({
      action: 'create',
      formId: 'create:week',
      formData: createCreateFormData()
    });
    await firstController.beginMutation({
      action: 'move',
      formId: 'move:shift-alpha',
      formData: createMoveFormData()
    });
    await firstController.beginMutation({
      action: 'delete',
      formId: 'delete:shift-alpha',
      formData: createDeleteFormData()
    });
    await firstController.destroy();

    const refreshedRepository = createMemoryScheduleRepository({ storage });
    const refreshedQueue = createOfflineMutationQueue({ repository: refreshedRepository });
    const refreshedController = createCalendarController({
      scope,
      initialSchedule: createTrustedSchedule({ includeAlpha: true, includeGamma: true }),
      routeMode: 'trusted-online',
      repository: refreshedRepository,
      queue: refreshedQueue,
      isOnline: () => true
    });

    await refreshedController.initialize();
    const drainStart = refreshedController.beginReconnectDrain();
    const drainResult = await drainReconnectQueue({
      entries: drainStart.entries,
      visibleWeekStart: scope.weekStart,
      submitAction: async (request) => {
        if (request.action === 'move') {
          return createReconnectTimeoutOutcome({
            action: request.action,
            visibleWeekStart: request.visibleWeekStart,
            shiftId: request.shiftId,
            fields: request.fields
          });
        }

        return createReconnectSuccessOutcome({
          action: request.action,
          visibleWeekStart: request.visibleWeekStart,
          shiftId: request.action === 'create' ? 'server-shift-1' : request.shiftId,
          fields: request.fields,
          affectedShiftIds: request.action === 'create' ? ['server-shift-1'] : [request.shiftId ?? 'shift-alpha']
        });
      },
      onOutcome: async (entry, outcome) => {
        await refreshedController.finalizeMutation(entry.id, outcome);
      }
    });
    refreshedController.completeReconnectDrain({
      ...drainResult,
      attemptedAt: drainStart.attemptedAt
    });

    const state = refreshedController.getState();
    const inspection = refreshedController.inspectQueue();

    expect(drainResult).toMatchObject({
      status: 'stopped',
      attemptedCount: 2,
      succeededCount: 1,
      reason: 'SCHEDULE_MOVE_TIMEOUT'
    });
    expect(state.queueLength).toBe(2);
    expect(state.pendingQueueLength).toBe(1);
    expect(state.retryableQueueLength).toBe(1);
    expect(state.boardSource).toBe('cached-local');
    expect(state.syncPhase).toBe('paused-retryable');
    expect(state.lastSyncAttemptAt).toBe(drainStart.attemptedAt);
    expect(state.lastSyncError).toEqual({
      reason: 'SCHEDULE_MOVE_TIMEOUT',
      detail: 'The reconnect drain timed out before the trusted action confirmed the queued change.'
    });
    expect(inspection.entries.map((entry) => [entry.action, entry.syncState])).toEqual([
      ['move', 'retryable'],
      ['delete', 'pending-server']
    ]);
  });
});
