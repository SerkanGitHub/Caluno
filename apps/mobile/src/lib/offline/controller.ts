import {
  expandShiftOccurrences,
  normalizeShiftDraft,
  normalizeVisibleRange
} from '@repo/caluno-core/schedule/recurrence';
import type {
  CalendarControllerActionState,
  CalendarControllerFailure,
  CalendarControllerSyncPhase,
  CalendarScheduleView,
  CalendarShift,
  CalendarShiftDiagnostic,
  ScheduleValidationFailureReason,
  VisibleWeek
} from '@repo/caluno-core/schedule/types';
import type {
  OfflineRepositoryState,
  OfflineScheduleRepository,
  OfflineScheduleScope,
  OfflineScheduleWeekSnapshot
} from '@repo/caluno-core/offline/types';
import type {
  OfflineMutationFields,
  OfflineMutationPayload,
  OfflineMutationQueue,
  OfflineMutationQueueEntry,
  OfflineMutationQueueReadResult
} from '@repo/caluno-core/offline/mutation-queue';
import {
  buildReconnectActionRequest,
  compareQueueEntries,
  createScheduleViewFromShifts,
  flattenScheduleShifts,
  rebaseTrustedScheduleWithLocalQueue,
  sortScheduleShifts,
  type CalendarControllerServerOutcome,
  type ReconnectDrainActionRequest,
  type ReconnectDrainResult
} from '@repo/caluno-core/offline/sync-engine';

export type MobileOfflineRouteMode = 'trusted-online' | 'cached-offline';

export type MobileCalendarControllerState = {
  schedule: CalendarScheduleView;
  routeMode: MobileOfflineRouteMode;
  network: 'online' | 'offline';
  boardSource: 'server-sync' | 'cached-local';
  queueLength: number;
  pendingQueueLength: number;
  retryableQueueLength: number;
  syncPhase: CalendarControllerSyncPhase;
  lastSyncAttemptAt: string | null;
  lastSyncError: CalendarControllerFailure | null;
  lastRetryableFailure: CalendarControllerFailure | null;
  actionStates: CalendarControllerActionState[];
  shiftDiagnostics: Record<string, CalendarShiftDiagnostic[]>;
  lastFailure: CalendarControllerFailure | null;
  repositoryState: OfflineRepositoryState | null;
  queueState: 'idle' | 'ready' | 'malformed' | 'unavailable';
  queueReason: string | null;
  queueDetail: string | null;
  snapshotStatus: 'idle' | 'ready' | 'failed';
  snapshotAt: string | null;
  snapshotOrigin: OfflineScheduleWeekSnapshot['origin'] | null;
};

export type MobileCalendarControllerQueueInspection = {
  queueState: MobileCalendarControllerState['queueState'];
  queueReason: string | null;
  queueDetail: string | null;
  entries: OfflineMutationQueueEntry[];
};

export type MobileCalendarControllerTrustedScheduleResult =
  | {
      status: 'applied';
      boardSource: MobileCalendarControllerState['boardSource'];
      snapshotOrigin: OfflineScheduleWeekSnapshot['origin'];
      replayedQueueLength: number;
      detail: string;
    }
  | {
      status: 'failed';
      reason: string;
      detail: string;
    };

export type MobileCalendarController = {
  subscribe: (listener: (state: MobileCalendarControllerState) => void) => () => void;
  initialize: () => Promise<void>;
  setNetwork: (isOnline: boolean) => void;
  inspectQueue: () => MobileCalendarControllerQueueInspection;
  ingestTrustedSchedule: (schedule: CalendarScheduleView) => Promise<MobileCalendarControllerTrustedScheduleResult>;
  beginReconnectDrain: () => {
    entries: OfflineMutationQueueEntry[];
    attemptedAt: string;
  };
  completeReconnectDrain: (result: ReconnectDrainResult & { attemptedAt: string }) => void;
  beginMutation: (params: {
    action: 'create' | 'edit' | 'move' | 'delete';
    formId: string;
    formData: FormData;
  }) => Promise<{
    submitOnline: boolean;
    operationId: string | null;
  }>;
  finalizeMutation: (operationId: string, outcome: CalendarControllerServerOutcome) => Promise<void>;
  createImmediateSubmitRequest: (operationId: string) =>
    | {
        ok: true;
        entry: OfflineMutationQueueEntry;
        request: ReconnectDrainActionRequest;
      }
    | {
        ok: false;
        reason: string;
        detail: string;
      };
  getState: () => MobileCalendarControllerState;
  destroy: () => Promise<void>;
};

export function createInitialMobileCalendarControllerState(params: {
  initialSchedule: CalendarScheduleView;
  routeMode: MobileOfflineRouteMode;
  isOnline: boolean;
}): MobileCalendarControllerState {
  return {
    schedule: cloneSchedule(params.initialSchedule),
    routeMode: params.routeMode,
    network: params.isOnline ? 'online' : 'offline',
    boardSource: params.routeMode === 'cached-offline' ? 'cached-local' : 'server-sync',
    queueLength: 0,
    pendingQueueLength: 0,
    retryableQueueLength: 0,
    syncPhase: 'idle',
    lastSyncAttemptAt: null,
    lastSyncError: null,
    lastRetryableFailure: null,
    actionStates: [],
    shiftDiagnostics: {},
    lastFailure: null,
    repositoryState: null,
    queueState: 'idle',
    queueReason: null,
    queueDetail: null,
    snapshotStatus: 'idle',
    snapshotAt: null,
    snapshotOrigin: null
  };
}

export function createMobileCalendarController(options: {
  scope: OfflineScheduleScope;
  initialSchedule: CalendarScheduleView;
  routeMode: MobileOfflineRouteMode;
  repository: OfflineScheduleRepository;
  queue: OfflineMutationQueue;
  isOnline: () => boolean;
  now?: () => Date;
}): MobileCalendarController {
  const now = options.now ?? (() => new Date());
  let queueEntries: OfflineMutationQueueEntry[] = [];
  let state = createInitialMobileCalendarControllerState({
    initialSchedule: options.initialSchedule,
    routeMode: options.routeMode,
    isOnline: options.isOnline()
  });
  const listeners = new Set<(state: MobileCalendarControllerState) => void>();

  function emit() {
    const nextState = {
      ...state,
      schedule: cloneSchedule(state.schedule),
      actionStates: [...state.actionStates].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
      shiftDiagnostics: cloneShiftDiagnostics(state.shiftDiagnostics)
    } satisfies MobileCalendarControllerState;

    state = nextState;
    for (const listener of listeners) {
      listener(nextState);
    }
  }

  function setActionState(nextAction: CalendarControllerActionState) {
    state = {
      ...state,
      actionStates: [nextAction, ...state.actionStates.filter((candidate) => candidate.formId !== nextAction.formId)]
    };
    refreshDiagnostics();
  }

  function setQueueState(result: OfflineMutationQueueReadResult) {
    if (result.status === 'available') {
      state = {
        ...state,
        queueState: 'ready',
        queueReason: null,
        queueDetail: null,
        lastFailure: state.lastFailure?.reason.startsWith('QUEUE_') ? null : state.lastFailure
      };
      return;
    }

    state = {
      ...state,
      queueState: result.status,
      queueReason: result.reason,
      queueDetail: result.detail,
      lastFailure: {
        reason: result.reason.toUpperCase().replace(/-/g, '_'),
        detail: result.detail
      }
    };
  }

  function refreshDiagnostics() {
    const retryable = queueEntries.filter((entry) => entry.syncState === 'retryable');

    state = {
      ...state,
      queueLength: queueEntries.length,
      pendingQueueLength: queueEntries.filter((entry) => entry.syncState === 'pending-server').length,
      retryableQueueLength: retryable.length,
      lastRetryableFailure: retryable[0]
        ? {
            reason: retryable[0].errorReason ?? 'QUEUE_RETRYABLE',
            detail: retryable[0].errorDetail ?? 'A mobile-local mutation needs retry before the queue can drain again.'
          }
        : null,
      shiftDiagnostics: buildShiftDiagnostics(queueEntries, state.actionStates),
      boardSource: queueEntries.length > 0 ? 'cached-local' : state.boardSource
    };
  }

  async function persistSnapshot(schedule: CalendarScheduleView, origin: OfflineScheduleWeekSnapshot['origin']) {
    const cachedAt = now().toISOString();
    const result = await options.repository.putWeekSnapshot({
      scope: options.scope,
      visibleWeek: schedule.visibleWeek,
      shifts: flattenScheduleShifts(schedule),
      cachedAt,
      origin
    });

    if (!result.ok) {
      state = {
        ...state,
        snapshotStatus: 'failed',
        lastFailure: {
          reason: result.reason.toUpperCase().replace(/-/g, '_'),
          detail: result.detail
        }
      };
      return false;
    }

    state = {
      ...state,
      snapshotStatus: 'ready',
      snapshotAt: cachedAt,
      snapshotOrigin: origin
    };

    return true;
  }

  async function applyTrustedSchedule(schedule: CalendarScheduleView): Promise<MobileCalendarControllerTrustedScheduleResult> {
    const replayResult = rebaseTrustedScheduleWithLocalQueue({
      trustedSchedule: schedule,
      queueEntries
    });

    if (!replayResult.ok) {
      state = {
        ...state,
        lastFailure: {
          reason: replayResult.reason,
          detail: replayResult.detail
        }
      };
      refreshDiagnostics();
      emit();
      return {
        status: 'failed',
        reason: replayResult.reason,
        detail: replayResult.detail
      };
    }

    state = {
      ...state,
      schedule: replayResult.schedule,
      boardSource: replayResult.boardSource,
      lastFailure: null
    };
    refreshDiagnostics();
    await persistSnapshot(replayResult.schedule, replayResult.snapshotOrigin);
    emit();

    return {
      status: 'applied',
      boardSource: replayResult.boardSource,
      snapshotOrigin: replayResult.snapshotOrigin,
      replayedQueueLength: replayResult.replayedQueueLength,
      detail: replayResult.detail
    };
  }

  async function markRetryableQueueEntry(entry: OfflineMutationQueueEntry, reason: string, detail: string) {
    const updatedEntry: OfflineMutationQueueEntry = {
      ...entry,
      syncState: 'retryable',
      errorReason: reason,
      errorDetail: detail
    };

    const updateResult = await options.queue.update(updatedEntry);
    if (updateResult.ok) {
      queueEntries = queueEntries.map((candidate) => (candidate.id === updatedEntry.id ? updatedEntry : candidate));
    }

    state = {
      ...state,
      lastFailure: {
        reason,
        detail
      },
      lastRetryableFailure: {
        reason,
        detail
      }
    };
    refreshDiagnostics();
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },

    getState() {
      return state;
    },

    async initialize() {
      const repositoryState = await options.repository.initialize();
      state = {
        ...state,
        repositoryState,
        network: options.isOnline() ? 'online' : 'offline'
      };

      const snapshotResult = await options.repository.getWeekSnapshot(options.scope);
      if (snapshotResult.status === 'available') {
        state = {
          ...state,
          schedule: createScheduleViewFromShifts({
            visibleWeek: snapshotResult.snapshot.visibleWeek,
            shifts: snapshotResult.snapshot.shifts,
            fallback: state.schedule,
            message:
              snapshotResult.snapshot.origin === 'local-write'
                ? 'Showing mobile-local week data with local changes already applied.'
                : snapshotResult.snapshot.origin === 'server-sync'
                  ? state.schedule.message
                  : 'Showing mobile-local week data.'
          }),
          boardSource: snapshotResult.snapshot.origin === 'local-write' ? 'cached-local' : state.boardSource,
          snapshotStatus: 'ready',
          snapshotAt: snapshotResult.snapshot.cachedAt,
          snapshotOrigin: snapshotResult.snapshot.origin
        };
      } else if (snapshotResult.status === 'malformed' || snapshotResult.status === 'unavailable') {
        state = {
          ...state,
          snapshotStatus: 'failed',
          lastFailure: {
            reason: snapshotResult.reason.toUpperCase().replace(/-/g, '_'),
            detail: snapshotResult.detail
          }
        };
      }

      const loadedQueue = await options.queue.read(options.scope);
      setQueueState(loadedQueue);
      if (loadedQueue.status === 'available') {
        queueEntries = loadedQueue.entries;
      }

      refreshDiagnostics();
      emit();

      if (options.routeMode === 'trusted-online' && loadedQueue.status === 'available' && options.initialSchedule.status === 'ready') {
        await applyTrustedSchedule(options.initialSchedule);
      }
    },

    setNetwork(isOnline) {
      state = {
        ...state,
        network: isOnline ? 'online' : 'offline'
      };
      refreshDiagnostics();
      emit();
    },

    inspectQueue() {
      return {
        queueState: state.queueState,
        queueReason: state.queueReason,
        queueDetail: state.queueDetail,
        entries: queueEntries.map((entry) => structuredCloneLike(entry))
      };
    },

    ingestTrustedSchedule(schedule) {
      return applyTrustedSchedule(schedule);
    },

    beginReconnectDrain() {
      const attemptedAt = now().toISOString();
      state = {
        ...state,
        syncPhase: 'draining',
        lastSyncAttemptAt: attemptedAt,
        lastSyncError: null
      };
      refreshDiagnostics();
      emit();

      return {
        entries: queueEntries.map((entry) => structuredCloneLike(entry)),
        attemptedAt
      };
    },

    completeReconnectDrain(result) {
      state = {
        ...state,
        syncPhase: result.status === 'drained' ? 'idle' : 'paused-retryable',
        lastSyncAttemptAt: result.attemptedAt,
        lastSyncError:
          result.status === 'drained'
            ? null
            : {
                reason: result.reason,
                detail: result.detail
              }
      };
      refreshDiagnostics();
      emit();
    },

    async beginMutation({ action, formId, formData }) {
      const operationId = createOperationId();
      const staged = stageLocalMutation({
        operationId,
        action,
        formId,
        formData,
        schedule: state.schedule,
        scope: options.scope,
        visibleWeek: state.schedule.visibleWeek,
        createdAt: now().toISOString()
      });

      if (!staged.ok) {
        setActionState(staged.actionState);
        emit();
        return {
          submitOnline: false,
          operationId: null
        };
      }

      state = {
        ...state,
        schedule: staged.schedule,
        boardSource: 'cached-local'
      };

      const snapshotPersisted = await persistSnapshot(staged.schedule, 'local-write');
      if (!snapshotPersisted) {
        setActionState({
          id: operationId,
          formId,
          action,
          status: 'local-write-failed',
          reason: 'LOCAL_PERSISTENCE_FAILED',
          message: 'The board changed locally, but mobile-local persistence could not confirm the write.',
          shiftId: staged.primaryShiftId,
          createdAt: staged.createdAt
        });
        emit();
        return {
          submitOnline: false,
          operationId: null
        };
      }

      const queueEntry: OfflineMutationQueueEntry = {
        id: operationId,
        scope: options.scope,
        action,
        shiftId: staged.primaryShiftId,
        createdAt: staged.createdAt,
        syncState: 'pending-server',
        errorReason: null,
        errorDetail: null,
        payload: staged.payload
      };

      const enqueueResult = await options.queue.enqueue(queueEntry);
      if (!enqueueResult.ok) {
        state = {
          ...state,
          lastFailure: {
            reason: enqueueResult.reason.toUpperCase().replace(/-/g, '_'),
            detail: enqueueResult.detail
          }
        };
        setActionState({
          id: operationId,
          formId,
          action,
          status: 'queue-persist-failed',
          reason: 'LOCAL_QUEUE_PERSIST_FAILED',
          message: 'The board changed locally, but the pending mutation queue could not be persisted for mobile reopen continuity.',
          shiftId: staged.primaryShiftId,
          createdAt: staged.createdAt
        });
        emit();
        return {
          submitOnline: false,
          operationId: null
        };
      }

      queueEntries = [...queueEntries.filter((entry) => entry.id !== queueEntry.id), queueEntry].sort(compareQueueEntries);
      setActionState({
        id: operationId,
        formId,
        action,
        status: 'pending-local',
        reason: options.isOnline() ? 'LOCAL_PENDING_SERVER_CONFIRMATION' : 'LOCAL_PENDING_OFFLINE',
        message: options.isOnline()
          ? 'Saved locally first. Waiting for the trusted mobile write path to confirm the change.'
          : 'Saved locally while offline. The change stays pending until the trusted mobile write path is reachable again.',
        shiftId: staged.primaryShiftId,
        createdAt: staged.createdAt
      });
      emit();

      return {
        submitOnline: options.isOnline(),
        operationId
      };
    },

    async finalizeMutation(operationId, outcome) {
      const queueEntry = queueEntries.find((entry) => entry.id === operationId) ?? null;
      if (!queueEntry) {
        return;
      }

      const currentAction = state.actionStates.find((candidate) => candidate.id === operationId) ?? null;
      const createdAt = currentAction?.createdAt ?? queueEntry.createdAt;
      const formId = currentAction?.formId ?? `${queueEntry.action}:${queueEntry.shiftId ?? 'week'}`;

      if (outcome.type === 'success' && outcome.state.status === 'success') {
        const nextSchedule = reconcileSuccessfulMutation(state.schedule, queueEntry, outcome.state);
        if (!nextSchedule) {
          await markRetryableQueueEntry(
            queueEntry,
            'SCHEDULE_RESPONSE_INVALID',
            'The trusted response acknowledged the write, but the returned action payload could not reconcile the mobile-local board safely.'
          );
          setActionState({
            id: operationId,
            formId,
            action: queueEntry.action,
            status: 'malformed-response',
            reason: 'SCHEDULE_RESPONSE_INVALID',
            message: 'The trusted response could not reconcile the local-first board, so the change stayed pending locally.',
            shiftId: queueEntry.shiftId,
            createdAt
          });
          emit();
          return;
        }

        state = {
          ...state,
          schedule: nextSchedule,
          boardSource: 'server-sync',
          lastFailure: null
        };
        const acknowledged = await options.queue.acknowledge(options.scope, queueEntry.id);
        if (acknowledged.ok) {
          queueEntries = queueEntries.filter((entry) => entry.id !== queueEntry.id);
          refreshDiagnostics();
          await persistSnapshot(state.schedule, queueEntries.length > 0 ? 'local-write' : 'server-sync');
          setActionState({
            id: operationId,
            formId,
            action: queueEntry.action,
            status: 'success',
            reason: outcome.state.reason,
            message: outcome.state.message,
            shiftId: outcome.state.shiftId,
            createdAt
          });
          emit();
          return;
        }

        state = {
          ...state,
          lastFailure: {
            reason: 'QUEUE_ACKNOWLEDGE_FAILED',
            detail:
              'The trusted mobile write path succeeded, but the mobile-local queue entry could not be acknowledged, so reconnect stopped with the change still pending locally.'
          }
        };
        refreshDiagnostics();
        await persistSnapshot(state.schedule, 'local-write');
        setActionState({
          id: operationId,
          formId,
          action: queueEntry.action,
          status: 'queue-persist-failed',
          reason: 'QUEUE_ACKNOWLEDGE_FAILED',
          message:
            'The trusted mobile write path succeeded, but the mobile-local queue acknowledgement failed, so the change stayed pending locally.',
          shiftId: queueEntry.shiftId,
          createdAt
        });
        emit();
        return;
      }

      if (outcome.type === 'failure') {
        await markRetryableQueueEntry(queueEntry, outcome.state.reason, outcome.state.message);
        setActionState({
          id: operationId,
          formId,
          action: queueEntry.action,
          status: outcome.state.status,
          reason: outcome.state.reason,
          message: outcome.state.message,
          shiftId: queueEntry.shiftId,
          createdAt
        });
        emit();
        return;
      }

      if (outcome.type === 'malformed-response') {
        await markRetryableQueueEntry(queueEntry, outcome.reason, outcome.detail);
        setActionState({
          id: operationId,
          formId,
          action: queueEntry.action,
          status: 'malformed-response',
          reason: outcome.reason,
          message: outcome.detail,
          shiftId: queueEntry.shiftId,
          createdAt
        });
        emit();
      }
    },

    createImmediateSubmitRequest(operationId) {
      const queueEntry = queueEntries.find((entry) => entry.id === operationId) ?? null;
      if (!queueEntry) {
        return {
          ok: false as const,
          reason: 'QUEUE_ENTRY_MISSING',
          detail: 'The queued mobile-local mutation could not be found for immediate trusted submission.'
        };
      }

      const requestResult = buildReconnectActionRequest({
        entry: queueEntry,
        visibleWeekStart: options.scope.weekStart
      });

      if (!requestResult.ok) {
        return {
          ok: false as const,
          reason:
            requestResult.outcome.type === 'malformed-response'
              ? requestResult.outcome.reason
              : requestResult.outcome.state.reason,
          detail:
            requestResult.outcome.type === 'malformed-response'
              ? requestResult.outcome.detail
              : requestResult.outcome.state.message
        };
      }

      return {
        ok: true as const,
        entry: queueEntry,
        request: requestResult.request
      };
    },

    async destroy() {
      await options.repository.close();
      listeners.clear();
    }
  };
}

function buildShiftDiagnostics(
  queueEntries: OfflineMutationQueueEntry[],
  actionStates: CalendarControllerActionState[]
): Record<string, CalendarShiftDiagnostic[]> {
  const diagnostics = new Map<string, CalendarShiftDiagnostic[]>();

  for (const entry of queueEntries) {
    const badges = diagnosticsForQueueEntry(entry);
    for (const shiftId of shiftIdsForQueueEntry(entry)) {
      const current = diagnostics.get(shiftId) ?? [];
      diagnostics.set(shiftId, dedupeDiagnostics([...current, ...badges]));
    }
  }

  for (const actionState of actionStates) {
    if (!actionState.shiftId || (actionState.status !== 'local-write-failed' && actionState.status !== 'queue-persist-failed')) {
      continue;
    }

    const current = diagnostics.get(actionState.shiftId) ?? [];
    diagnostics.set(
      actionState.shiftId,
      dedupeDiagnostics([
        ...current,
        {
          label: actionState.status === 'local-write-failed' ? 'Local write failed' : 'Queue save failed',
          tone: 'danger'
        }
      ])
    );
  }

  return Object.fromEntries(diagnostics.entries());
}

function diagnosticsForQueueEntry(entry: OfflineMutationQueueEntry): CalendarShiftDiagnostic[] {
  const diagnostics: CalendarShiftDiagnostic[] = [];

  if (entry.action === 'create') {
    diagnostics.push({
      label: 'Local only',
      tone: 'warning'
    });
  }

  diagnostics.push({
    label: entry.syncState === 'pending-server' ? 'Pending sync' : 'Retry needed',
    tone: entry.syncState === 'pending-server' ? 'warning' : 'danger'
  });

  return diagnostics;
}

function shiftIdsForQueueEntry(entry: OfflineMutationQueueEntry): string[] {
  if (entry.payload.kind === 'create') {
    return entry.payload.createdShifts.map((shift) => shift.id);
  }

  if (entry.payload.kind === 'delete') {
    return [entry.payload.deletedShift.id];
  }

  return [entry.payload.nextShift.id];
}

function dedupeDiagnostics(input: CalendarShiftDiagnostic[]): CalendarShiftDiagnostic[] {
  return input.filter(
    (candidate, index) => input.findIndex((entry) => entry.label === candidate.label && entry.tone === candidate.tone) === index
  );
}

function stageLocalMutation(params: {
  operationId: string;
  action: OfflineMutationQueueEntry['action'];
  formId: string;
  formData: FormData;
  schedule: CalendarScheduleView;
  scope: OfflineScheduleScope;
  visibleWeek: VisibleWeek;
  createdAt: string;
}):
  | {
      ok: true;
      schedule: CalendarScheduleView;
      payload: OfflineMutationPayload;
      primaryShiftId: string | null;
      createdAt: string;
    }
  | {
      ok: false;
      actionState: CalendarControllerActionState;
    } {
  switch (params.action) {
    case 'create':
      return stageCreateMutation(params);
    case 'edit':
      return stageEditMutation(params);
    case 'move':
      return stageMoveMutation(params);
    case 'delete':
      return stageDeleteMutation(params);
  }
}

function stageCreateMutation(params: {
  operationId: string;
  formId: string;
  formData: FormData;
  schedule: CalendarScheduleView;
  scope: OfflineScheduleScope;
  visibleWeek: VisibleWeek;
  createdAt: string;
}) {
  const fields = readCreateFields(params.formData);
  const draftResult = normalizeShiftDraft({
    calendarId: params.scope.calendarId,
    title: fields.title,
    startAt: fields.startAt,
    endAt: fields.endAt,
    recurrence: {
      cadence: fields.recurrenceCadence || null,
      interval: parseOptionalInteger(fields.recurrenceInterval ?? ''),
      repeatCount: parseOptionalInteger(fields.repeatCount ?? ''),
      repeatUntil: fields.repeatUntil || null
    }
  });

  if (!draftResult.ok) {
    return invalidLocalMutation({
      operationId: params.operationId,
      formId: params.formId,
      action: 'create',
      shiftId: null,
      createdAt: params.createdAt,
      reason: draftResult.reason,
      message: describeValidationReason(draftResult.reason)
    });
  }

  const occurrences = expandShiftOccurrences({
    shift: draftResult.value,
    visibleRange: {
      startAt: new Date(params.visibleWeek.startAt),
      endAt: new Date(params.visibleWeek.endAt),
      maxDays: 7,
      daySpan: 7
    }
  });

  const createdShifts: CalendarShift[] = occurrences.map((occurrence, index) => ({
    id: `local-${params.operationId}-${index + 1}`,
    calendarId: params.scope.calendarId,
    seriesId: draftResult.value.recurrence ? `local-series-${params.operationId}` : null,
    title: occurrence.title,
    startAt: occurrence.startAt,
    endAt: occurrence.endAt,
    occurrenceIndex: occurrence.occurrenceIndex,
    sourceKind: occurrence.occurrenceIndex ? 'series' : 'single'
  }));

  const nextSchedule = createScheduleViewFromShifts({
    visibleWeek: params.visibleWeek,
    shifts: sortScheduleShifts([...flattenScheduleShifts(params.schedule), ...createdShifts]),
    fallback: params.schedule,
    message: 'Showing mobile-local week data with local-first changes.'
  });

  return {
    ok: true,
    schedule: nextSchedule,
    payload: {
      kind: 'create',
      fields,
      createdShifts
    } satisfies OfflineMutationPayload,
    primaryShiftId: createdShifts[0]?.id ?? null,
    createdAt: params.createdAt
  } as const;
}

function stageEditMutation(params: {
  operationId: string;
  formId: string;
  formData: FormData;
  schedule: CalendarScheduleView;
  scope: OfflineScheduleScope;
  visibleWeek: VisibleWeek;
  createdAt: string;
}) {
  const fields = readShiftFields(params.formData);
  const previousShift = flattenScheduleShifts(params.schedule).find((shift) => shift.id === fields.shiftId) ?? null;
  if (!previousShift) {
    return invalidLocalMutation({
      operationId: params.operationId,
      formId: params.formId,
      action: 'edit',
      shiftId: fields.shiftId,
      createdAt: params.createdAt,
      reason: 'SHIFT_NOT_FOUND_LOCAL',
      message: 'The selected shift is no longer present in the local board, so the edit was not applied.'
    });
  }

  const draftResult = normalizeShiftDraft({
    calendarId: params.scope.calendarId,
    title: fields.title,
    startAt: fields.startAt,
    endAt: fields.endAt,
    recurrence: null
  });

  if (!draftResult.ok) {
    return invalidLocalMutation({
      operationId: params.operationId,
      formId: params.formId,
      action: 'edit',
      shiftId: fields.shiftId,
      createdAt: params.createdAt,
      reason: draftResult.reason,
      message: describeValidationReason(draftResult.reason)
    });
  }

  const nextShift: CalendarShift = {
    ...previousShift,
    title: draftResult.value.title,
    startAt: draftResult.value.startAt.toISOString(),
    endAt: draftResult.value.endAt.toISOString()
  };

  const nextSchedule = createScheduleViewFromShifts({
    visibleWeek: params.visibleWeek,
    shifts: sortScheduleShifts(
      flattenScheduleShifts(params.schedule).map((shift) => (shift.id === previousShift.id ? nextShift : shift))
    ),
    fallback: params.schedule,
    message: 'Showing mobile-local week data with local-first changes.'
  });

  return {
    ok: true,
    schedule: nextSchedule,
    payload: {
      kind: 'edit',
      fields,
      previousShift,
      nextShift
    } satisfies OfflineMutationPayload,
    primaryShiftId: previousShift.id,
    createdAt: params.createdAt
  } as const;
}

function stageMoveMutation(params: {
  operationId: string;
  formId: string;
  formData: FormData;
  schedule: CalendarScheduleView;
  scope: OfflineScheduleScope;
  visibleWeek: VisibleWeek;
  createdAt: string;
}) {
  const fields = readShiftFields(params.formData);
  const previousShift = flattenScheduleShifts(params.schedule).find((shift) => shift.id === fields.shiftId) ?? null;
  if (!previousShift) {
    return invalidLocalMutation({
      operationId: params.operationId,
      formId: params.formId,
      action: 'move',
      shiftId: fields.shiftId,
      createdAt: params.createdAt,
      reason: 'SHIFT_NOT_FOUND_LOCAL',
      message: 'The selected shift is no longer present in the local board, so the move was not applied.'
    });
  }

  const rangeResult = normalizeVisibleRange({
    startAt: fields.startAt,
    endAt: fields.endAt,
    maxDays: 7
  });

  if (!rangeResult.ok) {
    return invalidLocalMutation({
      operationId: params.operationId,
      formId: params.formId,
      action: 'move',
      shiftId: fields.shiftId,
      createdAt: params.createdAt,
      reason: rangeResult.reason,
      message: describeValidationReason(rangeResult.reason)
    });
  }

  const nextShift: CalendarShift = {
    ...previousShift,
    startAt: rangeResult.value.startAt.toISOString(),
    endAt: rangeResult.value.endAt.toISOString()
  };

  const nextSchedule = createScheduleViewFromShifts({
    visibleWeek: params.visibleWeek,
    shifts: sortScheduleShifts(
      flattenScheduleShifts(params.schedule).map((shift) => (shift.id === previousShift.id ? nextShift : shift))
    ),
    fallback: params.schedule,
    message: 'Showing mobile-local week data with local-first changes.'
  });

  return {
    ok: true,
    schedule: nextSchedule,
    payload: {
      kind: 'move',
      fields,
      previousShift,
      nextShift
    } satisfies OfflineMutationPayload,
    primaryShiftId: previousShift.id,
    createdAt: params.createdAt
  } as const;
}

function stageDeleteMutation(params: {
  operationId: string;
  formId: string;
  formData: FormData;
  schedule: CalendarScheduleView;
  scope: OfflineScheduleScope;
  visibleWeek: VisibleWeek;
  createdAt: string;
}) {
  const fields = readShiftFields(params.formData);
  const deletedShift = flattenScheduleShifts(params.schedule).find((shift) => shift.id === fields.shiftId) ?? null;
  if (!deletedShift) {
    return invalidLocalMutation({
      operationId: params.operationId,
      formId: params.formId,
      action: 'delete',
      shiftId: fields.shiftId,
      createdAt: params.createdAt,
      reason: 'SHIFT_NOT_FOUND_LOCAL',
      message: 'The selected shift is no longer present in the local board, so the delete was not applied.'
    });
  }

  const nextSchedule = createScheduleViewFromShifts({
    visibleWeek: params.visibleWeek,
    shifts: flattenScheduleShifts(params.schedule).filter((shift) => shift.id !== deletedShift.id),
    fallback: params.schedule,
    message: 'Showing mobile-local week data with local-first changes.'
  });

  return {
    ok: true,
    schedule: nextSchedule,
    payload: {
      kind: 'delete',
      fields,
      deletedShift
    } satisfies OfflineMutationPayload,
    primaryShiftId: deletedShift.id,
    createdAt: params.createdAt
  } as const;
}

function reconcileSuccessfulMutation(
  schedule: CalendarScheduleView,
  queueEntry: OfflineMutationQueueEntry,
  serverState: {
    shiftId: string | null;
    seriesId: string | null;
    affectedShiftIds: string[];
  }
): CalendarScheduleView | null {
  const currentShifts = flattenScheduleShifts(schedule);

  switch (queueEntry.payload.kind) {
    case 'create': {
      const serverIds = serverState.affectedShiftIds;
      if (serverIds.length !== queueEntry.payload.createdShifts.length || serverIds.some((id) => typeof id !== 'string')) {
        return null;
      }

      const byLocalId = new Map(queueEntry.payload.createdShifts.map((shift, index) => [shift.id, serverIds[index] ?? shift.id]));
      const nextShifts = currentShifts.map((shift) => {
        const serverId = byLocalId.get(shift.id);
        return serverId ? { ...shift, id: serverId, seriesId: serverState.seriesId ?? shift.seriesId } : shift;
      });

      return createScheduleViewFromShifts({
        visibleWeek: schedule.visibleWeek,
        shifts: sortScheduleShifts(nextShifts),
        fallback: schedule,
        message: 'The trusted mobile write path confirmed the local-first change.'
      });
    }
    case 'edit':
    case 'move':
      return createScheduleViewFromShifts({
        visibleWeek: schedule.visibleWeek,
        shifts: sortScheduleShifts(currentShifts),
        fallback: schedule,
        message: 'The trusted mobile write path confirmed the local-first change.'
      });
    case 'delete':
      return createScheduleViewFromShifts({
        visibleWeek: schedule.visibleWeek,
        shifts: currentShifts,
        fallback: schedule,
        message: 'The trusted mobile write path confirmed the local-first change.'
      });
  }
}

function cloneSchedule(schedule: CalendarScheduleView): CalendarScheduleView {
  return {
    ...schedule,
    visibleWeek: { ...schedule.visibleWeek, dayKeys: [...schedule.visibleWeek.dayKeys] },
    days: schedule.days.map((day) => ({
      ...day,
      shifts: day.shifts.map((shift) => ({ ...shift }))
    })),
    shiftIds: [...schedule.shiftIds]
  };
}

function cloneShiftDiagnostics(input: Record<string, CalendarShiftDiagnostic[]>): Record<string, CalendarShiftDiagnostic[]> {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, value.map((entry) => ({ ...entry }))]));
}

function readCreateFields(formData: FormData): OfflineMutationFields {
  return {
    title: readFormValue(formData, 'title'),
    startAt: readFormValue(formData, 'startAt'),
    endAt: readFormValue(formData, 'endAt'),
    recurrenceCadence: readFormValue(formData, 'recurrenceCadence'),
    recurrenceInterval: readFormValue(formData, 'recurrenceInterval'),
    repeatCount: readFormValue(formData, 'repeatCount'),
    repeatUntil: readFormValue(formData, 'repeatUntil')
  };
}

function readShiftFields(formData: FormData): OfflineMutationFields & { shiftId: string } {
  return {
    shiftId: readFormValue(formData, 'shiftId'),
    title: readFormValue(formData, 'title'),
    startAt: readFormValue(formData, 'startAt'),
    endAt: readFormValue(formData, 'endAt')
  };
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function parseOptionalInteger(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function invalidLocalMutation(params: {
  operationId: string;
  formId: string;
  action: OfflineMutationQueueEntry['action'];
  shiftId: string | null;
  createdAt: string;
  reason: string;
  message: string;
}) {
  return {
    ok: false,
    actionState: {
      id: params.operationId,
      formId: params.formId,
      action: params.action,
      status: 'validation-error',
      reason: params.reason,
      message: params.message,
      shiftId: params.shiftId,
      createdAt: params.createdAt
    } satisfies CalendarControllerActionState
  } as const;
}

function describeValidationReason(reason: ScheduleValidationFailureReason): string {
  switch (reason) {
    case 'TITLE_REQUIRED':
      return 'Give the shift a title before saving it locally.';
    case 'SHIFT_START_INVALID':
      return 'Provide a valid shift start time before saving it locally.';
    case 'SHIFT_END_INVALID':
      return 'Provide a valid shift end time before saving it locally.';
    case 'SHIFT_END_BEFORE_START':
      return 'The shift end must be after the shift start.';
    case 'RECURRENCE_CADENCE_REQUIRED':
      return 'Choose a recurrence cadence before creating a recurring local shift.';
    case 'RECURRENCE_CADENCE_UNSUPPORTED':
      return 'That recurrence cadence is not supported for local-first writes.';
    case 'RECURRENCE_INTERVAL_INVALID':
      return 'The recurrence interval must be at least 1.';
    case 'RECURRENCE_BOUND_REQUIRED':
      return 'Recurring local shifts need a repeat count or repeat-until bound.';
    case 'RECURRENCE_REPEAT_COUNT_INVALID':
      return 'The repeat count must be at least 1.';
    case 'RECURRENCE_REPEAT_UNTIL_INVALID':
      return 'Provide a valid repeat-until timestamp.';
    case 'RECURRENCE_REPEAT_UNTIL_BEFORE_SHIFT_END':
      return 'The repeat-until timestamp must not land before the shift ends.';
    case 'VISIBLE_RANGE_START_INVALID':
      return 'Provide a valid visible-range start time.';
    case 'VISIBLE_RANGE_END_INVALID':
      return 'Provide a valid visible-range end time.';
    case 'VISIBLE_RANGE_INVALID':
      return 'The visible range end must be after the start.';
    case 'VISIBLE_RANGE_TOO_WIDE':
      return 'That move would widen the visible range beyond the allowed week.';
  }
}

function structuredCloneLike<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createOperationId(): string {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
