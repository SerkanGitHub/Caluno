import type { ActionResult } from '@sveltejs/kit';
import type { CalendarScheduleView, CalendarShift, ScheduleActionState, VisibleWeek } from '$lib/server/schedule';
import type { OfflineMutationQueueEntry, OfflineMutationQueueReadResult } from './mutation-queue';
import type { OfflineWeekSnapshotReadResult } from './repository';

export type TrustedRefreshReplayFailureReason =
  | 'TRUSTED_SCHEDULE_INVALID'
  | 'QUEUE_ENTRY_INVALID'
  | 'REPLAY_CREATE_COLLISION'
  | 'REPLAY_EDIT_TARGET_MISSING'
  | 'REPLAY_MOVE_TARGET_MISSING'
  | 'REPLAY_DELETE_TARGET_MISSING';

export type TrustedRefreshReplayResult =
  | {
      ok: true;
      schedule: CalendarScheduleView;
      boardSource: 'server-sync' | 'cached-local';
      snapshotOrigin: 'server-sync' | 'local-write';
      replayedQueueLength: number;
      detail: string;
    }
  | {
      ok: false;
      reason: TrustedRefreshReplayFailureReason;
      detail: string;
    };

export type TrustedRefreshWriteDecision =
  | {
      shouldPersist: true;
      reason: 'trusted-refresh-persisted';
      detail: string;
      origin: 'server-sync';
    }
  | {
      shouldPersist: false;
      reason:
        | 'local-write-pending-queue'
        | 'local-write-retryable-queue'
        | 'local-write-queue-malformed'
        | 'local-write-queue-unavailable';
      detail: string;
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

export type ReconnectDrainActionKey = 'createShift' | 'editShift' | 'moveShift' | 'deleteShift';

export type ReconnectDrainActionRequest = {
  entryId: string;
  action: OfflineMutationQueueEntry['action'];
  actionKey: ReconnectDrainActionKey;
  url: string;
  formData: FormData;
  visibleWeekStart: string;
  shiftId: string | null;
  fields: Record<string, string>;
};

export type ReconnectDrainResult =
  | {
      status: 'drained';
      attemptedCount: number;
      succeededCount: number;
      processedEntryIds: string[];
      stoppedEntryId: null;
      reason: null;
      detail: string;
    }
  | {
      status: 'stopped';
      attemptedCount: number;
      succeededCount: number;
      processedEntryIds: string[];
      stoppedEntryId: string;
      reason: string;
      detail: string;
      outcome: CalendarControllerServerOutcome;
    };

export function rebaseTrustedScheduleWithLocalQueue(params: {
  trustedSchedule: CalendarScheduleView;
  queueEntries: OfflineMutationQueueEntry[];
}): TrustedRefreshReplayResult {
  if (params.trustedSchedule.status !== 'ready') {
    return {
      ok: false,
      reason: 'TRUSTED_SCHEDULE_INVALID',
      detail: 'The trusted refreshed week was not renderable, so local replay failed closed instead of guessing a merged board.'
    };
  }

  const orderedEntries = [...params.queueEntries].sort(compareQueueEntries);
  const shiftsById = new Map(flattenScheduleShifts(params.trustedSchedule).map((shift) => [shift.id, { ...shift }]));

  for (const entry of orderedEntries) {
    const applied = applyQueueEntry(shiftsById, entry);
    if (!applied.ok) {
      return applied;
    }
  }

  const replayedQueueLength = orderedEntries.length;
  return {
    ok: true,
    schedule: createScheduleViewFromShifts({
      visibleWeek: params.trustedSchedule.visibleWeek,
      shifts: sortScheduleShifts(Array.from(shiftsById.values())),
      fallback: params.trustedSchedule,
      message:
        replayedQueueLength > 0
          ? 'Showing trusted week data with pending browser-local changes replayed in deterministic queue order.'
          : params.trustedSchedule.message
    }),
    boardSource: replayedQueueLength > 0 ? 'cached-local' : 'server-sync',
    snapshotOrigin: replayedQueueLength > 0 ? 'local-write' : 'server-sync',
    replayedQueueLength,
    detail:
      replayedQueueLength > 0
        ? 'The refreshed trusted week was rebased with pending browser-local mutations in created-at order.'
        : 'No pending browser-local mutations existed, so the trusted week stayed authoritative as-is.'
  };
}

export function decideTrustedRefreshSnapshotWrite(params: {
  currentSnapshot: OfflineWeekSnapshotReadResult;
  queueReadResult: OfflineMutationQueueReadResult;
}): TrustedRefreshWriteDecision {
  const currentSnapshot = params.currentSnapshot;
  if (currentSnapshot.status !== 'available' || currentSnapshot.snapshot.origin !== 'local-write') {
    return {
      shouldPersist: true,
      reason: 'trusted-refresh-persisted',
      detail: 'No browser-local write snapshot needed protection, so the trusted refresh may replace the cached week.',
      origin: 'server-sync'
    };
  }

  if (params.queueReadResult.status === 'unavailable') {
    return {
      shouldPersist: false,
      reason: 'local-write-queue-unavailable',
      detail:
        'The browser-local queue could not be inspected while a local-write snapshot existed, so the trusted refresh did not overwrite the cached week.'
    };
  }

  if (params.queueReadResult.status === 'malformed') {
    return {
      shouldPersist: false,
      reason: 'local-write-queue-malformed',
      detail:
        'The browser-local queue was malformed while a local-write snapshot existed, so the trusted refresh did not overwrite the cached week.'
    };
  }

  const hasRetryable = params.queueReadResult.entries.some((entry) => entry.syncState === 'retryable');
  if (hasRetryable) {
    return {
      shouldPersist: false,
      reason: 'local-write-retryable-queue',
      detail:
        'Retryable browser-local mutations still exist for this week, so the trusted refresh did not replace the local-write snapshot.'
    };
  }

  if (params.queueReadResult.entries.length > 0) {
    return {
      shouldPersist: false,
      reason: 'local-write-pending-queue',
      detail:
        'Pending browser-local mutations still exist for this week, so the trusted refresh did not replace the local-write snapshot.'
    };
  }

  return {
    shouldPersist: true,
    reason: 'trusted-refresh-persisted',
    detail: 'The local-write snapshot had no remaining queue work, so the trusted refresh may replace it.',
    origin: 'server-sync'
  };
}

export async function drainReconnectQueue(params: {
  entries: OfflineMutationQueueEntry[];
  visibleWeekStart: string;
  submitAction: (request: ReconnectDrainActionRequest) => Promise<CalendarControllerServerOutcome>;
  onOutcome?: (entry: OfflineMutationQueueEntry, outcome: CalendarControllerServerOutcome) => Promise<void> | void;
}): Promise<ReconnectDrainResult> {
  const orderedEntries = [...params.entries].sort(compareQueueEntries);
  if (orderedEntries.length === 0) {
    return {
      status: 'drained',
      attemptedCount: 0,
      succeededCount: 0,
      processedEntryIds: [],
      stoppedEntryId: null,
      reason: null,
      detail: 'No queued browser-local mutations were waiting for reconnect.'
    };
  }

  const processedEntryIds: string[] = [];

  for (const entry of orderedEntries) {
    const requestResult = buildReconnectActionRequest({
      entry,
      visibleWeekStart: params.visibleWeekStart
    });

    const outcome = requestResult.ok ? await params.submitAction(requestResult.request) : requestResult.outcome;
    await params.onOutcome?.(entry, outcome);

    if (!isSuccessfulServerOutcome(outcome)) {
      const failure = describeServerOutcomeFailure(outcome);
      return {
        status: 'stopped',
        attemptedCount: processedEntryIds.length + 1,
        succeededCount: processedEntryIds.length,
        processedEntryIds,
        stoppedEntryId: entry.id,
        reason: failure.reason,
        detail: failure.detail,
        outcome
      };
    }

    processedEntryIds.push(entry.id);
  }

  return {
    status: 'drained',
    attemptedCount: orderedEntries.length,
    succeededCount: processedEntryIds.length,
    processedEntryIds,
    stoppedEntryId: null,
    reason: null,
    detail:
      processedEntryIds.length === 1
        ? 'The queued browser-local mutation drained through the trusted route action and acknowledged successfully.'
        : 'Queued browser-local mutations drained sequentially through the trusted route actions and acknowledged successfully.'
  };
}

export function buildReconnectActionRequest(params: {
  entry: OfflineMutationQueueEntry;
  visibleWeekStart: string;
}):
  | {
      ok: true;
      request: ReconnectDrainActionRequest;
    }
  | {
      ok: false;
      outcome: CalendarControllerServerOutcome;
    } {
  if (params.entry.scope.weekStart !== params.visibleWeekStart) {
    return {
      ok: false,
      outcome: {
        type: 'malformed-response',
        reason: 'QUEUE_SCOPE_MISMATCH',
        detail:
          'The queued browser-local mutation targets a different visible week than the current route, so reconnect replay stopped before widening scope.'
      }
    };
  }

  const actionKey = toReconnectDrainActionKey(params.entry.action as OfflineMutationQueueEntry['action']);
  if (!actionKey) {
    return {
      ok: false,
      outcome: {
        type: 'malformed-response',
        reason: 'QUEUE_ACTION_INVALID',
        detail: 'A queued browser-local mutation used an unknown action key, so reconnect replay failed closed.'
      }
    };
  }

  const fields = fieldsForEntry(params.entry);
  if (!hasRequiredReconnectFields(params.entry, fields)) {
    return {
      ok: false,
      outcome: {
        type: 'malformed-response',
        reason: 'QUEUE_ENTRY_INVALID',
        detail: 'A queued browser-local mutation was missing required form fields, so reconnect replay failed closed.'
      }
    };
  }

  const formData = new FormData();
  formData.set('visibleWeekStart', params.visibleWeekStart);
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }

  const searchParams = new URLSearchParams({ start: params.visibleWeekStart });
  return {
    ok: true,
    request: {
      entryId: params.entry.id,
      action: params.entry.action,
      actionKey,
      url: `?/${actionKey}&${searchParams.toString()}`,
      formData,
      visibleWeekStart: params.visibleWeekStart,
      shiftId: params.entry.shiftId,
      fields
    }
  };
}

export function normalizeScheduleActionResult(
  result: ActionResult,
  actionKey: ReconnectDrainActionKey
): CalendarControllerServerOutcome {
  if ((result.type === 'success' || result.type === 'failure') && isPlainObject(result.data)) {
    const candidate = result.data[actionKey];
    if (isScheduleActionState(candidate)) {
      return {
        type: result.type,
        state: candidate
      };
    }
  }

  return {
    type: 'malformed-response',
    reason: 'SCHEDULE_ACTION_RESULT_INVALID',
    detail: 'The trusted server action returned an unexpected result shape, so the local change stayed pending.'
  };
}

export function createReconnectTransportFailureOutcome(params: {
  request: ReconnectDrainActionRequest;
  kind: 'timeout' | 'network-error';
  detail?: string;
}): CalendarControllerServerOutcome {
  return {
    type: 'failure',
    state: {
      action: params.request.action,
      status: params.kind === 'timeout' ? 'timeout' : 'write-error',
      reason:
        params.kind === 'timeout'
          ? `SCHEDULE_${params.request.action.toUpperCase()}_TIMEOUT`
          : `SCHEDULE_${params.request.action.toUpperCase()}_NETWORK_FAILED`,
      message:
        params.kind === 'timeout'
          ? 'The reconnect drain timed out before the trusted server action could confirm the queued change.'
          : params.detail?.trim() ||
            'The reconnect drain could not reach the trusted server action, so the queued change stayed browser-local.',
      visibleWeekStart: params.request.visibleWeekStart,
      shiftId: params.request.shiftId,
      seriesId: null,
      affectedShiftIds: [],
      fields: params.request.fields
    }
  };
}

export function describeServerOutcomeFailure(outcome: CalendarControllerServerOutcome): {
  reason: string;
  detail: string;
} {
  if (outcome.type === 'malformed-response') {
    return {
      reason: outcome.reason,
      detail: outcome.detail
    };
  }

  return {
    reason: outcome.state.reason,
    detail: outcome.state.message
  };
}

export function isSuccessfulServerOutcome(outcome: CalendarControllerServerOutcome): boolean {
  return outcome.type === 'success' && outcome.state.status === 'success';
}

export function createScheduleViewFromShifts(params: {
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

export function flattenScheduleShifts(schedule: CalendarScheduleView): CalendarShift[] {
  return schedule.days.flatMap((day) => day.shifts);
}

export function sortScheduleShifts(shifts: CalendarShift[]): CalendarShift[] {
  return [...shifts].sort(
    (left, right) =>
      left.startAt.localeCompare(right.startAt) ||
      left.endAt.localeCompare(right.endAt) ||
      left.title.localeCompare(right.title) ||
      left.id.localeCompare(right.id)
  );
}

export function compareQueueEntries(left: OfflineMutationQueueEntry, right: OfflineMutationQueueEntry): number {
  return left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
}

function applyQueueEntry(
  shiftsById: Map<string, CalendarShift>,
  entry: OfflineMutationQueueEntry
):
  | { ok: true }
  | {
      ok: false;
      reason: TrustedRefreshReplayFailureReason;
      detail: string;
    } {
  switch (entry.payload.kind) {
    case 'create': {
      if (!Array.isArray(entry.payload.createdShifts) || entry.payload.createdShifts.some((shift) => !isCalendarShift(shift))) {
        return {
          ok: false,
          reason: 'QUEUE_ENTRY_INVALID',
          detail: 'A queued local create payload was malformed, so trusted replay failed closed.'
        };
      }

      for (const shift of entry.payload.createdShifts) {
        if (shiftsById.has(shift.id)) {
          return {
            ok: false,
            reason: 'REPLAY_CREATE_COLLISION',
            detail:
              'A queued local create would collide with an existing trusted shift id, so replay stopped before clobbering week data.'
          };
        }

        shiftsById.set(shift.id, { ...shift });
      }

      return { ok: true };
    }

    case 'edit': {
      if (!isCalendarShift(entry.payload.previousShift) || !isCalendarShift(entry.payload.nextShift)) {
        return {
          ok: false,
          reason: 'QUEUE_ENTRY_INVALID',
          detail: 'A queued local edit payload was malformed, so trusted replay failed closed.'
        };
      }

      if (!shiftsById.has(entry.payload.nextShift.id)) {
        return {
          ok: false,
          reason: 'REPLAY_EDIT_TARGET_MISSING',
          detail:
            'The trusted refreshed week no longer contained a shift needed for a queued local edit, so the existing local board stayed authoritative.'
        };
      }

      shiftsById.set(entry.payload.nextShift.id, { ...entry.payload.nextShift });
      return { ok: true };
    }

    case 'move': {
      if (!isCalendarShift(entry.payload.previousShift) || !isCalendarShift(entry.payload.nextShift)) {
        return {
          ok: false,
          reason: 'QUEUE_ENTRY_INVALID',
          detail: 'A queued local move payload was malformed, so trusted replay failed closed.'
        };
      }

      if (!shiftsById.has(entry.payload.nextShift.id)) {
        return {
          ok: false,
          reason: 'REPLAY_MOVE_TARGET_MISSING',
          detail:
            'The trusted refreshed week no longer contained a shift needed for a queued local move, so the existing local board stayed authoritative.'
        };
      }

      shiftsById.set(entry.payload.nextShift.id, { ...entry.payload.nextShift });
      return { ok: true };
    }

    case 'delete': {
      if (!isCalendarShift(entry.payload.deletedShift)) {
        return {
          ok: false,
          reason: 'QUEUE_ENTRY_INVALID',
          detail: 'A queued local delete payload was malformed, so trusted replay failed closed.'
        };
      }

      if (!shiftsById.has(entry.payload.deletedShift.id)) {
        return {
          ok: false,
          reason: 'REPLAY_DELETE_TARGET_MISSING',
          detail:
            'The trusted refreshed week no longer contained a shift needed for a queued local delete, so the existing local board stayed authoritative.'
        };
      }

      shiftsById.delete(entry.payload.deletedShift.id);
      return { ok: true };
    }
  }
}

function formatDayLabel(dayKey: string): string {
  return new Date(`${dayKey}T00:00:00.000Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });
}

function toReconnectDrainActionKey(action: OfflineMutationQueueEntry['action']): ReconnectDrainActionKey | null {
  switch (action) {
    case 'create':
      return 'createShift';
    case 'edit':
      return 'editShift';
    case 'move':
      return 'moveShift';
    case 'delete':
      return 'deleteShift';
    default:
      return null;
  }
}

function fieldsForEntry(entry: OfflineMutationQueueEntry): Record<string, string> {
  switch (entry.payload.kind) {
    case 'create':
      return {
        title: entry.payload.fields.title,
        startAt: entry.payload.fields.startAt,
        endAt: entry.payload.fields.endAt,
        recurrenceCadence: entry.payload.fields.recurrenceCadence ?? '',
        recurrenceInterval: entry.payload.fields.recurrenceInterval ?? '',
        repeatCount: entry.payload.fields.repeatCount ?? '',
        repeatUntil: entry.payload.fields.repeatUntil ?? ''
      };
    case 'edit':
    case 'move':
      return {
        shiftId: entry.payload.fields.shiftId,
        title: entry.payload.fields.title,
        startAt: entry.payload.fields.startAt,
        endAt: entry.payload.fields.endAt
      };
    case 'delete':
      return {
        shiftId: entry.payload.fields.shiftId,
        title: entry.payload.fields.title,
        startAt: entry.payload.fields.startAt,
        endAt: entry.payload.fields.endAt
      };
  }
}

function hasRequiredReconnectFields(entry: OfflineMutationQueueEntry, fields: Record<string, string>): boolean {
  if (!hasNonEmptyField(fields, 'title') || !hasNonEmptyField(fields, 'startAt') || !hasNonEmptyField(fields, 'endAt')) {
    return false;
  }

  if (entry.payload.kind === 'create') {
    return true;
  }

  return hasNonEmptyField(fields, 'shiftId');
}

function hasNonEmptyField(fields: Record<string, string>, key: string): boolean {
  return typeof fields[key] === 'string' && fields[key].trim().length > 0;
}

function isCalendarShift(value: unknown): value is CalendarShift {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<CalendarShift>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.calendarId === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.startAt === 'string' &&
    typeof candidate.endAt === 'string' &&
    (candidate.seriesId === null || typeof candidate.seriesId === 'string') &&
    (candidate.occurrenceIndex === null || typeof candidate.occurrenceIndex === 'number') &&
    (candidate.sourceKind === 'single' || candidate.sourceKind === 'series')
  );
}

function isScheduleActionState(value: unknown): value is ScheduleActionState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ScheduleActionState>;
  return (
    (candidate.action === 'create' ||
      candidate.action === 'edit' ||
      candidate.action === 'move' ||
      candidate.action === 'delete') &&
    typeof candidate.reason === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.visibleWeekStart === 'string' &&
    (candidate.shiftId === null || typeof candidate.shiftId === 'string') &&
    (candidate.seriesId === null || typeof candidate.seriesId === 'string') &&
    Array.isArray(candidate.affectedShiftIds) &&
    isPlainObject(candidate.fields) &&
    (candidate.status === 'success' ||
      candidate.status === 'validation-error' ||
      candidate.status === 'forbidden' ||
      candidate.status === 'write-error' ||
      candidate.status === 'timeout' ||
      candidate.status === 'malformed-response')
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
