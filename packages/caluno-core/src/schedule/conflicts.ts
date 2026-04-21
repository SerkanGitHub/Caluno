import type { CalendarScheduleView, CalendarShift, ScheduleActionState, VisibleWeek } from './types';

export type VisibleWeekConflictShift = {
  id: string;
  title: string;
  dayKey: string;
  startAt: string;
  endAt: string;
};

export type VisibleWeekShiftConflictSummary = {
  shiftId: string;
  dayKey: string;
  overlapCount: number;
  conflictingShiftIds: string[];
  conflictingShifts: VisibleWeekConflictShift[];
};

export type VisibleWeekDayConflictSummary = {
  dayKey: string;
  overlapCount: number;
  conflictingShiftIds: string[];
  conflictPairs: Array<{
    leftShiftId: string;
    rightShiftId: string;
  }>;
};

export type VisibleWeekBoardConflictSummary = {
  overlapCount: number;
  conflictDayCount: number;
  conflictingShiftCount: number;
  conflictDayKeys: string[];
};

export type VisibleWeekConflictSummary = {
  board: VisibleWeekBoardConflictSummary | null;
  days: Record<string, VisibleWeekDayConflictSummary>;
  shifts: Record<string, VisibleWeekShiftConflictSummary>;
  invalidShiftIds: string[];
};

export function deriveVisibleWeekConflicts(
  schedule: Pick<CalendarScheduleView, 'days'>
): VisibleWeekConflictSummary {
  const days: Record<string, VisibleWeekDayConflictSummary> = {};
  const shifts: Record<string, VisibleWeekShiftConflictSummary> = {};
  const invalidShiftIds = new Set<string>(findDuplicateShiftIds(schedule.days));
  const conflictDayKeys: string[] = [];
  const conflictingShiftIds = new Set<string>();
  let totalOverlapCount = 0;

  for (const day of schedule.days) {
    const dayResult = deriveDayConflicts(day.dayKey, day.shifts, invalidShiftIds);

    for (const conflict of dayResult.shiftConflicts) {
      shifts[conflict.shiftId] = conflict;
      conflictingShiftIds.add(conflict.shiftId);
    }

    if (dayResult.dayConflict) {
      days[day.dayKey] = dayResult.dayConflict;
      conflictDayKeys.push(day.dayKey);
      totalOverlapCount += dayResult.dayConflict.overlapCount;
    }
  }

  return {
    board:
      totalOverlapCount > 0
        ? {
            overlapCount: totalOverlapCount,
            conflictDayCount: conflictDayKeys.length,
            conflictingShiftCount: conflictingShiftIds.size,
            conflictDayKeys
          }
        : null,
    days,
    shifts,
    invalidShiftIds: [...invalidShiftIds].sort()
  };
}

function deriveDayConflicts(
  dayKey: string,
  dayShifts: CalendarShift[],
  invalidShiftIds: Set<string>
): {
  dayConflict: VisibleWeekDayConflictSummary | null;
  shiftConflicts: VisibleWeekShiftConflictSummary[];
} {
  const validShifts: VisibleWeekConflictShift[] = [];

  for (const shift of sortCalendarShifts(dayShifts)) {
    if (invalidShiftIds.has(shift.id)) {
      continue;
    }

    const normalized = normalizeShiftForConflict(dayKey, shift);
    if (!normalized) {
      invalidShiftIds.add(shift.id);
      continue;
    }

    validShifts.push(normalized);
  }

  if (validShifts.length < 2) {
    return {
      dayConflict: null,
      shiftConflicts: []
    };
  }

  const conflictsByShiftId = new Map<string, Map<string, VisibleWeekConflictShift>>();
  const conflictPairs: VisibleWeekDayConflictSummary['conflictPairs'] = [];

  for (let index = 0; index < validShifts.length; index += 1) {
    const current = validShifts[index];

    for (let nextIndex = index + 1; nextIndex < validShifts.length; nextIndex += 1) {
      const next = validShifts[nextIndex];
      if (next.startAt >= current.endAt) {
        break;
      }

      if (!rangesOverlap(current, next)) {
        continue;
      }

      addConflictCounterpart(conflictsByShiftId, current, next);
      addConflictCounterpart(conflictsByShiftId, next, current);
      conflictPairs.push({
        leftShiftId: current.id,
        rightShiftId: next.id
      });
    }
  }

  if (conflictPairs.length === 0) {
    return {
      dayConflict: null,
      shiftConflicts: []
    };
  }

  const conflictingShiftIds = [...conflictsByShiftId.keys()].sort();
  const shiftConflicts = conflictingShiftIds.map((shiftId) => {
    const conflictingShifts = [...(conflictsByShiftId.get(shiftId)?.values() ?? [])];
    const sortedConflictingShifts = sortConflictingShifts(conflictingShifts);

    return {
      shiftId,
      dayKey,
      overlapCount: sortedConflictingShifts.length,
      conflictingShiftIds: sortedConflictingShifts.map((shift) => shift.id),
      conflictingShifts: sortedConflictingShifts
    } satisfies VisibleWeekShiftConflictSummary;
  });

  return {
    dayConflict: {
      dayKey,
      overlapCount: conflictPairs.length,
      conflictingShiftIds,
      conflictPairs
    },
    shiftConflicts
  };
}

function normalizeShiftForConflict(dayKey: string, shift: CalendarShift): VisibleWeekConflictShift | null {
  const start = new Date(shift.startAt);
  const end = new Date(shift.endAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    return null;
  }

  if (shift.startAt.slice(0, 10) !== dayKey) {
    return null;
  }

  return {
    id: shift.id,
    title: shift.title,
    dayKey,
    startAt: shift.startAt,
    endAt: shift.endAt
  };
}

function sortCalendarShifts(shifts: CalendarShift[]): CalendarShift[] {
  return [...shifts].sort((left, right) => {
    return (
      left.startAt.localeCompare(right.startAt) ||
      left.endAt.localeCompare(right.endAt) ||
      left.title.localeCompare(right.title) ||
      left.id.localeCompare(right.id)
    );
  });
}

function findDuplicateShiftIds(days: CalendarScheduleView['days']): string[] {
  const counts = new Map<string, number>();

  for (const day of days) {
    for (const shift of day.shifts) {
      counts.set(shift.id, (counts.get(shift.id) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([shiftId]) => shiftId)
    .sort();
}

function addConflictCounterpart(
  conflictsByShiftId: Map<string, Map<string, VisibleWeekConflictShift>>,
  shift: VisibleWeekConflictShift,
  counterpart: VisibleWeekConflictShift
) {
  const existing = conflictsByShiftId.get(shift.id) ?? new Map<string, VisibleWeekConflictShift>();
  existing.set(counterpart.id, counterpart);
  conflictsByShiftId.set(shift.id, existing);
}

function sortConflictingShifts(shifts: VisibleWeekConflictShift[]): VisibleWeekConflictShift[] {
  return [...shifts].sort((left, right) => {
    return (
      left.startAt.localeCompare(right.startAt) ||
      left.endAt.localeCompare(right.endAt) ||
      left.title.localeCompare(right.title) ||
      left.id.localeCompare(right.id)
    );
  });
}

function rangesOverlap(left: VisibleWeekConflictShift, right: VisibleWeekConflictShift): boolean {
  return left.startAt < right.endAt && right.startAt < left.endAt;
}
