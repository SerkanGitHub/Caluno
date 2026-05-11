import { a as describeDeniedCalendarReason } from "../../../../../../chunks/app-shell.js";
import { r as resolveTrustedCalendarFromAppShell } from "../../../../../../chunks/route-contract.js";
import "../../../../../../chunks/recurrence.js";
const MINUTE_IN_MS$1 = 60 * 1e3;
const MIN_FIND_TIME_TOP_PICK_SHARED_MEMBERS = 2;
const MAX_FIND_TIME_TOP_PICKS = 3;
function rankFindTimeWindows(params) {
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
  const rankedWindows = [];
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
    const blockedMembers = [];
    const nearbyConstraints = {
      leading: [],
      trailing: []
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
        relation: "leading",
        boundaryAt: window.startAt
      });
      const trailingConstraint = toConstraint({
        interval: findTrailingConstraint(memberIntervals, window.endAt),
        member,
        relation: "trailing",
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
    const scoreBreakdown = {
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
function selectFindTimeTopPicks(windows) {
  return windows.filter((window) => window.topPickEligible).slice(0, MAX_FIND_TIME_TOP_PICKS);
}
function indexBusyIntervals(params) {
  const intervalsByMember = /* @__PURE__ */ new Map();
  const seenAssignments = /* @__PURE__ */ new Set();
  for (const interval of params.busyIntervals) {
    const member = params.rosterById.get(interval.memberId);
    if (!member) {
      return {
        ok: false,
        failure: {
          reason: "FIND_TIME_RANKING_MEMBER_UNKNOWN",
          message: "A busy interval referenced a member outside the trusted roster, so ranked explanations stayed empty."
        }
      };
    }
    if (seenAssignments.has(`${interval.shiftId}:${interval.memberId}`)) {
      return {
        ok: false,
        failure: {
          reason: "FIND_TIME_RANKING_MEMBER_DUPLICATE",
          message: "A busy interval duplicated the same shift/member assignment, so ranked explanations stayed empty."
        }
      };
    }
    if (typeof interval.shiftTitle !== "string" || interval.shiftTitle.trim().length === 0) {
      return {
        ok: false,
        failure: {
          reason: "FIND_TIME_RANKING_SHIFT_TITLE_MISSING",
          message: "A busy interval was missing its trusted shift title, so nearby explanations stayed fail closed."
        }
      };
    }
    const startMs = toTime(interval.startAt);
    const endMs = toTime(interval.endAt);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      return {
        ok: false,
        failure: {
          reason: "FIND_TIME_RANKING_BUSY_INTERVAL_INVALID",
          message: "A busy interval had invalid bounds, so ranked explanations stayed empty."
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
function validateWindow(params) {
  const startMs = toTime(params.window.startAt);
  const endMs = toTime(params.window.endAt);
  const spanStartMs = toTime(params.window.spanStartAt);
  const spanEndMs = toTime(params.window.spanEndAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || !Number.isFinite(spanStartMs) || !Number.isFinite(spanEndMs) || endMs <= startMs || spanEndMs <= spanStartMs || startMs < spanStartMs || endMs > spanEndMs) {
    return {
      reason: "FIND_TIME_RANKING_WINDOW_INVALID",
      message: "A ranked candidate had invalid bounds, so the trusted shortlist stayed empty."
    };
  }
  const seenMemberIds = /* @__PURE__ */ new Set();
  for (const memberId of params.window.availableMemberIds) {
    if (seenMemberIds.has(memberId) || !params.rosterById.has(memberId)) {
      return {
        reason: "FIND_TIME_RANKING_WINDOW_INVALID",
        message: "A ranked candidate carried malformed member availability, so the trusted shortlist stayed empty."
      };
    }
    seenMemberIds.add(memberId);
  }
  if (params.window.availableMembers.length !== params.window.availableMemberIds.length || params.window.availableMembers.some((member) => !seenMemberIds.has(member.memberId))) {
    return {
      reason: "FIND_TIME_RANKING_WINDOW_INVALID",
      message: "A ranked candidate carried malformed member availability, so the trusted shortlist stayed empty."
    };
  }
  return null;
}
function findLeadingConstraint(intervals, boundaryAt) {
  const boundaryMs = toTime(boundaryAt);
  let overlapping = null;
  let previous = null;
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
function findTrailingConstraint(intervals, boundaryAt) {
  const boundaryMs = toTime(boundaryAt);
  let overlapping = null;
  let next = null;
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
function toConstraint(params) {
  if (!params.interval) {
    return null;
  }
  const boundaryMs = toTime(params.boundaryAt);
  const distanceMinutes = Math.max(
    0,
    Math.round(
      (params.relation === "leading" ? boundaryMs - params.interval.endMs : params.interval.startMs - boundaryMs) / MINUTE_IN_MS$1
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
    overlapsBoundary: params.relation === "leading" ? params.interval.startMs <= boundaryMs && params.interval.endMs > boundaryMs : params.interval.startMs < boundaryMs && params.interval.endMs > boundaryMs
  };
}
function dedupeConstraints(constraints) {
  const seen = /* @__PURE__ */ new Set();
  const deduped = [];
  for (const constraint of constraints) {
    const key = `${constraint.relation}:${constraint.shiftId}:${constraint.memberId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(constraint);
  }
  return deduped.sort(
    (left, right) => left.distanceMinutes - right.distanceMinutes || left.memberName.localeCompare(right.memberName) || left.startAt.localeCompare(right.startAt) || left.shiftId.localeCompare(right.shiftId)
  );
}
function pressureContributionMinutes(distanceMinutes, durationMinutes) {
  return Math.max(0, durationMinutes - distanceMinutes);
}
function compareRankedWindows(left, right) {
  return right.scoreBreakdown.sharedMemberCount - left.scoreBreakdown.sharedMemberCount || right.scoreBreakdown.spanSlackMinutes - left.scoreBreakdown.spanSlackMinutes || left.scoreBreakdown.nearbyEdgePressureMinutes - right.scoreBreakdown.nearbyEdgePressureMinutes || left.startAt.localeCompare(right.startAt);
}
function toTime(value) {
  return new Date(value).getTime();
}
const MIN_FIND_TIME_DURATION_MINUTES = 15;
const MAX_FIND_TIME_DURATION_MINUTES = 12 * 60;
const MAX_FIND_TIME_MATCH_RANGE_DAYS = 30;
const MAX_FIND_TIME_WINDOWS = 200;
const MINUTE_IN_MS = 60 * 1e3;
const DAY_IN_MS$1 = 24 * 60 * 60 * 1e3;
function normalizeFindTimeDuration(value) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return {
      ok: false,
      reason: "FIND_TIME_DURATION_REQUIRED",
      message: "Choose a duration before find-time can search the trusted 30-day horizon."
    };
  }
  if (!/^\d+$/.test(trimmed)) {
    return {
      ok: false,
      reason: "FIND_TIME_DURATION_INVALID",
      message: "The requested duration must be a whole number of minutes before any trusted search can run."
    };
  }
  const durationMinutes = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(durationMinutes)) {
    return {
      ok: false,
      reason: "FIND_TIME_DURATION_INVALID",
      message: "The requested duration must be a whole number of minutes before any trusted search can run."
    };
  }
  if (durationMinutes < MIN_FIND_TIME_DURATION_MINUTES) {
    return {
      ok: false,
      reason: "FIND_TIME_DURATION_TOO_SHORT",
      message: `The requested duration must be at least ${MIN_FIND_TIME_DURATION_MINUTES} minutes for a trusted availability search.`
    };
  }
  if (durationMinutes > MAX_FIND_TIME_DURATION_MINUTES) {
    return {
      ok: false,
      reason: "FIND_TIME_DURATION_TOO_LONG",
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
function normalizeFindTimeSearchRange(params) {
  const totalDays = params.totalDays ?? MAX_FIND_TIME_MATCH_RANGE_DAYS;
  const trimmedStart = params.start?.trim() ?? "";
  if (trimmedStart) {
    const parsedStart = parseRangeAnchor(trimmedStart);
    if (!parsedStart) {
      return {
        ok: false,
        reason: "FIND_TIME_RANGE_START_INVALID",
        message: "The requested find-time anchor was invalid, so the trusted 30-day search did not run."
      };
    }
    return buildRange(parsedStart, totalDays, "query", trimmedStart);
  }
  return buildRange(startOfUtcDay(params.now ?? /* @__PURE__ */ new Date()), totalDays, "default", null);
}
function buildFindTimeWindows(params) {
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
function buildRawFindTimeWindows(params) {
  const rangeStartMs = toDate$1(params.range.startAt)?.getTime() ?? Number.NaN;
  const rangeEndMs = toDate$1(params.range.endAt)?.getTime() ?? Number.NaN;
  if (!Number.isFinite(rangeStartMs) || !Number.isFinite(rangeEndMs) || rangeEndMs <= rangeStartMs) {
    return {
      windows: [],
      totalWindows: 0
    };
  }
  const orderedRoster = [...params.roster].sort((left, right) => left.displayName.localeCompare(right.displayName));
  const rosterById = new Map(orderedRoster.map((member) => [member.memberId, member]));
  const boundaries = /* @__PURE__ */ new Set([rangeStartMs, rangeEndMs]);
  const activeBusyCounts = /* @__PURE__ */ new Map();
  const boundaryEvents = /* @__PURE__ */ new Map();
  for (const interval of params.busyIntervals) {
    const member = rosterById.get(interval.memberId);
    const intervalStartMs = toDate$1(interval.startAt)?.getTime() ?? Number.NaN;
    const intervalEndMs = toDate$1(interval.endAt)?.getTime() ?? Number.NaN;
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
  const spans = [];
  for (let index = 0; index < sortedBoundaries.length - 1; index += 1) {
    const currentBoundary = sortedBoundaries[index];
    applyBoundaryEvents(activeBusyCounts, boundaryEvents.get(currentBoundary));
    const nextBoundary = sortedBoundaries[index + 1];
    if (nextBoundary <= currentBoundary) {
      continue;
    }
    const availableMembers = orderedRoster.filter((member) => !activeBusyCounts.has(member.memberId));
    if (availableMembers.length === 0) {
      continue;
    }
    const availableMemberIds = availableMembers.map((member) => member.memberId);
    const previousSpan = spans.at(-1);
    if (previousSpan && previousSpan.endMs === currentBoundary && areEqualStringArrays(previousSpan.availableMemberIds, availableMemberIds)) {
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
      const availableMembers = span.availableMemberIds.map((memberId) => rosterById.get(memberId)).filter((member) => member !== void 0);
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
      };
    }),
    totalWindows: matchingSpans.length
  };
}
function buildRange(startDate, totalDays, source, requestedStart) {
  const startAt = startOfUtcDay(startDate);
  const endAt = addUtcDays(startAt, totalDays);
  return {
    ok: true,
    value: {
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      totalDays,
      source,
      requestedStart
    }
  };
}
function parseRangeAnchor(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
  }
  return toDate$1(value);
}
function addBoundaryDelta(store, atMs, memberId, delta) {
  const events = store.get(atMs) ?? /* @__PURE__ */ new Map();
  events.set(memberId, (events.get(memberId) ?? 0) + delta);
  store.set(atMs, events);
}
function applyBoundaryEvents(activeBusyCounts, deltas) {
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
function areEqualStringArrays(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
function startOfUtcDay(value) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}
function addUtcDays(value, amount) {
  return new Date(value.getTime() + amount * DAY_IN_MS$1);
}
function toDate$1(value) {
  const candidate = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
}
const MAX_FIND_TIME_RANGE_DAYS = 30;
const DAY_IN_MS = 24 * 60 * 60 * 1e3;
function normalizeFindTimeRange(params) {
  const startAt = toDate(params.startAt);
  if (!startAt) {
    return {
      ok: false,
      reason: "FIND_TIME_RANGE_START_INVALID",
      message: "The requested availability range start was invalid, so no trusted query was run."
    };
  }
  const endAt = toDate(params.endAt);
  if (!endAt) {
    return {
      ok: false,
      reason: "FIND_TIME_RANGE_END_INVALID",
      message: "The requested availability range end was invalid, so no trusted query was run."
    };
  }
  if (endAt.getTime() <= startAt.getTime()) {
    return {
      ok: false,
      reason: "FIND_TIME_RANGE_INVALID",
      message: "The availability range end must land after the start before any trusted query can run."
    };
  }
  const totalDays = (endAt.getTime() - startAt.getTime()) / DAY_IN_MS;
  if (totalDays > (params.maxDays ?? MAX_FIND_TIME_RANGE_DAYS)) {
    return {
      ok: false,
      reason: "FIND_TIME_RANGE_TOO_WIDE",
      message: "The availability range exceeded the trusted 30-day search horizon, so the query failed closed."
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
async function loadCalendarMemberAvailability(params) {
  const emptyRange = fallbackRange(params.rangeStart, params.rangeEnd);
  const emptyState = createEmptyAvailabilityState({
    calendarId: params.calendarId,
    range: emptyRange
  });
  if (!isUuidLike(params.calendarId)) {
    return {
      ...emptyState,
      status: "invalid-input",
      reason: "CALENDAR_ID_INVALID",
      message: "The calendar id was malformed, so the roster and busy lookup were rejected before any trusted query ran."
    };
  }
  const normalizedRange = normalizeFindTimeRange({
    startAt: params.rangeStart,
    endAt: params.rangeEnd
  });
  if (!normalizedRange.ok) {
    return {
      ...emptyState,
      status: "invalid-input",
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
  const rosterResult = await params.supabase.rpc("list_calendar_members", {
    p_calendar_id: params.calendarId
  });
  if (rosterResult.error) {
    return {
      ...scopedState,
      status: isTimeoutMessage(rosterResult.error.message) ? "timeout" : "query-failure",
      reason: isTimeoutMessage(rosterResult.error.message) ? "FIND_TIME_ROSTER_TIMEOUT" : "FIND_TIME_ROSTER_FAILED",
      message: isTimeoutMessage(rosterResult.error.message) ? "The calendar roster lookup timed out before trusted member names could be returned." : "The calendar roster lookup failed, so find-time stayed fail closed."
    };
  }
  if (!Array.isArray(rosterResult.data)) {
    return {
      ...scopedState,
      status: "malformed-response",
      reason: "FIND_TIME_ROSTER_RESPONSE_INVALID",
      message: "The calendar roster response was malformed, so the server refused to guess member identity."
    };
  }
  const roster = normalizeRoster(rosterResult.data);
  if (!roster.ok) {
    return {
      ...scopedState,
      status: "malformed-response",
      reason: roster.reason,
      message: roster.message
    };
  }
  const busyResult = await params.supabase.from("shifts").select("id, title, start_at, end_at, shift_assignments(member_id)").eq("calendar_id", params.calendarId).lt("start_at", normalizedRange.value.endAt).gt("end_at", normalizedRange.value.startAt).order("start_at", { ascending: true }).order("end_at", { ascending: true });
  if (busyResult.error) {
    return {
      ...scopedState,
      status: isTimeoutMessage(busyResult.error.message) ? "timeout" : "query-failure",
      reason: isTimeoutMessage(busyResult.error.message) ? "FIND_TIME_ASSIGNMENTS_TIMEOUT" : "FIND_TIME_ASSIGNMENTS_FAILED",
      message: isTimeoutMessage(busyResult.error.message) ? "The member-attributed busy lookup timed out before trusted availability could be returned." : "The member-attributed busy lookup failed, so find-time stayed fail closed."
    };
  }
  if (!Array.isArray(busyResult.data)) {
    return {
      ...scopedState,
      status: "malformed-response",
      reason: "FIND_TIME_ASSIGNMENTS_RESPONSE_INVALID",
      message: "The busy-interval response was malformed, so the server refused to infer availability."
    };
  }
  const busyIntervals = normalizeBusyIntervals({
    rows: busyResult.data,
    roster: roster.value
  });
  if (!busyIntervals.ok) {
    return {
      ...scopedState,
      status: "malformed-response",
      reason: busyIntervals.reason,
      message: busyIntervals.message,
      roster: roster.value,
      memberIds: roster.value.map((member) => member.memberId)
    };
  }
  return {
    status: "ready",
    reason: null,
    message: "Trusted calendar roster summaries and member-attributed busy intervals loaded successfully.",
    calendarId: params.calendarId,
    range: normalizedRange.value,
    roster: roster.value,
    busyIntervals: busyIntervals.value,
    shiftIds: Array.from(new Set(busyIntervals.value.map((interval) => interval.shiftId))),
    memberIds: roster.value.map((member) => member.memberId)
  };
}
async function loadFindTimeSearchView(params) {
  const fallbackRange2 = normalizeFindTimeSearchRange({
    start: null,
    now: params.now
  });
  const emptyRange = fallbackRange2.ok ? fallbackRange2.value : {
    startAt: (/* @__PURE__ */ new Date(0)).toISOString(),
    endAt: (/* @__PURE__ */ new Date(0)).toISOString(),
    totalDays: MAX_FIND_TIME_RANGE_DAYS,
    source: "default",
    requestedStart: null
  };
  const duration = normalizeFindTimeDuration(params.duration);
  if (!duration.ok) {
    return createEmptyFindTimeSearchView({
      calendarId: params.calendarId,
      range: emptyRange,
      durationMinutes: null,
      status: "invalid-input",
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
    return createEmptyFindTimeSearchView({
      calendarId: params.calendarId,
      range: emptyRange,
      durationMinutes: duration.value.durationMinutes,
      status: "invalid-input",
      reason: range.reason,
      message: range.message
    });
  }
  const availability = await loadCalendarMemberAvailability({
    supabase: params.supabase,
    calendarId: params.calendarId,
    userId: params.userId,
    rangeStart: range.value.startAt,
    rangeEnd: range.value.endAt
  });
  if (availability.status !== "ready") {
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
    };
  }
  const matches = buildFindTimeWindows({
    roster: availability.roster,
    busyIntervals: availability.busyIntervals,
    range: range.value,
    duration: duration.value
  });
  if (matches.malformed) {
    return {
      status: "malformed-response",
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
    };
  }
  if (matches.totalWindows === 0) {
    return {
      status: "no-results",
      reason: "FIND_TIME_NO_RESULTS",
      message: "No truthful windows matched that duration inside the trusted 30-day horizon.",
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
    };
  }
  const splitWindows = splitRankedFindTimeWindows(matches.windows);
  return {
    status: "ready",
    reason: null,
    message: `Found ${matches.totalWindows} truthful window${matches.totalWindows === 1 ? "" : "s"}, including ${splitWindows.topPicks.length} top pick${splitWindows.topPicks.length === 1 ? "" : "s"}.`,
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
  };
}
function splitRankedFindTimeWindows(windows) {
  const topPicks = [];
  const browseWindows = [];
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
function createEmptyFindTimeSearchView(params) {
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
  };
}
function createEmptyAvailabilityState(params) {
  return {
    status: "ready",
    reason: null,
    message: "Trusted calendar roster summaries and member-attributed busy intervals loaded successfully.",
    calendarId: params.calendarId,
    range: params.range,
    roster: [],
    busyIntervals: [],
    shiftIds: [],
    memberIds: []
  };
}
async function resolveCalendarReadScope(params) {
  if (!params.userId) {
    return {
      ok: false,
      status: "denied",
      reason: "AUTH_REQUIRED",
      message: "A trusted authenticated member is required before roster or busy data can be loaded."
    };
  }
  const calendarResult = await params.supabase.from("calendars").select("id, group_id").eq("id", params.calendarId);
  if (calendarResult.error) {
    return {
      ok: false,
      status: isTimeoutMessage(calendarResult.error.message) ? "timeout" : "query-failure",
      reason: isTimeoutMessage(calendarResult.error.message) ? "CALENDAR_SCOPE_TIMEOUT" : "CALENDAR_SCOPE_FAILED",
      message: isTimeoutMessage(calendarResult.error.message) ? "The trusted calendar scope lookup timed out before find-time could be authorized." : "The trusted calendar scope lookup failed, so find-time stayed fail closed."
    };
  }
  const calendar = calendarResult.data?.[0] ?? null;
  if (!calendar) {
    return {
      ok: false,
      status: "denied",
      reason: "CALENDAR_NOT_PERMITTED",
      message: "That calendar is outside the current trusted scope, so roster and busy data were withheld."
    };
  }
  if (!isCalendarScopeRow(calendar)) {
    return {
      ok: false,
      status: "malformed-response",
      reason: "CALENDAR_SCOPE_RESPONSE_INVALID",
      message: "The trusted calendar scope lookup returned malformed data, so find-time stayed fail closed."
    };
  }
  const membershipResult = await params.supabase.from("group_memberships").select("group_id, role").eq("user_id", params.userId).eq("group_id", calendar.group_id);
  if (membershipResult.error) {
    return {
      ok: false,
      status: isTimeoutMessage(membershipResult.error.message) ? "timeout" : "query-failure",
      reason: isTimeoutMessage(membershipResult.error.message) ? "CALENDAR_SCOPE_TIMEOUT" : "CALENDAR_SCOPE_MEMBERSHIP_FAILED",
      message: isTimeoutMessage(membershipResult.error.message) ? "The trusted membership scope lookup timed out before find-time could be authorized." : "The trusted membership scope lookup failed, so find-time stayed fail closed."
    };
  }
  const membership = membershipResult.data?.[0] ?? null;
  if (!membership) {
    return {
      ok: false,
      status: "denied",
      reason: "CALENDAR_NOT_PERMITTED",
      message: "Your trusted session is not a member of the calendar group, so roster and busy data were withheld."
    };
  }
  if (!isMembershipScopeRow(membership)) {
    return {
      ok: false,
      status: "malformed-response",
      reason: "CALENDAR_SCOPE_RESPONSE_INVALID",
      message: "The trusted membership scope lookup returned malformed data, so find-time stayed fail closed."
    };
  }
  return {
    ok: true,
    calendar,
    membership
  };
}
function normalizeRoster(rows) {
  const seenMemberIds = /* @__PURE__ */ new Set();
  const value = [];
  for (const row of rows) {
    if (!isRosterRow(row)) {
      return {
        ok: false,
        reason: "FIND_TIME_ROSTER_RESPONSE_INVALID",
        message: "The calendar roster response was malformed, so the server refused to guess member identity."
      };
    }
    if (seenMemberIds.has(row.member_id)) {
      return {
        ok: false,
        reason: "FIND_TIME_ROSTER_MEMBER_DUPLICATE",
        message: "The calendar roster response duplicated a member, so the server refused to trust the result."
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
function normalizeBusyIntervals(params) {
  const rosterById = new Map(params.roster.map((member) => [member.memberId, member]));
  const intervals = [];
  for (const row of params.rows) {
    if (!isShiftAvailabilityRow(row) || !Array.isArray(row.shift_assignments)) {
      return {
        ok: false,
        reason: "FIND_TIME_ASSIGNMENTS_RESPONSE_INVALID",
        message: "The busy-interval response was malformed, so the server refused to infer availability."
      };
    }
    if (row.shift_assignments.length === 0) {
      return {
        ok: false,
        reason: "FIND_TIME_ASSIGNMENTS_MISSING",
        message: "A shift in the trusted range was missing member assignments, so the server refused to guess who is busy."
      };
    }
    const seenMembersForShift = /* @__PURE__ */ new Set();
    for (const assignment of row.shift_assignments) {
      if (!assignment || typeof assignment.member_id !== "string" || !isUuidLike(assignment.member_id)) {
        return {
          ok: false,
          reason: "FIND_TIME_ASSIGNMENTS_RESPONSE_INVALID",
          message: "The busy-interval response was malformed, so the server refused to infer availability."
        };
      }
      if (seenMembersForShift.has(assignment.member_id)) {
        return {
          ok: false,
          reason: "FIND_TIME_ASSIGNMENT_DUPLICATE",
          message: "A shift returned duplicate member assignments, so the server refused to trust the busy result."
        };
      }
      const member = rosterById.get(assignment.member_id);
      if (!member) {
        return {
          ok: false,
          reason: "FIND_TIME_ASSIGNMENT_MEMBER_UNKNOWN",
          message: "A shift assignment referenced a member outside the trusted calendar roster, so the result failed closed."
        };
      }
      if (typeof row.title !== "string" || row.title.trim().length === 0) {
        return {
          ok: false,
          reason: "FIND_TIME_ASSIGNMENT_TITLE_MISSING",
          message: "A shift was missing its trusted title, so nearby find-time explanations failed closed."
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
function compareBusyIntervals(left, right) {
  return left.startAt.localeCompare(right.startAt) || left.endAt.localeCompare(right.endAt) || left.memberName.localeCompare(right.memberName) || left.shiftId.localeCompare(right.shiftId);
}
function fallbackRange(startAt, endAt) {
  const normalizedStart = toDate(startAt)?.toISOString() ?? (/* @__PURE__ */ new Date(0)).toISOString();
  const normalizedEnd = toDate(endAt)?.toISOString() ?? (/* @__PURE__ */ new Date(0)).toISOString();
  const totalDays = Math.max(0, (new Date(normalizedEnd).getTime() - new Date(normalizedStart).getTime()) / DAY_IN_MS);
  return {
    startAt: normalizedStart,
    endAt: normalizedEnd,
    totalDays
  };
}
function toDate(value) {
  const candidate = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
}
function isCalendarScopeRow(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value;
  return typeof candidate.id === "string" && typeof candidate.group_id === "string";
}
function isMembershipScopeRow(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value;
  return typeof candidate.group_id === "string" && (candidate.role === "owner" || candidate.role === "member");
}
function isRosterRow(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value;
  return typeof candidate.member_id === "string" && isUuidLike(candidate.member_id) && typeof candidate.display_name === "string" && candidate.display_name.trim().length > 0;
}
function isShiftAvailabilityRow(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value;
  return typeof candidate.id === "string" && typeof candidate.title === "string" && typeof candidate.start_at === "string" && typeof candidate.end_at === "string" && Array.isArray(candidate.shift_assignments);
}
function isTimeoutMessage(message) {
  return /timeout/i.test(message ?? "");
}
function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
function buildDeniedFindTimeView(params) {
  return {
    findTimeView: {
      kind: "denied",
      attemptedCalendarId: params.calendarId,
      failurePhase: params.failurePhase,
      reason: params.reason,
      detail: describeDeniedCalendarReason(params.reason),
      welcome: params.welcome
    }
  };
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
    return buildDeniedFindTimeView({
      calendarId: params.calendarId,
      reason: calendarState.reason,
      failurePhase: calendarState.failurePhase,
      welcome: url.searchParams.get("welcome")
    });
  }
  const group = Array.isArray(appShell?.groups) ? appShell.groups.find((candidate) => candidate.id === calendarState.calendar.groupId) ?? null : null;
  const search = await loadFindTimeSearchView({
    supabase: locals.supabase,
    calendarId: calendarState.calendar.id,
    userId: user?.id ?? null,
    duration: url.searchParams.get("duration"),
    start: url.searchParams.get("start")
  });
  return {
    findTimeView: {
      kind: "calendar",
      calendar: calendarState.calendar,
      group,
      welcome: url.searchParams.get("welcome"),
      search
    }
  };
};
export {
  load
};
