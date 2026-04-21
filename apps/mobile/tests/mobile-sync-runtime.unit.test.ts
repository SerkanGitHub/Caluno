import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOfflineMutationQueue } from '@repo/caluno-core/offline/mutation-queue';
import type { CalendarControllerServerOutcome } from '@repo/caluno-core/offline/sync-engine';
import type { OfflineScheduleRepository, OfflineScheduleScope } from '@repo/caluno-core/offline/types';
import type { CalendarScheduleView } from '@repo/caluno-core/schedule/types';
import {
  createMobileOfflineRepository,
  type MobileOfflineStorage
} from '../src/lib/offline/repository';
import { createMobileCalendarController } from '../src/lib/offline/controller';
import {
  getOrCreateMobileOfflineRuntime,
  resetMobileOfflineRuntimeRegistryForTests,
  type MobileOfflineRuntime
} from '../src/lib/offline/runtime';
import type { MobileNetworkAdapter, MobileNetworkStatus } from '../src/lib/offline/network';
import type { MobileAppLifecycleAdapter, MobileAppLifecycleEvent } from '../src/lib/offline/app-lifecycle';
import type { MobileTrustedScheduleTransport } from '../src/lib/offline/transport';

afterEach(async () => {
  await resetMobileOfflineRuntimeRegistryForTests();
});

function createAsyncStorage() {
  const values = new Map<string, string>();
  const storage: MobileOfflineStorage = {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    remove: vi.fn(async (key: string) => {
      values.delete(key);
    }),
    keys: vi.fn(async () => Array.from(values.keys()))
  };

  return { storage, values };
}

function createScope(): OfflineScheduleScope {
  return {
    userId: 'user-mobile',
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

function createCreateFormData(title = 'Offline prep'): FormData {
  const formData = new FormData();
  formData.set('title', title);
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

class FakeNetworkAdapter implements MobileNetworkAdapter {
  private listeners = new Set<(status: MobileNetworkStatus) => void | Promise<void>>();

  constructor(private current: MobileNetworkStatus) {}

  async getCurrentStatus() {
    return this.current;
  }

  async subscribe(listener: (status: MobileNetworkStatus) => void | Promise<void>) {
    this.listeners.add(listener);
    return async () => {
      this.listeners.delete(listener);
    };
  }

  async emit(status: MobileNetworkStatus) {
    this.current = status;
    await Promise.all(Array.from(this.listeners).map((listener) => listener(status)));
  }
}

class FakeLifecycleAdapter implements MobileAppLifecycleAdapter {
  private listeners = new Set<(event: MobileAppLifecycleEvent) => void | Promise<void>>();

  async subscribe(listener: (event: MobileAppLifecycleEvent) => void | Promise<void>) {
    this.listeners.add(listener);
    return async () => {
      this.listeners.delete(listener);
    };
  }

  async emit(event: MobileAppLifecycleEvent) {
    await Promise.all(Array.from(this.listeners).map((listener) => listener(event)));
  }
}

describe('mobile sync runtime', () => {
  it('persists a local create across controller reopen and keeps queue diagnostics visible', async () => {
    const { storage } = createAsyncStorage();
    const scope = createScope();

    const firstRepository = createMobileOfflineRepository({ storage });
    const firstQueue = createOfflineMutationQueue({ repository: firstRepository });
    const firstController = createMobileCalendarController({
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

    const reopenedRepository = createMobileOfflineRepository({ storage });
    const reopenedQueue = createOfflineMutationQueue({ repository: reopenedRepository });
    const reopenedController = createMobileCalendarController({
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
    const { storage, values } = createAsyncStorage();
    const scope = createScope();

    values.set(
      `caluno.mobile.mutation-queue.v1:${scope.userId}:${scope.calendarId}:${scope.weekStart}`,
      JSON.stringify([
        {
          id: 'mutation-1',
          scope,
          action: 'create',
          shiftId: null,
          createdAt: '2026-04-15T10:00:00.000Z',
          payload: {}
        }
      ])
    );

    const repository = createMobileOfflineRepository({ storage });
    const queue = createOfflineMutationQueue({ repository });
    const controller = createMobileCalendarController({
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
        persistence: 'persistent',
        database: 'failing-memory',
        sqliteVersion: null
      }),
      inspect: () => null,
      getWeekSnapshot: async () => ({ status: 'missing', reason: 'snapshot-missing' }),
      putWeekSnapshot: async () => ({
        ok: false,
        reason: 'repository-unavailable',
        detail: 'The mobile-local snapshot write failed.'
      }),
      deleteWeekSnapshot: async () => ({ ok: true }),
      listLocalMutations: async () => ({ status: 'available', mutations: [] }),
      putLocalMutation: async () => ({ ok: true }),
      deleteLocalMutation: async () => ({ ok: true }),
      clearLocalMutations: async () => ({ ok: true }),
      close: async () => {}
    };

    const controller = createMobileCalendarController({
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
      detail: 'The mobile-local snapshot write failed.'
    });
    expect(state.queueLength).toBe(0);
  });

  it('keeps timed-out immediate mobile writes in a retryable local state', async () => {
    const { storage } = createAsyncStorage();
    const scope = createScope();
    const network = new FakeNetworkAdapter({ connected: true, source: 'navigator' });
    const lifecycle = new FakeLifecycleAdapter();

    const timeoutTransport: MobileTrustedScheduleTransport = {
      loadWeek: async () => createInitialSchedule(),
      submitAction: async (request) =>
        ({
          type: 'failure',
          state: {
            action: request.action,
            status: 'timeout',
            reason: 'SCHEDULE_MOVE_TIMEOUT',
            message: 'The reconnect drain timed out before the trusted action confirmed the queued change.',
            visibleWeekStart: request.visibleWeekStart,
            shiftId: request.shiftId,
            seriesId: null,
            affectedShiftIds: [],
            fields: request.fields
          }
        }) satisfies CalendarControllerServerOutcome
    };

    const runtime = getOrCreateMobileOfflineRuntime({
      scope,
      initialSchedule: createInitialSchedule(),
      routeMode: 'trusted-online',
      repository: createMobileOfflineRepository({ storage }),
      transport: timeoutTransport,
      network,
      lifecycle
    });

    await runtime.initialize();
    const result = await runtime.submitMutation({
      action: 'move',
      formId: 'move:shift-alpha',
      formData: createMoveFormData()
    });

    const state = runtime.getState();
    expect(result.submittedOnline).toBe(true);
    expect(state.queueLength).toBe(1);
    expect(state.retryableQueueLength).toBe(1);
    expect(state.lastRetryableFailure).toEqual({
      reason: 'SCHEDULE_MOVE_TIMEOUT',
      detail: 'The reconnect drain timed out before the trusted action confirmed the queued change.'
    });
    expect(state.actionStates[0]).toMatchObject({
      status: 'timeout',
      reason: 'SCHEDULE_MOVE_TIMEOUT'
    });
    expect(state.shiftDiagnostics['shift-alpha']).toEqual([{ label: 'Retry needed', tone: 'danger' }]);
  });

  it('stops reconnect drain on the first retryable failure and preserves later queued entries in order', async () => {
    const { storage } = createAsyncStorage();
    const scope = createScope();
    const network = new FakeNetworkAdapter({ connected: false, source: 'navigator' });
    const lifecycle = new FakeLifecycleAdapter();

    const submittedTitles: string[] = [];
    let submitCount = 0;
    let nowTick = 0;

    const transport: MobileTrustedScheduleTransport = {
      loadWeek: async () => createInitialSchedule(),
      submitAction: async (request) => {
        submitCount += 1;
        submittedTitles.push(request.fields.title);

        return {
          type: 'failure',
          state: {
            action: request.action,
            status: 'timeout',
            reason: 'SCHEDULE_CREATE_TIMEOUT',
            message: 'The reconnect drain timed out before the trusted action confirmed the queued change.',
            visibleWeekStart: request.visibleWeekStart,
            shiftId: request.shiftId,
            seriesId: null,
            affectedShiftIds: [],
            fields: request.fields
          }
        } satisfies CalendarControllerServerOutcome;
      }
    };

    const runtime = getOrCreateMobileOfflineRuntime({
      scope,
      initialSchedule: createInitialSchedule(),
      routeMode: 'cached-offline',
      repository: createMobileOfflineRepository({ storage }),
      transport,
      network,
      lifecycle,
      now: () => new Date(Date.UTC(2026, 3, 20, 9, 0, nowTick++))
    });

    await runtime.initialize();
    await runtime.submitMutation({
      action: 'create',
      formId: 'create:first',
      formData: createCreateFormData('First offline prep')
    });
    await runtime.submitMutation({
      action: 'create',
      formId: 'create:second',
      formData: createCreateFormData('Second offline prep')
    });

    expect(runtime.getState().queueLength).toBe(2);
    expect(runtime.getState().pendingQueueLength).toBe(2);

    await network.emit({ connected: true, source: 'capacitor-network' });

    const state = runtime.getState();
    expect(submitCount).toBe(1);
    expect(submittedTitles).toEqual(['First offline prep']);
    expect(state.queueLength).toBe(2);
    expect(state.pendingQueueLength).toBe(1);
    expect(state.retryableQueueLength).toBe(1);
    expect(state.syncPhase).toBe('paused-retryable');
    expect(state.lastSyncError).toEqual({
      reason: 'SCHEDULE_CREATE_TIMEOUT',
      detail: 'The reconnect drain timed out before the trusted action confirmed the queued change.'
    });

    const queueInspection = runtime.getController().inspectQueue();
    expect(queueInspection.entries.map((entry) => ({ title: entry.payload.fields.title, syncState: entry.syncState }))).toEqual([
      { title: 'First offline prep', syncState: 'retryable' },
      { title: 'Second offline prep', syncState: 'pending-server' }
    ]);
  });

  it('rejects malformed local drafts without mutating the queued week state', async () => {
    const { storage } = createAsyncStorage();
    const scope = createScope();
    const repository = createMobileOfflineRepository({ storage });
    const controller = createMobileCalendarController({
      scope,
      initialSchedule: createInitialSchedule(),
      routeMode: 'cached-offline',
      repository,
      queue: createOfflineMutationQueue({ repository }),
      isOnline: () => false
    });

    await controller.initialize();

    const invalidCreate = new FormData();
    invalidCreate.set('title', '   ');
    invalidCreate.set('startAt', '2026-04-21T09:00');
    invalidCreate.set('endAt', '2026-04-21T11:00');
    invalidCreate.set('recurrenceCadence', 'weekly');
    invalidCreate.set('recurrenceInterval', '1');
    invalidCreate.set('repeatCount', '');
    invalidCreate.set('repeatUntil', '');

    const invalidMove = new FormData();
    invalidMove.set('shiftId', 'shift-alpha');
    invalidMove.set('title', 'Alpha opening sweep');
    invalidMove.set('startAt', '2026-04-20T11:00');
    invalidMove.set('endAt', '2026-04-20T10:00');

    const createResult = await controller.beginMutation({
      action: 'create',
      formId: 'create:invalid',
      formData: invalidCreate
    });
    const moveResult = await controller.beginMutation({
      action: 'move',
      formId: 'move:invalid-range',
      formData: invalidMove
    });

    const state = controller.getState();
    expect(createResult).toEqual({ submitOnline: false, operationId: null });
    expect(moveResult).toEqual({ submitOnline: false, operationId: null });
    expect(state.schedule.totalShifts).toBe(1);
    expect(state.queueLength).toBe(0);
    expect(state.pendingQueueLength).toBe(0);
    expect(state.retryableQueueLength).toBe(0);
    expect(state.actionStates.slice(0, 2)).toMatchObject([
      {
        formId: 'move:invalid-range',
        status: 'validation-error',
        reason: 'VISIBLE_RANGE_INVALID'
      },
      {
        formId: 'create:invalid',
        status: 'validation-error',
        reason: 'TITLE_REQUIRED'
      }
    ]);
  });

  it('serializes reconnect drain across duplicate online and resume events and reuses the same scoped runtime singleton', async () => {
    const { storage } = createAsyncStorage();
    const scope = createScope();
    const network = new FakeNetworkAdapter({ connected: false, source: 'navigator' });
    const lifecycle = new FakeLifecycleAdapter();

    let resolveDrain: (() => void) | undefined;
    let submitCount = 0;
    const drainPromise = new Promise<void>((resolve) => {
      resolveDrain = resolve;
    });

    const transport: MobileTrustedScheduleTransport = {
      loadWeek: async () => createInitialSchedule(),
      submitAction: async (request) => {
        submitCount += 1;
        await drainPromise;
        return {
          type: 'success',
          state: {
            action: request.action,
            status: 'success',
            reason: 'SHIFT_CREATED',
            message: 'The trusted mobile write path confirmed the local-first change.',
            visibleWeekStart: request.visibleWeekStart,
            shiftId: 'server-shift-1',
            seriesId: null,
            affectedShiftIds: ['server-shift-1'],
            fields: request.fields
          }
        } satisfies CalendarControllerServerOutcome;
      }
    };

    const runtimeA = getOrCreateMobileOfflineRuntime({
      scope,
      initialSchedule: createInitialSchedule(),
      routeMode: 'cached-offline',
      repository: createMobileOfflineRepository({ storage }),
      transport,
      network,
      lifecycle
    });
    const runtimeB = getOrCreateMobileOfflineRuntime({
      scope,
      initialSchedule: createInitialSchedule(),
      routeMode: 'cached-offline',
      repository: createMobileOfflineRepository({ storage }),
      transport,
      network,
      lifecycle
    });

    expect(runtimeA).toBe(runtimeB);

    await runtimeA.initialize();
    await runtimeA.submitMutation({
      action: 'create',
      formId: 'create:week',
      formData: createCreateFormData()
    });

    expect(runtimeA.getState().queueLength).toBe(1);
    expect(runtimeA.getState().pendingQueueLength).toBe(1);

    const firstDrain = network.emit({ connected: true, source: 'capacitor-network' });
    const secondDrain = lifecycle.emit('resume');
    const thirdDrain = network.emit({ connected: true, source: 'capacitor-network' });

    await Promise.resolve();
    expect(submitCount).toBe(1);

    resolveDrain?.();
    await Promise.all([firstDrain, secondDrain, thirdDrain]);

    const state = runtimeA.getState();
    expect(submitCount).toBe(1);
    expect(state.queueLength).toBe(0);
    expect(state.pendingQueueLength).toBe(0);
    expect(state.retryableQueueLength).toBe(0);
    expect(state.syncPhase).toBe('idle');
    expect(state.boardSource).toBe('server-sync');
  });
});
