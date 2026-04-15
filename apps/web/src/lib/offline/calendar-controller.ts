import {
  expandShiftOccurrences,
  normalizeShiftDraft,
  normalizeVisibleRange
} from '$lib/schedule/recurrence';
import type { ScheduleValidationFailureReason } from '$lib/schedule/types';
import type {
  CalendarScheduleView,
  CalendarShift,
  ScheduleActionState,
  VisibleWeek
} from '$lib/server/schedule';
import type {
  OfflineScheduleRepository,
  OfflineScheduleScope,
  OfflineScheduleWeekSnapshot,
  OfflineRepositoryState
} from './repository';
import type {
  OfflineMutationFields,
  OfflineMutationPayload,
  OfflineMutationQueue,
  OfflineMutationQueueEntry,
  OfflineMutationQueueReadResult
} from './mutation-queue';

export type CalendarControllerActionStatus =
  | 'pending-local'
  | 'success'
  | 'validation-error'
  | 'forbidden'
  | 'write-error'
  | 'timeout'
  | 'malformed-response'
  | 'local-write-failed'
  | 'queue-persist-failed';

export type CalendarControllerActionState = {
  id: string;
  formId: string;
  action: 'create' | 'edit' | 'move' | 'delete';
  status: CalendarControllerActionStatus;
  reason: string;
  message: string;
  shiftId: string | null;
  createdAt: string;
};

export type CalendarControllerFailure = {
  reason: string;
  detail: string;
};

export type CalendarShiftDiagnostic = {
  label: string;
  tone: 'neutral' | 'warning' | 'danger';
};

export type CalendarControllerState = {
  schedule: CalendarScheduleView;
  routeMode: App.ProtectedRouteMode;
  network: 'online' | 'offline';
  boardSource: 'server-sync' | 'cached-local';
  queueLength: number;
  pendingQueueLength: number;
  retryableQueueLength: number;
  actionStates: CalendarControllerActionState[];
  shiftDiagnostics: Record<string, CalendarShiftDiagnostic[]>;
  lastFailure: CalendarControllerFailure | null;
  repositoryState: OfflineRepositoryState | null;
  queueState: 'idle' | 'ready' | 'malformed' | 'unavailable';
  queueReason: string | null;
  queueDetail: string | null;
};

export type CalendarControllerServerOutcome =
  | {
      type: 'success' | 'failure';
      state: ScheduleActionState;
    }
  | {
      type: 'malformed-response';
      reason: string;
      detail: string;
    };

export type CalendarController = {
  subscribe: (listener: (state: CalendarControllerState) => void) => () => void;
  initialize: () => Promise<void>;
  setNetwork: (isOnline: boolean) => void;
  beginMutation: (params: {
    action: 'create' | 'edit' | 'move' | 'delete';
    formId: string;
    formData: FormData;
  }) => Promise<{
    submitOnline: boolean;
    operationId: string | null;
  }>;
  finalizeMutation: (operationId: string, outcome: CalendarControllerServerOutcome) => Promise<void>;
  destroy: () => Promise<void>;
  getState: () => CalendarControllerState;
};

export function createInitialCalendarControllerState(params: {
  initialSchedule: CalendarScheduleView;
  routeMode: App.ProtectedRouteMode;
  isOnline: boolean;
}): CalendarControllerState {
  return {
    schedule: cloneSchedule(params.initialSchedule),
    routeMode: params.routeMode,
    network: params.isOnline ? 'online' : 'offline',
    boardSource: params.routeMode === 'cached-offline' ? 'cached-local' : 'server-sync',
    queueLength: 0,
    pendingQueueLength: 0,
    retryableQueueLength: 0,
    actionStates: [],
    shiftDiagnostics: {},
    lastFailure: null,
    repositoryState: null,
    queueState: 'idle',
    queueReason: null,
    queueDetail: null
  };
}

export function createCalendarController(options: {
  scope: OfflineScheduleScope;
  initialSchedule: CalendarScheduleView;
  routeMode: App.ProtectedRouteMode;
  repository: OfflineScheduleRepository;
  queue: OfflineMutationQueue;
  isOnline: () => boolean;
  now?: () => Date;
}): CalendarController {
  const now = options.now ?? (() => new Date());
  let queueEntries: OfflineMutationQueueEntry[] = [];
  let state = createInitialCalendarControllerState({
    initialSchedule: options.initialSchedule,
    routeMode: options.routeMode,
    isOnline: options.isOnline()
  });
  const listeners = new Set<(state: CalendarControllerState) => void>();

  function emit() {
    const nextState = {
      ...state,
      schedule: cloneSchedule(state.schedule),
      actionStates: [...state.actionStates].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
      shiftDiagnostics: cloneShiftDiagnostics(state.shiftDiagnostics)
    } satisfies CalendarControllerState;

    state = nextState;
    for (const listener of listeners) {
      listener(nextState);
    }
  }

  function setActionState(nextAction: CalendarControllerActionState) {
    state = {
      ...state,
      actionStates: [
        nextAction,
        ...state.actionStates.filter((candidate) => candidate.formId !== nextAction.formId)
      ]
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
    state = {
      ...state,
      queueLength: queueEntries.length,
      pendingQueueLength: queueEntries.filter((entry) => entry.syncState === 'pending-server').length,
      retryableQueueLength: queueEntries.filter((entry) => entry.syncState === 'retryable').length,
      shiftDiagnostics: buildShiftDiagnostics(queueEntries, state.actionStates),
      boardSource: queueEntries.length > 0 || state.boardSource === 'cached-local' ? 'cached-local' : 'server-sync'
    };
  }

  async function persistSnapshot(schedule: CalendarScheduleView, origin: OfflineScheduleWeekSnapshot['origin']) {
    const result = await options.repository.putWeekSnapshot({
      scope: options.scope,
      visibleWeek: schedule.visibleWeek,
      shifts: flattenScheduleShifts(schedule),
      cachedAt: now().toISOString(),
      origin
    });

    if (!result.ok) {
      state = {
        ...state,
        lastFailure: {
          reason: result.reason.toUpperCase().replace(/-/g, '_'),
          detail: result.detail
        }
      };
      return false;
    }

    return true;
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
                ? 'Showing browser-local week data with local changes already applied.'
                : snapshotResult.snapshot.origin === 'server-sync'
                  ? state.schedule.message
                  : 'Showing browser-local week data.'
          }),
          boardSource: snapshotResult.snapshot.origin === 'local-write' ? 'cached-local' : state.boardSource
        };
      } else if (snapshotResult.status === 'malformed' || snapshotResult.status === 'unavailable') {
        state = {
          ...state,
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
    },

    setNetwork(isOnline) {
      state = {
        ...state,
        network: isOnline ? 'online' : 'offline'
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
          message: 'The board changed locally, but browser-local persistence could not confirm the write.',
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
          message: 'The board changed locally, but the pending mutation queue could not be persisted for reload continuity.',
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
          ? 'Saved locally first. Waiting for the trusted server action to confirm the change.'
          : 'Saved locally while offline. The change stays pending until the trusted server path is reachable again.',
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
          await markRetryableQueueEntry(queueEntry, 'SCHEDULE_RESPONSE_INVALID', 'The server acknowledged the write, but the returned action payload could not reconcile the local board safely.');
          setActionState({
            id: operationId,
            formId,
            action: queueEntry.action,
            status: 'malformed-response',
            reason: 'SCHEDULE_RESPONSE_INVALID',
            message: 'The server response could not reconcile the local-first board, so the change stayed pending locally.',
            shiftId: queueEntry.shiftId,
            createdAt
          });
          emit();
          return;
        }

        state = {
          ...state,
          schedule: nextSchedule,
          lastFailure: null
        };
        const acknowledged = await options.queue.acknowledge(options.scope, queueEntry.id);
        if (acknowledged.ok) {
          queueEntries = queueEntries.filter((entry) => entry.id !== queueEntry.id);
        }

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

    async destroy() {
      await options.repository.close();
      listeners.clear();
    }
  };

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
      }
    };
    refreshDiagnostics();
  }
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
    message: 'Showing browser-local week data with local-first changes.'
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
    message: 'Showing browser-local week data with local-first changes.'
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
    message: 'Showing browser-local week data with local-first changes.'
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
    message: 'Showing browser-local week data with local-first changes.'
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
  serverState: ScheduleActionState
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
        message: 'The trusted server action confirmed the local-first change.'
      });
    }
    case 'edit':
    case 'move':
      return createScheduleViewFromShifts({
        visibleWeek: schedule.visibleWeek,
        shifts: sortScheduleShifts(currentShifts),
        fallback: schedule,
        message: 'The trusted server action confirmed the local-first change.'
      });
    case 'delete':
      return createScheduleViewFromShifts({
        visibleWeek: schedule.visibleWeek,
        shifts: currentShifts,
        fallback: schedule,
        message: 'The trusted server action confirmed the local-first change.'
      });
  }
}

function createScheduleViewFromShifts(params: {
  visibleWeek: VisibleWeek;
  shifts: CalendarShift[];
  fallback: CalendarScheduleView;
  message: string;
}): CalendarScheduleView {
  const sortedShifts = sortScheduleShifts(params.shifts);
  return {
    status: 'ready',
    reason: params.fallback.reason,
    message: params.message,
    visibleWeek: params.visibleWeek,
    days: params.visibleWeek.dayKeys.map((dayKey) => ({
      dayKey,
      label: formatDayLabel(dayKey),
      shifts: sortedShifts.filter((shift) => shift.startAt.slice(0, 10) === dayKey)
    })),
    totalShifts: sortedShifts.length,
    shiftIds: sortedShifts.map((shift) => shift.id)
  };
}

function flattenScheduleShifts(schedule: CalendarScheduleView): CalendarShift[] {
  return schedule.days.flatMap((day) => day.shifts);
}

function sortScheduleShifts(shifts: CalendarShift[]): CalendarShift[] {
  return [...shifts].sort(
    (left, right) =>
      left.startAt.localeCompare(right.startAt) ||
      left.endAt.localeCompare(right.endAt) ||
      left.title.localeCompare(right.title) ||
      left.id.localeCompare(right.id)
  );
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

function formatDayLabel(dayKey: string): string {
  return new Date(`${dayKey}T00:00:00.000Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });
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

function compareQueueEntries(left: OfflineMutationQueueEntry, right: OfflineMutationQueueEntry): number {
  return left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
}

function createOperationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
