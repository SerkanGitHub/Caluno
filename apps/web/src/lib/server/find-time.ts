import type { SupabaseClient } from '@supabase/supabase-js';

export type FindTimeLoadStatus =
  | 'ready'
  | 'invalid-input'
  | 'denied'
  | 'query-failure'
  | 'timeout'
  | 'malformed-response';

export type CalendarRosterMember = {
  memberId: string;
  displayName: string;
};

export type MemberBusyInterval = {
  shiftId: string;
  memberId: string;
  memberName: string;
  startAt: string;
  endAt: string;
};

export type FindTimeRange = {
  startAt: string;
  endAt: string;
  totalDays: number;
};

export type CalendarMemberAvailability = {
  status: FindTimeLoadStatus;
  reason: string | null;
  message: string;
  calendarId: string;
  range: FindTimeRange;
  roster: CalendarRosterMember[];
  busyIntervals: MemberBusyInterval[];
  shiftIds: string[];
  memberIds: string[];
};

type SupabaseResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

type CalendarScopeRow = {
  id: string;
  group_id: string;
};

type MembershipScopeRow = {
  group_id: string;
  role: 'owner' | 'member';
};

type RosterRow = {
  member_id: string;
  display_name: string;
};

type ShiftAssignmentRow = {
  member_id: string;
};

type ShiftAvailabilityRow = {
  id: string;
  start_at: string;
  end_at: string;
  shift_assignments: ShiftAssignmentRow[] | null;
};

const MAX_FIND_TIME_RANGE_DAYS = 30;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function normalizeFindTimeRange(params: {
  startAt: string | Date;
  endAt: string | Date;
  maxDays?: number;
}):
  | {
      ok: true;
      value: FindTimeRange;
    }
  | {
      ok: false;
      reason:
        | 'FIND_TIME_RANGE_START_INVALID'
        | 'FIND_TIME_RANGE_END_INVALID'
        | 'FIND_TIME_RANGE_INVALID'
        | 'FIND_TIME_RANGE_TOO_WIDE';
      message: string;
    } {
  const startAt = toDate(params.startAt);
  if (!startAt) {
    return {
      ok: false,
      reason: 'FIND_TIME_RANGE_START_INVALID',
      message: 'The requested availability range start was invalid, so no trusted query was run.'
    };
  }

  const endAt = toDate(params.endAt);
  if (!endAt) {
    return {
      ok: false,
      reason: 'FIND_TIME_RANGE_END_INVALID',
      message: 'The requested availability range end was invalid, so no trusted query was run.'
    };
  }

  if (endAt.getTime() <= startAt.getTime()) {
    return {
      ok: false,
      reason: 'FIND_TIME_RANGE_INVALID',
      message: 'The availability range end must land after the start before any trusted query can run.'
    };
  }

  const totalDays = (endAt.getTime() - startAt.getTime()) / DAY_IN_MS;
  if (totalDays > (params.maxDays ?? MAX_FIND_TIME_RANGE_DAYS)) {
    return {
      ok: false,
      reason: 'FIND_TIME_RANGE_TOO_WIDE',
      message: 'The availability range exceeded the trusted 30-day search horizon, so the query failed closed.'
    };
  }

  return {
    ok: true,
    value: {
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      totalDays
    }
  };
}

export async function loadCalendarMemberAvailability(params: {
  supabase: SupabaseClient;
  calendarId: string;
  userId: string | null | undefined;
  rangeStart: string | Date;
  rangeEnd: string | Date;
}): Promise<CalendarMemberAvailability> {
  const emptyRange = fallbackRange(params.rangeStart, params.rangeEnd);
  const emptyState = createEmptyAvailabilityState({
    calendarId: params.calendarId,
    range: emptyRange
  });

  if (!isUuidLike(params.calendarId)) {
    return {
      ...emptyState,
      status: 'invalid-input',
      reason: 'CALENDAR_ID_INVALID',
      message: 'The calendar id was malformed, so the roster and busy lookup were rejected before any trusted query ran.'
    };
  }

  const normalizedRange = normalizeFindTimeRange({
    startAt: params.rangeStart,
    endAt: params.rangeEnd
  });

  if (!normalizedRange.ok) {
    return {
      ...emptyState,
      status: 'invalid-input',
      reason: normalizedRange.reason,
      message: normalizedRange.message
    };
  }

  const scopedState = createEmptyAvailabilityState({
    calendarId: params.calendarId,
    range: normalizedRange.value
  });

  const scope = await resolveCalendarReadScope({
    supabase: params.supabase,
    calendarId: params.calendarId,
    userId: params.userId
  });

  if (!scope.ok) {
    return {
      ...scopedState,
      status: scope.status,
      reason: scope.reason,
      message: scope.message
    };
  }

  const rosterResult = (await params.supabase.rpc('list_calendar_members', {
    p_calendar_id: params.calendarId
  })) as SupabaseResult<RosterRow[]>;

  if (rosterResult.error) {
    return {
      ...scopedState,
      status: isTimeoutMessage(rosterResult.error.message) ? 'timeout' : 'query-failure',
      reason: isTimeoutMessage(rosterResult.error.message)
        ? 'FIND_TIME_ROSTER_TIMEOUT'
        : 'FIND_TIME_ROSTER_FAILED',
      message: isTimeoutMessage(rosterResult.error.message)
        ? 'The calendar roster lookup timed out before trusted member names could be returned.'
        : 'The calendar roster lookup failed, so find-time stayed fail closed.'
    };
  }

  if (!Array.isArray(rosterResult.data)) {
    return {
      ...scopedState,
      status: 'malformed-response',
      reason: 'FIND_TIME_ROSTER_RESPONSE_INVALID',
      message: 'The calendar roster response was malformed, so the server refused to guess member identity.'
    };
  }

  const roster = normalizeRoster(rosterResult.data);
  if (!roster.ok) {
    return {
      ...scopedState,
      status: 'malformed-response',
      reason: roster.reason,
      message: roster.message
    };
  }

  const busyResult = (await params.supabase
    .from('shifts')
    .select('id, start_at, end_at, shift_assignments(member_id)')
    .eq('calendar_id', params.calendarId)
    .lt('start_at', normalizedRange.value.endAt)
    .gt('end_at', normalizedRange.value.startAt)
    .order('start_at', { ascending: true })
    .order('end_at', { ascending: true })) as unknown as SupabaseResult<ShiftAvailabilityRow[]>;

  if (busyResult.error) {
    return {
      ...scopedState,
      status: isTimeoutMessage(busyResult.error.message) ? 'timeout' : 'query-failure',
      reason: isTimeoutMessage(busyResult.error.message)
        ? 'FIND_TIME_ASSIGNMENTS_TIMEOUT'
        : 'FIND_TIME_ASSIGNMENTS_FAILED',
      message: isTimeoutMessage(busyResult.error.message)
        ? 'The member-attributed busy lookup timed out before trusted availability could be returned.'
        : 'The member-attributed busy lookup failed, so find-time stayed fail closed.'
    };
  }

  if (!Array.isArray(busyResult.data)) {
    return {
      ...scopedState,
      status: 'malformed-response',
      reason: 'FIND_TIME_ASSIGNMENTS_RESPONSE_INVALID',
      message: 'The busy-interval response was malformed, so the server refused to infer availability.'
    };
  }

  const busyIntervals = normalizeBusyIntervals({
    rows: busyResult.data,
    roster: roster.value
  });

  if (!busyIntervals.ok) {
    return {
      ...scopedState,
      status: 'malformed-response',
      reason: busyIntervals.reason,
      message: busyIntervals.message,
      roster: roster.value,
      memberIds: roster.value.map((member) => member.memberId)
    };
  }

  return {
    status: 'ready',
    reason: null,
    message: 'Trusted calendar roster summaries and member-attributed busy intervals loaded successfully.',
    calendarId: params.calendarId,
    range: normalizedRange.value,
    roster: roster.value,
    busyIntervals: busyIntervals.value,
    shiftIds: Array.from(new Set(busyIntervals.value.map((interval) => interval.shiftId))),
    memberIds: roster.value.map((member) => member.memberId)
  };
}

function createEmptyAvailabilityState(params: {
  calendarId: string;
  range: FindTimeRange;
}): CalendarMemberAvailability {
  return {
    status: 'ready',
    reason: null,
    message: 'Trusted calendar roster summaries and member-attributed busy intervals loaded successfully.',
    calendarId: params.calendarId,
    range: params.range,
    roster: [],
    busyIntervals: [],
    shiftIds: [],
    memberIds: []
  };
}

async function resolveCalendarReadScope(params: {
  supabase: SupabaseClient;
  calendarId: string;
  userId: string | null | undefined;
}): Promise<
  | {
      ok: true;
      calendar: CalendarScopeRow;
      membership: MembershipScopeRow;
    }
  | {
      ok: false;
      status: Extract<FindTimeLoadStatus, 'denied' | 'query-failure' | 'timeout' | 'malformed-response'>;
      reason: string;
      message: string;
    }
> {
  if (!params.userId) {
    return {
      ok: false,
      status: 'denied',
      reason: 'AUTH_REQUIRED',
      message: 'A trusted authenticated member is required before roster or busy data can be loaded.'
    };
  }

  const calendarResult = (await params.supabase
    .from('calendars')
    .select('id, group_id')
    .eq('id', params.calendarId)) as SupabaseResult<CalendarScopeRow[]>;

  if (calendarResult.error) {
    return {
      ok: false,
      status: isTimeoutMessage(calendarResult.error.message) ? 'timeout' : 'query-failure',
      reason: isTimeoutMessage(calendarResult.error.message)
        ? 'CALENDAR_SCOPE_TIMEOUT'
        : 'CALENDAR_SCOPE_FAILED',
      message: isTimeoutMessage(calendarResult.error.message)
        ? 'The trusted calendar scope lookup timed out before find-time could be authorized.'
        : 'The trusted calendar scope lookup failed, so find-time stayed fail closed.'
    };
  }

  const calendar = calendarResult.data?.[0] ?? null;
  if (!calendar) {
    return {
      ok: false,
      status: 'denied',
      reason: 'CALENDAR_NOT_PERMITTED',
      message: 'That calendar is outside the current trusted scope, so roster and busy data were withheld.'
    };
  }

  if (!isCalendarScopeRow(calendar)) {
    return {
      ok: false,
      status: 'malformed-response',
      reason: 'CALENDAR_SCOPE_RESPONSE_INVALID',
      message: 'The trusted calendar scope lookup returned malformed data, so find-time stayed fail closed.'
    };
  }

  const membershipResult = (await params.supabase
    .from('group_memberships')
    .select('group_id, role')
    .eq('user_id', params.userId)
    .eq('group_id', calendar.group_id)) as SupabaseResult<MembershipScopeRow[]>;

  if (membershipResult.error) {
    return {
      ok: false,
      status: isTimeoutMessage(membershipResult.error.message) ? 'timeout' : 'query-failure',
      reason: isTimeoutMessage(membershipResult.error.message)
        ? 'CALENDAR_SCOPE_TIMEOUT'
        : 'CALENDAR_SCOPE_MEMBERSHIP_FAILED',
      message: isTimeoutMessage(membershipResult.error.message)
        ? 'The trusted membership scope lookup timed out before find-time could be authorized.'
        : 'The trusted membership scope lookup failed, so find-time stayed fail closed.'
    };
  }

  const membership = membershipResult.data?.[0] ?? null;
  if (!membership) {
    return {
      ok: false,
      status: 'denied',
      reason: 'CALENDAR_NOT_PERMITTED',
      message: 'Your trusted session is not a member of the calendar group, so roster and busy data were withheld.'
    };
  }

  if (!isMembershipScopeRow(membership)) {
    return {
      ok: false,
      status: 'malformed-response',
      reason: 'CALENDAR_SCOPE_RESPONSE_INVALID',
      message: 'The trusted membership scope lookup returned malformed data, so find-time stayed fail closed.'
    };
  }

  return {
    ok: true,
    calendar,
    membership
  };
}

function normalizeRoster(rows: RosterRow[]):
  | {
      ok: true;
      value: CalendarRosterMember[];
    }
  | {
      ok: false;
      reason: 'FIND_TIME_ROSTER_RESPONSE_INVALID' | 'FIND_TIME_ROSTER_MEMBER_DUPLICATE';
      message: string;
    } {
  const seenMemberIds = new Set<string>();
  const value: CalendarRosterMember[] = [];

  for (const row of rows) {
    if (!isRosterRow(row)) {
      return {
        ok: false,
        reason: 'FIND_TIME_ROSTER_RESPONSE_INVALID',
        message: 'The calendar roster response was malformed, so the server refused to guess member identity.'
      };
    }

    if (seenMemberIds.has(row.member_id)) {
      return {
        ok: false,
        reason: 'FIND_TIME_ROSTER_MEMBER_DUPLICATE',
        message: 'The calendar roster response duplicated a member, so the server refused to trust the result.'
      };
    }

    seenMemberIds.add(row.member_id);
    value.push({
      memberId: row.member_id,
      displayName: row.display_name.trim()
    });
  }

  return {
    ok: true,
    value: value.sort((left, right) => left.displayName.localeCompare(right.displayName))
  };
}

function normalizeBusyIntervals(params: {
  rows: ShiftAvailabilityRow[];
  roster: CalendarRosterMember[];
}):
  | {
      ok: true;
      value: MemberBusyInterval[];
    }
  | {
      ok: false;
      reason:
        | 'FIND_TIME_ASSIGNMENTS_RESPONSE_INVALID'
        | 'FIND_TIME_ASSIGNMENTS_MISSING'
        | 'FIND_TIME_ASSIGNMENT_MEMBER_UNKNOWN'
        | 'FIND_TIME_ASSIGNMENT_DUPLICATE';
      message: string;
    } {
  const rosterById = new Map(params.roster.map((member) => [member.memberId, member]));
  const intervals: MemberBusyInterval[] = [];

  for (const row of params.rows) {
    if (!isShiftAvailabilityRow(row) || !Array.isArray(row.shift_assignments)) {
      return {
        ok: false,
        reason: 'FIND_TIME_ASSIGNMENTS_RESPONSE_INVALID',
        message: 'The busy-interval response was malformed, so the server refused to infer availability.'
      };
    }

    if (row.shift_assignments.length === 0) {
      return {
        ok: false,
        reason: 'FIND_TIME_ASSIGNMENTS_MISSING',
        message: 'A shift in the trusted range was missing member assignments, so the server refused to guess who is busy.'
      };
    }

    const seenMembersForShift = new Set<string>();

    for (const assignment of row.shift_assignments) {
      if (!assignment || typeof assignment.member_id !== 'string' || !isUuidLike(assignment.member_id)) {
        return {
          ok: false,
          reason: 'FIND_TIME_ASSIGNMENTS_RESPONSE_INVALID',
          message: 'The busy-interval response was malformed, so the server refused to infer availability.'
        };
      }

      if (seenMembersForShift.has(assignment.member_id)) {
        return {
          ok: false,
          reason: 'FIND_TIME_ASSIGNMENT_DUPLICATE',
          message: 'A shift returned duplicate member assignments, so the server refused to trust the busy result.'
        };
      }

      const member = rosterById.get(assignment.member_id);
      if (!member) {
        return {
          ok: false,
          reason: 'FIND_TIME_ASSIGNMENT_MEMBER_UNKNOWN',
          message: 'A shift assignment referenced a member outside the trusted calendar roster, so the result failed closed.'
        };
      }

      seenMembersForShift.add(assignment.member_id);
      intervals.push({
        shiftId: row.id,
        memberId: assignment.member_id,
        memberName: member.displayName,
        startAt: row.start_at,
        endAt: row.end_at
      });
    }
  }

  return {
    ok: true,
    value: intervals.sort(compareBusyIntervals)
  };
}

function compareBusyIntervals(left: MemberBusyInterval, right: MemberBusyInterval) {
  return (
    left.startAt.localeCompare(right.startAt) ||
    left.endAt.localeCompare(right.endAt) ||
    left.memberName.localeCompare(right.memberName) ||
    left.shiftId.localeCompare(right.shiftId)
  );
}

function fallbackRange(startAt: string | Date, endAt: string | Date): FindTimeRange {
  const normalizedStart = toDate(startAt)?.toISOString() ?? new Date(0).toISOString();
  const normalizedEnd = toDate(endAt)?.toISOString() ?? new Date(0).toISOString();
  const totalDays = Math.max(0, (new Date(normalizedEnd).getTime() - new Date(normalizedStart).getTime()) / DAY_IN_MS);

  return {
    startAt: normalizedStart,
    endAt: normalizedEnd,
    totalDays
  };
}

function toDate(value: string | Date): Date | null {
  const candidate = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
}

function isCalendarScopeRow(value: unknown): value is CalendarScopeRow {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<CalendarScopeRow>;
  return typeof candidate.id === 'string' && typeof candidate.group_id === 'string';
}

function isMembershipScopeRow(value: unknown): value is MembershipScopeRow {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<MembershipScopeRow>;
  return typeof candidate.group_id === 'string' && (candidate.role === 'owner' || candidate.role === 'member');
}

function isRosterRow(value: unknown): value is RosterRow {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<RosterRow>;
  return (
    typeof candidate.member_id === 'string' &&
    isUuidLike(candidate.member_id) &&
    typeof candidate.display_name === 'string' &&
    candidate.display_name.trim().length > 0
  );
}

function isShiftAvailabilityRow(value: unknown): value is ShiftAvailabilityRow {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ShiftAvailabilityRow>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.start_at === 'string' &&
    typeof candidate.end_at === 'string' &&
    Array.isArray(candidate.shift_assignments)
  );
}

function isTimeoutMessage(message: string | null | undefined): boolean {
  return /timeout/i.test(message ?? '');
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
