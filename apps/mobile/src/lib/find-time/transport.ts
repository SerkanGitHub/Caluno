import {
  buildFindTimeWindows,
  normalizeFindTimeDuration,
  normalizeFindTimeSearchRange,
  type FindTimeSearchRange as MatcherFindTimeSearchRange,
  type FindTimeWindow
} from '@repo/caluno-core/find-time/matcher';
import type { MobileSupabaseDataClient } from '$lib/supabase/client';

export type MobileFindTimeLoadStatus =
  | 'ready'
  | 'invalid-input'
  | 'denied'
  | 'query-failure'
  | 'timeout'
  | 'malformed-response';

export type MobileCalendarRosterMember = {
  memberId: string;
  displayName: string;
};

export type MobileMemberBusyInterval = {
  shiftId: string;
  shiftTitle: string;
  memberId: string;
  memberName: string;
  startAt: string;
  endAt: string;
};

export type MobileFindTimeSearchStatus = MobileFindTimeLoadStatus | 'no-results';

export type MobileFindTimeSearchView = {
  status: MobileFindTimeSearchStatus;
  reason: string | null;
  message: string;
  calendarId: string;
  range: MatcherFindTimeSearchRange;
  durationMinutes: number | null;
  roster: MobileCalendarRosterMember[];
  busyIntervals: MobileMemberBusyInterval[];
  topPicks: FindTimeWindow[];
  browseWindows: FindTimeWindow[];
  windows: FindTimeWindow[];
  topPickCount: number;
  totalBrowseWindows: number;
  totalWindows: number;
  truncated: boolean;
  shiftIds: string[];
  memberIds: string[];
};

export type MobileFindTimeTransport = {
  loadSearchView: (params: {
    calendarId: string;
    userId: string | null | undefined;
    duration: string | null | undefined;
    start: string | null | undefined;
    now?: Date;
  }) => Promise<MobileFindTimeSearchView>;
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
  title: string;
  start_at: string;
  end_at: string;
  shift_assignments: ShiftAssignmentRow[] | null;
};

const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_FIND_TIME_RANGE_DAYS = 30;

export function createMobileFindTimeTransport(options: {
  client: MobileSupabaseDataClient;
  timeoutMs?: number;
}): MobileFindTimeTransport {
  return {
    loadSearchView(params) {
      return loadMobileFindTimeSearchView({
        client: options.client,
        timeoutMs: options.timeoutMs,
        ...params
      });
    }
  };
}

export async function loadMobileFindTimeSearchView(params: {
  client: MobileSupabaseDataClient;
  calendarId: string;
  userId: string | null | undefined;
  duration: string | null | undefined;
  start: string | null | undefined;
  timeoutMs?: number;
  now?: Date;
}): Promise<MobileFindTimeSearchView> {
  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fallbackRange = normalizeFindTimeSearchRange({
    start: null,
    now: params.now
  });
  const emptyRange = fallbackRange.ok
    ? fallbackRange.value
    : {
        startAt: new Date(0).toISOString(),
        endAt: new Date(0).toISOString(),
        totalDays: MAX_FIND_TIME_RANGE_DAYS,
        source: 'default' as const,
        requestedStart: null
      };

  const duration = normalizeFindTimeDuration(params.duration);
  if (!duration.ok) {
    return createEmptyMobileFindTimeSearchView({
      calendarId: params.calendarId,
      range: emptyRange,
      durationMinutes: null,
      status: 'invalid-input',
      reason: duration.reason,
      message: duration.message
    });
  }

  const range = normalizeFindTimeSearchRange({
    start: params.start,
    now: params.now,
    totalDays: MAX_FIND_TIME_RANGE_DAYS
  });

  if (!range.ok) {
    return createEmptyMobileFindTimeSearchView({
      calendarId: params.calendarId,
      range: emptyRange,
      durationMinutes: duration.value.durationMinutes,
      status: 'invalid-input',
      reason: range.reason,
      message: range.message
    });
  }

  const availability = await loadMobileCalendarMemberAvailability({
    client: params.client,
    calendarId: params.calendarId,
    userId: params.userId,
    rangeStart: range.value.startAt,
    rangeEnd: range.value.endAt,
    timeoutMs
  });

  if (availability.status !== 'ready') {
    return {
      status: availability.status,
      reason: availability.reason,
      message: availability.message,
      calendarId: params.calendarId,
      range: range.value,
      durationMinutes: duration.value.durationMinutes,
      roster: availability.roster,
      busyIntervals: availability.busyIntervals,
      topPicks: [],
      browseWindows: [],
      windows: [],
      topPickCount: 0,
      totalBrowseWindows: 0,
      totalWindows: 0,
      truncated: false,
      shiftIds: availability.shiftIds,
      memberIds: availability.memberIds
    } satisfies MobileFindTimeSearchView;
  }

  const matches = buildFindTimeWindows({
    roster: availability.roster,
    busyIntervals: availability.busyIntervals,
    range: range.value,
    duration: duration.value
  });

  if (matches.malformed) {
    return {
      status: 'malformed-response',
      reason: matches.malformed.reason,
      message: matches.malformed.message,
      calendarId: params.calendarId,
      range: range.value,
      durationMinutes: duration.value.durationMinutes,
      roster: availability.roster,
      busyIntervals: availability.busyIntervals,
      topPicks: [],
      browseWindows: [],
      windows: [],
      topPickCount: 0,
      totalBrowseWindows: 0,
      totalWindows: 0,
      truncated: false,
      shiftIds: availability.shiftIds,
      memberIds: availability.memberIds
    } satisfies MobileFindTimeSearchView;
  }

  if (matches.totalWindows === 0) {
    return {
      status: 'no-results',
      reason: 'FIND_TIME_NO_RESULTS',
      message: 'No truthful windows matched that duration inside the trusted 30-day horizon.',
      calendarId: params.calendarId,
      range: range.value,
      durationMinutes: duration.value.durationMinutes,
      roster: availability.roster,
      busyIntervals: availability.busyIntervals,
      topPicks: [],
      browseWindows: [],
      windows: [],
      topPickCount: 0,
      totalBrowseWindows: 0,
      totalWindows: 0,
      truncated: false,
      shiftIds: availability.shiftIds,
      memberIds: availability.memberIds
    } satisfies MobileFindTimeSearchView;
  }

  const splitWindows = splitRankedFindTimeWindows(matches.windows);

  return {
    status: 'ready',
    reason: null,
    message: `Found ${matches.totalWindows} truthful window${matches.totalWindows === 1 ? '' : 's'}, including ${splitWindows.topPicks.length} top pick${splitWindows.topPicks.length === 1 ? '' : 's'}.`,
    calendarId: params.calendarId,
    range: range.value,
    durationMinutes: duration.value.durationMinutes,
    roster: availability.roster,
    busyIntervals: availability.busyIntervals,
    topPicks: splitWindows.topPicks,
    browseWindows: splitWindows.browseWindows,
    windows: splitWindows.windows,
    topPickCount: splitWindows.topPicks.length,
    totalBrowseWindows: Math.max(0, matches.totalWindows - splitWindows.topPicks.length),
    totalWindows: matches.totalWindows,
    truncated: matches.truncated,
    shiftIds: availability.shiftIds,
    memberIds: availability.memberIds
  } satisfies MobileFindTimeSearchView;
}

export type MobileCalendarMemberAvailability = {
  status: MobileFindTimeLoadStatus;
  reason: string | null;
  message: string;
  calendarId: string;
  range: {
    startAt: string;
    endAt: string;
    totalDays: number;
  };
  roster: MobileCalendarRosterMember[];
  busyIntervals: MobileMemberBusyInterval[];
  shiftIds: string[];
  memberIds: string[];
};

export async function loadMobileCalendarMemberAvailability(params: {
  client: MobileSupabaseDataClient;
  calendarId: string;
  userId: string | null | undefined;
  rangeStart: string | Date;
  rangeEnd: string | Date;
  timeoutMs?: number;
}): Promise<MobileCalendarMemberAvailability> {
  const emptyRange = fallbackRange(params.rangeStart, params.rangeEnd);
  const emptyState = createEmptyAvailabilityState({
    calendarId: params.calendarId,
    range: emptyRange
  });
  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (!isUuidLike(params.calendarId)) {
    return {
      ...emptyState,
      status: 'invalid-input',
      reason: 'CALENDAR_ID_INVALID',
      message: 'The calendar id was malformed, so the mobile find-time route rejected it before any trusted roster or busy query ran.'
    } satisfies MobileCalendarMemberAvailability;
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
    } satisfies MobileCalendarMemberAvailability;
  }

  const scopedState = createEmptyAvailabilityState({
    calendarId: params.calendarId,
    range: normalizedRange.value
  });

  const scope = await resolveCalendarReadScope({
    client: params.client,
    calendarId: params.calendarId,
    userId: params.userId,
    timeoutMs
  });

  if (!scope.ok) {
    return {
      ...scopedState,
      status: scope.status,
      reason: scope.reason,
      message: scope.message
    } satisfies MobileCalendarMemberAvailability;
  }

  const rosterResult = await safeSupabaseCall(
    params.client.rpc('list_calendar_members', {
      p_calendar_id: params.calendarId
    }) as unknown as Promise<SupabaseResult<RosterRow[]>>,
    timeoutMs,
    'FIND_TIME_ROSTER_TIMEOUT'
  );

  if (!rosterResult.ok) {
    return {
      ...scopedState,
      status: rosterResult.timeout ? 'timeout' : 'query-failure',
      reason: rosterResult.timeout ? 'FIND_TIME_ROSTER_TIMEOUT' : 'FIND_TIME_ROSTER_FAILED',
      message: rosterResult.timeout
        ? 'The calendar roster lookup timed out before trusted member names could be returned.'
        : 'The calendar roster lookup failed, so mobile find-time stayed fail closed.'
    } satisfies MobileCalendarMemberAvailability;
  }

  if (!Array.isArray(rosterResult.data)) {
    return {
      ...scopedState,
      status: 'malformed-response',
      reason: 'FIND_TIME_ROSTER_RESPONSE_INVALID',
      message: 'The calendar roster response was malformed, so mobile find-time refused to guess member identity.'
    } satisfies MobileCalendarMemberAvailability;
  }

  const roster = normalizeRoster(rosterResult.data);
  if (!roster.ok) {
    return {
      ...scopedState,
      status: 'malformed-response',
      reason: roster.reason,
      message: roster.message
    } satisfies MobileCalendarMemberAvailability;
  }

  const busyResult = await safeSupabaseCall(
    params.client
      .from('shifts')
      .select('id, title, start_at, end_at, shift_assignments(member_id)')
      .eq('calendar_id', params.calendarId)
      .lt('start_at', normalizedRange.value.endAt)
      .gt('end_at', normalizedRange.value.startAt)
      .order('start_at', { ascending: true })
      .order('end_at', { ascending: true }) as unknown as Promise<SupabaseResult<ShiftAvailabilityRow[]>>,
    timeoutMs,
    'FIND_TIME_ASSIGNMENTS_TIMEOUT'
  );

  if (!busyResult.ok) {
    return {
      ...scopedState,
      status: busyResult.timeout ? 'timeout' : 'query-failure',
      reason: busyResult.timeout ? 'FIND_TIME_ASSIGNMENTS_TIMEOUT' : 'FIND_TIME_ASSIGNMENTS_FAILED',
      message: busyResult.timeout
        ? 'The member-attributed busy lookup timed out before trusted availability could be returned.'
        : 'The member-attributed busy lookup failed, so mobile find-time stayed fail closed.'
    } satisfies MobileCalendarMemberAvailability;
  }

  if (!Array.isArray(busyResult.data)) {
    return {
      ...scopedState,
      status: 'malformed-response',
      reason: 'FIND_TIME_ASSIGNMENTS_RESPONSE_INVALID',
      message: 'The busy-interval response was malformed, so mobile find-time refused to infer availability.'
    } satisfies MobileCalendarMemberAvailability;
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
    } satisfies MobileCalendarMemberAvailability;
  }

  return {
    status: 'ready',
    reason: null,
    message: 'Trusted mobile roster summaries and member-attributed busy intervals loaded successfully.',
    calendarId: params.calendarId,
    range: normalizedRange.value,
    roster: roster.value,
    busyIntervals: busyIntervals.value,
    shiftIds: Array.from(new Set(busyIntervals.value.map((interval) => interval.shiftId))),
    memberIds: roster.value.map((member) => member.memberId)
  } satisfies MobileCalendarMemberAvailability;
}

function splitRankedFindTimeWindows(windows: FindTimeWindow[]) {
  const topPicks: FindTimeWindow[] = [];
  const browseWindows: FindTimeWindow[] = [];

  for (const window of windows) {
    if (window.topPick) {
      topPicks.push(window);
      continue;
    }

    browseWindows.push(window);
  }

  return {
    topPicks,
    browseWindows,
    windows: [...topPicks, ...browseWindows]
  };
}

function createEmptyMobileFindTimeSearchView(params: {
  calendarId: string;
  range: MatcherFindTimeSearchRange;
  durationMinutes: number | null;
  status: Exclude<MobileFindTimeSearchStatus, 'ready' | 'no-results'>;
  reason: string;
  message: string;
}): MobileFindTimeSearchView {
  return {
    status: params.status,
    reason: params.reason,
    message: params.message,
    calendarId: params.calendarId,
    range: params.range,
    durationMinutes: params.durationMinutes,
    roster: [],
    busyIntervals: [],
    topPicks: [],
    browseWindows: [],
    windows: [],
    topPickCount: 0,
    totalBrowseWindows: 0,
    totalWindows: 0,
    truncated: false,
    shiftIds: [],
    memberIds: []
  } satisfies MobileFindTimeSearchView;
}

function createEmptyAvailabilityState(params: {
  calendarId: string;
  range: { startAt: string; endAt: string; totalDays: number };
}): MobileCalendarMemberAvailability {
  return {
    status: 'ready',
    reason: null,
    message: 'Trusted mobile roster summaries and member-attributed busy intervals loaded successfully.',
    calendarId: params.calendarId,
    range: params.range,
    roster: [],
    busyIntervals: [],
    shiftIds: [],
    memberIds: []
  } satisfies MobileCalendarMemberAvailability;
}

async function resolveCalendarReadScope(params: {
  client: MobileSupabaseDataClient;
  calendarId: string;
  userId: string | null | undefined;
  timeoutMs: number;
}): Promise<
  | {
      ok: true;
      calendar: CalendarScopeRow;
      membership: MembershipScopeRow;
    }
  | {
      ok: false;
      status: Extract<MobileFindTimeLoadStatus, 'denied' | 'query-failure' | 'timeout' | 'malformed-response'>;
      reason: string;
      message: string;
    }
> {
  if (!params.userId) {
    return {
      ok: false,
      status: 'denied',
      reason: 'AUTH_REQUIRED',
      message: 'A trusted authenticated member is required before mobile find-time can load roster or busy data.'
    };
  }

  const calendarResult = await safeSupabaseCall(
    params.client.from('calendars').select('id, group_id').eq('id', params.calendarId) as unknown as Promise<
      SupabaseResult<CalendarScopeRow[]>
    >,
    params.timeoutMs,
    'CALENDAR_SCOPE_TIMEOUT'
  );

  if (!calendarResult.ok) {
    return {
      ok: false,
      status: calendarResult.timeout ? 'timeout' : 'query-failure',
      reason: calendarResult.timeout ? 'CALENDAR_SCOPE_TIMEOUT' : 'CALENDAR_SCOPE_FAILED',
      message: calendarResult.timeout
        ? 'The trusted calendar scope lookup timed out before mobile find-time could be authorized.'
        : calendarResult.detail ?? 'The trusted calendar scope lookup failed, so mobile find-time stayed fail closed.'
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
      message: 'The trusted calendar scope lookup returned malformed data, so mobile find-time stayed fail closed.'
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
      status: membershipResult.timeout ? 'timeout' : 'query-failure',
      reason: membershipResult.timeout ? 'CALENDAR_SCOPE_TIMEOUT' : 'CALENDAR_SCOPE_MEMBERSHIP_FAILED',
      message: membershipResult.timeout
        ? 'The trusted membership scope lookup timed out before mobile find-time could be authorized.'
        : membershipResult.detail ?? 'The trusted membership scope lookup failed, so mobile find-time stayed fail closed.'
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
      message: 'The trusted membership scope lookup returned malformed data, so mobile find-time stayed fail closed.'
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
      value: MobileCalendarRosterMember[];
    }
  | {
      ok: false;
      reason: 'FIND_TIME_ROSTER_RESPONSE_INVALID' | 'FIND_TIME_ROSTER_MEMBER_DUPLICATE';
      message: string;
    } {
  const seenMemberIds = new Set<string>();
  const value: MobileCalendarRosterMember[] = [];

  for (const row of rows) {
    if (!isRosterRow(row)) {
      return {
        ok: false,
        reason: 'FIND_TIME_ROSTER_RESPONSE_INVALID',
        message: 'The calendar roster response was malformed, so mobile find-time refused to guess member identity.'
      };
    }

    if (seenMemberIds.has(row.member_id)) {
      return {
        ok: false,
        reason: 'FIND_TIME_ROSTER_MEMBER_DUPLICATE',
        message: 'The calendar roster response duplicated a member, so mobile find-time refused to trust the result.'
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
  roster: MobileCalendarRosterMember[];
}):
  | {
      ok: true;
      value: MobileMemberBusyInterval[];
    }
  | {
      ok: false;
      reason:
        | 'FIND_TIME_ASSIGNMENTS_RESPONSE_INVALID'
        | 'FIND_TIME_ASSIGNMENTS_MISSING'
        | 'FIND_TIME_ASSIGNMENT_MEMBER_UNKNOWN'
        | 'FIND_TIME_ASSIGNMENT_DUPLICATE'
        | 'FIND_TIME_ASSIGNMENT_TITLE_MISSING';
      message: string;
    } {
  const rosterById = new Map(params.roster.map((member) => [member.memberId, member]));
  const intervals: MobileMemberBusyInterval[] = [];

  for (const row of params.rows) {
    if (!isShiftAvailabilityRow(row) || !Array.isArray(row.shift_assignments)) {
      return {
        ok: false,
        reason: 'FIND_TIME_ASSIGNMENTS_RESPONSE_INVALID',
        message: 'The busy-interval response was malformed, so mobile find-time refused to infer availability.'
      };
    }

    if (row.shift_assignments.length === 0) {
      return {
        ok: false,
        reason: 'FIND_TIME_ASSIGNMENTS_MISSING',
        message: 'A shift in the trusted range was missing member assignments, so mobile find-time refused to guess who is busy.'
      };
    }

    const seenMembersForShift = new Set<string>();

    for (const assignment of row.shift_assignments) {
      if (!assignment || typeof assignment.member_id !== 'string' || !isUuidLike(assignment.member_id)) {
        return {
          ok: false,
          reason: 'FIND_TIME_ASSIGNMENTS_RESPONSE_INVALID',
          message: 'The busy-interval response was malformed, so mobile find-time refused to infer availability.'
        };
      }

      if (seenMembersForShift.has(assignment.member_id)) {
        return {
          ok: false,
          reason: 'FIND_TIME_ASSIGNMENT_DUPLICATE',
          message: 'A shift returned duplicate member assignments, so mobile find-time refused to trust the busy result.'
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

      if (typeof row.title !== 'string' || row.title.trim().length === 0) {
        return {
          ok: false,
          reason: 'FIND_TIME_ASSIGNMENT_TITLE_MISSING',
          message: 'A shift was missing its trusted title, so nearby mobile find-time explanations failed closed.'
        };
      }

      seenMembersForShift.add(assignment.member_id);
      intervals.push({
        shiftId: row.id,
        shiftTitle: row.title.trim(),
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

async function safeSupabaseCall<T>(
  promise: PromiseLike<SupabaseResult<T>>,
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

function compareBusyIntervals(left: MobileMemberBusyInterval, right: MobileMemberBusyInterval) {
  return (
    left.startAt.localeCompare(right.startAt) ||
    left.endAt.localeCompare(right.endAt) ||
    left.memberName.localeCompare(right.memberName) ||
    left.shiftId.localeCompare(right.shiftId)
  );
}

function fallbackRange(startAt: string | Date, endAt: string | Date) {
  const normalizedStart = toDate(startAt)?.toISOString() ?? new Date(0).toISOString();
  const normalizedEnd = toDate(endAt)?.toISOString() ?? new Date(0).toISOString();
  const totalDays = Math.max(0, (new Date(normalizedEnd).getTime() - new Date(normalizedStart).getTime()) / (24 * 60 * 60 * 1000));

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
    typeof candidate.title === 'string' &&
    typeof candidate.start_at === 'string' &&
    typeof candidate.end_at === 'string' &&
    Array.isArray(candidate.shift_assignments)
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

function normalizeFindTimeRange(params: {
  startAt: string | Date;
  endAt: string | Date;
  maxDays?: number;
}):
  | {
      ok: true;
      value: {
        startAt: string;
        endAt: string;
        totalDays: number;
      };
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
      message: 'The requested availability range start was invalid, so no trusted mobile query was run.'
    };
  }

  const endAt = toDate(params.endAt);
  if (!endAt) {
    return {
      ok: false,
      reason: 'FIND_TIME_RANGE_END_INVALID',
      message: 'The requested availability range end was invalid, so no trusted mobile query was run.'
    };
  }

  if (endAt.getTime() <= startAt.getTime()) {
    return {
      ok: false,
      reason: 'FIND_TIME_RANGE_INVALID',
      message: 'The availability range end must land after the start before any trusted mobile query can run.'
    };
  }

  const totalDays = (endAt.getTime() - startAt.getTime()) / (24 * 60 * 60 * 1000);
  if (totalDays > (params.maxDays ?? MAX_FIND_TIME_RANGE_DAYS)) {
    return {
      ok: false,
      reason: 'FIND_TIME_RANGE_TOO_WIDE',
      message: 'The availability range exceeded the trusted 30-day search horizon, so the mobile query failed closed.'
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
