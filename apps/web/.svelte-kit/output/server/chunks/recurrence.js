import * as rrulePkg from "rrule";
const scheduleRecurrenceCadences = ["daily", "weekly", "monthly"];
const rruleModule = rrulePkg;
const RRule = rruleModule.RRule ?? rruleModule.default?.RRule;
({
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY
});
function normalizeVisibleRange(input) {
  const startAt = parseIsoDate(input.startAt);
  if (!startAt) {
    return {
      ok: false,
      reason: "VISIBLE_RANGE_START_INVALID",
      field: "startAt"
    };
  }
  const endAt = parseIsoDate(input.endAt);
  if (!endAt) {
    return {
      ok: false,
      reason: "VISIBLE_RANGE_END_INVALID",
      field: "endAt"
    };
  }
  if (endAt <= startAt) {
    return {
      ok: false,
      reason: "VISIBLE_RANGE_INVALID",
      field: "endAt",
      detail: "Visible range end must be after the start."
    };
  }
  const maxDays = Math.max(1, Math.trunc(input.maxDays));
  const daySpan = Math.ceil((endAt.getTime() - startAt.getTime()) / DAY_IN_MS);
  if (daySpan > maxDays) {
    return {
      ok: false,
      reason: "VISIBLE_RANGE_TOO_WIDE",
      detail: `Visible range spans ${daySpan} day(s), which exceeds the ${maxDays}-day limit.`
    };
  }
  return {
    ok: true,
    value: {
      startAt,
      endAt,
      maxDays,
      daySpan
    }
  };
}
function normalizeShiftDraft(input) {
  const title = input.title.trim();
  if (!title) {
    return {
      ok: false,
      reason: "TITLE_REQUIRED",
      field: "title"
    };
  }
  const startAt = parseIsoDate(input.startAt);
  if (!startAt) {
    return {
      ok: false,
      reason: "SHIFT_START_INVALID",
      field: "startAt"
    };
  }
  const endAt = parseIsoDate(input.endAt);
  if (!endAt) {
    return {
      ok: false,
      reason: "SHIFT_END_INVALID",
      field: "endAt"
    };
  }
  if (endAt <= startAt) {
    return {
      ok: false,
      reason: "SHIFT_END_BEFORE_START",
      field: "endAt"
    };
  }
  const recurrenceResult = normalizeRecurrence(input.recurrence ?? null, endAt);
  if (!recurrenceResult.ok) {
    return recurrenceResult;
  }
  return {
    ok: true,
    value: {
      calendarId: input.calendarId,
      title,
      startAt,
      endAt,
      durationMs: endAt.getTime() - startAt.getTime(),
      seriesId: input.seriesId ?? null,
      recurrence: recurrenceResult.value
    }
  };
}
function detectRecurrencePattern(shifts) {
  const duplicateShiftIds = findDuplicateShiftIds(shifts);
  const validShifts = sortCalendarShifts(shifts).filter((shift) => !duplicateShiftIds.has(shift.id)).map((shift) => normalizeShiftForPattern(shift)).filter((shift) => shift != null);
  if (validShifts.length < RECURRENCE_MATCH_THRESHOLD) {
    return null;
  }
  const anchorShift = validShifts[validShifts.length - 1];
  const windowStartAt = anchorShift.startAt.getTime() - RECURRENCE_LOOKBACK_DAYS * DAY_IN_MS;
  const recentShifts = validShifts.filter((shift) => {
    const startAt = shift.startAt.getTime();
    return startAt >= windowStartAt && startAt <= anchorShift.startAt.getTime();
  });
  if (recentShifts.length < RECURRENCE_MATCH_THRESHOLD) {
    return null;
  }
  const groups = /* @__PURE__ */ new Map();
  for (const shift of recentShifts) {
    const key = `${shift.weekday}|${shift.startTime}|${shift.endTime}`;
    const existing = groups.get(key) ?? [];
    existing.push(shift);
    groups.set(key, existing);
  }
  const candidates = [...groups.entries()].map(([key, matchingShifts]) => ({
    key,
    matchingShifts: sortPatternShifts(matchingShifts)
  })).filter((candidate) => candidate.matchingShifts.length >= RECURRENCE_MATCH_THRESHOLD).sort((left, right) => {
    const leftExemplar = left.matchingShifts[left.matchingShifts.length - 1];
    const rightExemplar = right.matchingShifts[right.matchingShifts.length - 1];
    return right.matchingShifts.length - left.matchingShifts.length || rightExemplar.startAt.getTime() - leftExemplar.startAt.getTime() || left.key.localeCompare(right.key);
  });
  const suggestion = candidates[0];
  if (!suggestion) {
    return null;
  }
  const exemplar = suggestion.matchingShifts[suggestion.matchingShifts.length - 1];
  return {
    cadence: "weekly",
    interval: 1,
    weekday: exemplar.weekday,
    startTime: exemplar.startTime,
    endTime: exemplar.endTime,
    exemplarShiftId: exemplar.id,
    exemplarStartAt: exemplar.startAt.toISOString(),
    exemplarEndAt: exemplar.endAt.toISOString(),
    matchCount: suggestion.matchingShifts.length,
    matchingShiftIds: suggestion.matchingShifts.map((shift) => shift.id)
  };
}
function normalizeRecurrence(input, shiftEndAt) {
  if (!input) {
    return {
      ok: true,
      value: null
    };
  }
  const hasCadence = input.cadence != null && `${input.cadence}`.trim().length > 0;
  const hasBounds = input.repeatCount != null || input.repeatUntil != null && `${input.repeatUntil}`.trim().length > 0;
  const hasInterval = input.interval != null;
  if (!hasCadence && !hasBounds && !hasInterval) {
    return {
      ok: true,
      value: null
    };
  }
  if (!hasCadence) {
    return {
      ok: false,
      reason: "RECURRENCE_CADENCE_REQUIRED",
      field: "recurrence.cadence"
    };
  }
  const cadence = `${input.cadence}`.trim().toLowerCase();
  if (!isScheduleRecurrenceCadence(cadence)) {
    return {
      ok: false,
      reason: "RECURRENCE_CADENCE_UNSUPPORTED",
      field: "recurrence.cadence"
    };
  }
  const interval = input.interval == null ? 1 : Math.trunc(input.interval);
  if (interval < 1) {
    return {
      ok: false,
      reason: "RECURRENCE_INTERVAL_INVALID",
      field: "recurrence.interval"
    };
  }
  const repeatCount = input.repeatCount == null ? null : Math.trunc(input.repeatCount);
  if (repeatCount != null && repeatCount < 1) {
    return {
      ok: false,
      reason: "RECURRENCE_REPEAT_COUNT_INVALID",
      field: "recurrence.repeatCount"
    };
  }
  const repeatUntil = input.repeatUntil ? parseIsoDate(input.repeatUntil) : null;
  if (input.repeatUntil && !repeatUntil) {
    return {
      ok: false,
      reason: "RECURRENCE_REPEAT_UNTIL_INVALID",
      field: "recurrence.repeatUntil"
    };
  }
  if (repeatUntil && repeatUntil < shiftEndAt) {
    return {
      ok: false,
      reason: "RECURRENCE_REPEAT_UNTIL_BEFORE_SHIFT_END",
      field: "recurrence.repeatUntil"
    };
  }
  if (repeatCount == null && repeatUntil == null) {
    return {
      ok: false,
      reason: "RECURRENCE_BOUND_REQUIRED",
      field: "recurrence.repeatUntil"
    };
  }
  return {
    ok: true,
    value: {
      cadence,
      interval,
      repeatCount,
      repeatUntil
    }
  };
}
function parseIsoDate(value) {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }
  const utcNormalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalizedValue) ? `${normalizedValue}:00.000Z` : normalizedValue;
  const parsed = new Date(utcNormalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function normalizeShiftForPattern(shift) {
  const startAt = parseIsoDate(shift.startAt);
  const endAt = parseIsoDate(shift.endAt);
  if (!startAt || !endAt || endAt.getTime() <= startAt.getTime()) {
    return null;
  }
  return {
    id: shift.id,
    startAt,
    endAt,
    weekday: startAt.getUTCDay(),
    startTime: toTimeOfDay(startAt),
    endTime: toTimeOfDay(endAt)
  };
}
function sortCalendarShifts(shifts) {
  return [...shifts].sort((left, right) => {
    return left.startAt.localeCompare(right.startAt) || left.endAt.localeCompare(right.endAt) || left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
  });
}
function sortPatternShifts(shifts) {
  return [...shifts].sort((left, right) => {
    return left.startAt.getTime() - right.startAt.getTime() || left.endAt.getTime() - right.endAt.getTime() || left.id.localeCompare(right.id);
  });
}
function findDuplicateShiftIds(shifts) {
  const counts = /* @__PURE__ */ new Map();
  for (const shift of shifts) {
    counts.set(shift.id, (counts.get(shift.id) ?? 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([shiftId]) => shiftId));
}
function toTimeOfDay(date) {
  return `${`${date.getUTCHours()}`.padStart(2, "0")}:${`${date.getUTCMinutes()}`.padStart(2, "0")}`;
}
function isScheduleRecurrenceCadence(value) {
  return scheduleRecurrenceCadences.includes(value);
}
const DAY_IN_MS = 24 * 60 * 60 * 1e3;
const RECURRENCE_LOOKBACK_DAYS = 30;
const RECURRENCE_MATCH_THRESHOLD = 3;
export {
  normalizeVisibleRange as a,
  detectRecurrencePattern as d,
  normalizeShiftDraft as n
};
