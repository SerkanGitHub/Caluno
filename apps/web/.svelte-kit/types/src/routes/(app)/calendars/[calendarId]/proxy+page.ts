// @ts-nocheck
import { browser } from '$app/environment';
import {
  resolveCachedCalendarRouteData,
  type ProtectedAppShellData
} from '$lib/offline/protected-routes';
import { resolveVisibleWeek } from '@repo/caluno-core/route-contract';
import type { PageLoad } from './$types';

export const load = async ({ data, params, parent, url }: Parameters<PageLoad>[0]) => {
  const parentData = await parent();
  const isOnline = !browser || navigator.onLine;

  if (isOnline) {
    if (browser && data.calendarView.kind === 'calendar' && data.calendarView.schedule.status === 'ready' && parentData.appShell) {
      const { createBrowserScheduleRepository } = await import('$lib/offline/repository');
      const { createOfflineMutationQueue } = await import('$lib/offline/mutation-queue');
      const { decideTrustedRefreshSnapshotWrite } = await import('$lib/offline/sync-engine');
      const repository = createBrowserScheduleRepository();
      const queue = createOfflineMutationQueue({ repository });
      const scope = {
        userId: parentData.appShell.viewer.id,
        calendarId: data.calendarView.calendar.id,
        weekStart: data.calendarView.schedule.visibleWeek.start
      };

      try {
        const [currentSnapshot, queueReadResult] = await Promise.all([
          repository.getWeekSnapshot(scope),
          queue.read(scope)
        ]);
        const writeDecision = decideTrustedRefreshSnapshotWrite({
          currentSnapshot,
          queueReadResult
        });

        if (writeDecision.shouldPersist) {
          await repository.putWeekSnapshot({
            scope,
            visibleWeek: data.calendarView.schedule.visibleWeek,
            shifts: data.calendarView.schedule.days.flatMap((day) => day.shifts),
            cachedAt: new Date().toISOString(),
            origin: writeDecision.origin
          });
        }
      } catch {
        // fail closed: keep the trusted online route active even if local caching is unavailable
      } finally {
        await repository.close();
      }
    }

    return {
      ...data,
      protectedCalendarState: {
        mode: 'trusted-online',
        reason: null,
        detail: 'Week data and calendar scope came from the trusted server route.',
        cachedAt: null,
        visibleWeekStart: data.calendarView.kind === 'calendar' ? data.calendarView.schedule.visibleWeek.start : null,
        visibleWeekOrigin: data.calendarView.kind === 'calendar' ? 'server-sync' : null
      }
    };
  }

  if (!parentData.appShell) {
    return resolveCachedCalendarRouteData({
      calendarId: params.calendarId,
      searchParams: url.searchParams,
      appShell: null,
      shellState: parentData.protectedShellState
    });
  }

  const visibleWeek = resolveVisibleWeek(url.searchParams);
  const { createBrowserScheduleRepository } = await import('$lib/offline/repository');
  const repository = createBrowserScheduleRepository();

  try {
    const snapshotResult = await repository.getWeekSnapshot({
      userId: parentData.appShell.viewer.id,
      calendarId: params.calendarId,
      weekStart: visibleWeek.start
    });

    return resolveCachedCalendarRouteData({
      calendarId: params.calendarId,
      searchParams: url.searchParams,
      appShell: parentData.appShell,
      shellState: parentData.protectedShellState,
      snapshotResult
    });
  } finally {
    await repository.close();
  }
};
