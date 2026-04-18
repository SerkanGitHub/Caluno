import {
  rankFindTimeWindows,
  type FindTimeRankedWindow,
  type FindTimeWindowRankingFailure
} from '$lib/find-time/ranking';

export const DEFAULT_FIND_TIME_DURATION_MINUTES = 60;
export const MIN_FIND_TIME_DURATION_MINUTES = 15;
export const MAX_FIND_TIME_DURATION_MINUTES = 12 * 60;
export const MAX_FIND_TIME_MATCH_RANGE_DAYS = 30;
export const MAX_FIND_TIME_WINDOWS = 200;

const MINUTE_IN_MS = 60 * 1000;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type FindTimeMatcherMember = {
  memberId: string;
  displayName: string;
};

export type FindTimeMatcherBusyInterval = {
  shiftId: string;
  shiftTitle?: string | null;
  memberId: string;
  memberName: string;
  startAt: string;
  endAt: string;
};

export type FindTimeDuration = {
  durationMinutes: number;
  durationMs: number;
};

export type FindTimeSearchRange = {
  startAt: string;
  endAt: string;
  totalDays: number;
  source: 'query' | 'default';
  requestedStart: string | null;
};

export type FindTimeRawWindow = {
  startAt: string;
  endAt: string;
  durationMinutes: number;
  spanStartAt: string;
  spanEndAt: string;
  spanDurationMinutes: number;
  availableMembers: FindTimeMatcherMember[];
  availableMemberIds: string[];
  busyMemberCount: number;
};

export type FindTimeWindow = FindTimeRankedWindow;

export function normalizeFindTimeDuration(value: string | null | undefined):
  | {
      ok: true;
      value: FindTimeDuration;
    }
  | {
      ok: false;
      reason:
        | 'FIND_TIME_DURATION_REQUIRED'
        | 'FIND_TIME_DURATION_INVALID'
        | 'FIND_TIME_DURATION_TOO_SHORT'
        | 'FIND_TIME_DURATION_TOO_LONG';
      message: string;
    } {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return {
      ok: false,
      reason: 'FIND_TIME_DURATION_REQUIRED',
      message: 'Choose a duration before find-time can search the trusted 30-day horizon.'
    };
  }

  if (!/^\d+$/.test(trimmed)) {
    return {
      ok: false,
      reason: 'FIND_TIME_DURATION_INVALID',
      message: 'The requested duration must be a whole number of minutes before any trusted search can run.'
    };
  }

  const durationMinutes = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(durationMinutes)) {
    return {
      ok: false,
      reason: 'FIND_TIME_DURATION_INVALID',
      message: 'The requested duration must be a whole number of minutes before any trusted search can run.'
    };
  }

  if (durationMinutes < MIN_FIND_TIME_DURATION_MINUTES) {
    return {
      ok: false,
      reason: 'FIND_TIME_DURATION_TOO_SHORT',
      message: `The requested duration must be at least ${MIN_FIND_TIME_DURATION_MINUTES} minutes for a trusted availability search.`
    };
  }

  if (durationMinutes > MAX_FIND_TIME_DURATION_MINUTES) {
    return {
      ok: false,
      reason: 'FIND_TIME_DURATION_TOO_LONG',
      message: `The requested duration exceeded the trusted ${MAX_FIND_TIME_DURATION_MINUTES}-minute search bound.`
    };
  }

  return {
    ok: true,
    value: {
      durationMinutes,
      durationMs: durationMinutes * MINUTE_IN_MS
    }
  };
}

export function normalizeFindTimeSearchRange(params: {
  start: string | null | undefined;
  now?: Date;
  totalDays?: number;
}):
  | {
      ok: true;
      value: FindTimeSearchRange;
    }
  | {
      ok: false;
      reason: 'FIND_TIME_RANGE_START_INVALID';
      message: string;
    } {
  const totalDays = params.totalDays ?? MAX_FIND_TIME_MATCH_RANGE_DAYS;
  const trimmedStart = params.start?.trim() ?? '';

  if (trimmedStart) {
    const parsedStart = parseRangeAnchor(trimmedStart);
    if (!parsedStart) {
      return {
        ok: false,
        reason: 'FIND_TIME_RANGE_START_INVALID',
        message: 'The requested find-time anchor was invalid, so the trusted 30-day search did not run.'
      };
    }

    return buildRange(parsedStart, totalDays, 'query', trimmedStart);
  }

  return buildRange(startOfUtcDay(params.now ?? new Date()), totalDays, 'default', null);
}

export function buildFindTimeWindows(params: {
  roster: FindTimeMatcherMember[];
  busyIntervals: FindTimeMatcherBusyInterval[];
  range: Pick<FindTimeSearchRange, 'startAt' | 'endAt'>;
  duration: FindTimeDuration;
  maxWindows?: number;
}): {
  windows: FindTimeWindow[];
  totalWindows: number;
  truncated: boolean;
  topPickCount: number;
  malformed: FindTimeWindowRankingFailure | null;
} {
  const rawMatches = buildRawFindTimeWindows(params);
  if (rawMatches.totalWindows === 0) {
    return {
      windows: [],
      totalWindows: 0,
      truncated: false,
      topPickCount: 0,
      malformed: null
    };
  }

  const ranked = rankFindTimeWindows({
    roster: params.roster,
    busyIntervals: params.busyIntervals,
    windows: rawMatches.windows,
    duration: params.duration
  });

  if (!ranked.ok) {
    return {
      windows: [],
      totalWindows: 0,
      truncated: false,
      topPickCount: 0,
      malformed: ranked.failure
    };
  }

  const maxWindows = params.maxWindows ?? MAX_FIND_TIME_WINDOWS;
  const windows = ranked.windows.slice(0, maxWindows);

  return {
    windows,
    totalWindows: ranked.windows.length,
    truncated: ranked.windows.length > windows.length,
    topPickCount: ranked.windows.filter((window) => window.topPick).length,
    malformed: null
  };
}

export function buildRawFindTimeWindows(params: {
  roster: FindTimeMatcherMember[];
  busyIntervals: FindTimeMatcherBusyInterval[];
  range: Pick<FindTimeSearchRange, 'startAt' | 'endAt'>;
  duration: FindTimeDuration;
}): {
  windows: FindTimeRawWindow[];
  totalWindows: number;
} {
  const rangeStartMs = toDate(params.range.startAt)?.getTime() ?? Number.NaN;
  const rangeEndMs = toDate(params.range.endAt)?.getTime() ?? Number.NaN;

  if (!Number.isFinite(rangeStartMs) || !Number.isFinite(rangeEndMs) || rangeEndMs <= rangeStartMs) {
    return {
      windows: [],
      totalWindows: 0
    };
  }

  const orderedRoster = [...params.roster].sort((left, right) => left.displayName.localeCompare(right.displayName));
  const rosterById = new Map(orderedRoster.map((member) => [member.memberId, member]));
  const boundaries = new Set<number>([rangeStartMs, rangeEndMs]);
  const activeBusyCounts = new Map<string, number>();
  const boundaryEvents = new Map<number, Map<string, number>>();

  for (const interval of params.busyIntervals) {
    const member = rosterById.get(interval.memberId);
    const intervalStartMs = toDate(interval.startAt)?.getTime() ?? Number.NaN;
    const intervalEndMs = toDate(interval.endAt)?.getTime() ?? Number.NaN;

    if (!member || !Number.isFinite(intervalStartMs) || !Number.isFinite(intervalEndMs) || intervalEndMs <= intervalStartMs) {
      continue;
    }

    const clippedStartMs = Math.max(intervalStartMs, rangeStartMs);
    const clippedEndMs = Math.min(intervalEndMs, rangeEndMs);

    if (clippedEndMs <= clippedStartMs) {
      continue;
    }

    boundaries.add(clippedStartMs);
    boundaries.add(clippedEndMs);

    if (intervalStartMs < rangeStartMs && intervalEndMs > rangeStartMs) {
      activeBusyCounts.set(interval.memberId, (activeBusyCounts.get(interval.memberId) ?? 0) + 1);
    } else {
      addBoundaryDelta(boundaryEvents, clippedStartMs, interval.memberId, 1);
    }

    addBoundaryDelta(boundaryEvents, clippedEndMs, interval.memberId, -1);
  }

  const sortedBoundaries = [...boundaries].sort((left, right) => left - right);
  const spans: Array<{ startMs: number; endMs: number; availableMemberIds: string[] }> = [];

  for (let index = 0; index < sortedBoundaries.length - 1; index += 1) {
    const currentBoundary = sortedBoundaries[index] as number;
    applyBoundaryEvents(activeBusyCounts, boundaryEvents.get(currentBoundary));

    const nextBoundary = sortedBoundaries[index + 1] as number;
    if (nextBoundary <= currentBoundary) {
      continue;
    }

    const availableMembers = orderedRoster.filter((member) => !activeBusyCounts.has(member.memberId));
    if (availableMembers.length === 0) {
      continue;
    }

    const availableMemberIds = availableMembers.map((member) => member.memberId);
    const previousSpan = spans.at(-1);

    if (
      previousSpan &&
      previousSpan.endMs === currentBoundary &&
      areEqualStringArrays(previousSpan.availableMemberIds, availableMemberIds)
    ) {
      previousSpan.endMs = nextBoundary;
      continue;
    }

    spans.push({
      startMs: currentBoundary,
      endMs: nextBoundary,
      availableMemberIds
    });
  }

  const durationMs = params.duration.durationMs;
  const matchingSpans = spans.filter((span) => span.endMs - span.startMs >= durationMs);

  return {
    windows: matchingSpans.map((span) => {
      const availableMembers = span.availableMemberIds
        .map((memberId) => rosterById.get(memberId))
        .filter((member): member is FindTimeMatcherMember => member !== undefined);

      return {
        startAt: new Date(span.startMs).toISOString(),
        endAt: new Date(span.startMs + durationMs).toISOString(),
        durationMinutes: params.duration.durationMinutes,
        spanStartAt: new Date(span.startMs).toISOString(),
        spanEndAt: new Date(span.endMs).toISOString(),
        spanDurationMinutes: Math.round((span.endMs - span.startMs) / MINUTE_IN_MS),
        availableMembers,
        availableMemberIds: span.availableMemberIds,
        busyMemberCount: Math.max(0, orderedRoster.length - availableMembers.length)
      } satisfies FindTimeRawWindow;
    }),
    totalWindows: matchingSpans.length
  };
}

function buildRange(startDate: Date, totalDays: number, source: FindTimeSearchRange['source'], requestedStart: string | null) {
  const startAt = startOfUtcDay(startDate);
  const endAt = addUtcDays(startAt, totalDays);

  return {
    ok: true as const,
    value: {
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      totalDays,
      source,
      requestedStart
    }
  };
}

function parseRangeAnchor(value: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  return toDate(value);
}

function addBoundaryDelta(store: Map<number, Map<string, number>>, atMs: number, memberId: string, delta: number) {
  const events = store.get(atMs) ?? new Map<string, number>();
  events.set(memberId, (events.get(memberId) ?? 0) + delta);
  store.set(atMs, events);
}

function applyBoundaryEvents(activeBusyCounts: Map<string, number>, deltas: Map<string, number> | undefined) {
  if (!deltas) {
    return;
  }

  for (const [memberId, delta] of deltas) {
    const nextCount = (activeBusyCounts.get(memberId) ?? 0) + delta;
    if (nextCount > 0) {
      activeBusyCounts.set(memberId, nextCount);
      continue;
    }

    activeBusyCounts.delete(memberId);
  }
}

function areEqualStringArrays(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addUtcDays(value: Date, amount: number): Date {
  return new Date(value.getTime() + amount * DAY_IN_MS);
}

function toDate(value: string | Date): Date | null {
  const candidate = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
}
