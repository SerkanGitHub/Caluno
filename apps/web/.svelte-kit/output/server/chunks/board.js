function deriveVisibleWeekConflicts(schedule) {
  const days = {};
  const shifts = {};
  const invalidShiftIds = new Set(findDuplicateShiftIds(schedule.days));
  const conflictDayKeys = [];
  const conflictingShiftIds = /* @__PURE__ */ new Set();
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
    board: totalOverlapCount > 0 ? {
      overlapCount: totalOverlapCount,
      conflictDayCount: conflictDayKeys.length,
      conflictingShiftCount: conflictingShiftIds.size,
      conflictDayKeys
    } : null,
    days,
    shifts,
    invalidShiftIds: [...invalidShiftIds].sort()
  };
}
function previewShiftConflicts(draft, existingShifts) {
  const draftRange = normalizeDraftRange(draft);
  if (!draftRange) {
    return [];
  }
  return sortCalendarShifts(existingShifts).filter((shift) => {
    if (shift.calendarId !== draft.calendarId) {
      return false;
    }
    const shiftRange = normalizeCalendarShiftRange(shift);
    if (!shiftRange) {
      return false;
    }
    return rangesOverlap(draftRange, shiftRange);
  });
}
function deriveDayConflicts(dayKey, dayShifts, invalidShiftIds) {
  const validShifts = [];
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
  const conflictsByShiftId = /* @__PURE__ */ new Map();
  const conflictPairs = [];
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
    const conflictingShifts = [...conflictsByShiftId.get(shiftId)?.values() ?? []];
    const sortedConflictingShifts = sortConflictingShifts(conflictingShifts);
    return {
      shiftId,
      dayKey,
      overlapCount: sortedConflictingShifts.length,
      conflictingShiftIds: sortedConflictingShifts.map((shift) => shift.id),
      conflictingShifts: sortedConflictingShifts
    };
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
function normalizeShiftForConflict(dayKey, shift) {
  const range = normalizeCalendarShiftRange(shift);
  if (!range) {
    return null;
  }
  if (range.startAt.slice(0, 10) !== dayKey) {
    return null;
  }
  return {
    id: shift.id,
    title: shift.title,
    dayKey,
    startAt: range.startAt,
    endAt: range.endAt
  };
}
function normalizeDraftRange(draft) {
  const startAt = draft.startAt.toISOString();
  const endAt = draft.endAt.toISOString();
  return endAt > startAt ? {
    startAt,
    endAt
  } : null;
}
function normalizeCalendarShiftRange(shift) {
  const start = new Date(shift.startAt);
  const end = new Date(shift.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    return null;
  }
  return {
    startAt: shift.startAt,
    endAt: shift.endAt
  };
}
function sortCalendarShifts(shifts) {
  return [...shifts].sort((left, right) => {
    return left.startAt.localeCompare(right.startAt) || left.endAt.localeCompare(right.endAt) || left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
  });
}
function findDuplicateShiftIds(days) {
  const counts = /* @__PURE__ */ new Map();
  for (const day of days) {
    for (const shift of day.shifts) {
      counts.set(shift.id, (counts.get(shift.id) ?? 0) + 1);
    }
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([shiftId]) => shiftId).sort();
}
function addConflictCounterpart(conflictsByShiftId, shift, counterpart) {
  const existing = conflictsByShiftId.get(shift.id) ?? /* @__PURE__ */ new Map();
  existing.set(counterpart.id, counterpart);
  conflictsByShiftId.set(shift.id, existing);
}
function sortConflictingShifts(shifts) {
  return [...shifts].sort((left, right) => {
    return left.startAt.localeCompare(right.startAt) || left.endAt.localeCompare(right.endAt) || left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
  });
}
function rangesOverlap(left, right) {
  return left.startAt < right.endAt && right.startAt < left.endAt;
}
function buildCalendarWeekBoard(schedule, options) {
  const visibleWeek = schedule.visibleWeek;
  const todayKey = toDayKey(options?.now ?? null);
  const startDate = parseUtcDate(visibleWeek.start);
  const endDate = parseUtcDate(addDayKey(visibleWeek.endExclusive, -1));
  const runtime = options?.runtime;
  const conflicts = deriveVisibleWeekConflicts(schedule);
  return {
    visibleWeekStart: visibleWeek.start,
    visibleWeekEndExclusive: visibleWeek.endExclusive,
    rangeLabel: `${formatMonthDay(startDate)} — ${formatMonthDay(endDate)}, ${startDate.getUTCFullYear()}`,
    caption: buildVisibleWeekCaption(visibleWeek, "server-sync"),
    sourceLabel: buildVisibleWeekSourceLabel(visibleWeek),
    sourceTone: visibleWeek.source === "fallback-invalid" ? "warning" : "neutral",
    previousWeekStart: addDayKey(visibleWeek.start, -7),
    nextWeekStart: addDayKey(visibleWeek.start, 7),
    totalShifts: schedule.totalShifts,
    hasShifts: schedule.totalShifts > 0,
    statusBadges: buildBoardStatusBadges(),
    conflict: buildBoardConflictModel(schedule, conflicts),
    syncPhaseLabel: formatSyncPhaseLabel("idle"),
    lastSyncAttemptLabel: runtime?.lastSyncAttemptAt ?? null,
    lastFailure: runtime?.lastFailure ?? null,
    lastSyncError: runtime?.lastSyncError ?? null,
    days: schedule.days.map((day) => buildDayColumn(day, todayKey, {}, conflicts))
  };
}
function sortShiftsForBoard(shifts) {
  return [...shifts].sort((left, right) => {
    return left.startAt.localeCompare(right.startAt) || left.endAt.localeCompare(right.endAt) || left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
  });
}
function summarizeScheduleActions(states) {
  return states.filter((state) => Boolean(state)).map((state) => ({
    id: state.id,
    label: formatActionLabel(state.action),
    tone: mapActionTone(state.status),
    state
  }));
}
function toDateTimeLocalValue(value) {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  const year = parsed.getUTCFullYear();
  const month = `${parsed.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${parsed.getUTCDate()}`.padStart(2, "0");
  const hours = `${parsed.getUTCHours()}`.padStart(2, "0");
  const minutes = `${parsed.getUTCMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
function buildDayColumn(day, todayKey, shiftDiagnostics, conflicts) {
  const date = parseUtcDate(day.dayKey);
  const dayConflict = buildDayConflictModel(day, conflicts.days[day.dayKey] ?? null);
  const shifts = sortShiftsForBoard(day.shifts).map(
    (shift) => buildShiftCardModel(shift, day.shifts.length, shiftDiagnostics, conflicts.shifts[shift.id] ?? null)
  );
  return {
    dayKey: day.dayKey,
    label: day.label,
    weekdayLabel: date.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "UTC"
    }),
    dayNumberLabel: date.toLocaleDateString("en-US", {
      day: "numeric",
      timeZone: "UTC"
    }),
    monthLabel: date.toLocaleDateString("en-US", {
      month: "short",
      timeZone: "UTC"
    }),
    isToday: todayKey === day.dayKey,
    isEmpty: shifts.length === 0,
    density: shifts.length === 0 ? "empty" : shifts.length >= 3 ? "busy" : "quiet",
    shiftCount: shifts.length,
    shifts,
    conflict: dayConflict
  };
}
function buildShiftCardModel(shift, dayShiftCount, shiftDiagnostics, shiftConflict) {
  const start = new Date(shift.startAt);
  const end = new Date(shift.endAt);
  const durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 6e4));
  const durationHours = durationMinutes / 60;
  return {
    id: shift.id,
    title: shift.title,
    dayKey: shift.startAt.slice(0, 10),
    startAt: shift.startAt,
    endAt: shift.endAt,
    startTimeLabel: formatTime(start),
    endTimeLabel: formatTime(end),
    rangeLabel: `${formatTime(start)} → ${formatTime(end)}`,
    durationLabel: durationMinutes % 60 === 0 ? `${durationHours.toFixed(0)}h block` : `${durationHours.toFixed(1)}h block`,
    occurrenceLabel: shift.occurrenceIndex ? `Occurrence ${shift.occurrenceIndex}` : null,
    sourceLabel: shift.sourceKind === "series" ? "Recurring series" : "One-off shift",
    density: dayShiftCount >= 3 ? "busy" : "quiet",
    seriesId: shift.seriesId,
    occurrenceIndex: shift.occurrenceIndex,
    sourceKind: shift.sourceKind,
    statusBadges: shiftDiagnostics[shift.id] ?? [],
    conflict: buildShiftConflictModel(shiftConflict)
  };
}
function buildBoardConflictModel(schedule, conflicts) {
  if (!conflicts.board) {
    return null;
  }
  const conflictedDayLabels = schedule.days.filter((day) => conflicts.board?.conflictDayKeys.includes(day.dayKey)).map((day) => day.label);
  return {
    overlapCount: conflicts.board.overlapCount,
    dayCount: conflicts.board.conflictDayCount,
    shiftCount: conflicts.board.conflictingShiftCount,
    conflictDayKeys: conflicts.board.conflictDayKeys,
    label: `${conflicts.board.overlapCount} overlap ${conflicts.board.overlapCount === 1 ? "pair" : "pairs"} in view`,
    detail: conflictedDayLabels.length === 1 ? `${conflictedDayLabels[0]} contains ${conflicts.board.conflictingShiftCount} conflicting visible ${conflicts.board.conflictingShiftCount === 1 ? "shift" : "shifts"}.` : `${conflictedDayLabels.length} visible days contain ${conflicts.board.conflictingShiftCount} conflicting shifts: ${formatInlineList(conflictedDayLabels)}.`
  };
}
function buildDayConflictModel(day, dayConflict) {
  if (!dayConflict) {
    return null;
  }
  const conflictingShifts = sortShiftsForBoard(day.shifts).filter((shift) => dayConflict.conflictingShiftIds.includes(shift.id));
  return {
    overlapCount: dayConflict.overlapCount,
    conflictingShiftIds: dayConflict.conflictingShiftIds,
    label: `${dayConflict.overlapCount} overlap ${dayConflict.overlapCount === 1 ? "pair" : "pairs"}`,
    detail: formatConflictShiftList(conflictingShifts)
  };
}
function buildShiftConflictModel(shiftConflict) {
  if (!shiftConflict) {
    return null;
  }
  return {
    overlapCount: shiftConflict.overlapCount,
    conflictingShiftIds: shiftConflict.conflictingShiftIds,
    label: `Overlaps ${shiftConflict.overlapCount} visible ${shiftConflict.overlapCount === 1 ? "shift" : "shifts"}`,
    detail: formatConflictShiftList(shiftConflict.conflictingShifts)
  };
}
function formatConflictShiftList(shifts) {
  const items = [...shifts].sort((left, right) => {
    return left.startAt.localeCompare(right.startAt) || left.endAt.localeCompare(right.endAt) || left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
  }).map((shift) => {
    return `${shift.title} (${formatTime(new Date(shift.startAt))} → ${formatTime(new Date(shift.endAt))})`;
  });
  if (items.length <= 2) {
    return items.join(" · ");
  }
  return `${items.slice(0, 2).join(" · ")} +${items.length - 2} more`;
}
function formatInlineList(items) {
  if (items.length <= 1) {
    return items[0] ?? "";
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
function buildBoardStatusBadges(runtime) {
  {
    return [];
  }
}
function buildVisibleWeekCaption(visibleWeek, boardSource) {
  if (visibleWeek.source === "query") {
    return boardSource === "cached-local" ? "Visible week chosen from the route query and reopened from browser-local continuity." : "Visible week chosen from the route query.";
  }
  if (visibleWeek.source === "fallback-invalid") {
    return "The requested week was malformed, so the board fell back to the current trusted week.";
  }
  return boardSource === "cached-local" ? "Showing the current week from browser-local continuity." : "Showing the current trusted week.";
}
function buildVisibleWeekSourceLabel(visibleWeek) {
  if (visibleWeek.source === "query") {
    return `Visible week start: ${visibleWeek.start}`;
  }
  if (visibleWeek.source === "fallback-invalid") {
    return `Invalid requested week ${visibleWeek.requestedStart ?? "unknown"}. Showing ${visibleWeek.start} instead.`;
  }
  return `Default visible week start: ${visibleWeek.start}`;
}
function formatActionLabel(action) {
  switch (action) {
    case "create":
      return "Create shift";
    case "edit":
      return "Edit shift";
    case "move":
      return "Move shift";
    case "delete":
      return "Delete shift";
  }
}
function mapActionTone(status) {
  switch (status) {
    case "success":
      return "success";
    case "pending-local":
    case "timeout":
      return "warning";
    case "validation-error":
    case "forbidden":
    case "write-error":
    case "malformed-response":
    case "local-write-failed":
    case "queue-persist-failed":
      return "danger";
  }
}
function formatSyncPhaseLabel(phase) {
  switch (phase) {
    case "idle":
      return "Sync idle";
    case "draining":
      return "Sync draining reconnect queue";
    case "paused-retryable":
      return "Sync paused with retryable work";
  }
}
function formatMonthDay(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
}
function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC"
  });
}
function parseUtcDate(dayKey) {
  return /* @__PURE__ */ new Date(`${dayKey}T00:00:00.000Z`);
}
function addDayKey(dayKey, amount) {
  const next = new Date(parseUtcDate(dayKey).getTime() + amount * DAY_IN_MS);
  return next.toISOString().slice(0, 10);
}
function toDayKey(value) {
  if (!value || Number.isNaN(value.getTime())) {
    return null;
  }
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())).toISOString().slice(0, 10);
}
const DAY_IN_MS = 24 * 60 * 60 * 1e3;
export {
  buildCalendarWeekBoard as b,
  previewShiftConflicts as p,
  summarizeScheduleActions as s,
  toDateTimeLocalValue as t
};
