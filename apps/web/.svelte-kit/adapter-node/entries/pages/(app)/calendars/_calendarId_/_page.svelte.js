import { a as attr_class, d as derived, e as ensure_array_like, h as head } from "../../../../../chunks/renderer.js";
import { e as escape_html, a as attr } from "../../../../../chunks/attributes.js";
import "@sveltejs/kit/internal";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../chunks/root.js";
import "../../../../../chunks/state.svelte.js";
import "../../../../../chunks/recurrence.js";
import "@supabase/ssr";
function deriveVisibleWeekConflicts(schedule) {
  const days = {};
  const shifts = {};
  const invalidShiftIds = new Set(findDuplicateShiftIds(schedule.days));
  const conflictDayKeys = [];
  const conflictingShiftIds = /* @__PURE__ */ new Set();
  let totalOverlapCount = 0;
  for (const day of schedule.days) {
    const dayResult = deriveDayConflicts(day.dayKey, day.shifts, invalidShiftIds);
    for (const conflict of dayResult.shiftConflicts) {
      shifts[conflict.shiftId] = conflict;
      conflictingShiftIds.add(conflict.shiftId);
    }
    if (dayResult.dayConflict) {
      days[day.dayKey] = dayResult.dayConflict;
      conflictDayKeys.push(day.dayKey);
      totalOverlapCount += dayResult.dayConflict.overlapCount;
    }
  }
  return {
    board: totalOverlapCount > 0 ? {
      overlapCount: totalOverlapCount,
      conflictDayCount: conflictDayKeys.length,
      conflictingShiftCount: conflictingShiftIds.size,
      conflictDayKeys
    } : null,
    days,
    shifts,
    invalidShiftIds: [...invalidShiftIds].sort()
  };
}
function deriveDayConflicts(dayKey, dayShifts, invalidShiftIds) {
  const validShifts = [];
  for (const shift of sortCalendarShifts(dayShifts)) {
    if (invalidShiftIds.has(shift.id)) {
      continue;
    }
    const normalized = normalizeShiftForConflict(dayKey, shift);
    if (!normalized) {
      invalidShiftIds.add(shift.id);
      continue;
    }
    validShifts.push(normalized);
  }
  if (validShifts.length < 2) {
    return {
      dayConflict: null,
      shiftConflicts: []
    };
  }
  const conflictsByShiftId = /* @__PURE__ */ new Map();
  const conflictPairs = [];
  for (let index = 0; index < validShifts.length; index += 1) {
    const current = validShifts[index];
    for (let nextIndex = index + 1; nextIndex < validShifts.length; nextIndex += 1) {
      const next = validShifts[nextIndex];
      if (next.startAt >= current.endAt) {
        break;
      }
      if (!rangesOverlap(current, next)) {
        continue;
      }
      addConflictCounterpart(conflictsByShiftId, current, next);
      addConflictCounterpart(conflictsByShiftId, next, current);
      conflictPairs.push({
        leftShiftId: current.id,
        rightShiftId: next.id
      });
    }
  }
  if (conflictPairs.length === 0) {
    return {
      dayConflict: null,
      shiftConflicts: []
    };
  }
  const conflictingShiftIds = [...conflictsByShiftId.keys()].sort();
  const shiftConflicts = conflictingShiftIds.map((shiftId) => {
    const conflictingShifts = [...conflictsByShiftId.get(shiftId)?.values() ?? []];
    const sortedConflictingShifts = sortConflictingShifts(conflictingShifts);
    return {
      shiftId,
      dayKey,
      overlapCount: sortedConflictingShifts.length,
      conflictingShiftIds: sortedConflictingShifts.map((shift) => shift.id),
      conflictingShifts: sortedConflictingShifts
    };
  });
  return {
    dayConflict: {
      dayKey,
      overlapCount: conflictPairs.length,
      conflictingShiftIds,
      conflictPairs
    },
    shiftConflicts
  };
}
function normalizeShiftForConflict(dayKey, shift) {
  const start = new Date(shift.startAt);
  const end = new Date(shift.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    return null;
  }
  if (shift.startAt.slice(0, 10) !== dayKey) {
    return null;
  }
  return {
    id: shift.id,
    title: shift.title,
    dayKey,
    startAt: shift.startAt,
    endAt: shift.endAt
  };
}
function sortCalendarShifts(shifts) {
  return [...shifts].sort((left, right) => {
    return left.startAt.localeCompare(right.startAt) || left.endAt.localeCompare(right.endAt) || left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
  });
}
function findDuplicateShiftIds(days) {
  const counts = /* @__PURE__ */ new Map();
  for (const day of days) {
    for (const shift of day.shifts) {
      counts.set(shift.id, (counts.get(shift.id) ?? 0) + 1);
    }
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([shiftId]) => shiftId).sort();
}
function addConflictCounterpart(conflictsByShiftId, shift, counterpart) {
  const existing = conflictsByShiftId.get(shift.id) ?? /* @__PURE__ */ new Map();
  existing.set(counterpart.id, counterpart);
  conflictsByShiftId.set(shift.id, existing);
}
function sortConflictingShifts(shifts) {
  return [...shifts].sort((left, right) => {
    return left.startAt.localeCompare(right.startAt) || left.endAt.localeCompare(right.endAt) || left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
  });
}
function rangesOverlap(left, right) {
  return left.startAt < right.endAt && right.startAt < left.endAt;
}
function buildCalendarWeekBoard(schedule, options) {
  const visibleWeek = schedule.visibleWeek;
  const todayKey = toDayKey(options?.now ?? null);
  const startDate = parseUtcDate(visibleWeek.start);
  const endDate = parseUtcDate(addDayKey(visibleWeek.endExclusive, -1));
  const runtime = options?.runtime;
  const conflicts = deriveVisibleWeekConflicts(schedule);
  return {
    visibleWeekStart: visibleWeek.start,
    visibleWeekEndExclusive: visibleWeek.endExclusive,
    rangeLabel: `${formatMonthDay(startDate)} — ${formatMonthDay(endDate)}, ${startDate.getUTCFullYear()}`,
    caption: buildVisibleWeekCaption(visibleWeek, "server-sync"),
    sourceLabel: buildVisibleWeekSourceLabel(visibleWeek),
    sourceTone: visibleWeek.source === "fallback-invalid" ? "warning" : "neutral",
    previousWeekStart: addDayKey(visibleWeek.start, -7),
    nextWeekStart: addDayKey(visibleWeek.start, 7),
    totalShifts: schedule.totalShifts,
    hasShifts: schedule.totalShifts > 0,
    statusBadges: buildBoardStatusBadges(),
    conflict: buildBoardConflictModel(schedule, conflicts),
    syncPhaseLabel: formatSyncPhaseLabel("idle"),
    lastSyncAttemptLabel: runtime?.lastSyncAttemptAt ?? null,
    lastFailure: runtime?.lastFailure ?? null,
    lastSyncError: runtime?.lastSyncError ?? null,
    days: schedule.days.map((day) => buildDayColumn(day, todayKey, {}, conflicts))
  };
}
function sortShiftsForBoard(shifts) {
  return [...shifts].sort((left, right) => {
    return left.startAt.localeCompare(right.startAt) || left.endAt.localeCompare(right.endAt) || left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
  });
}
function summarizeScheduleActions(states) {
  return states.filter((state) => Boolean(state)).map((state) => ({
    id: state.id,
    label: formatActionLabel(state.action),
    tone: mapActionTone(state.status),
    state
  }));
}
function toDateTimeLocalValue(value) {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  const year = parsed.getUTCFullYear();
  const month = `${parsed.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${parsed.getUTCDate()}`.padStart(2, "0");
  const hours = `${parsed.getUTCHours()}`.padStart(2, "0");
  const minutes = `${parsed.getUTCMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
function buildDefaultCreateTimes(dayKey) {
  const safeDayKey = dayKey && /^\d{4}-\d{2}-\d{2}$/.test(dayKey) ? dayKey : "2026-04-20";
  return {
    startAt: `${safeDayKey}T09:00`,
    endAt: `${safeDayKey}T13:00`
  };
}
function buildDayColumn(day, todayKey, shiftDiagnostics, conflicts) {
  const date = parseUtcDate(day.dayKey);
  const dayConflict = buildDayConflictModel(day, conflicts.days[day.dayKey] ?? null);
  const shifts = sortShiftsForBoard(day.shifts).map(
    (shift) => buildShiftCardModel(shift, day.shifts.length, shiftDiagnostics, conflicts.shifts[shift.id] ?? null)
  );
  return {
    dayKey: day.dayKey,
    label: day.label,
    weekdayLabel: date.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "UTC"
    }),
    dayNumberLabel: date.toLocaleDateString("en-US", {
      day: "numeric",
      timeZone: "UTC"
    }),
    monthLabel: date.toLocaleDateString("en-US", {
      month: "short",
      timeZone: "UTC"
    }),
    isToday: todayKey === day.dayKey,
    isEmpty: shifts.length === 0,
    density: shifts.length === 0 ? "empty" : shifts.length >= 3 ? "busy" : "quiet",
    shiftCount: shifts.length,
    shifts,
    conflict: dayConflict
  };
}
function buildShiftCardModel(shift, dayShiftCount, shiftDiagnostics, shiftConflict) {
  const start = new Date(shift.startAt);
  const end = new Date(shift.endAt);
  const durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 6e4));
  const durationHours = durationMinutes / 60;
  return {
    id: shift.id,
    title: shift.title,
    dayKey: shift.startAt.slice(0, 10),
    startAt: shift.startAt,
    endAt: shift.endAt,
    startTimeLabel: formatTime(start),
    endTimeLabel: formatTime(end),
    rangeLabel: `${formatTime(start)} → ${formatTime(end)}`,
    durationLabel: durationMinutes % 60 === 0 ? `${durationHours.toFixed(0)}h block` : `${durationHours.toFixed(1)}h block`,
    occurrenceLabel: shift.occurrenceIndex ? `Occurrence ${shift.occurrenceIndex}` : null,
    sourceLabel: shift.sourceKind === "series" ? "Recurring series" : "One-off shift",
    density: dayShiftCount >= 3 ? "busy" : "quiet",
    seriesId: shift.seriesId,
    occurrenceIndex: shift.occurrenceIndex,
    sourceKind: shift.sourceKind,
    statusBadges: shiftDiagnostics[shift.id] ?? [],
    conflict: buildShiftConflictModel(shiftConflict)
  };
}
function buildBoardConflictModel(schedule, conflicts) {
  if (!conflicts.board) {
    return null;
  }
  const conflictedDayLabels = schedule.days.filter((day) => conflicts.board?.conflictDayKeys.includes(day.dayKey)).map((day) => day.label);
  return {
    overlapCount: conflicts.board.overlapCount,
    dayCount: conflicts.board.conflictDayCount,
    shiftCount: conflicts.board.conflictingShiftCount,
    conflictDayKeys: conflicts.board.conflictDayKeys,
    label: `${conflicts.board.overlapCount} overlap ${conflicts.board.overlapCount === 1 ? "pair" : "pairs"} in view`,
    detail: conflictedDayLabels.length === 1 ? `${conflictedDayLabels[0]} contains ${conflicts.board.conflictingShiftCount} conflicting visible ${conflicts.board.conflictingShiftCount === 1 ? "shift" : "shifts"}.` : `${conflictedDayLabels.length} visible days contain ${conflicts.board.conflictingShiftCount} conflicting shifts: ${formatInlineList(conflictedDayLabels)}.`
  };
}
function buildDayConflictModel(day, dayConflict) {
  if (!dayConflict) {
    return null;
  }
  const conflictingShifts = sortShiftsForBoard(day.shifts).filter((shift) => dayConflict.conflictingShiftIds.includes(shift.id));
  return {
    overlapCount: dayConflict.overlapCount,
    conflictingShiftIds: dayConflict.conflictingShiftIds,
    label: `${dayConflict.overlapCount} overlap ${dayConflict.overlapCount === 1 ? "pair" : "pairs"}`,
    detail: formatConflictShiftList(conflictingShifts)
  };
}
function buildShiftConflictModel(shiftConflict) {
  if (!shiftConflict) {
    return null;
  }
  return {
    overlapCount: shiftConflict.overlapCount,
    conflictingShiftIds: shiftConflict.conflictingShiftIds,
    label: `Overlaps ${shiftConflict.overlapCount} visible ${shiftConflict.overlapCount === 1 ? "shift" : "shifts"}`,
    detail: formatConflictShiftList(shiftConflict.conflictingShifts)
  };
}
function formatConflictShiftList(shifts) {
  const items = [...shifts].sort((left, right) => {
    return left.startAt.localeCompare(right.startAt) || left.endAt.localeCompare(right.endAt) || left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
  }).map((shift) => {
    return `${shift.title} (${formatTime(new Date(shift.startAt))} → ${formatTime(new Date(shift.endAt))})`;
  });
  if (items.length <= 2) {
    return items.join(" · ");
  }
  return `${items.slice(0, 2).join(" · ")} +${items.length - 2} more`;
}
function formatInlineList(items) {
  if (items.length <= 1) {
    return items[0] ?? "";
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
function buildBoardStatusBadges(runtime) {
  {
    return [];
  }
}
function buildVisibleWeekCaption(visibleWeek, boardSource) {
  if (visibleWeek.source === "query") {
    return boardSource === "cached-local" ? "Visible week chosen from the route query and reopened from browser-local continuity." : "Visible week chosen from the route query.";
  }
  if (visibleWeek.source === "fallback-invalid") {
    return "The requested week was malformed, so the board fell back to the current trusted week.";
  }
  return boardSource === "cached-local" ? "Showing the current week from browser-local continuity." : "Showing the current trusted week.";
}
function buildVisibleWeekSourceLabel(visibleWeek) {
  if (visibleWeek.source === "query") {
    return `Visible week start: ${visibleWeek.start}`;
  }
  if (visibleWeek.source === "fallback-invalid") {
    return `Invalid requested week ${visibleWeek.requestedStart ?? "unknown"}. Showing ${visibleWeek.start} instead.`;
  }
  return `Default visible week start: ${visibleWeek.start}`;
}
function formatActionLabel(action) {
  switch (action) {
    case "create":
      return "Create shift";
    case "edit":
      return "Edit shift";
    case "move":
      return "Move shift";
    case "delete":
      return "Delete shift";
  }
}
function mapActionTone(status) {
  switch (status) {
    case "success":
      return "success";
    case "pending-local":
    case "timeout":
      return "warning";
    case "validation-error":
    case "forbidden":
    case "write-error":
    case "malformed-response":
    case "local-write-failed":
    case "queue-persist-failed":
      return "danger";
  }
}
function formatSyncPhaseLabel(phase) {
  switch (phase) {
    case "idle":
      return "Sync idle";
    case "draining":
      return "Sync draining reconnect queue";
    case "paused-retryable":
      return "Sync paused with retryable work";
  }
}
function formatMonthDay(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
}
function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC"
  });
}
function parseUtcDate(dayKey) {
  return /* @__PURE__ */ new Date(`${dayKey}T00:00:00.000Z`);
}
function addDayKey(dayKey, amount) {
  const next = new Date(parseUtcDate(dayKey).getTime() + amount * DAY_IN_MS);
  return next.toISOString().slice(0, 10);
}
function toDayKey(value) {
  if (!value || Number.isNaN(value.getTime())) {
    return null;
  }
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())).toISOString().slice(0, 10);
}
const DAY_IN_MS = 24 * 60 * 60 * 1e3;
function ShiftEditorDialog($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      action,
      mode,
      formId,
      visibleWeekStart,
      actionStates = [],
      shift = null,
      defaultDayKey = null,
      pendingActionKey,
      enhanceMutation
    } = $$props;
    const defaultTimes = derived(() => buildDefaultCreateTimes(defaultDayKey));
    const isSubmitting = derived(() => pendingActionKey === formId);
    const actionTarget = derived(() => `?/${mode === "create" ? "createShift" : mode === "edit" ? "editShift" : "moveShift"}&start=${visibleWeekStart}`);
    const scopedState = derived(() => actionStates.find((state) => state.formId === formId) ?? null);
    const tone = derived(() => {
      if (!scopedState()) {
        return "tone-neutral";
      }
      if (scopedState().status === "success") {
        return "tone-neutral";
      }
      return scopedState().status === "pending-local" || scopedState().status === "timeout" ? "tone-warning" : "tone-danger";
    });
    const summaryLabel = derived(() => {
      if (mode === "create") {
        return "Plan a shift";
      }
      if (mode === "edit") {
        return "Edit details";
      }
      return "Move timing";
    });
    const heading = derived(() => {
      if (mode === "create") {
        return "Create a shift";
      }
      if (mode === "edit") {
        return "Revise shift details";
      }
      return "Move this shift";
    });
    const submitLabel = derived(() => {
      if (mode === "create") {
        return "Save shift";
      }
      if (mode === "edit") {
        return "Save edits";
      }
      return "Save new timing";
    });
    const titleValue = derived(() => {
      if (mode === "move") {
        return shift?.title ?? "";
      }
      return shift?.title ?? "";
    });
    const startValue = derived(() => toDateTimeLocalValue(shift?.startAt) || defaultTimes().startAt);
    const endValue = derived(() => toDateTimeLocalValue(shift?.endAt) || defaultTimes().endAt);
    $$renderer2.push(`<details${attr_class(`shift-editor ${mode === "create" ? "shift-editor--create" : ""}`)}><summary${attr_class(`button ${mode === "create" ? "button-primary" : "button-secondary"}`)}>${escape_html(summaryLabel())}</summary> <div class="shift-editor__panel framed-panel"><div class="shift-editor__header"><div><p class="panel-kicker">${escape_html(mode === "create" ? "Local-first create" : mode === "edit" ? "Local-first edit" : "Local-first move")}</p> <h3>${escape_html(heading())}</h3></div> <span class="pill pill-neutral">UTC times</span></div> <form method="POST"${attr("action", actionTarget())} class="stacked-form"><input type="hidden" name="visibleWeekStart"${attr("value", visibleWeekStart)}/> `);
    if (shift) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<input type="hidden" name="shiftId"${attr("value", shift.id)}/>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <fieldset class="shift-editor__fieldset"${attr("disabled", isSubmitting(), true)}>`);
    if (mode !== "move") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<label class="field"><span>Title</span> <input class="input" name="title"${attr("value", titleValue())} placeholder="Opening shift" required=""/></label>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="code-strip shift-editor__locked-title"><span>Shift title</span> <code>${escape_html(shift?.title ?? "Unknown shift")}</code></div> <input type="hidden" name="title"${attr("value", shift?.title ?? "")}/>`);
    }
    $$renderer2.push(`<!--]--> <div class="calendar-form-grid"><label class="field"><span>Start</span> <input class="input" type="datetime-local" name="startAt"${attr("value", startValue())} required=""/></label> <label class="field"><span>End</span> <input class="input" type="datetime-local" name="endAt"${attr("value", endValue())} required=""/></label></div> `);
    if (mode === "create") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="recurrence-fields"><div class="recurrence-fields__header"><div><p class="panel-kicker">Bounded recurrence</p> <h3>Optional repeat rule</h3></div> <span class="pill pill-neutral">Count or until required</span></div> <div class="calendar-form-grid recurrence-fields__grid"><fieldset class="field recurrence-cadence-group"><span>Cadence</span> <div class="recurrence-cadence-options"><label class="recurrence-cadence-option is-selected"><input type="radio" name="recurrenceCadence" value="" checked=""/> <strong>One-off</strong> <small>No repeats</small></label> <label class="recurrence-cadence-option"><input type="radio" name="recurrenceCadence" value="daily"/> <strong>Daily</strong> <small>Every day</small></label> <label class="recurrence-cadence-option"><input type="radio" name="recurrenceCadence" value="weekly"/> <strong>Weekly</strong> <small>Weekly cadence</small></label> <label class="recurrence-cadence-option"><input type="radio" name="recurrenceCadence" value="monthly"/> <strong>Monthly</strong> <small>Monthly cadence</small></label></div></fieldset> <label class="field"><span>Interval</span> <input class="input" type="number" min="1" step="1" name="recurrenceInterval" value=""/></label> <label class="field"><span>Repeat count</span> <input class="input" type="number" min="1" step="1" name="repeatCount" value=""/></label> <label class="field"><span>Repeat until</span> <input class="input" type="datetime-local" name="repeatUntil" value=""/></label></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></fieldset> `);
    if (scopedState()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article${attr_class(`inline-state ${tone()}`)}${attr("data-testid", `${mode}-state`)}><strong>${escape_html(scopedState().reason)}</strong> <p>${escape_html(scopedState().message)}</p></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="calendar-form-actions"><button${attr_class(`button ${mode === "create" ? "button-primary" : "button-secondary"}`)} type="submit">${escape_html(isSubmitting() ? "Saving…" : submitLabel())}</button> <span class="calendar-form-note">${escape_html(mode === "create" ? "The board updates locally first, then waits for trusted server confirmation when online." : "The board updates locally first and keeps the trusted server action as the confirmation path.")}</span></div></form></div></details>`);
  });
}
function ShiftCard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      shift,
      visibleWeekStart,
      actionStates = [],
      pendingActionKey,
      enhanceMutation
    } = $$props;
    const deleteFormId = derived(() => `delete:${shift.id}`);
    const deleteActionTarget = derived(() => `?/deleteShift&start=${visibleWeekStart}`);
    const isDeleting = derived(() => pendingActionKey === deleteFormId());
    const scopedDeleteState = derived(() => actionStates.find((state) => state.formId === deleteFormId()) ?? null);
    const deleteTone = derived(() => {
      if (!scopedDeleteState()) {
        return "tone-neutral";
      }
      if (scopedDeleteState().status === "success") {
        return "tone-neutral";
      }
      return scopedDeleteState().status === "pending-local" || scopedDeleteState().status === "timeout" ? "tone-warning" : "tone-danger";
    });
    $$renderer2.push(`<article${attr_class(`shift-card shift-card--${shift.density} ${shift.conflict ? "shift-card--conflict" : ""}`)}${attr("data-testid", `shift-card-${shift.id}`)}${attr("data-conflict-overlaps", shift.conflict?.overlapCount ?? 0)}><div class="shift-card__header"><div><p class="panel-kicker">${escape_html(shift.sourceLabel)}</p> <h3>${escape_html(shift.title)}</h3></div> <div class="shift-card__meta-pills"><span class="pill pill-neutral">${escape_html(shift.rangeLabel)}</span> `);
    if (shift.occurrenceLabel) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="pill pill-active">${escape_html(shift.occurrenceLabel)}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (shift.conflict) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="pill pill-conflict"${attr("data-testid", `shift-conflict-pill-${shift.id}`)}${attr("data-conflict-overlaps", shift.conflict.overlapCount)}>${escape_html(shift.conflict.label)}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <!--[-->`);
    const each_array = ensure_array_like(shift.statusBadges);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let badge = each_array[$$index];
      $$renderer2.push(`<span${attr_class(`pill ${badge.tone === "danger" ? "pill-danger" : badge.tone === "warning" ? "pill-expired" : "pill-neutral"}`)}>${escape_html(badge.label)}</span>`);
    }
    $$renderer2.push(`<!--]--></div></div> `);
    if (shift.conflict) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article class="inline-state tone-warning shift-card__conflict"${attr("data-testid", `shift-conflict-summary-${shift.id}`)}${attr("data-conflict-overlaps", shift.conflict.overlapCount)}><strong>${escape_html(shift.conflict.label)}</strong> <p>${escape_html(shift.conflict.detail)}</p></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="shift-card__stats"><div><span>Window</span> <strong>${escape_html(shift.startTimeLabel)} → ${escape_html(shift.endTimeLabel)}</strong></div> <div><span>Duration</span> <strong>${escape_html(shift.durationLabel)}</strong></div> <div><span>Shift id</span> <code>${escape_html(shift.id)}</code></div></div> <div class="shift-card__actions">`);
    ShiftEditorDialog($$renderer2, {
      action: "edit",
      mode: "edit",
      formId: `edit:${shift.id}`,
      visibleWeekStart,
      actionStates,
      shift,
      pendingActionKey,
      enhanceMutation
    });
    $$renderer2.push(`<!----> `);
    ShiftEditorDialog($$renderer2, {
      action: "move",
      mode: "move",
      formId: `move:${shift.id}`,
      visibleWeekStart,
      actionStates,
      shift,
      pendingActionKey,
      enhanceMutation
    });
    $$renderer2.push(`<!----> <form method="POST"${attr("action", deleteActionTarget())} class="shift-delete-form"><input type="hidden" name="visibleWeekStart"${attr("value", visibleWeekStart)}/> <input type="hidden" name="shiftId"${attr("value", shift.id)}/> <input type="hidden" name="title"${attr("value", shift.title)}/> <input type="hidden" name="startAt"${attr("value", shift.startAt)}/> <input type="hidden" name="endAt"${attr("value", shift.endAt)}/> <button class="button button-secondary button-danger" type="submit"${attr("disabled", isDeleting(), true)}>${escape_html(isDeleting() ? "Deleting…" : "Delete shift")}</button></form></div> `);
    if (scopedDeleteState()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article${attr_class(`inline-state ${deleteTone()}`)}${attr("data-testid", `delete-state-${shift.id}`)}><strong>${escape_html(scopedDeleteState().reason)}</strong> <p>${escape_html(scopedDeleteState().message)}</p></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></article>`);
  });
}
function ShiftDayColumn($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      day,
      visibleWeekStart,
      actionStates = [],
      pendingActionKey,
      enhanceMutation
    } = $$props;
    $$renderer2.push(`<section${attr_class(`shift-day-column shift-day-column--${day.density} ${day.isToday ? "shift-day-column--today" : ""} ${day.conflict ? "shift-day-column--conflict" : ""}`)}${attr("data-conflict-pairs", day.conflict?.overlapCount ?? 0)}${attr("data-testid", `day-shell-${day.dayKey}`)}><header class="shift-day-column__header"><div><p class="panel-kicker">${escape_html(day.weekdayLabel)}</p> <h3>${escape_html(day.monthLabel)} ${escape_html(day.dayNumberLabel)}</h3></div> <div class="shift-day-column__pills">`);
    if (day.isToday) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="pill pill-active">Today</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (day.conflict) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="pill pill-conflict"${attr("data-testid", `day-conflict-pill-${day.dayKey}`)}${attr("data-conflict-pairs", day.conflict.overlapCount)}${attr("data-conflict-shifts", day.conflict.conflictingShiftIds.length)}>${escape_html(day.conflict.label)}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <span class="pill pill-neutral">${escape_html(day.shiftCount)} ${escape_html(day.shiftCount === 1 ? "shift" : "shifts")}</span></div></header> `);
    if (day.isEmpty) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article class="empty-card shift-day-column__empty"${attr("data-testid", `day-empty-${day.dayKey}`)}><p class="panel-kicker">Open capacity</p> <h3>Nothing scheduled.</h3> <p class="panel-copy">This day stays visible so users can add or move a shift here without losing week context.</p></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="shift-day-column__stack"${attr("data-testid", `day-column-${day.dayKey}`)}>`);
      if (day.conflict) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<article class="inline-state tone-warning shift-day-column__conflict"${attr("data-testid", `day-conflict-summary-${day.dayKey}`)}${attr("data-conflict-pairs", day.conflict.overlapCount)}${attr("data-conflict-shifts", day.conflict.conflictingShiftIds.length)}><strong>${escape_html(day.conflict.label)}</strong> <p>${escape_html(day.conflict.detail)}</p></article>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <!--[-->`);
      const each_array = ensure_array_like(day.shifts);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let shift = each_array[$$index];
        ShiftCard($$renderer2, {
          shift,
          visibleWeekStart,
          actionStates,
          pendingActionKey,
          enhanceMutation
        });
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></section>`);
  });
}
function CalendarWeekBoard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      board,
      scheduleStatus,
      scheduleReason,
      scheduleMessage,
      actionStates = [],
      realtimeDiagnostics = null,
      pendingActionKey,
      enhanceMutation
    } = $$props;
    const boardTone = derived(() => {
      if (scheduleStatus === "ready") {
        return "tone-neutral";
      }
      return scheduleStatus === "timeout" ? "tone-warning" : "tone-danger";
    });
    const canRenderSchedule = derived(() => scheduleStatus !== "malformed-response");
    const actionSummaries = derived(() => summarizeScheduleActions(actionStates));
    const realtimeTone = derived(() => !realtimeDiagnostics ? "tone-neutral" : realtimeDiagnostics.channelState === "retrying" || realtimeDiagnostics.remoteRefreshState === "failed" ? "tone-danger" : realtimeDiagnostics.channelState === "subscribing" || realtimeDiagnostics.remoteRefreshState === "refreshing" ? "tone-warning" : "tone-neutral");
    $$renderer2.push(`<section class="calendar-week-board framed-panel" data-testid="calendar-week-board"${attr("data-visible-week-start", board.visibleWeekStart)}${attr("data-visible-week-end", board.visibleWeekEndExclusive)}><header class="calendar-week-board__header"><div><p class="eyebrow">Protected week board</p> <h2>${escape_html(board.rangeLabel)}</h2> <p class="lede">${escape_html(board.caption)}</p></div> <div class="calendar-week-board__header-side"><div class="calendar-week-board__meta"><span${attr_class(`pill pill-neutral ${board.sourceTone === "warning" ? "pill-expired" : ""}`)}>${escape_html(board.sourceLabel)}</span> <span class="pill pill-active">${escape_html(board.totalShifts)} ${escape_html(board.totalShifts === 1 ? "shift" : "shifts")}</span> <span class="pill pill-neutral">UTC board</span> `);
    if (board.conflict) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="pill pill-conflict" data-testid="board-conflict-pill"${attr("data-conflict-days", board.conflict.dayCount)}${attr("data-conflict-shifts", board.conflict.shiftCount)}${attr("data-conflict-pairs", board.conflict.overlapCount)}>${escape_html(board.conflict.label)}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <!--[-->`);
    const each_array = ensure_array_like(board.statusBadges);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let badge = each_array[$$index];
      $$renderer2.push(`<span${attr_class(`pill ${badge.tone === "danger" ? "pill-danger" : badge.tone === "warning" ? "pill-expired" : badge.tone === "success" ? "pill-active" : "pill-neutral"}`)}>${escape_html(badge.label)}</span>`);
    }
    $$renderer2.push(`<!--]--></div> <nav class="calendar-week-board__nav" aria-label="Visible week navigation"><a class="button button-secondary"${attr("href", `?start=${board.previousWeekStart}`)}>Previous week</a> <a class="button button-secondary"${attr("href", `?start=${board.nextWeekStart}`)}>Next week</a></nav></div></header> <section class="calendar-toolbar">`);
    ShiftEditorDialog($$renderer2, {
      action: "create",
      mode: "create",
      formId: "create:week",
      visibleWeekStart: board.visibleWeekStart,
      actionStates,
      defaultDayKey: board.days[0]?.dayKey ?? board.visibleWeekStart,
      pendingActionKey,
      enhanceMutation
    });
    $$renderer2.push(`<!----> <div class="calendar-toolbar__notes"><p class="panel-kicker">Board rhythm</p> <p class="panel-copy">Local writes update the visible week immediately, stay queued when the server is unavailable, and keep the trusted server action as the confirmation path.</p></div></section> `);
    if (scheduleStatus !== "ready") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article${attr_class(`status-card ${boardTone()}`)} data-testid="schedule-load-state"><span class="status-card__label">Schedule state</span> <strong>${escape_html(scheduleStatus)}</strong> <p>${escape_html(scheduleMessage)}</p> `);
      if (scheduleReason) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<code>${escape_html(scheduleReason)}</code>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (board.lastFailure) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article class="status-card tone-danger" data-testid="local-write-failure"><span class="status-card__label">Local-first failure</span> <strong>${escape_html(board.lastFailure.reason)}</strong> <p>${escape_html(board.lastFailure.detail)}</p></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (board.conflict) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article class="status-card tone-warning" data-testid="board-conflict-summary"${attr("data-conflict-days", board.conflict.dayCount)}${attr("data-conflict-shifts", board.conflict.shiftCount)}${attr("data-conflict-pairs", board.conflict.overlapCount)}><span class="status-card__label">Visible-week conflict watch</span> <strong>${escape_html(board.conflict.label)}</strong> <p>${escape_html(board.conflict.detail)}</p></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <article${attr_class(`status-card ${board.lastSyncError ? "tone-danger" : board.syncPhaseLabel === "Sync draining reconnect queue" ? "tone-warning" : "tone-neutral"}`)} data-testid="board-sync-diagnostics"><span class="status-card__label">Board sync diagnostics</span> <strong>${escape_html(board.syncPhaseLabel)}</strong> <p>`);
    if (board.lastSyncAttemptLabel) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`Last reconnect attempt: <code>${escape_html(board.lastSyncAttemptLabel)}</code>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`No reconnect attempt has been recorded on this route yet.`);
    }
    $$renderer2.push(`<!--]--></p> `);
    if (board.lastSyncError) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p>${escape_html(board.lastSyncError.detail)}</p> <code>${escape_html(board.lastSyncError.reason)}</code>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></article> `);
    if (realtimeDiagnostics) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article${attr_class(`status-card ${realtimeTone()}`)} data-testid="board-realtime-diagnostics"${attr("data-channel-state", realtimeDiagnostics.channelState)}${attr("data-remote-refresh-state", realtimeDiagnostics.remoteRefreshState)}><span class="status-card__label">Board realtime diagnostics</span> <strong>${escape_html(realtimeDiagnostics.channelState)}</strong> <p>`);
      if (realtimeDiagnostics.lastSignalAt) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`Last signal: ${escape_html(realtimeDiagnostics.lastSignalEvent ?? "signal")} at <code>${escape_html(realtimeDiagnostics.lastSignalAt)}</code>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`No shared shift signal has touched this visible week yet.`);
      }
      $$renderer2.push(`<!--]--></p> <p>${escape_html(realtimeDiagnostics.channelDetail)}</p> `);
      if (realtimeDiagnostics.channelReason) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<code>${escape_html(realtimeDiagnostics.channelReason)}</code>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (realtimeDiagnostics.lastRemoteRefreshDetail) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<p>${escape_html(realtimeDiagnostics.lastRemoteRefreshDetail)}</p>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (realtimeDiagnostics.lastRemoteRefreshReason) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<code>${escape_html(realtimeDiagnostics.lastRemoteRefreshReason)}</code>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (actionSummaries().length > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="calendar-action-strip" data-testid="schedule-action-strip"><!--[-->`);
      const each_array_1 = ensure_array_like(actionSummaries());
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let summary = each_array_1[$$index_1];
        $$renderer2.push(`<article${attr_class(`status-card tone-${summary.tone === "neutral" ? "neutral" : summary.tone}`)}><span class="status-card__label">${escape_html(summary.label)}</span> <strong>${escape_html(summary.state.status)}</strong> <p>${escape_html(summary.state.message)}</p> <code>${escape_html(summary.state.reason)}</code></article>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (canRenderSchedule()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="calendar-week-grid" data-testid="schedule-week-grid"><!--[-->`);
      const each_array_2 = ensure_array_like(board.days);
      for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
        let day = each_array_2[$$index_2];
        ShiftDayColumn($$renderer2, {
          day,
          visibleWeekStart: board.visibleWeekStart,
          actionStates,
          pendingActionKey,
          enhanceMutation
        });
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<article class="empty-card calendar-week-board__unavailable" data-testid="schedule-malformed-state"><p class="panel-kicker">Non-renderable schedule</p> <h3>The week payload could not be trusted.</h3> <p class="panel-copy">The board stayed on the same calendar route, but the malformed response was withheld instead of rendering broken cards.</p></article>`);
    }
    $$renderer2.push(`<!--]--></section>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let pendingActionKey = null;
    let realtimeDiagnostics = createInitialRealtimeDiagnostics();
    const calendarState = derived(() => data.protectedCalendarState);
    const appShell = derived(() => data.appShell ?? null);
    const calendarView = derived(() => data.calendarView ?? null);
    const readyView = derived(() => calendarView()?.kind === "calendar" ? calendarView() : null);
    const deniedView = derived(() => calendarView()?.kind === "denied" ? calendarView() : null);
    const relatedCalendars = derived(() => readyView()?.group?.calendars ?? appShell()?.calendars ?? []);
    const effectiveSchedule = derived(() => readyView()?.schedule ?? null);
    const board = derived(() => effectiveSchedule() ? buildCalendarWeekBoard(effectiveSchedule(), {
      now: /* @__PURE__ */ new Date(),
      runtime: void 0
    }) : null);
    const viewerName = derived(() => appShell()?.viewer.displayName ?? "Protected calendar");
    const routeTone = derived(() => calendarState().mode === "offline-denied" ? "tone-danger" : calendarState().mode === "cached-offline" ? "tone-warning" : "tone-neutral");
    function enhanceMutation(params) {
      return async ({ formData, cancel }) => {
        pendingActionKey = params.formId;
        {
          return async ({ update }) => {
            pendingActionKey = null;
            await update({ reset: false });
          };
        }
      };
    }
    function buildTrustedScheduleKey(schedule) {
      return JSON.stringify({
        status: schedule.status,
        reason: schedule.reason,
        visibleWeekStart: schedule.visibleWeek.start,
        shiftIds: schedule.shiftIds
      });
    }
    function createInitialRealtimeDiagnostics() {
      return {
        channelState: "closed",
        channelReason: null,
        channelDetail: "Live change detection is idle until a trusted online calendar week is open.",
        lastSignalAt: null,
        lastSignalEvent: null,
        lastSignalDetail: null,
        remoteRefreshState: "idle",
        lastRemoteRefreshAt: null,
        lastRemoteRefreshReason: null,
        lastRemoteRefreshDetail: null
      };
    }
    head("1x90697", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>
    ${escape_html(readyView() ? `${readyView().calendar.name} • Caluno` : "Access denied • Caluno")}
  </title>`);
      });
    });
    $$renderer2.push(`<main class="workspace-shell"><aside class="workspace-rail framed-panel"><p class="eyebrow">Trusted calendar scope</p> <h1>${escape_html(viewerName())}</h1> <p class="rail-copy">`);
    if (calendarState().mode === "trusted-online") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`This route rendered from the trusted server contract, so calendar authority was revalidated before the week loaded.`);
    } else if (calendarState().mode === "cached-offline") {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`This route reopened from trusted browser-local scope and a cached week snapshot without widening access beyond previously synced calendars.`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`Offline continuity failed closed on this route instead of guessing whether the calendar should be visible.`);
    }
    $$renderer2.push(`<!--]--></p> <div class="status-stack"><article${attr_class(`status-card ${routeTone()}`)} data-testid="calendar-route-state"><span class="status-card__label">Route state</span> <strong>${escape_html(calendarState().mode)}</strong> <p>${escape_html(calendarState().detail)}</p> `);
    if (calendarState().reason) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<code>${escape_html(calendarState().reason)}</code>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></article> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (calendarState().cachedAt) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article class="status-card tone-warning"><span class="status-card__label">Cached snapshot</span> <strong>${escape_html(calendarState().cachedAt)}</strong> <p>The visible week reopened from browser-local storage instead of the server.</p></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (effectiveSchedule()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article${attr_class(`status-card ${effectiveSchedule().status === "ready" ? "tone-neutral" : effectiveSchedule().status === "timeout" ? "tone-warning" : "tone-danger"}`)}><span class="status-card__label">Week scope</span> <strong>${escape_html(effectiveSchedule().visibleWeek.start)}</strong> <p>${escape_html(effectiveSchedule().message)}</p> `);
      if (calendarState().visibleWeekOrigin) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<code>${escape_html(calendarState().visibleWeekOrigin)}</code>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <nav class="rail-links"><a href="/groups">Back to groups</a> <a href="/logout">Sign out</a></nav></aside> <section class="workspace-main">`);
    if (readyView()) {
      $$renderer2.push("<!--[0-->");
      if (board() && effectiveSchedule()) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<header class="hero-panel compact" data-testid="calendar-shell"${attr("data-trusted-schedule-key", buildTrustedScheduleKey(effectiveSchedule()))}><p class="eyebrow">${escape_html(readyView().group?.name ?? "Permitted calendar")}</p> <h2>${escape_html(readyView().calendar.name)}</h2> <p class="lede">`);
        {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`A calm week board for multi-shift days: local writes render immediately, while trusted server actions stay authoritative for confirmation.`);
        }
        $$renderer2.push(`<!--]--></p> <div class="calendar-board__meta"><span class="pill pill-active">${escape_html(readyView().calendar.isDefault ? "Default calendar" : "Secondary calendar")}</span> <span class="pill pill-neutral">${escape_html(readyView().group?.role ?? "member")} access</span> <span class="pill pill-neutral">${escape_html(effectiveSchedule().totalShifts)} visible shifts</span> <span${attr_class(`pill ${"pill-neutral"}`)}>${escape_html("Trusted online")}</span> <span${attr_class(`pill ${"pill-neutral"}`)}>${escape_html("idle")}</span> <span${attr_class(`pill ${realtimeDiagnostics.channelState === "ready" ? "pill-active" : realtimeDiagnostics.channelState === "retrying" ? "pill-danger" : "pill-expired"}`)}>realtime ${escape_html(realtimeDiagnostics.channelState)}</span></div></header> `);
        CalendarWeekBoard($$renderer2, {
          board: board(),
          scheduleStatus: effectiveSchedule().status,
          scheduleReason: effectiveSchedule().reason,
          scheduleMessage: effectiveSchedule().message,
          actionStates: [],
          realtimeDiagnostics,
          pendingActionKey,
          enhanceMutation
        });
        $$renderer2.push(`<!---->`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]-->`);
    } else if (deniedView()) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<section class="denied-banner framed-panel" data-testid="access-denied-state"><p class="eyebrow">${escape_html(deniedView().detail.badge)}</p> <h2>${escape_html(deniedView().detail.title)}</h2> <p class="lede">${escape_html(deniedView().detail.detail)}</p> <div class="denied-meta"><div><span>Failure phase</span> <strong>${escape_html(deniedView().failurePhase)}</strong></div> <div><span>Reason code</span> <strong>${escape_html(deniedView().reason)}</strong></div> <div><span>Attempted id</span> <code>${escape_html(deniedView().attemptedCalendarId)}</code></div></div> <div class="denied-actions"><a class="button button-primary" href="/groups">Return to permitted groups</a> `);
      if (appShell()?.primaryCalendar) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<a class="button button-secondary"${attr("href", `/calendars/${appShell().primaryCalendar.id}`)}>Open a permitted calendar</a>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div></section>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <section class="related-panel framed-panel"><div class="group-card__header"><div><p class="panel-kicker">Visible calendar inventory</p> <h3>Only trusted calendars appear in navigation.</h3></div> <span class="pill pill-neutral">${escape_html(relatedCalendars().length)} visible</span></div> <div class="calendar-list"><!--[-->`);
    const each_array = ensure_array_like(relatedCalendars());
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let calendar = each_array[$$index];
      $$renderer2.push(`<a${attr_class(`calendar-link ${readyView() && calendar.id === readyView().calendar.id ? "active" : ""}`)}${attr("href", `/calendars/${calendar.id}`)}><strong>${escape_html(calendar.name)}</strong> <span>${escape_html(calendar.isDefault ? "Default calendar" : "Secondary calendar")}</span></a>`);
    }
    $$renderer2.push(`<!--]--></div></section></section></main>`);
  });
}
export {
  _page as default
};
