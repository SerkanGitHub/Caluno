import { fail } from '@sveltejs/kit';
import {
  describeDeniedCalendarReason,
  resolveTrustedCalendarFromAppShell,
  resolveVisibleWeek
} from '@repo/caluno-core';
import type { Actions, PageServerLoad } from './$types';
import { parseCreatePrefill, stripCreatePrefillSearchParams } from '$lib/schedule/create-prefill';
import {
  createScheduleShift,
  deleteScheduleShift,
  editScheduleShift,
  loadCalendarScheduleView,
  moveScheduleShift,
  type ScheduleActionKind,
  type ScheduleActionResult,
  type ScheduleActionState
} from '$lib/server/schedule';

function buildDeniedCalendarView(params: {
  calendarId: string;
  reason: 'calendar-id-invalid' | 'calendar-missing' | 'group-membership-missing' | 'anonymous';
  failurePhase: 'calendar-param' | 'calendar-lookup' | 'calendar-authorization';
  welcome: string | null;
}) {
  return {
    calendarView: {
      kind: 'denied' as const,
      attemptedCalendarId: params.calendarId,
      failurePhase: params.failurePhase,
      reason: params.reason,
      detail: describeDeniedCalendarReason(params.reason),
      welcome: params.welcome
    }
  };
}

async function requireAuthenticatedUser(locals: App.Locals) {
  const authState = await locals.safeGetSession();
  return authState.authStatus === 'authenticated' && authState.user ? authState.user : null;
}

function buildAuthRequiredActionState(action: ScheduleActionKind, url: URL): ScheduleActionState {
  const visibleWeek = resolveVisibleWeek(url.searchParams);

  return {
    action,
    status: 'forbidden',
    reason: 'AUTH_REQUIRED',
    message: 'Your trusted session expired before the schedule write could be authorized.',
    visibleWeekStart: visibleWeek.start,
    shiftId: null,
    seriesId: null,
    affectedShiftIds: [],
    fields: {}
  };
}

function respondWithActionResult(key: 'createShift' | 'editShift' | 'moveShift' | 'deleteShift', result: ScheduleActionResult) {
  if (result.status >= 400) {
    return fail(result.status, {
      [key]: result.state
    });
  }

  return {
    [key]: result.state
  };
}

export function _resolveActionSearchParams(url: URL, formData: FormData) {
  const searchParams = stripCreatePrefillSearchParams(url.searchParams);
  const submittedWeekStart = formData.get('visibleWeekStart');

  if (!searchParams.get('start') && typeof submittedWeekStart === 'string' && submittedWeekStart.trim()) {
    searchParams.set('start', submittedWeekStart.trim());
  }

  return searchParams;
}

export const load: PageServerLoad = async ({ params, parent, url, locals }) => {
  const { appShell, user } = await parent();
  const calendarState = resolveTrustedCalendarFromAppShell({
    calendarId: params.calendarId,
    userId: user?.id ?? null,
    memberships: appShell?.memberships,
    calendars: appShell?.calendars
  });

  if (!calendarState.ok) {
    return buildDeniedCalendarView({
      calendarId: params.calendarId,
      reason: calendarState.reason,
      failurePhase: calendarState.failurePhase,
      welcome: url.searchParams.get('welcome')
    });
  }

  const group = Array.isArray(appShell?.groups)
    ? appShell.groups.find((candidate) => candidate.id === calendarState.calendar.groupId) ?? null
    : null;

  const schedule = await loadCalendarScheduleView({
    supabase: locals.supabase,
    calendarId: calendarState.calendar.id,
    searchParams: url.searchParams
  });
  const createPrefill = parseCreatePrefill(url.searchParams);

  return {
    calendarView: {
      kind: 'calendar' as const,
      calendar: calendarState.calendar,
      group,
      welcome: url.searchParams.get('welcome'),
      visibleWeek: schedule.visibleWeek,
      schedule,
      createPrefill
    }
  };
};

export const actions = {
  createShift: async ({ request, locals, params, url }) => {
    const formData = await request.formData();
    const actionSearchParams = _resolveActionSearchParams(url, formData);
    const user = await requireAuthenticatedUser(locals);
    if (!user) {
      return fail(401, {
        createShift: buildAuthRequiredActionState('create', new URL(`${url.origin}${url.pathname}?${actionSearchParams.toString()}`))
      });
    }

    const result = await createScheduleShift({
      supabase: locals.supabase,
      calendarId: params.calendarId,
      userId: user.id,
      searchParams: actionSearchParams,
      formData
    });

    return respondWithActionResult('createShift', result);
  },

  editShift: async ({ request, locals, params, url }) => {
    const formData = await request.formData();
    const actionSearchParams = _resolveActionSearchParams(url, formData);
    const user = await requireAuthenticatedUser(locals);
    if (!user) {
      return fail(401, {
        editShift: buildAuthRequiredActionState('edit', new URL(`${url.origin}${url.pathname}?${actionSearchParams.toString()}`))
      });
    }

    const result = await editScheduleShift({
      supabase: locals.supabase,
      calendarId: params.calendarId,
      userId: user.id,
      searchParams: actionSearchParams,
      formData
    });

    return respondWithActionResult('editShift', result);
  },

  moveShift: async ({ request, locals, params, url }) => {
    const formData = await request.formData();
    const actionSearchParams = _resolveActionSearchParams(url, formData);
    const user = await requireAuthenticatedUser(locals);
    if (!user) {
      return fail(401, {
        moveShift: buildAuthRequiredActionState('move', new URL(`${url.origin}${url.pathname}?${actionSearchParams.toString()}`))
      });
    }

    const result = await moveScheduleShift({
      supabase: locals.supabase,
      calendarId: params.calendarId,
      userId: user.id,
      searchParams: actionSearchParams,
      formData
    });

    return respondWithActionResult('moveShift', result);
  },

  deleteShift: async ({ request, locals, params, url }) => {
    const formData = await request.formData();
    const actionSearchParams = _resolveActionSearchParams(url, formData);
    const user = await requireAuthenticatedUser(locals);
    if (!user) {
      return fail(401, {
        deleteShift: buildAuthRequiredActionState('delete', new URL(`${url.origin}${url.pathname}?${actionSearchParams.toString()}`))
      });
    }

    const result = await deleteScheduleShift({
      supabase: locals.supabase,
      calendarId: params.calendarId,
      userId: user.id,
      searchParams: actionSearchParams,
      formData
    });

    return respondWithActionResult('deleteShift', result);
  }
} satisfies Actions;
