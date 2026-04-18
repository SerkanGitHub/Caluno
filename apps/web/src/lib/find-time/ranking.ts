import type {
  FindTimeDuration,
  FindTimeMatcherBusyInterval,
  FindTimeMatcherMember,
  FindTimeRawWindow
} from '$lib/find-time/matcher';

const MINUTE_IN_MS = 60 * 1000;

export const MIN_FIND_TIME_TOP_PICK_SHARED_MEMBERS = 2;
export const MAX_FIND_TIME_TOP_PICKS = 3;

export type FindTimeNearbyConstraint = {
  memberId: string;
  memberName: string;
  shiftId: string;
  shiftTitle: string;
  startAt: string;
  endAt: string;
  relation: 'leading' | 'trailing';
  distanceMinutes: number;
  overlapsBoundary: boolean;
};

export type FindTimeBlockedMember = {
  memberId: string;
  displayName: string;
  nearbyConstraints: {
    leading: FindTimeNearbyConstraint[];
    trailing: FindTimeNearbyConstraint[];
  };
};

export type FindTimeScoreBreakdown = {
  sharedMemberCount: number;
  spanSlackMinutes: number;
  nearbyEdgePressureMinutes: number;
  earlierStartAt: string;
};

export type FindTimeRankedWindow = FindTimeRawWindow & {
  topPickEligible: boolean;
  topPick: boolean;
  topPickRank: number | null;
  scoreBreakdown: FindTimeScoreBreakdown;
  blockedMembers: FindTimeBlockedMember[];
  nearbyConstraints: {
    leading: FindTimeNearbyConstraint[];
    trailing: FindTimeNearbyConstraint[];
  };
};

export type FindTimeWindowRankingFailure = {
  reason:
    | 'FIND_TIME_RANKING_WINDOW_INVALID'
    | 'FIND_TIME_RANKING_MEMBER_UNKNOWN'
    | 'FIND_TIME_RANKING_MEMBER_DUPLICATE'
    | 'FIND_TIME_RANKING_SHIFT_TITLE_MISSING'
    | 'FIND_TIME_RANKING_BUSY_INTERVAL_INVALID';
  message: string;
};

type RankedBusyInterval = {
  shiftId: string;
  shiftTitle: string;
  memberId: string;
  memberName: string;
  startAt: string;
  endAt: string;
  startMs: number;
  endMs: number;
};

type RankFindTimeWindowsResult =
  | {
      ok: true;
      windows: FindTimeRankedWindow[];
    }
  | {
      ok: false;
      windows: [];
      failure: FindTimeWindowRankingFailure;
    };

export function rankFindTimeWindows(params: {
  roster: FindTimeMatcherMember[];
  busyIntervals: FindTimeMatcherBusyInterval[];
  windows: FindTimeRawWindow[];
  duration: FindTimeDuration;
}): RankFindTimeWindowsResult {
  const rosterById = new Map(params.roster.map((member) => [member.memberId, member]));
  const indexedBusyIntervals = indexBusyIntervals({
    rosterById,
    busyIntervals: params.busyIntervals
  });

  if (!indexedBusyIntervals.ok) {
    return {
      ok: false,
      windows: [],
      failure: indexedBusyIntervals.failure
    };
  }

  const rankedWindows: FindTimeRankedWindow[] = [];

  for (const window of params.windows) {
    const validationFailure = validateWindow({
      window,
      rosterById
    });

    if (validationFailure) {
      return {
        ok: false,
        windows: [],
        failure: validationFailure
      };
    }

    const availableIds = new Set(window.availableMemberIds);
    const blockedMembers: FindTimeBlockedMember[] = [];
    const nearbyConstraints = {
      leading: [] as FindTimeNearbyConstraint[],
      trailing: [] as FindTimeNearbyConstraint[]
    };

    let nearbyEdgePressureMinutes = 0;

    for (const member of params.roster) {
      if (availableIds.has(member.memberId)) {
        continue;
      }

      const memberIntervals = indexedBusyIntervals.value.get(member.memberId) ?? [];
      const leadingConstraint = toConstraint({
        interval: findLeadingConstraint(memberIntervals, window.startAt),
        member,
        relation: 'leading',
        boundaryAt: window.startAt
      });
      const trailingConstraint = toConstraint({
        interval: findTrailingConstraint(memberIntervals, window.endAt),
        member,
        relation: 'trailing',
        boundaryAt: window.endAt
      });

      const leading = leadingConstraint ? [leadingConstraint] : [];
      const trailing = trailingConstraint ? [trailingConstraint] : [];

      blockedMembers.push({
        memberId: member.memberId,
        displayName: member.displayName,
        nearbyConstraints: {
          leading,
          trailing
        }
      });

      nearbyConstraints.leading.push(...leading);
      nearbyConstraints.trailing.push(...trailing);

      nearbyEdgePressureMinutes += leading.reduce(
        (total, constraint) => total + pressureContributionMinutes(constraint.distanceMinutes, params.duration.durationMinutes),
        0
      );
      nearbyEdgePressureMinutes += trailing.reduce(
        (total, constraint) => total + pressureContributionMinutes(constraint.distanceMinutes, params.duration.durationMinutes),
        0
      );
    }

    const scoreBreakdown: FindTimeScoreBreakdown = {
      sharedMemberCount: window.availableMembers.length,
      spanSlackMinutes: Math.max(0, window.spanDurationMinutes - window.durationMinutes),
      nearbyEdgePressureMinutes,
      earlierStartAt: window.startAt
    };

    rankedWindows.push({
      ...window,
      topPickEligible: window.availableMembers.length >= MIN_FIND_TIME_TOP_PICK_SHARED_MEMBERS,
      topPick: false,
      topPickRank: null,
      scoreBreakdown,
      blockedMembers,
      nearbyConstraints: {
        leading: dedupeConstraints(nearbyConstraints.leading),
        trailing: dedupeConstraints(nearbyConstraints.trailing)
      }
    });
  }

  rankedWindows.sort(compareRankedWindows);

  for (const [index, window] of selectFindTimeTopPicks(rankedWindows).entries()) {
    window.topPick = true;
    window.topPickRank = index + 1;
  }

  return {
    ok: true,
    windows: rankedWindows
  };
}

export function selectFindTimeTopPicks(windows: FindTimeRankedWindow[]) {
  return windows.filter((window) => window.topPickEligible).slice(0, MAX_FIND_TIME_TOP_PICKS);
}

function indexBusyIntervals(params: {
  rosterById: Map<string, FindTimeMatcherMember>;
  busyIntervals: FindTimeMatcherBusyInterval[];
}):
  | {
      ok: true;
      value: Map<string, RankedBusyInterval[]>;
    }
  | {
      ok: false;
      failure: FindTimeWindowRankingFailure;
    } {
  const intervalsByMember = new Map<string, RankedBusyInterval[]>();
  const seenAssignments = new Set<string>();

  for (const interval of params.busyIntervals) {
    const member = params.rosterById.get(interval.memberId);
    if (!member) {
      return {
        ok: false,
        failure: {
          reason: 'FIND_TIME_RANKING_MEMBER_UNKNOWN',
          message: 'A busy interval referenced a member outside the trusted roster, so ranked explanations stayed empty.'
        }
      };
    }

    if (seenAssignments.has(`${interval.shiftId}:${interval.memberId}`)) {
      return {
        ok: false,
        failure: {
          reason: 'FIND_TIME_RANKING_MEMBER_DUPLICATE',
          message: 'A busy interval duplicated the same shift/member assignment, so ranked explanations stayed empty.'
        }
      };
    }

    if (typeof interval.shiftTitle !== 'string' || interval.shiftTitle.trim().length === 0) {
      return {
        ok: false,
        failure: {
          reason: 'FIND_TIME_RANKING_SHIFT_TITLE_MISSING',
          message: 'A busy interval was missing its trusted shift title, so nearby explanations stayed fail closed.'
        }
      };
    }

    const startMs = toTime(interval.startAt);
    const endMs = toTime(interval.endAt);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      return {
        ok: false,
        failure: {
          reason: 'FIND_TIME_RANKING_BUSY_INTERVAL_INVALID',
          message: 'A busy interval had invalid bounds, so ranked explanations stayed empty.'
        }
      };
    }

    seenAssignments.add(`${interval.shiftId}:${interval.memberId}`);

    const value = intervalsByMember.get(interval.memberId) ?? [];
    value.push({
      shiftId: interval.shiftId,
      shiftTitle: interval.shiftTitle.trim(),
      memberId: interval.memberId,
      memberName: member.displayName,
      startAt: interval.startAt,
      endAt: interval.endAt,
      startMs,
      endMs
    });
    intervalsByMember.set(interval.memberId, value);
  }

  for (const intervals of intervalsByMember.values()) {
    intervals.sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs || left.shiftId.localeCompare(right.shiftId));
  }

  return {
    ok: true,
    value: intervalsByMember
  };
}

function validateWindow(params: {
  window: FindTimeRawWindow;
  rosterById: Map<string, FindTimeMatcherMember>;
}): FindTimeWindowRankingFailure | null {
  const startMs = toTime(params.window.startAt);
  const endMs = toTime(params.window.endAt);
  const spanStartMs = toTime(params.window.spanStartAt);
  const spanEndMs = toTime(params.window.spanEndAt);

  if (
    !Number.isFinite(startMs) ||
    !Number.isFinite(endMs) ||
    !Number.isFinite(spanStartMs) ||
    !Number.isFinite(spanEndMs) ||
    endMs <= startMs ||
    spanEndMs <= spanStartMs ||
    startMs < spanStartMs ||
    endMs > spanEndMs
  ) {
    return {
      reason: 'FIND_TIME_RANKING_WINDOW_INVALID',
      message: 'A ranked candidate had invalid bounds, so the trusted shortlist stayed empty.'
    };
  }

  const seenMemberIds = new Set<string>();
  for (const memberId of params.window.availableMemberIds) {
    if (seenMemberIds.has(memberId) || !params.rosterById.has(memberId)) {
      return {
        reason: 'FIND_TIME_RANKING_WINDOW_INVALID',
        message: 'A ranked candidate carried malformed member availability, so the trusted shortlist stayed empty.'
      };
    }

    seenMemberIds.add(memberId);
  }

  if (
    params.window.availableMembers.length !== params.window.availableMemberIds.length ||
    params.window.availableMembers.some((member) => !seenMemberIds.has(member.memberId))
  ) {
    return {
      reason: 'FIND_TIME_RANKING_WINDOW_INVALID',
      message: 'A ranked candidate carried malformed member availability, so the trusted shortlist stayed empty.'
    };
  }

  return null;
}

function findLeadingConstraint(intervals: RankedBusyInterval[], boundaryAt: string) {
  const boundaryMs = toTime(boundaryAt);
  let overlapping: RankedBusyInterval | null = null;
  let previous: RankedBusyInterval | null = null;

  for (const interval of intervals) {
    if (interval.startMs > boundaryMs) {
      break;
    }

    if (interval.endMs > boundaryMs) {
      if (!overlapping || interval.endMs > overlapping.endMs) {
        overlapping = interval;
      }
      continue;
    }

    previous = interval;
  }

  return overlapping ?? previous;
}

function findTrailingConstraint(intervals: RankedBusyInterval[], boundaryAt: string) {
  const boundaryMs = toTime(boundaryAt);
  let overlapping: RankedBusyInterval | null = null;
  let next: RankedBusyInterval | null = null;

  for (const interval of intervals) {
    if (interval.endMs <= boundaryMs) {
      continue;
    }

    if (interval.startMs < boundaryMs) {
      if (!overlapping || interval.startMs < overlapping.startMs) {
        overlapping = interval;
      }
      continue;
    }

    next = interval;
    break;
  }

  return overlapping ?? next;
}

function toConstraint(params: {
  interval: RankedBusyInterval | null;
  member: FindTimeMatcherMember;
  relation: 'leading' | 'trailing';
  boundaryAt: string;
}): FindTimeNearbyConstraint | null {
  if (!params.interval) {
    return null;
  }

  const boundaryMs = toTime(params.boundaryAt);
  const distanceMinutes = Math.max(
    0,
    Math.round(
      (params.relation === 'leading'
        ? boundaryMs - params.interval.endMs
        : params.interval.startMs - boundaryMs) / MINUTE_IN_MS
    )
  );

  return {
    memberId: params.member.memberId,
    memberName: params.member.displayName,
    shiftId: params.interval.shiftId,
    shiftTitle: params.interval.shiftTitle,
    startAt: params.interval.startAt,
    endAt: params.interval.endAt,
    relation: params.relation,
    distanceMinutes,
    overlapsBoundary:
      params.relation === 'leading'
        ? params.interval.startMs <= boundaryMs && params.interval.endMs > boundaryMs
        : params.interval.startMs < boundaryMs && params.interval.endMs > boundaryMs
  };
}

function dedupeConstraints(constraints: FindTimeNearbyConstraint[]) {
  const seen = new Set<string>();
  const deduped: FindTimeNearbyConstraint[] = [];

  for (const constraint of constraints) {
    const key = `${constraint.relation}:${constraint.shiftId}:${constraint.memberId}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(constraint);
  }

  return deduped.sort(
    (left, right) =>
      left.distanceMinutes - right.distanceMinutes ||
      left.memberName.localeCompare(right.memberName) ||
      left.startAt.localeCompare(right.startAt) ||
      left.shiftId.localeCompare(right.shiftId)
  );
}

function pressureContributionMinutes(distanceMinutes: number, durationMinutes: number) {
  return Math.max(0, durationMinutes - distanceMinutes);
}

function compareRankedWindows(left: FindTimeRankedWindow, right: FindTimeRankedWindow) {
  return (
    right.scoreBreakdown.sharedMemberCount - left.scoreBreakdown.sharedMemberCount ||
    right.scoreBreakdown.spanSlackMinutes - left.scoreBreakdown.spanSlackMinutes ||
    left.scoreBreakdown.nearbyEdgePressureMinutes - right.scoreBreakdown.nearbyEdgePressureMinutes ||
    left.startAt.localeCompare(right.startAt)
  );
}

function toTime(value: string) {
  return new Date(value).getTime();
}
