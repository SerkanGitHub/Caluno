import { t as toDateTimeLocalValue } from "./board.js";
const CREATE_PREFILL_FLAG = "1";
const CREATE_PREFILL_SOURCE = "find-time";
const CREATE_PREFILL_SEARCH_PARAM_KEYS = [
  "create",
  "prefillStartAt",
  "prefillEndAt",
  "source"
];
function buildCreatePrefillHref(params) {
  const normalizedWindow = normalizeCreatePrefillWindow(params.window);
  if (!normalizedWindow) {
    return null;
  }
  const searchParams = new URLSearchParams({
    create: CREATE_PREFILL_FLAG,
    start: deriveCreatePrefillWeekStart(normalizedWindow.startAt),
    prefillStartAt: normalizedWindow.startAt,
    prefillEndAt: normalizedWindow.endAt,
    source: params.source ?? CREATE_PREFILL_SOURCE
  });
  return `/calendars/${encodeURIComponent(params.calendarId)}?${searchParams.toString()}`;
}
function parseCreatePrefill(searchParams) {
  const create = searchParams.get("create")?.trim();
  const suppliedWeekStart = searchParams.get("start")?.trim();
  const prefillStartAt = searchParams.get("prefillStartAt")?.trim();
  const prefillEndAt = searchParams.get("prefillEndAt")?.trim();
  const source = searchParams.get("source")?.trim();
  if (create !== CREATE_PREFILL_FLAG || source !== CREATE_PREFILL_SOURCE || !suppliedWeekStart || !prefillStartAt || !prefillEndAt || !isIsoDay(suppliedWeekStart)) {
    return null;
  }
  const normalizedWindow = normalizeCreatePrefillWindow({
    startAt: prefillStartAt,
    endAt: prefillEndAt
  });
  if (!normalizedWindow) {
    return null;
  }
  const derivedWeekStart = deriveCreatePrefillWeekStart(normalizedWindow.startAt);
  if (!derivedWeekStart || suppliedWeekStart !== derivedWeekStart) {
    return null;
  }
  const startAtLocal = toDateTimeLocalValue(normalizedWindow.startAt);
  const endAtLocal = toDateTimeLocalValue(normalizedWindow.endAt);
  if (!startAtLocal || !endAtLocal) {
    return null;
  }
  return {
    source: CREATE_PREFILL_SOURCE,
    visibleWeekStart: suppliedWeekStart,
    startAt: normalizedWindow.startAt,
    endAt: normalizedWindow.endAt,
    startAtLocal,
    endAtLocal
  };
}
function deriveCreatePrefillWeekStart(startAt) {
  const parsedStartAt = parseIsoInstant(startAt);
  if (!parsedStartAt) {
    return null;
  }
  const dayStart = new Date(
    Date.UTC(parsedStartAt.getUTCFullYear(), parsedStartAt.getUTCMonth(), parsedStartAt.getUTCDate())
  );
  const dayOfWeek = dayStart.getUTCDay();
  const daysFromMonday = (dayOfWeek + 6) % 7;
  dayStart.setUTCDate(dayStart.getUTCDate() - daysFromMonday);
  return dayStart.toISOString().slice(0, 10);
}
function stripCreatePrefillSearchParams(searchParams) {
  const nextSearchParams = new URLSearchParams(searchParams);
  for (const key of CREATE_PREFILL_SEARCH_PARAM_KEYS) {
    nextSearchParams.delete(key);
  }
  return nextSearchParams;
}
function normalizeCreatePrefillWindow(window) {
  const startAt = normalizeIsoInstant(window.startAt);
  const endAt = normalizeIsoInstant(window.endAt);
  if (!startAt || !endAt) {
    return null;
  }
  const startTime = Date.parse(startAt);
  const endTime = Date.parse(endAt);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    return null;
  }
  return {
    startAt,
    endAt
  };
}
function normalizeIsoInstant(value) {
  if (!value) {
    return null;
  }
  const trimmedValue = value.trim();
  if (!ISO_INSTANT_PATTERN.test(trimmedValue)) {
    return null;
  }
  const parsed = parseIsoInstant(trimmedValue);
  return parsed ? parsed.toISOString() : null;
}
function parseIsoInstant(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function isIsoDay(value) {
  if (!ISO_DAY_PATTERN.test(value)) {
    return false;
  }
  const parsed = /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime());
}
const ISO_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
export {
  buildCreatePrefillHref as b,
  deriveCreatePrefillWeekStart as d,
  parseCreatePrefill as p,
  stripCreatePrefillSearchParams as s
};
