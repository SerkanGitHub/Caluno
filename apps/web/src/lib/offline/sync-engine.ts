import type { CalendarScheduleView, CalendarShift, VisibleWeek } from '$lib/server/schedule';
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
