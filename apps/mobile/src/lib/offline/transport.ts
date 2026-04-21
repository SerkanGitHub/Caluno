import { createEmptyCalendarScheduleView, resolveVisibleWeek } from '@repo/caluno-core/route-contract';
import { normalizeShiftDraft, normalizeVisibleRange } from '@repo/caluno-core/schedule/recurrence';
import type {
  CalendarScheduleView,
  CalendarShift,
  NormalizedScheduleRecurrence,
  ScheduleActionKind,
  ScheduleActionState,
  VisibleWeek
} from '@repo/caluno-core/schedule/types';
import type { ReconnectDrainActionRequest, CalendarControllerServerOutcome } from '@repo/caluno-core/offline/sync-engine';
import type { MobileSupabaseDataClient } from '$lib/supabase/client';
import * as rrulePkg from 'rrule';

const rruleModule = rrulePkg as unknown as {
  RRule?: typeof import('rrule').RRule;
  default?: {
    RRule?: typeof import('rrule').RRule;
  };
};

const RRule = (rruleModule.RRule ?? rruleModule.default?.RRule) as typeof import('rrule').RRule;

export type MobileTrustedScheduleTransport = {
  loadWeek: (params: { calendarId: string; visibleWeekStart: string }) => Promise<CalendarScheduleView>;
  submitAction: (request: ReconnectDrainActionRequest) => Promise<CalendarControllerServerOutcome>;
};

type ShiftRow = {
  id: string;
  calendar_id: string;
  series_id: string | null;
  title: string;
  start_at: string;
  end_at: string;
  occurrence_index: number | null;
  source_kind: 'single' | 'series';
};

type CalendarScopeRow = {
  id: string;
  group_id: string;
  name: string;
  is_default: boolean | null;
};

type MembershipScopeRow = {
  group_id: string;
  role: 'owner' | 'member';
};

type ShiftAssignmentInsertRow = {
  shift_id: string;
  member_id: string;
  created_by: string;
};

type SupabaseResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

type CreateFields = {
  title: string;
  startAt: string;
  endAt: string;
  recurrenceCadence: string;
  recurrenceInterval: string;
  repeatCount: string;
  repeatUntil: string;
};

type ShiftMutationFields = {
  shiftId: string;
  title: string;
  startAt: string;
  endAt: string;
};

const recurrenceFrequencyByCadence = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY
} as const;

export function createTrustedMobileScheduleTransport(options: {
  client: MobileSupabaseDataClient;
  userId: string;
  calendarId: string;
  timeoutMs?: number;
}): MobileTrustedScheduleTransport {
  const timeoutMs = options.timeoutMs ?? 8_000;

  return {
    async loadWeek(params) {
      const visibleWeek = resolveVisibleWeek(new URLSearchParams({ start: params.visibleWeekStart }));
      const emptyView = createEmptyCalendarScheduleView(visibleWeek);

      try {
        const result = await withTimeout(
          options.client
            .from('shifts')
            .select('id, calendar_id, series_id, title, start_at, end_at, occurrence_index, source_kind')
            .eq('calendar_id', params.calendarId)
            .lt('start_at', visibleWeek.endAt)
            .gt('end_at', visibleWeek.startAt)
            .order('start_at', { ascending: true })
            .order('end_at', { ascending: true }) as unknown as Promise<SupabaseResult<ShiftRow[]>>,
          timeoutMs,
          'SCHEDULE_LOAD_TIMEOUT'
        );

        if (result.error) {
          const timeout = isTimeoutMessage(result.error.message);
          return {
            ...emptyView,
            status: timeout ? 'timeout' : 'query-error',
            reason: timeout ? 'SCHEDULE_LOAD_TIMEOUT' : 'SCHEDULE_LOAD_FAILED',
            message: timeout
              ? 'The visible-week schedule query timed out before trusted shift data could be returned.'
              : 'The visible-week schedule query failed, so the calendar stayed on the current bounded range.'
          } satisfies CalendarScheduleView;
        }

        if (!Array.isArray(result.data) || result.data.some((row) => !isShiftRow(row))) {
          return {
            ...emptyView,
            status: 'malformed-response',
            reason: 'SCHEDULE_LOAD_RESPONSE_INVALID',
            message: 'The schedule query returned malformed data, so the route refused to render guessed shifts.'
          } satisfies CalendarScheduleView;
        }

        const mappedShifts = result.data.map(mapShiftRow).sort(compareShiftTimes);
        return {
          status: 'ready',
          reason: emptyView.reason,
          message: emptyView.message,
          visibleWeek,
          days: emptyView.days.map((day) => ({
            ...day,
            shifts: mappedShifts.filter((shift) => shift.startAt.slice(0, 10) === day.dayKey)
          })),
          totalShifts: mappedShifts.length,
          shiftIds: mappedShifts.map((shift) => shift.id)
        } satisfies CalendarScheduleView;
      } catch (error) {
        return {
          ...emptyView,
          status: isTimeoutError(error) ? 'timeout' : 'query-error',
          reason: isTimeoutError(error) ? 'SCHEDULE_LOAD_TIMEOUT' : 'SCHEDULE_LOAD_FAILED',
          message: isTimeoutError(error)
            ? 'The visible-week schedule query timed out before trusted shift data could be returned.'
            : error instanceof Error
              ? error.message
              : 'The visible-week schedule query failed, so the calendar stayed on the current bounded range.'
        } satisfies CalendarScheduleView;
      }
    },

    async submitAction(request) {
      switch (request.action) {
        case 'create':
          return submitCreateAction(options.client, options.userId, request, timeoutMs, options.calendarId);
        case 'edit':
          return submitEditAction(options.client, options.userId, request, timeoutMs, options.calendarId);
        case 'move':
          return submitMoveAction(options.client, options.userId, request, timeoutMs, options.calendarId);
        case 'delete':
          return submitDeleteAction(options.client, options.userId, request, timeoutMs, options.calendarId);
      }
    }
  };
}

async function submitCreateAction(
  client: MobileSupabaseDataClient,
  userId: string,
  request: ReconnectDrainActionRequest,
  timeoutMs: number,
  defaultCalendarId: string
): Promise<CalendarControllerServerOutcome> {
  const calendarId = extractCalendarIdFromRequest(request, defaultCalendarId);
  if (!calendarId) {
    return malformedResponse('CALENDAR_ID_INVALID', 'The trusted mobile write request was missing calendar scope, so the create failed closed.');
  }

  const fields = normalizeCreateShiftFields(request.formData);
  const scope = await resolveCalendarWriteScope({ client, calendarId, userId, timeoutMs });
  if (!scope.ok) {
    return failureOutcome({
      action: 'create',
      request,
      status: scope.actionStatus,
      reason: scope.reason,
      message: scope.message,
      fields
    });
  }

  const normalized = normalizeShiftDraft({
    calendarId,
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

  if (!normalized.ok) {
    return failureOutcome({
      action: 'create',
      request,
      status: 'validation-error',
      reason: normalized.reason,
      message: describeValidationReason(normalized.reason),
      fields
    });
  }

  if (!normalized.value.recurrence) {
    const shiftId = createId();
    const insertResult = await safeSupabaseCall(
      client
        .from('shifts')
        .insert({
          id: shiftId,
          calendar_id: calendarId,
          series_id: null,
          title: normalized.value.title,
          start_at: normalized.value.startAt.toISOString(),
          end_at: normalized.value.endAt.toISOString(),
          occurrence_index: null,
          source_kind: 'single',
          created_by: userId
        }) as unknown as Promise<SupabaseResult<null>>,
      timeoutMs,
      'SCHEDULE_CREATE_TIMEOUT'
    );

    if (!insertResult.ok) {
      return failureOutcome({
        action: 'create',
        request,
        status: insertResult.timeout ? 'timeout' : 'write-error',
        reason: insertResult.timeout ? 'SCHEDULE_CREATE_TIMEOUT' : 'SCHEDULE_CREATE_FAILED',
        message: insertResult.timeout
          ? 'The shift create request timed out before the write could be confirmed.'
          : insertResult.detail ?? 'The shift could not be created, so the visible board stayed unchanged.',
        fields
      });
    }

    const assignmentsInsert = await safeSupabaseCall(
      client.from('shift_assignments').insert(
        buildShiftAssignmentInsertRows({
          shiftIds: [shiftId],
          memberId: userId,
          createdBy: userId
        })
      ) as unknown as Promise<SupabaseResult<null>>,
      timeoutMs,
      'SCHEDULE_CREATE_TIMEOUT'
    );

    if (!assignmentsInsert.ok) {
      await client.from('shifts').delete().eq('id', shiftId).eq('calendar_id', calendarId);
      return failureOutcome({
        action: 'create',
        request,
        status: assignmentsInsert.timeout ? 'timeout' : 'write-error',
        reason: assignmentsInsert.timeout ? 'SCHEDULE_CREATE_TIMEOUT' : 'SCHEDULE_CREATE_ASSIGNMENT_FAILED',
        message: assignmentsInsert.timeout
          ? 'The creator assignment write timed out, so the shift create was rolled back.'
          : 'The creator assignment could not be written, so the shift create was rolled back and the board stayed unchanged.',
        fields,
        shiftId,
        affectedShiftIds: [shiftId]
      });
    }

    return successOutcome({
      action: 'create',
      request,
      reason: 'SHIFT_CREATED',
      message: 'The shift was created inside the current trusted calendar with creator assignment attribution.',
      fields,
      shiftId,
      affectedShiftIds: [shiftId]
    });
  }

  const seriesId = createId();
  const seriesInsert = await safeSupabaseCall(
    client.from('shift_series').insert({
      id: seriesId,
      calendar_id: calendarId,
      title: normalized.value.title,
      starts_at: normalized.value.startAt.toISOString(),
      ends_at: normalized.value.endAt.toISOString(),
      recurrence_cadence: normalized.value.recurrence.cadence,
      recurrence_interval: normalized.value.recurrence.interval,
      repeat_count: normalized.value.recurrence.repeatCount,
      repeat_until: normalized.value.recurrence.repeatUntil?.toISOString() ?? null,
      timezone_name: 'UTC',
      created_by: userId
    }) as unknown as Promise<SupabaseResult<null>>,
    timeoutMs,
    'SCHEDULE_CREATE_TIMEOUT'
  );

  if (!seriesInsert.ok) {
    return failureOutcome({
      action: 'create',
      request,
      status: seriesInsert.timeout ? 'timeout' : 'write-error',
      reason: seriesInsert.timeout ? 'SCHEDULE_CREATE_TIMEOUT' : 'SCHEDULE_CREATE_FAILED',
      message: seriesInsert.timeout
        ? 'The recurring shift create request timed out before the series could be confirmed.'
        : 'The recurring shift series could not be created, so no occurrences were added.',
      fields
    });
  }

  const occurrenceRows = buildRecurringShiftInsertRows({
    calendarId,
    userId,
    seriesId,
    title: normalized.value.title,
    startAt: normalized.value.startAt,
    durationMs: normalized.value.durationMs,
    recurrence: normalized.value.recurrence
  });

  const shiftsInsert = await safeSupabaseCall(
    client.from('shifts').insert(occurrenceRows) as unknown as Promise<SupabaseResult<null>>,
    timeoutMs,
    'SCHEDULE_CREATE_TIMEOUT'
  );

  if (!shiftsInsert.ok) {
    await client.from('shift_series').delete().eq('id', seriesId).eq('calendar_id', calendarId);
    return failureOutcome({
      action: 'create',
      request,
      status: shiftsInsert.timeout ? 'timeout' : 'write-error',
      reason: shiftsInsert.timeout ? 'SCHEDULE_CREATE_TIMEOUT' : 'SCHEDULE_CREATE_FAILED',
      message: shiftsInsert.timeout
        ? 'The recurring occurrence write timed out, so the series was rolled back.'
        : 'The recurring occurrence write failed, so the series was rolled back and the board stayed unchanged.',
      fields,
      seriesId
    });
  }

  const affectedShiftIds = occurrenceRows.map((row) => row.id);
  const assignmentsInsert = await safeSupabaseCall(
    client.from('shift_assignments').insert(
      buildShiftAssignmentInsertRows({
        shiftIds: affectedShiftIds,
        memberId: userId,
        createdBy: userId
      })
    ) as unknown as Promise<SupabaseResult<null>>,
    timeoutMs,
    'SCHEDULE_CREATE_TIMEOUT'
  );

  if (!assignmentsInsert.ok) {
    await client.from('shift_series').delete().eq('id', seriesId).eq('calendar_id', calendarId);
    return failureOutcome({
      action: 'create',
      request,
      status: assignmentsInsert.timeout ? 'timeout' : 'write-error',
      reason: assignmentsInsert.timeout ? 'SCHEDULE_CREATE_TIMEOUT' : 'SCHEDULE_CREATE_ASSIGNMENT_FAILED',
      message: assignmentsInsert.timeout
        ? 'The recurring creator-assignment write timed out, so the series was rolled back.'
        : 'The recurring creator-assignment write failed, so the series was rolled back and the board stayed unchanged.',
      fields,
      seriesId,
      affectedShiftIds,
      shiftId: affectedShiftIds[0] ?? null
    });
  }

  return successOutcome({
    action: 'create',
    request,
    reason: 'SHIFT_CREATED',
    message: 'The recurring shift series, concrete occurrences, and creator assignments were created inside the current trusted calendar.',
    fields,
    seriesId,
    shiftId: affectedShiftIds[0] ?? null,
    affectedShiftIds
  });
}

async function submitEditAction(
  client: MobileSupabaseDataClient,
  userId: string,
  request: ReconnectDrainActionRequest,
  timeoutMs: number,
  defaultCalendarId: string
): Promise<CalendarControllerServerOutcome> {
  const calendarId = extractCalendarIdFromRequest(request, defaultCalendarId);
  if (!calendarId) {
    return malformedResponse('CALENDAR_ID_INVALID', 'The trusted mobile write request was missing calendar scope, so the edit failed closed.');
  }

  const fields = normalizeShiftMutationFields(request.formData);
  const scope = await resolveCalendarWriteScope({ client, calendarId, userId, timeoutMs });
  if (!scope.ok) {
    return failureOutcome({
      action: 'edit',
      request,
      status: scope.actionStatus,
      reason: scope.reason,
      message: scope.message,
      fields
    });
  }

  if (!isUuidLike(fields.shiftId)) {
    return failureOutcome({
      action: 'edit',
      request,
      status: 'validation-error',
      reason: 'SHIFT_ID_INVALID',
      message: 'The requested shift id was malformed, so the edit was rejected before any lookup ran.',
      fields,
      shiftId: fields.shiftId
    });
  }

  const draftResult = normalizeShiftDraft({
    calendarId,
    title: fields.title,
    startAt: fields.startAt,
    endAt: fields.endAt,
    recurrence: null
  });

  if (!draftResult.ok) {
    return failureOutcome({
      action: 'edit',
      request,
      status: 'validation-error',
      reason: draftResult.reason,
      message: describeValidationReason(draftResult.reason),
      fields,
      shiftId: fields.shiftId
    });
  }

  const authority = await resolveShiftWriteAuthority({ client, shiftId: fields.shiftId, calendarId, timeoutMs });
  if (!authority.ok) {
    return failureOutcome({
      action: 'edit',
      request,
      status: authority.actionStatus,
      reason: authority.reason,
      message: authority.message,
      fields,
      shiftId: fields.shiftId
    });
  }

  const writeResult = await safeSupabaseCall(
    client
      .from('shifts')
      .update({
        title: draftResult.value.title,
        start_at: draftResult.value.startAt.toISOString(),
        end_at: draftResult.value.endAt.toISOString()
      })
      .eq('id', fields.shiftId)
      .eq('calendar_id', calendarId)
      .select('id, calendar_id, series_id, title, start_at, end_at, occurrence_index, source_kind') as unknown as Promise<
      SupabaseResult<ShiftRow[]>
    >,
    timeoutMs,
    'SCHEDULE_EDIT_TIMEOUT'
  );

  return finalizeSingleShiftMutation({
    action: 'edit',
    request,
    fields,
    submittedShiftId: fields.shiftId,
    successReason: 'SHIFT_UPDATED',
    successMessage: 'The shift details were updated inside the current trusted calendar.',
    writeResult
  });
}

async function submitMoveAction(
  client: MobileSupabaseDataClient,
  userId: string,
  request: ReconnectDrainActionRequest,
  timeoutMs: number,
  defaultCalendarId: string
): Promise<CalendarControllerServerOutcome> {
  const calendarId = extractCalendarIdFromRequest(request, defaultCalendarId);
  if (!calendarId) {
    return malformedResponse('CALENDAR_ID_INVALID', 'The trusted mobile write request was missing calendar scope, so the move failed closed.');
  }

  const fields = normalizeShiftMutationFields(request.formData);
  const scope = await resolveCalendarWriteScope({ client, calendarId, userId, timeoutMs });
  if (!scope.ok) {
    return failureOutcome({
      action: 'move',
      request,
      status: scope.actionStatus,
      reason: scope.reason,
      message: scope.message,
      fields
    });
  }

  if (!isUuidLike(fields.shiftId)) {
    return failureOutcome({
      action: 'move',
      request,
      status: 'validation-error',
      reason: 'SHIFT_ID_INVALID',
      message: 'The requested shift id was malformed, so the move was rejected before any lookup ran.',
      fields,
      shiftId: fields.shiftId
    });
  }

  const visibleRangeResult = normalizeVisibleRange({
    startAt: fields.startAt,
    endAt: fields.endAt,
    maxDays: 7
  });

  if (!visibleRangeResult.ok) {
    return failureOutcome({
      action: 'move',
      request,
      status: 'validation-error',
      reason: visibleRangeResult.reason,
      message: describeValidationReason(visibleRangeResult.reason),
      fields,
      shiftId: fields.shiftId
    });
  }

  const authority = await resolveShiftWriteAuthority({ client, shiftId: fields.shiftId, calendarId, timeoutMs });
  if (!authority.ok) {
    return failureOutcome({
      action: 'move',
      request,
      status: authority.actionStatus,
      reason: authority.reason,
      message: authority.message,
      fields,
      shiftId: fields.shiftId
    });
  }

  const writeResult = await safeSupabaseCall(
    client
      .from('shifts')
      .update({
        start_at: visibleRangeResult.value.startAt.toISOString(),
        end_at: visibleRangeResult.value.endAt.toISOString()
      })
      .eq('id', fields.shiftId)
      .eq('calendar_id', calendarId)
      .select('id, calendar_id, series_id, title, start_at, end_at, occurrence_index, source_kind') as unknown as Promise<
      SupabaseResult<ShiftRow[]>
    >,
    timeoutMs,
    'SCHEDULE_MOVE_TIMEOUT'
  );

  return finalizeSingleShiftMutation({
    action: 'move',
    request,
    fields,
    submittedShiftId: fields.shiftId,
    successReason: 'SHIFT_MOVED',
    successMessage: 'The shift range was moved inside the current trusted calendar.',
    writeResult
  });
}

async function submitDeleteAction(
  client: MobileSupabaseDataClient,
  userId: string,
  request: ReconnectDrainActionRequest,
  timeoutMs: number,
  defaultCalendarId: string
): Promise<CalendarControllerServerOutcome> {
  const calendarId = extractCalendarIdFromRequest(request, defaultCalendarId);
  if (!calendarId) {
    return malformedResponse('CALENDAR_ID_INVALID', 'The trusted mobile write request was missing calendar scope, so the delete failed closed.');
  }

  const fields = normalizeShiftMutationFields(request.formData);
  const scope = await resolveCalendarWriteScope({ client, calendarId, userId, timeoutMs });
  if (!scope.ok) {
    return failureOutcome({
      action: 'delete',
      request,
      status: scope.actionStatus,
      reason: scope.reason,
      message: scope.message,
      fields
    });
  }

  if (!isUuidLike(fields.shiftId)) {
    return failureOutcome({
      action: 'delete',
      request,
      status: 'validation-error',
      reason: 'SHIFT_ID_INVALID',
      message: 'The requested shift id was malformed, so the delete was rejected before any lookup ran.',
      fields,
      shiftId: fields.shiftId
    });
  }

  const authority = await resolveShiftWriteAuthority({ client, shiftId: fields.shiftId, calendarId, timeoutMs });
  if (!authority.ok) {
    return failureOutcome({
      action: 'delete',
      request,
      status: authority.actionStatus,
      reason: authority.reason,
      message: authority.message,
      fields,
      shiftId: fields.shiftId
    });
  }

  const writeResult = await safeSupabaseCall(
    client
      .from('shifts')
      .delete()
      .eq('id', fields.shiftId)
      .eq('calendar_id', calendarId)
      .select('id, calendar_id, series_id, title, start_at, end_at, occurrence_index, source_kind') as unknown as Promise<
      SupabaseResult<ShiftRow[]>
    >,
    timeoutMs,
    'SCHEDULE_DELETE_TIMEOUT'
  );

  return finalizeSingleShiftMutation({
    action: 'delete',
    request,
    fields,
    submittedShiftId: fields.shiftId,
    successReason: 'SHIFT_DELETED',
    successMessage: 'The shift was deleted from the current trusted calendar.',
    writeResult
  });
}

async function resolveCalendarWriteScope(params: {
  client: MobileSupabaseDataClient;
  calendarId: string;
  userId: string;
  timeoutMs: number;
}): Promise<
  | {
      ok: true;
      calendar: CalendarScopeRow;
    }
  | {
      ok: false;
      actionStatus: 'forbidden' | 'timeout' | 'malformed-response';
      reason: string;
      message: string;
    }
> {
  const calendarResult = await safeSupabaseCall(
    params.client.from('calendars').select('id, group_id, name, is_default').eq('id', params.calendarId) as unknown as Promise<
      SupabaseResult<CalendarScopeRow[]>
    >,
    params.timeoutMs,
    'CALENDAR_SCOPE_TIMEOUT'
  );

  if (!calendarResult.ok) {
    return {
      ok: false,
      actionStatus: calendarResult.timeout ? 'timeout' : 'forbidden',
      reason: calendarResult.timeout ? 'CALENDAR_SCOPE_TIMEOUT' : 'CALENDAR_SCOPE_FAILED',
      message: calendarResult.timeout
        ? 'The trusted calendar scope lookup timed out before the write could be authorized.'
        : calendarResult.detail ?? 'The trusted calendar scope could not be resolved, so the write failed closed.'
    };
  }

  const calendar = calendarResult.data?.[0] ?? null;
  if (!calendar?.id || !calendar.group_id) {
    return {
      ok: false,
      actionStatus: calendar === null ? 'forbidden' : 'malformed-response',
      reason: calendar === null ? 'CALENDAR_NOT_PERMITTED' : 'CALENDAR_SCOPE_RESPONSE_INVALID',
      message:
        calendar === null
          ? 'That calendar is outside the trusted route scope, so the write was rejected.'
          : 'The calendar scope lookup returned malformed data, so the write failed closed.'
    };
  }

  const membershipResult = await safeSupabaseCall(
    params.client
      .from('group_memberships')
      .select('group_id, role')
      .eq('user_id', params.userId)
      .eq('group_id', calendar.group_id) as unknown as Promise<SupabaseResult<MembershipScopeRow[]>>,
    params.timeoutMs,
    'CALENDAR_SCOPE_TIMEOUT'
  );

  if (!membershipResult.ok) {
    return {
      ok: false,
      actionStatus: membershipResult.timeout ? 'timeout' : 'forbidden',
      reason: membershipResult.timeout ? 'CALENDAR_SCOPE_TIMEOUT' : 'CALENDAR_SCOPE_MEMBERSHIP_FAILED',
      message: membershipResult.timeout
        ? 'The trusted membership check timed out before the write could be authorized.'
        : membershipResult.detail ?? 'The trusted membership scope could not be confirmed, so the write failed closed.'
    };
  }

  const membership = membershipResult.data?.[0] ?? null;
  if (!membership?.group_id || !membership.role) {
    return {
      ok: false,
      actionStatus: membership === null ? 'forbidden' : 'malformed-response',
      reason: membership === null ? 'CALENDAR_NOT_PERMITTED' : 'CALENDAR_SCOPE_RESPONSE_INVALID',
      message:
        membership === null
          ? 'Your session is not trusted for the calendar behind this route, so the write was rejected.'
          : 'The membership scope lookup returned malformed data, so the write failed closed.'
    };
  }

  return {
    ok: true,
    calendar
  };
}

async function resolveShiftWriteAuthority(params: {
  client: MobileSupabaseDataClient;
  shiftId: string;
  calendarId: string;
  timeoutMs: number;
}): Promise<
  | {
      ok: true;
      shift: ShiftRow;
    }
  | {
      ok: false;
      actionStatus: 'forbidden' | 'timeout' | 'malformed-response';
      reason: string;
      message: string;
    }
> {
  const result = await safeSupabaseCall(
    params.client
      .from('shifts')
      .select('id, calendar_id, series_id, title, start_at, end_at, occurrence_index, source_kind')
      .eq('id', params.shiftId) as unknown as Promise<SupabaseResult<ShiftRow[]>>,
    params.timeoutMs,
    'SHIFT_LOOKUP_TIMEOUT'
  );

  if (!result.ok) {
    return {
      ok: false,
      actionStatus: result.timeout ? 'timeout' : 'forbidden',
      reason: result.timeout ? 'SHIFT_LOOKUP_TIMEOUT' : 'SHIFT_LOOKUP_FAILED',
      message: result.timeout
        ? 'The trusted shift lookup timed out before the write could be authorized.'
        : result.detail ?? 'The trusted shift lookup failed, so the write was rejected.'
    };
  }

  const shift = result.data?.[0] ?? null;
  if (!shift) {
    return {
      ok: false,
      actionStatus: 'forbidden',
      reason: 'SHIFT_NOT_FOUND',
      message: 'The requested shift was not found inside the trusted write scope.'
    };
  }

  if (!isShiftRow(shift)) {
    return {
      ok: false,
      actionStatus: 'malformed-response',
      reason: 'SHIFT_LOOKUP_RESPONSE_INVALID',
      message: 'The trusted shift lookup returned malformed data, so the write failed closed.'
    };
  }

  if (shift.calendar_id !== params.calendarId) {
    return {
      ok: false,
      actionStatus: 'forbidden',
      reason: 'SHIFT_CALENDAR_MISMATCH',
      message: 'That shift belongs to a different calendar than the current trusted route.'
    };
  }

  return {
    ok: true,
    shift
  };
}

function finalizeSingleShiftMutation(params: {
  action: ScheduleActionKind;
  request: ReconnectDrainActionRequest;
  fields: Record<string, string>;
  submittedShiftId: string;
  successReason: string;
  successMessage: string;
  writeResult:
    | { ok: true; data: ShiftRow[] | null }
    | { ok: false; timeout: boolean; detail: string | null };
}): CalendarControllerServerOutcome {
  if (!params.writeResult.ok) {
    return failureOutcome({
      action: params.action,
      request: params.request,
      status: params.writeResult.timeout ? 'timeout' : 'write-error',
      reason: params.writeResult.timeout
        ? `SCHEDULE_${params.action.toUpperCase()}_TIMEOUT`
        : `SCHEDULE_${params.action.toUpperCase()}_FAILED`,
      message: params.writeResult.timeout
        ? `The ${params.action} request timed out before the shift write could be confirmed.`
        : `The ${params.action} request failed, so the visible board stayed unchanged.`,
      fields: params.fields,
      shiftId: params.submittedShiftId
    });
  }

  const shiftedRow = params.writeResult.data?.[0] ?? null;
  if (!shiftedRow || !isShiftRow(shiftedRow)) {
    return malformedResponse(
      `SCHEDULE_${params.action.toUpperCase()}_RESPONSE_INVALID`,
      `The ${params.action} write returned malformed data, so the mobile client did not assume success.`
    );
  }

  return successOutcome({
    action: params.action,
    request: params.request,
    reason: params.successReason,
    message: params.successMessage,
    fields: params.fields,
    shiftId: shiftedRow.id,
    seriesId: shiftedRow.series_id,
    affectedShiftIds: [shiftedRow.id]
  });
}

function successOutcome(params: {
  action: ScheduleActionKind;
  request: ReconnectDrainActionRequest;
  reason: string;
  message: string;
  fields: Record<string, string>;
  shiftId?: string | null;
  seriesId?: string | null;
  affectedShiftIds: string[];
}): CalendarControllerServerOutcome {
  return {
    type: 'success',
    state: {
      action: params.action,
      status: 'success',
      reason: params.reason,
      message: params.message,
      visibleWeekStart: params.request.visibleWeekStart,
      shiftId: params.shiftId ?? null,
      seriesId: params.seriesId ?? null,
      affectedShiftIds: params.affectedShiftIds,
      fields: params.fields
    } satisfies ScheduleActionState
  };
}

function failureOutcome(params: {
  action: ScheduleActionKind;
  request: ReconnectDrainActionRequest;
  status: ScheduleActionState['status'];
  reason: string;
  message: string;
  fields: Record<string, string>;
  shiftId?: string | null;
  seriesId?: string | null;
  affectedShiftIds?: string[];
}): CalendarControllerServerOutcome {
  return {
    type: 'failure',
    state: {
      action: params.action,
      status: params.status,
      reason: params.reason,
      message: params.message,
      visibleWeekStart: params.request.visibleWeekStart,
      shiftId: params.shiftId ?? null,
      seriesId: params.seriesId ?? null,
      affectedShiftIds: params.affectedShiftIds ?? [],
      fields: params.fields
    } satisfies ScheduleActionState
  };
}

function malformedResponse(reason: string, detail: string): CalendarControllerServerOutcome {
  return {
    type: 'malformed-response',
    reason,
    detail
  };
}

async function safeSupabaseCall<T>(
  promise: Promise<SupabaseResult<T>>,
  timeoutMs: number,
  timeoutReason: string
): Promise<
  | {
      ok: true;
      data: T | null;
    }
  | {
      ok: false;
      timeout: boolean;
      detail: string | null;
    }
> {
  try {
    const result = await withTimeout(promise, timeoutMs, timeoutReason);
    if (result.error) {
      return {
        ok: false,
        timeout: isTimeoutMessage(result.error.message),
        detail: result.error.message
      };
    }

    return {
      ok: true,
      data: result.data
    };
  } catch (error) {
    return {
      ok: false,
      timeout: isTimeoutError(error),
      detail: error instanceof Error ? error.message : null
    };
  }
}

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, reason: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const normalizedPromise = Promise.resolve(promise);

  return Promise.race([
    normalizedPromise.finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    }),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(reason)), timeoutMs);
    })
  ]);
}

function normalizeCreateShiftFields(formData: FormData): CreateFields {
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

function normalizeShiftMutationFields(formData: FormData): ShiftMutationFields {
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

function buildRecurringShiftInsertRows(params: {
  calendarId: string;
  userId: string;
  seriesId: string;
  title: string;
  startAt: Date;
  durationMs: number;
  recurrence: NormalizedScheduleRecurrence;
}) {
  const rule = new RRule({
    freq: recurrenceFrequencyByCadence[params.recurrence.cadence],
    interval: params.recurrence.interval,
    count: params.recurrence.repeatCount ?? undefined,
    until: params.recurrence.repeatUntil ?? undefined,
    dtstart: params.startAt
  });

  return rule.all().map((occurrenceStart, index) => ({
    id: createId(),
    calendar_id: params.calendarId,
    series_id: params.seriesId,
    title: params.title,
    start_at: occurrenceStart.toISOString(),
    end_at: new Date(occurrenceStart.getTime() + params.durationMs).toISOString(),
    occurrence_index: index + 1,
    source_kind: 'series' as const,
    created_by: params.userId
  }));
}

function buildShiftAssignmentInsertRows(params: {
  shiftIds: string[];
  memberId: string;
  createdBy: string;
}): ShiftAssignmentInsertRow[] {
  return params.shiftIds.map((shiftId) => ({
    shift_id: shiftId,
    member_id: params.memberId,
    created_by: params.createdBy
  }));
}

function extractCalendarIdFromRequest(request: ReconnectDrainActionRequest, fallbackCalendarId: string): string | null {
  return request.url.match(/calendars\/([0-9a-f-]{36})/i)?.[1] ?? request.formData.get('calendarId')?.toString() ?? fallbackCalendarId;
}

function createId(): string {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `mobile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function describeValidationReason(reason: string): string {
  switch (reason) {
    case 'TITLE_REQUIRED':
      return 'Give the shift a title before saving it.';
    case 'SHIFT_START_INVALID':
      return 'Provide a valid shift start time before saving.';
    case 'SHIFT_END_INVALID':
      return 'Provide a valid shift end time before saving.';
    case 'SHIFT_END_BEFORE_START':
      return 'The shift end must be after the shift start.';
    case 'RECURRENCE_CADENCE_REQUIRED':
      return 'Choose a recurrence cadence before creating a recurring shift.';
    case 'RECURRENCE_CADENCE_UNSUPPORTED':
      return 'That recurrence cadence is not supported.';
    case 'RECURRENCE_INTERVAL_INVALID':
      return 'The recurrence interval must be at least 1.';
    case 'RECURRENCE_BOUND_REQUIRED':
      return 'Recurring shifts need a repeat count or repeat-until bound.';
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
      return 'That move would widen the schedule range beyond the allowed week.';
    default:
      return 'The trusted mobile write failed validation.';
  }
}

function mapShiftRow(row: ShiftRow): CalendarShift {
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

function compareShiftTimes(left: Pick<CalendarShift, 'startAt' | 'endAt' | 'title'>, right: Pick<CalendarShift, 'startAt' | 'endAt' | 'title'>) {
  return (
    left.startAt.localeCompare(right.startAt) ||
    left.endAt.localeCompare(right.endAt) ||
    left.title.localeCompare(right.title)
  );
}

function isShiftRow(value: unknown): value is ShiftRow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<ShiftRow>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.calendar_id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.start_at === 'string' &&
    typeof candidate.end_at === 'string' &&
    (candidate.series_id === null || typeof candidate.series_id === 'string') &&
    (candidate.occurrence_index === null || typeof candidate.occurrence_index === 'number') &&
    (candidate.source_kind === 'single' || candidate.source_kind === 'series')
  );
}

function isTimeoutMessage(message: string | null | undefined): boolean {
  return /timeout/i.test(message ?? '');
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && /timeout/i.test(error.message);
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
