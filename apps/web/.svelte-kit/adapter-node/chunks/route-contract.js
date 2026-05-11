import { r as resolveCalendarAccess } from "./access.js";
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
function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
const DAY_IN_MS = 24 * 60 * 60 * 1e3;
export {
  resolveVisibleWeek as a,
  resolveTrustedCalendarFromAppShell as r
};
