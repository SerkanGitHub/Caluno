import { a as attr_class, d as derived, e as ensure_array_like, h as head } from "../../../../../chunks/renderer.js";
import { e as escape_html, a as attr } from "../../../../../chunks/attributes.js";
import "@sveltejs/kit/internal";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../chunks/root.js";
import "../../../../../chunks/state.svelte.js";
function buildCalendarWeekBoard(schedule, options) {
  const visibleWeek = schedule.visibleWeek;
  const todayKey = toDayKey(options?.now ?? null);
  const startDate = parseUtcDate(visibleWeek.start);
  const endDate = parseUtcDate(addDayKey(visibleWeek.endExclusive, -1));
  return {
    visibleWeekStart: visibleWeek.start,
    visibleWeekEndExclusive: visibleWeek.endExclusive,
    rangeLabel: `${formatMonthDay(startDate)} — ${formatMonthDay(endDate)}, ${startDate.getUTCFullYear()}`,
    caption: buildVisibleWeekCaption(visibleWeek),
    sourceLabel: buildVisibleWeekSourceLabel(visibleWeek),
    sourceTone: visibleWeek.source === "fallback-invalid" ? "warning" : "neutral",
    previousWeekStart: addDayKey(visibleWeek.start, -7),
    nextWeekStart: addDayKey(visibleWeek.start, 7),
    totalShifts: schedule.totalShifts,
    hasShifts: schedule.totalShifts > 0,
    days: schedule.days.map((day) => buildDayColumn(day, todayKey))
  };
}
function sortShiftsForBoard(shifts) {
  return [...shifts].sort((left, right) => {
    return left.startAt.localeCompare(right.startAt) || left.endAt.localeCompare(right.endAt) || left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
  });
}
function summarizeScheduleActions(states) {
  return states.filter((state) => Boolean(state)).map((state) => ({
    id: `${state.action}:${state.shiftId ?? state.seriesId ?? state.visibleWeekStart}`,
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
function buildDayColumn(day, todayKey) {
  const date = parseUtcDate(day.dayKey);
  const shifts = sortShiftsForBoard(day.shifts).map((shift) => buildShiftCardModel(shift, day.shifts.length));
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
    shifts
  };
}
function buildShiftCardModel(shift, dayShiftCount) {
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
    sourceKind: shift.sourceKind
  };
}
function buildVisibleWeekCaption(visibleWeek) {
  if (visibleWeek.source === "query") {
    return "Visible week chosen from the route query.";
  }
  if (visibleWeek.source === "fallback-invalid") {
    return "The requested week was malformed, so the board fell back to the current trusted week.";
  }
  return "Showing the current trusted week.";
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
    case "timeout":
      return "warning";
    case "validation-error":
    case "forbidden":
    case "write-error":
    case "malformed-response":
      return "danger";
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
      mode,
      formId,
      visibleWeekStart,
      actionState = null,
      shift = null,
      defaultDayKey = null,
      pendingActionKey,
      setPendingActionKey
    } = $$props;
    const defaultTimes = derived(() => buildDefaultCreateTimes(defaultDayKey));
    const isSubmitting = derived(() => pendingActionKey === formId);
    const actionTarget = derived(() => `?/${mode === "create" ? "createShift" : mode === "edit" ? "editShift" : "moveShift"}&start=${visibleWeekStart}`);
    const tone = derived(() => {
      if (!actionState) {
        return "tone-neutral";
      }
      if (actionState.status === "success") {
        return "tone-neutral";
      }
      return actionState.status === "timeout" ? "tone-warning" : "tone-danger";
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
      return actionState?.fields.title ?? shift?.title ?? "";
    });
    const startValue = derived(() => actionState?.fields.startAt ?? toDateTimeLocalValue(shift?.startAt) ?? defaultTimes().startAt);
    const endValue = derived(() => actionState?.fields.endAt ?? toDateTimeLocalValue(shift?.endAt) ?? defaultTimes().endAt);
    const cadenceValue = derived(() => actionState?.fields.recurrenceCadence ?? "");
    const intervalValue = derived(() => actionState?.fields.recurrenceInterval ?? "1");
    const repeatCountValue = derived(() => actionState?.fields.repeatCount ?? "");
    const repeatUntilValue = derived(() => actionState?.fields.repeatUntil ?? "");
    function matchesCurrentSurface(state, mode2, shiftId) {
      if (!state) {
        return false;
      }
      if (state.action !== mode2) {
        return false;
      }
      if (mode2 === "create") {
        return true;
      }
      return state.shiftId === shiftId;
    }
    const scopedState = derived(() => matchesCurrentSurface(actionState, mode, shift?.id ?? null) ? actionState : null);
    $$renderer2.push(`<details${attr_class(`shift-editor ${mode === "create" ? "shift-editor--create" : ""}`)}><summary${attr_class(`button ${mode === "create" ? "button-primary" : "button-secondary"}`)}>${escape_html(summaryLabel())}</summary> <div class="shift-editor__panel framed-panel"><div class="shift-editor__header"><div><p class="panel-kicker">${escape_html(mode === "create" ? "Server-backed create" : mode === "edit" ? "Trusted edit" : "Trusted move")}</p> <h3>${escape_html(heading())}</h3></div> <span class="pill pill-neutral">UTC times</span></div> <form method="POST"${attr("action", actionTarget())} class="stacked-form"><input type="hidden" name="visibleWeekStart"${attr("value", visibleWeekStart)}/> `);
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
      $$renderer2.push(`<div class="recurrence-fields"><div class="recurrence-fields__header"><div><p class="panel-kicker">Bounded recurrence</p> <h3>Optional repeat rule</h3></div> <span class="pill pill-neutral">Count or until required</span></div> <div class="calendar-form-grid recurrence-fields__grid"><fieldset class="field recurrence-cadence-group"><span>Cadence</span> <div class="recurrence-cadence-options"><label${attr_class(`recurrence-cadence-option ${cadenceValue() === "" ? "is-selected" : ""}`)}><input type="radio" name="recurrenceCadence" value=""${attr("checked", cadenceValue() === "", true)}/> <strong>One-off</strong> <small>No repeats</small></label> <label${attr_class(`recurrence-cadence-option ${cadenceValue() === "daily" ? "is-selected" : ""}`)}><input type="radio" name="recurrenceCadence" value="daily"${attr("checked", cadenceValue() === "daily", true)}/> <strong>Daily</strong> <small>Every day</small></label> <label${attr_class(`recurrence-cadence-option ${cadenceValue() === "weekly" ? "is-selected" : ""}`)}><input type="radio" name="recurrenceCadence" value="weekly"${attr("checked", cadenceValue() === "weekly", true)}/> <strong>Weekly</strong> <small>Weekly cadence</small></label> <label${attr_class(`recurrence-cadence-option ${cadenceValue() === "monthly" ? "is-selected" : ""}`)}><input type="radio" name="recurrenceCadence" value="monthly"${attr("checked", cadenceValue() === "monthly", true)}/> <strong>Monthly</strong> <small>Monthly cadence</small></label></div></fieldset> <label class="field"><span>Interval</span> <input class="input" type="number" min="1" step="1" name="recurrenceInterval"${attr("value", intervalValue())}/></label> <label class="field"><span>Repeat count</span> <input class="input" type="number" min="1" step="1" name="repeatCount"${attr("value", repeatCountValue())}/></label> <label class="field"><span>Repeat until</span> <input class="input" type="datetime-local" name="repeatUntil"${attr("value", repeatUntilValue())}/></label></div></div>`);
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
    $$renderer2.push(`<!--]--> <div class="calendar-form-actions"><button${attr_class(`button ${mode === "create" ? "button-primary" : "button-secondary"}`)} type="submit">${escape_html(isSubmitting() ? "Saving…" : submitLabel())}</button> <span class="calendar-form-note">${escape_html(mode === "create" ? "Successful saves rerender the visible week from server data." : "This write re-validates calendar and shift authority on the server.")}</span></div></form></div></details>`);
  });
}
function ShiftCard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      shift,
      visibleWeekStart,
      editState = null,
      moveState = null,
      deleteState = null,
      pendingActionKey,
      setPendingActionKey
    } = $$props;
    const deleteFormId = derived(() => `delete:${shift.id}`);
    const deleteActionTarget = derived(() => `?/deleteShift&start=${visibleWeekStart}`);
    const isDeleting = derived(() => pendingActionKey === deleteFormId());
    const scopedDeleteState = derived(() => deleteState?.shiftId === shift.id ? deleteState : null);
    const deleteTone = derived(() => {
      if (!scopedDeleteState()) {
        return "tone-neutral";
      }
      if (scopedDeleteState().status === "success") {
        return "tone-neutral";
      }
      return scopedDeleteState().status === "timeout" ? "tone-warning" : "tone-danger";
    });
    $$renderer2.push(`<article${attr_class(`shift-card shift-card--${shift.density}`)}${attr("data-testid", `shift-card-${shift.id}`)}><div class="shift-card__header"><div><p class="panel-kicker">${escape_html(shift.sourceLabel)}</p> <h3>${escape_html(shift.title)}</h3></div> <div class="shift-card__meta-pills"><span class="pill pill-neutral">${escape_html(shift.rangeLabel)}</span> `);
    if (shift.occurrenceLabel) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="pill pill-active">${escape_html(shift.occurrenceLabel)}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></div> <div class="shift-card__stats"><div><span>Window</span> <strong>${escape_html(shift.startTimeLabel)} → ${escape_html(shift.endTimeLabel)}</strong></div> <div><span>Duration</span> <strong>${escape_html(shift.durationLabel)}</strong></div> <div><span>Shift id</span> <code>${escape_html(shift.id)}</code></div></div> <div class="shift-card__actions">`);
    ShiftEditorDialog($$renderer2, {
      mode: "edit",
      formId: `edit:${shift.id}`,
      visibleWeekStart,
      actionState: editState,
      shift,
      pendingActionKey,
      setPendingActionKey
    });
    $$renderer2.push(`<!----> `);
    ShiftEditorDialog($$renderer2, {
      mode: "move",
      formId: `move:${shift.id}`,
      visibleWeekStart,
      actionState: moveState,
      shift,
      pendingActionKey,
      setPendingActionKey
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
      editState = null,
      moveState = null,
      deleteState = null,
      pendingActionKey,
      setPendingActionKey
    } = $$props;
    $$renderer2.push(`<section${attr_class(`shift-day-column shift-day-column--${day.density} ${day.isToday ? "shift-day-column--today" : ""}`)}><header class="shift-day-column__header"><div><p class="panel-kicker">${escape_html(day.weekdayLabel)}</p> <h3>${escape_html(day.monthLabel)} ${escape_html(day.dayNumberLabel)}</h3></div> <div class="shift-day-column__pills">`);
    if (day.isToday) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="pill pill-active">Today</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <span class="pill pill-neutral">${escape_html(day.shiftCount)} ${escape_html(day.shiftCount === 1 ? "shift" : "shifts")}</span></div></header> `);
    if (day.isEmpty) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article class="empty-card shift-day-column__empty"${attr("data-testid", `day-empty-${day.dayKey}`)}><p class="panel-kicker">Open capacity</p> <h3>Nothing scheduled.</h3> <p class="panel-copy">This day stays visible so users can add or move a shift here without losing week context.</p></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="shift-day-column__stack"${attr("data-testid", `day-column-${day.dayKey}`)}><!--[-->`);
      const each_array = ensure_array_like(day.shifts);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let shift = each_array[$$index];
        ShiftCard($$renderer2, {
          shift,
          visibleWeekStart,
          editState,
          moveState,
          deleteState,
          pendingActionKey,
          setPendingActionKey
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
      createState = null,
      editState = null,
      moveState = null,
      deleteState = null,
      pendingActionKey,
      setPendingActionKey
    } = $$props;
    const boardTone = derived(() => {
      if (scheduleStatus === "ready") {
        return "tone-neutral";
      }
      return scheduleStatus === "timeout" ? "tone-warning" : "tone-danger";
    });
    const canRenderSchedule = derived(() => scheduleStatus !== "malformed-response");
    const actionSummaries = derived(() => summarizeScheduleActions([createState, editState, moveState, deleteState]));
    $$renderer2.push(`<section class="calendar-week-board framed-panel" data-testid="calendar-week-board"${attr("data-visible-week-start", board.visibleWeekStart)}${attr("data-visible-week-end", board.visibleWeekEndExclusive)}><header class="calendar-week-board__header"><div><p class="eyebrow">Protected week board</p> <h2>${escape_html(board.rangeLabel)}</h2> <p class="lede">${escape_html(board.caption)}</p></div> <div class="calendar-week-board__header-side"><div class="calendar-week-board__meta"><span${attr_class(`pill pill-neutral ${board.sourceTone === "warning" ? "pill-expired" : ""}`)}>${escape_html(board.sourceLabel)}</span> <span class="pill pill-active">${escape_html(board.totalShifts)} ${escape_html(board.totalShifts === 1 ? "shift" : "shifts")}</span> <span class="pill pill-neutral">UTC board</span></div> <nav class="calendar-week-board__nav" aria-label="Visible week navigation"><a class="button button-secondary"${attr("href", `?start=${board.previousWeekStart}`)}>Previous week</a> <a class="button button-secondary"${attr("href", `?start=${board.nextWeekStart}`)}>Next week</a></nav></div></header> <section class="calendar-toolbar">`);
    ShiftEditorDialog($$renderer2, {
      mode: "create",
      formId: "create:week",
      visibleWeekStart: board.visibleWeekStart,
      actionState: createState,
      defaultDayKey: board.days[0]?.dayKey ?? board.visibleWeekStart,
      pendingActionKey,
      setPendingActionKey
    });
    $$renderer2.push(`<!----> <div class="calendar-toolbar__notes"><p class="panel-kicker">Board rhythm</p> <p class="panel-copy">Same-day shifts stay stacked by time, recurring creates stay bounded, and every mutation reruns against server-resolved authority.</p></div></section> `);
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
    if (actionSummaries().length > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="calendar-action-strip" data-testid="schedule-action-strip"><!--[-->`);
      const each_array = ensure_array_like(actionSummaries());
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let summary = each_array[$$index];
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
      const each_array_1 = ensure_array_like(board.days);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let day = each_array_1[$$index_1];
        ShiftDayColumn($$renderer2, {
          day,
          visibleWeekStart: board.visibleWeekStart,
          editState,
          moveState,
          deleteState,
          pendingActionKey,
          setPendingActionKey
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
    let { data, form } = $$props;
    let pendingActionKey = null;
    const calendarView = derived(() => data.calendarView);
    const createState = derived(() => form?.createShift ?? null);
    const editState = derived(() => form?.editShift ?? null);
    const moveState = derived(() => form?.moveShift ?? null);
    const deleteState = derived(() => form?.deleteShift ?? null);
    const relatedCalendars = derived(() => calendarView().kind === "calendar" ? calendarView().group?.calendars ?? [] : data.appShell.calendars);
    const board = derived(() => calendarView().kind === "calendar" ? buildCalendarWeekBoard(calendarView().schedule, { now: /* @__PURE__ */ new Date() }) : null);
    const deniedView = derived(() => calendarView().kind === "denied" ? calendarView() : null);
    function setPendingActionKey(value) {
      pendingActionKey = value;
    }
    head("1x90697", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>
    ${escape_html(calendarView().kind === "calendar" ? `${calendarView().calendar.name} • Caluno` : "Access denied • Caluno")}
  </title>`);
      });
    });
    $$renderer2.push(`<main class="workspace-shell"><aside class="workspace-rail framed-panel"><p class="eyebrow">Trusted calendar scope</p> <h1>${escape_html(data.appShell.viewer.displayName)}</h1> <p class="rail-copy">This route still renders only after the server matches the calendar id against the protected membership inventory.</p> <div class="status-stack"><article${attr_class(`status-card ${calendarView().kind === "calendar" ? "tone-neutral" : "tone-danger"}`)}><span class="status-card__label">Route state</span> <strong>${escape_html(calendarView().kind === "calendar" ? "calendar-ready" : "access-denied")}</strong> <p>${escape_html(calendarView().kind === "calendar" ? "Week data and shift writes stay scoped to the trusted calendar behind this route." : `Failure phase: ${calendarView().failurePhase}`)}</p></article> `);
    if (calendarView().welcome) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article class="status-card tone-neutral"><span class="status-card__label">Onboarding transition</span> <strong>${escape_html(calendarView().welcome)}</strong> <p>The create/join action redirected into this calendar after the protected shell reloaded.</p></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (calendarView().kind === "calendar") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article${attr_class(`status-card ${calendarView().schedule.status === "ready" ? "tone-neutral" : calendarView().schedule.status === "timeout" ? "tone-warning" : "tone-danger"}`)}><span class="status-card__label">Week scope</span> <strong>${escape_html(calendarView().schedule.visibleWeek.start)}</strong> <p>${escape_html(calendarView().schedule.message)}</p></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <nav class="rail-links"><a href="/groups">Back to groups</a> <a href="/logout">Sign out</a></nav></aside> <section class="workspace-main">`);
    if (calendarView().kind === "calendar") {
      $$renderer2.push("<!--[0-->");
      if (board()) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<header class="hero-panel compact" data-testid="calendar-shell"><p class="eyebrow">${escape_html(calendarView().group?.name ?? "Permitted calendar")}</p> <h2>${escape_html(calendarView().calendar.name)}</h2> <p class="lede">A calm week board for multi-shift days: create, edit, move, and delete flows stay on this route and still re-derive calendar authority on the server.</p> <div class="calendar-board__meta"><span class="pill pill-active">${escape_html(calendarView().calendar.isDefault ? "Default calendar" : "Secondary calendar")}</span> <span class="pill pill-neutral">${escape_html(calendarView().group?.role ?? "member")} access</span> <span class="pill pill-neutral">${escape_html(calendarView().schedule.totalShifts)} visible shifts</span></div></header> `);
        CalendarWeekBoard($$renderer2, {
          board: board(),
          scheduleStatus: calendarView().schedule.status,
          scheduleReason: calendarView().schedule.reason,
          scheduleMessage: calendarView().schedule.message,
          createState: createState(),
          editState: editState(),
          moveState: moveState(),
          deleteState: deleteState(),
          pendingActionKey,
          setPendingActionKey
        });
        $$renderer2.push(`<!---->`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]-->`);
    } else if (deniedView()) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<section class="denied-banner framed-panel" data-testid="access-denied-state"><p class="eyebrow">${escape_html(deniedView().detail.badge)}</p> <h2>${escape_html(deniedView().detail.title)}</h2> <p class="lede">${escape_html(deniedView().detail.detail)}</p> <div class="denied-meta"><div><span>Failure phase</span> <strong>${escape_html(deniedView().failurePhase)}</strong></div> <div><span>Reason code</span> <strong>${escape_html(deniedView().reason)}</strong></div> <div><span>Attempted id</span> <code>${escape_html(deniedView().attemptedCalendarId)}</code></div></div> <div class="denied-actions"><a class="button button-primary" href="/groups">Return to permitted groups</a> `);
      if (data.appShell.primaryCalendar) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<a class="button button-secondary"${attr("href", `/calendars/${data.appShell.primaryCalendar.id}`)}>Open a permitted calendar</a>`);
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
      $$renderer2.push(`<a${attr_class(`calendar-link ${calendarView().kind === "calendar" && calendar.id === calendarView().calendar.id ? "active" : ""}`)}${attr("href", `/calendars/${calendar.id}`)}><strong>${escape_html(calendar.name)}</strong> <span>${escape_html(calendar.isDefault ? "Default calendar" : "Secondary calendar")}</span></a>`);
    }
    $$renderer2.push(`<!--]--></div></section></section></main>`);
  });
}
export {
  _page as default
};
