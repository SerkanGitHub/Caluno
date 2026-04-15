import { fail } from "@sveltejs/kit";
import { a as describeDeniedCalendarReason } from "../../../../../chunks/app-shell.js";
import { randomUUID } from "node:crypto";
import rrulePkg from "rrule";
import { r as resolveCalendarAccess } from "../../../../../chunks/contract.js";
const scheduleRecurrenceCadences = ["daily", "weekly", "monthly"];
const { RRule: RRule$1 } = rrulePkg;
({
  daily: RRule$1.DAILY,
  weekly: RRule$1.WEEKLY,
  monthly: RRule$1.MONTHLY
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
  const daySpan = Math.ceil((endAt.getTime() - startAt.getTime()) / DAY_IN_MS$1);
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
function isScheduleRecurrenceCadence(value) {
  return scheduleRecurrenceCadences.includes(value);
}
const DAY_IN_MS$1 = 24 * 60 * 60 * 1e3;
const { RRule } = rrulePkg;
const recurrenceFrequencyByCadence = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY
};
function resolveVisibleWeek(searchParams, now = /* @__PURE__ */ new Date()) {
  const requestedStart = searchParams.get("start")?.trim() || null;
  if (requestedStart) {
    const parsedRequested = parseIsoDay(requestedStart);
    if (parsedRequested) {
      return buildVisibleWeek(parsedRequested, "query", requestedStart, null);
    }
    return buildVisibleWeek(startOfUtcWeek(now), "fallback-invalid", requestedStart, "VISIBLE_WEEK_START_INVALID");
  }
  return buildVisibleWeek(startOfUtcWeek(now), "default", null, null);
}
function createEmptyCalendarScheduleView(visibleWeek) {
  return {
    status: "ready",
    reason: visibleWeek.reason,
    message: visibleWeek.reason === "VISIBLE_WEEK_START_INVALID" ? "The requested week start was invalid, so the route fell back to the current trusted week." : "The requested visible week resolved successfully.",
    visibleWeek,
    days: visibleWeek.dayKeys.map((dayKey) => ({
      dayKey,
      label: formatDayLabel(dayKey),
      shifts: []
    })),
    totalShifts: 0,
    shiftIds: []
  };
}
async function loadCalendarScheduleView(params) {
  const visibleWeek = resolveVisibleWeek(params.searchParams, params.now);
  const emptyView = createEmptyCalendarScheduleView(visibleWeek);
  const query = params.supabase.from("shifts").select("id, calendar_id, series_id, title, start_at, end_at, occurrence_index, source_kind").eq("calendar_id", params.calendarId).lt("start_at", visibleWeek.endAt).gt("end_at", visibleWeek.startAt).order("start_at", { ascending: true }).order("end_at", { ascending: true });
  const result = await query;
  if (result.error) {
    const timeout = isTimeoutMessage(result.error.message);
    return {
      ...emptyView,
      status: timeout ? "timeout" : "query-error",
      reason: timeout ? "SCHEDULE_LOAD_TIMEOUT" : "SCHEDULE_LOAD_FAILED",
      message: timeout ? "The visible-week schedule query timed out before trusted shift data could be returned." : "The visible-week schedule query failed, so the calendar stayed on the current bounded range."
    };
  }
  if (!Array.isArray(result.data)) {
    return {
      ...emptyView,
      status: "malformed-response",
      reason: "SCHEDULE_LOAD_RESPONSE_INVALID",
      message: "The schedule query returned malformed data, so the route refused to render guessed shifts."
    };
  }
  const mappedShifts = result.data.map(mapShiftRow).sort(compareShiftTimes);
  const groupedDays = emptyView.days.map((day) => ({
    ...day,
    shifts: mappedShifts.filter((shift) => day.dayKey === shift.startAt.slice(0, 10))
  }));
  return {
    status: "ready",
    reason: emptyView.reason,
    message: emptyView.message,
    visibleWeek,
    days: groupedDays,
    totalShifts: mappedShifts.length,
    shiftIds: mappedShifts.map((shift) => shift.id)
  };
}
function resolveTrustedCalendarFromAppShell(params) {
  if (!Array.isArray(params.memberships) || !Array.isArray(params.calendars)) {
    return {
      ok: false,
      reason: "group-membership-missing",
      failurePhase: "calendar-authorization"
    };
  }
  if (!isUuidLike(params.calendarId)) {
    return {
      ok: false,
      reason: "calendar-id-invalid",
      failurePhase: "calendar-param"
    };
  }
  const accessResult = resolveCalendarAccess({
    calendars: params.calendars,
    memberships: params.memberships,
    calendarId: params.calendarId,
    userId: params.userId
  });
  if (!accessResult.allowed) {
    const reason = accessResult.reason === "authenticated-group-member" ? "group-membership-missing" : accessResult.reason;
    return {
      ok: false,
      reason,
      failurePhase: reason === "calendar-missing" ? "calendar-lookup" : "calendar-authorization"
    };
  }
  return {
    ok: true,
    calendar: params.calendars.find((calendar) => calendar.id === params.calendarId),
    memberships: params.memberships,
    calendars: params.calendars
  };
}
function normalizeCreateShiftFields(formData) {
  return {
    title: readFormValue(formData, "title"),
    startAt: readFormValue(formData, "startAt"),
    endAt: readFormValue(formData, "endAt"),
    recurrenceCadence: readFormValue(formData, "recurrenceCadence"),
    recurrenceInterval: readFormValue(formData, "recurrenceInterval"),
    repeatCount: readFormValue(formData, "repeatCount"),
    repeatUntil: readFormValue(formData, "repeatUntil")
  };
}
function normalizeShiftMutationFields(formData) {
  return {
    shiftId: readFormValue(formData, "shiftId"),
    title: readFormValue(formData, "title"),
    startAt: readFormValue(formData, "startAt"),
    endAt: readFormValue(formData, "endAt")
  };
}
function validateCreateShiftForm(params) {
  const fields = normalizeCreateShiftFields(params.formData);
  return normalizeShiftDraft({
    calendarId: params.calendarId,
    title: fields.title,
    startAt: fields.startAt,
    endAt: fields.endAt,
    recurrence: {
      cadence: fields.recurrenceCadence || null,
      interval: parseOptionalInteger(fields.recurrenceInterval),
      repeatCount: parseOptionalInteger(fields.repeatCount),
      repeatUntil: fields.repeatUntil || null
    }
  });
}
async function createScheduleShift(params) {
  const visibleWeek = resolveVisibleWeek(params.searchParams);
  const fields = normalizeCreateShiftFields(params.formData);
  if (!isUuidLike(params.calendarId)) {
    return actionFailure({
      action: "create",
      visibleWeek,
      status: 400,
      actionStatus: "forbidden",
      reason: "CALENDAR_ID_INVALID",
      message: "The route calendar id was invalid, so the shift write was rejected before any lookup ran.",
      fields
    });
  }
  const scope = await resolveCalendarWriteScope({
    supabase: params.supabase,
    calendarId: params.calendarId,
    userId: params.userId
  });
  if (!scope.ok) {
    return actionFailure({
      action: "create",
      visibleWeek,
      status: scope.status,
      actionStatus: scope.actionStatus,
      reason: scope.reason,
      message: scope.message,
      fields
    });
  }
  const normalized = validateCreateShiftForm({
    calendarId: params.calendarId,
    formData: params.formData
  });
  if (!normalized.ok) {
    return actionFailure({
      action: "create",
      visibleWeek,
      status: 400,
      actionStatus: "validation-error",
      reason: normalized.reason,
      message: describeValidationReason(normalized.reason),
      fields
    });
  }
  if (!normalized.value.recurrence) {
    const generatedShiftId = randomUUID();
    const insertResult = await params.supabase.from("shifts").insert({
      id: generatedShiftId,
      calendar_id: params.calendarId,
      series_id: null,
      title: normalized.value.title,
      start_at: normalized.value.startAt.toISOString(),
      end_at: normalized.value.endAt.toISOString(),
      occurrence_index: null,
      source_kind: "single",
      created_by: params.userId
    });
    if (insertResult.error) {
      return actionFailure({
        action: "create",
        visibleWeek,
        status: isTimeoutMessage(insertResult.error.message) ? 504 : 400,
        actionStatus: isTimeoutMessage(insertResult.error.message) ? "timeout" : "write-error",
        reason: isTimeoutMessage(insertResult.error.message) ? "SCHEDULE_CREATE_TIMEOUT" : "SCHEDULE_CREATE_FAILED",
        message: isTimeoutMessage(insertResult.error.message) ? "The shift create request timed out before the write could be confirmed." : "The shift could not be created, so the visible board stayed unchanged.",
        fields
      });
    }
    return actionSuccess({
      action: "create",
      visibleWeek,
      reason: "SHIFT_CREATED",
      message: "The shift was created inside the current trusted calendar.",
      fields,
      shiftId: generatedShiftId,
      affectedShiftIds: [generatedShiftId]
    });
  }
  const generatedSeriesId = randomUUID();
  const seriesInsert = await params.supabase.from("shift_series").insert({
    id: generatedSeriesId,
    calendar_id: params.calendarId,
    title: normalized.value.title,
    starts_at: normalized.value.startAt.toISOString(),
    ends_at: normalized.value.endAt.toISOString(),
    recurrence_cadence: normalized.value.recurrence.cadence,
    recurrence_interval: normalized.value.recurrence.interval,
    repeat_count: normalized.value.recurrence.repeatCount,
    repeat_until: normalized.value.recurrence.repeatUntil?.toISOString() ?? null,
    timezone_name: "UTC",
    created_by: params.userId
  });
  if (seriesInsert.error) {
    return actionFailure({
      action: "create",
      visibleWeek,
      status: isTimeoutMessage(seriesInsert.error.message) ? 504 : 400,
      actionStatus: isTimeoutMessage(seriesInsert.error.message) ? "timeout" : "write-error",
      reason: isTimeoutMessage(seriesInsert.error.message) ? "SCHEDULE_CREATE_TIMEOUT" : "SCHEDULE_CREATE_FAILED",
      message: isTimeoutMessage(seriesInsert.error.message) ? "The recurring shift create request timed out before the series could be confirmed." : "The recurring shift series could not be created, so no occurrences were added.",
      fields
    });
  }
  const occurrenceRows = buildRecurringShiftInsertRows({
    calendarId: params.calendarId,
    userId: params.userId,
    seriesId: generatedSeriesId,
    normalizedShift: normalized.value
  });
  const shiftsInsert = await params.supabase.from("shifts").insert(occurrenceRows);
  if (shiftsInsert.error) {
    await params.supabase.from("shift_series").delete().eq("id", generatedSeriesId).eq("calendar_id", params.calendarId);
    return actionFailure({
      action: "create",
      visibleWeek,
      status: isTimeoutMessage(shiftsInsert.error.message) ? 504 : 400,
      actionStatus: isTimeoutMessage(shiftsInsert.error.message) ? "timeout" : "write-error",
      reason: isTimeoutMessage(shiftsInsert.error.message) ? "SCHEDULE_CREATE_TIMEOUT" : "SCHEDULE_CREATE_FAILED",
      message: isTimeoutMessage(shiftsInsert.error.message) ? "The recurring occurrence write timed out, so the series was rolled back." : "The recurring occurrence write failed, so the series was rolled back and the board stayed unchanged.",
      fields,
      seriesId: generatedSeriesId
    });
  }
  const affectedShiftIds = occurrenceRows.map((row) => row.id);
  return actionSuccess({
    action: "create",
    visibleWeek,
    reason: "SHIFT_CREATED",
    message: "The recurring shift series and its concrete occurrences were created inside the current trusted calendar.",
    fields,
    seriesId: generatedSeriesId,
    affectedShiftIds,
    shiftId: affectedShiftIds[0] ?? null
  });
}
async function editScheduleShift(params) {
  const visibleWeek = resolveVisibleWeek(params.searchParams);
  const fields = normalizeShiftMutationFields(params.formData);
  const scope = await resolveCalendarWriteScope({
    supabase: params.supabase,
    calendarId: params.calendarId,
    userId: params.userId
  });
  if (!scope.ok) {
    return actionFailure({
      action: "edit",
      visibleWeek,
      status: scope.status,
      actionStatus: scope.actionStatus,
      reason: scope.reason,
      message: scope.message,
      fields
    });
  }
  if (!isUuidLike(fields.shiftId)) {
    return actionFailure({
      action: "edit",
      visibleWeek,
      status: 400,
      actionStatus: "validation-error",
      reason: "SHIFT_ID_INVALID",
      message: "The requested shift id was malformed, so the edit was rejected before any lookup ran.",
      fields
    });
  }
  const draftResult = normalizeShiftDraft({
    calendarId: params.calendarId,
    title: fields.title,
    startAt: fields.startAt,
    endAt: fields.endAt,
    seriesId: null,
    recurrence: null
  });
  if (!draftResult.ok) {
    return actionFailure({
      action: "edit",
      visibleWeek,
      status: 400,
      actionStatus: "validation-error",
      reason: draftResult.reason,
      message: describeValidationReason(draftResult.reason),
      fields,
      shiftId: fields.shiftId
    });
  }
  const authority = await resolveShiftWriteAuthority({
    supabase: params.supabase,
    shiftId: fields.shiftId,
    calendarId: params.calendarId
  });
  if (!authority.ok) {
    return actionFailure({
      action: "edit",
      visibleWeek,
      status: authority.status,
      actionStatus: authority.actionStatus,
      reason: authority.reason,
      message: authority.message,
      fields,
      shiftId: fields.shiftId
    });
  }
  const updateResult = await params.supabase.from("shifts").update({
    title: draftResult.value.title,
    start_at: draftResult.value.startAt.toISOString(),
    end_at: draftResult.value.endAt.toISOString()
  }).eq("id", fields.shiftId).eq("calendar_id", params.calendarId).select("id, calendar_id, series_id, title, start_at, end_at, occurrence_index, source_kind");
  return finalizeSingleShiftMutation({
    action: "edit",
    visibleWeek,
    fields,
    submittedShiftId: fields.shiftId,
    successReason: "SHIFT_UPDATED",
    successMessage: "The shift details were updated inside the current trusted calendar.",
    writeResult: updateResult
  });
}
async function moveScheduleShift(params) {
  const visibleWeek = resolveVisibleWeek(params.searchParams);
  const fields = normalizeShiftMutationFields(params.formData);
  const scope = await resolveCalendarWriteScope({
    supabase: params.supabase,
    calendarId: params.calendarId,
    userId: params.userId
  });
  if (!scope.ok) {
    return actionFailure({
      action: "move",
      visibleWeek,
      status: scope.status,
      actionStatus: scope.actionStatus,
      reason: scope.reason,
      message: scope.message,
      fields
    });
  }
  if (!isUuidLike(fields.shiftId)) {
    return actionFailure({
      action: "move",
      visibleWeek,
      status: 400,
      actionStatus: "validation-error",
      reason: "SHIFT_ID_INVALID",
      message: "The requested shift id was malformed, so the move was rejected before any lookup ran.",
      fields
    });
  }
  const startAt = fields.startAt.trim();
  const endAt = fields.endAt.trim();
  const visibleRangeResult = normalizeVisibleRange({
    startAt,
    endAt,
    maxDays: 7
  });
  if (!visibleRangeResult.ok) {
    return actionFailure({
      action: "move",
      visibleWeek,
      status: 400,
      actionStatus: "validation-error",
      reason: visibleRangeResult.reason,
      message: describeValidationReason(visibleRangeResult.reason),
      fields,
      shiftId: fields.shiftId
    });
  }
  const authority = await resolveShiftWriteAuthority({
    supabase: params.supabase,
    shiftId: fields.shiftId,
    calendarId: params.calendarId
  });
  if (!authority.ok) {
    return actionFailure({
      action: "move",
      visibleWeek,
      status: authority.status,
      actionStatus: authority.actionStatus,
      reason: authority.reason,
      message: authority.message,
      fields,
      shiftId: fields.shiftId
    });
  }
  const updateResult = await params.supabase.from("shifts").update({
    start_at: visibleRangeResult.value.startAt.toISOString(),
    end_at: visibleRangeResult.value.endAt.toISOString()
  }).eq("id", fields.shiftId).eq("calendar_id", params.calendarId).select("id, calendar_id, series_id, title, start_at, end_at, occurrence_index, source_kind");
  return finalizeSingleShiftMutation({
    action: "move",
    visibleWeek,
    fields,
    submittedShiftId: fields.shiftId,
    successReason: "SHIFT_MOVED",
    successMessage: "The shift range was moved inside the current trusted calendar.",
    writeResult: updateResult
  });
}
async function deleteScheduleShift(params) {
  const visibleWeek = resolveVisibleWeek(params.searchParams);
  const fields = normalizeShiftMutationFields(params.formData);
  const scope = await resolveCalendarWriteScope({
    supabase: params.supabase,
    calendarId: params.calendarId,
    userId: params.userId
  });
  if (!scope.ok) {
    return actionFailure({
      action: "delete",
      visibleWeek,
      status: scope.status,
      actionStatus: scope.actionStatus,
      reason: scope.reason,
      message: scope.message,
      fields
    });
  }
  if (!isUuidLike(fields.shiftId)) {
    return actionFailure({
      action: "delete",
      visibleWeek,
      status: 400,
      actionStatus: "validation-error",
      reason: "SHIFT_ID_INVALID",
      message: "The requested shift id was malformed, so the delete was rejected before any lookup ran.",
      fields
    });
  }
  const authority = await resolveShiftWriteAuthority({
    supabase: params.supabase,
    shiftId: fields.shiftId,
    calendarId: params.calendarId
  });
  if (!authority.ok) {
    return actionFailure({
      action: "delete",
      visibleWeek,
      status: authority.status,
      actionStatus: authority.actionStatus,
      reason: authority.reason,
      message: authority.message,
      fields,
      shiftId: fields.shiftId
    });
  }
  const deleteResult = await params.supabase.from("shifts").delete().eq("id", fields.shiftId).eq("calendar_id", params.calendarId).select("id, calendar_id, series_id, title, start_at, end_at, occurrence_index, source_kind");
  return finalizeSingleShiftMutation({
    action: "delete",
    visibleWeek,
    fields,
    submittedShiftId: fields.shiftId,
    successReason: "SHIFT_DELETED",
    successMessage: "The shift was deleted from the current trusted calendar.",
    writeResult: deleteResult
  });
}
function actionSuccess(params) {
  return {
    status: 200,
    state: {
      action: params.action,
      status: "success",
      reason: params.reason,
      message: params.message,
      visibleWeekStart: params.visibleWeek.start,
      shiftId: params.shiftId ?? null,
      seriesId: params.seriesId ?? null,
      affectedShiftIds: params.affectedShiftIds,
      fields: params.fields
    }
  };
}
function actionFailure(params) {
  return {
    status: params.status,
    state: {
      action: params.action,
      status: params.actionStatus,
      reason: params.reason,
      message: params.message,
      visibleWeekStart: params.visibleWeek.start,
      shiftId: params.shiftId ?? null,
      seriesId: params.seriesId ?? null,
      affectedShiftIds: params.affectedShiftIds ?? [],
      fields: params.fields
    }
  };
}
async function resolveCalendarWriteScope(params) {
  const calendarResult = await params.supabase.from("calendars").select("id, group_id, name, is_default").eq("id", params.calendarId);
  if (calendarResult.error) {
    return {
      ok: false,
      status: isTimeoutMessage(calendarResult.error.message) ? 504 : 400,
      actionStatus: isTimeoutMessage(calendarResult.error.message) ? "timeout" : "forbidden",
      reason: isTimeoutMessage(calendarResult.error.message) ? "CALENDAR_SCOPE_TIMEOUT" : "CALENDAR_SCOPE_FAILED",
      message: isTimeoutMessage(calendarResult.error.message) ? "The trusted calendar scope lookup timed out before the write could be authorized." : "The trusted calendar scope could not be resolved, so the write failed closed."
    };
  }
  const calendar = calendarResult.data?.[0] ?? null;
  if (!calendar?.id || !calendar.group_id) {
    return {
      ok: false,
      status: calendar === null ? 403 : 502,
      actionStatus: calendar === null ? "forbidden" : "malformed-response",
      reason: calendar === null ? "CALENDAR_NOT_PERMITTED" : "CALENDAR_SCOPE_RESPONSE_INVALID",
      message: calendar === null ? "That calendar is outside the trusted route scope, so the write was rejected." : "The calendar scope lookup returned malformed data, so the write failed closed."
    };
  }
  const membershipResult = await params.supabase.from("group_memberships").select("group_id, role").eq("user_id", params.userId).eq("group_id", calendar.group_id);
  if (membershipResult.error) {
    return {
      ok: false,
      status: isTimeoutMessage(membershipResult.error.message) ? 504 : 400,
      actionStatus: isTimeoutMessage(membershipResult.error.message) ? "timeout" : "forbidden",
      reason: isTimeoutMessage(membershipResult.error.message) ? "CALENDAR_SCOPE_TIMEOUT" : "CALENDAR_SCOPE_MEMBERSHIP_FAILED",
      message: isTimeoutMessage(membershipResult.error.message) ? "The trusted membership check timed out before the write could be authorized." : "The trusted membership scope could not be confirmed, so the write failed closed."
    };
  }
  const membership = membershipResult.data?.[0] ?? null;
  if (!membership?.group_id || !membership.role) {
    return {
      ok: false,
      status: membership === null ? 403 : 502,
      actionStatus: membership === null ? "forbidden" : "malformed-response",
      reason: membership === null ? "CALENDAR_NOT_PERMITTED" : "CALENDAR_SCOPE_RESPONSE_INVALID",
      message: membership === null ? "Your session is not trusted for the calendar behind this route, so the write was rejected." : "The membership scope lookup returned malformed data, so the write failed closed."
    };
  }
  return {
    ok: true,
    calendar,
    membership: {
      groupId: membership.group_id,
      userId: params.userId,
      role: membership.role
    }
  };
}
async function resolveShiftWriteAuthority(params) {
  const result = await params.supabase.from("shifts").select("id, calendar_id, series_id, title, start_at, end_at, occurrence_index, source_kind").eq("id", params.shiftId);
  if (result.error) {
    return {
      ok: false,
      status: isTimeoutMessage(result.error.message) ? 504 : 400,
      actionStatus: isTimeoutMessage(result.error.message) ? "timeout" : "forbidden",
      reason: isTimeoutMessage(result.error.message) ? "SHIFT_LOOKUP_TIMEOUT" : "SHIFT_LOOKUP_FAILED",
      message: isTimeoutMessage(result.error.message) ? "The trusted shift lookup timed out before the write could be authorized." : "The trusted shift lookup failed, so the write was rejected."
    };
  }
  const shift = result.data?.[0] ?? null;
  if (!shift) {
    return {
      ok: false,
      status: 404,
      actionStatus: "forbidden",
      reason: "SHIFT_NOT_FOUND",
      message: "The requested shift was not found inside the trusted write scope."
    };
  }
  if (!isShiftRow(shift)) {
    return {
      ok: false,
      status: 502,
      actionStatus: "malformed-response",
      reason: "SHIFT_LOOKUP_RESPONSE_INVALID",
      message: "The trusted shift lookup returned malformed data, so the write failed closed."
    };
  }
  if (shift.calendar_id !== params.calendarId) {
    return {
      ok: false,
      status: 403,
      actionStatus: "forbidden",
      reason: "SHIFT_CALENDAR_MISMATCH",
      message: "That shift belongs to a different calendar than the current trusted route."
    };
  }
  return {
    ok: true,
    shift
  };
}
function finalizeSingleShiftMutation(params) {
  if (params.writeResult.error) {
    return actionFailure({
      action: params.action,
      visibleWeek: params.visibleWeek,
      status: isTimeoutMessage(params.writeResult.error.message) ? 504 : 400,
      actionStatus: isTimeoutMessage(params.writeResult.error.message) ? "timeout" : "write-error",
      reason: isTimeoutMessage(params.writeResult.error.message) ? `SCHEDULE_${params.action.toUpperCase()}_TIMEOUT` : `SCHEDULE_${params.action.toUpperCase()}_FAILED`,
      message: isTimeoutMessage(params.writeResult.error.message) ? `The ${params.action} request timed out before the shift write could be confirmed.` : `The ${params.action} request failed, so the visible board stayed unchanged.`,
      fields: params.fields,
      shiftId: params.submittedShiftId
    });
  }
  const shiftedRow = params.writeResult.data?.[0] ?? null;
  if (!shiftedRow || !isShiftRow(shiftedRow)) {
    return actionFailure({
      action: params.action,
      visibleWeek: params.visibleWeek,
      status: 502,
      actionStatus: "malformed-response",
      reason: `SCHEDULE_${params.action.toUpperCase()}_RESPONSE_INVALID`,
      message: `The ${params.action} write returned malformed data, so the browser did not assume success.`,
      fields: params.fields,
      shiftId: params.submittedShiftId
    });
  }
  return actionSuccess({
    action: params.action,
    visibleWeek: params.visibleWeek,
    reason: params.successReason,
    message: params.successMessage,
    fields: params.fields,
    shiftId: shiftedRow.id,
    seriesId: shiftedRow.series_id,
    affectedShiftIds: [shiftedRow.id]
  });
}
function buildRecurringShiftInsertRows(params) {
  const occurrences = expandRecurringOccurrences(params.normalizedShift);
  return occurrences.map((occurrence) => ({
    id: randomUUID(),
    calendar_id: params.calendarId,
    series_id: params.seriesId,
    title: params.normalizedShift.title,
    start_at: occurrence.startAt,
    end_at: occurrence.endAt,
    occurrence_index: occurrence.occurrenceIndex,
    source_kind: "series",
    created_by: params.userId
  }));
}
function expandRecurringOccurrences(normalizedShift) {
  if (!normalizedShift.recurrence) {
    return [
      {
        occurrenceIndex: 1,
        startAt: normalizedShift.startAt.toISOString(),
        endAt: normalizedShift.endAt.toISOString()
      }
    ];
  }
  const rule = new RRule({
    freq: recurrenceFrequencyByCadence[normalizedShift.recurrence.cadence],
    interval: normalizedShift.recurrence.interval,
    count: normalizedShift.recurrence.repeatCount ?? void 0,
    until: normalizedShift.recurrence.repeatUntil ?? void 0,
    dtstart: normalizedShift.startAt
  });
  return rule.all().map((occurrenceStart, index) => {
    const occurrenceEnd = new Date(occurrenceStart.getTime() + normalizedShift.durationMs);
    return {
      occurrenceIndex: index + 1,
      startAt: occurrenceStart.toISOString(),
      endAt: occurrenceEnd.toISOString()
    };
  });
}
function buildVisibleWeek(startDate, source, requestedStart, reason) {
  const weekStart = startOfUtcDay(startDate);
  const weekEnd = addUtcDays(weekStart, 7);
  return {
    start: weekStart.toISOString().slice(0, 10),
    endExclusive: weekEnd.toISOString().slice(0, 10),
    startAt: weekStart.toISOString(),
    endAt: weekEnd.toISOString(),
    requestedStart,
    source,
    reason,
    dayKeys: Array.from({ length: 7 }, (_, index) => addUtcDays(weekStart, index).toISOString().slice(0, 10))
  };
}
function compareShiftTimes(left, right) {
  return left.startAt.localeCompare(right.startAt) || left.endAt.localeCompare(right.endAt) || left.title.localeCompare(right.title);
}
function mapShiftRow(row) {
  return {
    id: row.id,
    calendarId: row.calendar_id,
    seriesId: row.series_id,
    title: row.title,
    startAt: row.start_at,
    endAt: row.end_at,
    occurrenceIndex: row.occurrence_index,
    sourceKind: row.source_kind
  };
}
function parseIsoDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function startOfUtcWeek(value) {
  const dayStart = startOfUtcDay(value);
  const dayOfWeek = dayStart.getUTCDay();
  const daysFromMonday = (dayOfWeek + 6) % 7;
  return addUtcDays(dayStart, -daysFromMonday);
}
function startOfUtcDay(value) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}
function addUtcDays(value, amount) {
  return new Date(value.getTime() + amount * DAY_IN_MS);
}
function formatDayLabel(dayKey) {
  const date = parseIsoDay(dayKey);
  return (date ?? /* @__PURE__ */ new Date(`${dayKey}T00:00:00.000Z`)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
}
function describeValidationReason(reason) {
  switch (reason) {
    case "TITLE_REQUIRED":
      return "Give the shift a title before saving it.";
    case "SHIFT_START_INVALID":
      return "Provide a valid shift start time before saving.";
    case "SHIFT_END_INVALID":
      return "Provide a valid shift end time before saving.";
    case "SHIFT_END_BEFORE_START":
      return "The shift end must be after the shift start.";
    case "RECURRENCE_CADENCE_REQUIRED":
      return "Choose a recurrence cadence before creating a recurring shift.";
    case "RECURRENCE_CADENCE_UNSUPPORTED":
      return "That recurrence cadence is not supported.";
    case "RECURRENCE_INTERVAL_INVALID":
      return "The recurrence interval must be at least 1.";
    case "RECURRENCE_BOUND_REQUIRED":
      return "Recurring shifts need a repeat count or repeat-until bound.";
    case "RECURRENCE_REPEAT_COUNT_INVALID":
      return "The repeat count must be at least 1.";
    case "RECURRENCE_REPEAT_UNTIL_INVALID":
      return "Provide a valid repeat-until timestamp.";
    case "RECURRENCE_REPEAT_UNTIL_BEFORE_SHIFT_END":
      return "The repeat-until timestamp must not land before the shift ends.";
    case "VISIBLE_RANGE_START_INVALID":
      return "Provide a valid visible-range start time.";
    case "VISIBLE_RANGE_END_INVALID":
      return "Provide a valid visible-range end time.";
    case "VISIBLE_RANGE_INVALID":
      return "The visible range end must be after the start.";
    case "VISIBLE_RANGE_TOO_WIDE":
      return "That move would widen the schedule range beyond the allowed week.";
  }
}
function parseOptionalInteger(value) {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}
function readFormValue(formData, key) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
function isTimeoutMessage(message) {
  return /timeout/i.test(message ?? "");
}
function isShiftRow(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value;
  return typeof candidate.id === "string" && typeof candidate.calendar_id === "string" && typeof candidate.title === "string" && typeof candidate.start_at === "string" && typeof candidate.end_at === "string" && (candidate.series_id === null || typeof candidate.series_id === "string") && (candidate.occurrence_index === null || typeof candidate.occurrence_index === "number") && (candidate.source_kind === "single" || candidate.source_kind === "series");
}
function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
const DAY_IN_MS = 24 * 60 * 60 * 1e3;
function buildDeniedCalendarView(params) {
  return {
    calendarView: {
      kind: "denied",
      attemptedCalendarId: params.calendarId,
      failurePhase: params.failurePhase,
      reason: params.reason,
      detail: describeDeniedCalendarReason(params.reason),
      welcome: params.welcome
    }
  };
}
async function requireAuthenticatedUser(locals) {
  const authState = await locals.safeGetSession();
  return authState.authStatus === "authenticated" && authState.user ? authState.user : null;
}
function buildAuthRequiredActionState(action, url) {
  const visibleWeek = resolveVisibleWeek(url.searchParams);
  return {
    action,
    status: "forbidden",
    reason: "AUTH_REQUIRED",
    message: "Your trusted session expired before the schedule write could be authorized.",
    visibleWeekStart: visibleWeek.start,
    shiftId: null,
    seriesId: null,
    affectedShiftIds: [],
    fields: {}
  };
}
function respondWithActionResult(key, result) {
  if (result.status >= 400) {
    return fail(result.status, {
      [key]: result.state
    });
  }
  return {
    [key]: result.state
  };
}
function resolveActionSearchParams(url, formData) {
  const searchParams = new URLSearchParams(url.searchParams);
  const submittedWeekStart = formData.get("visibleWeekStart");
  if (!searchParams.get("start") && typeof submittedWeekStart === "string" && submittedWeekStart.trim()) {
    searchParams.set("start", submittedWeekStart.trim());
  }
  return searchParams;
}
const load = async ({ params, parent, url, locals }) => {
  const { appShell, user } = await parent();
  const calendarState = resolveTrustedCalendarFromAppShell({
    calendarId: params.calendarId,
    userId: user?.id ?? null,
    memberships: appShell?.memberships,
    calendars: appShell?.calendars
  });
  if (!calendarState.ok) {
    return buildDeniedCalendarView({
      calendarId: params.calendarId,
      reason: calendarState.reason,
      failurePhase: calendarState.failurePhase,
      welcome: url.searchParams.get("welcome")
    });
  }
  const group = Array.isArray(appShell?.groups) ? appShell.groups.find((candidate) => candidate.id === calendarState.calendar.groupId) ?? null : null;
  const schedule = await loadCalendarScheduleView({
    supabase: locals.supabase,
    calendarId: calendarState.calendar.id,
    searchParams: url.searchParams
  });
  return {
    calendarView: {
      kind: "calendar",
      calendar: calendarState.calendar,
      group,
      welcome: url.searchParams.get("welcome"),
      visibleWeek: schedule.visibleWeek,
      schedule
    }
  };
};
const actions = {
  createShift: async ({ request, locals, params, url }) => {
    const formData = await request.formData();
    const actionSearchParams = resolveActionSearchParams(url, formData);
    const user = await requireAuthenticatedUser(locals);
    if (!user) {
      return fail(401, {
        createShift: buildAuthRequiredActionState("create", new URL(`${url.origin}${url.pathname}?${actionSearchParams.toString()}`))
      });
    }
    const result = await createScheduleShift({
      supabase: locals.supabase,
      calendarId: params.calendarId,
      userId: user.id,
      searchParams: actionSearchParams,
      formData
    });
    return respondWithActionResult("createShift", result);
  },
  editShift: async ({ request, locals, params, url }) => {
    const formData = await request.formData();
    const actionSearchParams = resolveActionSearchParams(url, formData);
    const user = await requireAuthenticatedUser(locals);
    if (!user) {
      return fail(401, {
        editShift: buildAuthRequiredActionState("edit", new URL(`${url.origin}${url.pathname}?${actionSearchParams.toString()}`))
      });
    }
    const result = await editScheduleShift({
      supabase: locals.supabase,
      calendarId: params.calendarId,
      userId: user.id,
      searchParams: actionSearchParams,
      formData
    });
    return respondWithActionResult("editShift", result);
  },
  moveShift: async ({ request, locals, params, url }) => {
    const formData = await request.formData();
    const actionSearchParams = resolveActionSearchParams(url, formData);
    const user = await requireAuthenticatedUser(locals);
    if (!user) {
      return fail(401, {
        moveShift: buildAuthRequiredActionState("move", new URL(`${url.origin}${url.pathname}?${actionSearchParams.toString()}`))
      });
    }
    const result = await moveScheduleShift({
      supabase: locals.supabase,
      calendarId: params.calendarId,
      userId: user.id,
      searchParams: actionSearchParams,
      formData
    });
    return respondWithActionResult("moveShift", result);
  },
  deleteShift: async ({ request, locals, params, url }) => {
    const formData = await request.formData();
    const actionSearchParams = resolveActionSearchParams(url, formData);
    const user = await requireAuthenticatedUser(locals);
    if (!user) {
      return fail(401, {
        deleteShift: buildAuthRequiredActionState("delete", new URL(`${url.origin}${url.pathname}?${actionSearchParams.toString()}`))
      });
    }
    const result = await deleteScheduleShift({
      supabase: locals.supabase,
      calendarId: params.calendarId,
      userId: user.id,
      searchParams: actionSearchParams,
      formData
    });
    return respondWithActionResult("deleteShift", result);
  }
};
export {
  actions,
  load
};
