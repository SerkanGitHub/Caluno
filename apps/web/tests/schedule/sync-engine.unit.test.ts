import { describe, expect, it, vi } from 'vitest';
import type { OfflineMutationQueueEntry, OfflineMutationQueueReadResult } from '../../src/lib/offline/mutation-queue';
import type { OfflineWeekSnapshotReadResult, OfflineScheduleScope } from '../../src/lib/offline/repository';
import {
  decideTrustedRefreshSnapshotWrite,
  drainReconnectQueue,
  rebaseTrustedScheduleWithLocalQueue
} from '../../src/lib/offline/sync-engine';
import type { CalendarScheduleView, CalendarShift } from '../../src/lib/server/schedule';

function createScope(): OfflineScheduleScope {
  return {
    userId: 'user-1',
    calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
    weekStart: '2026-04-20'
  };
}

function createVisibleWeek() {
  return {
    start: '2026-04-20',
    endExclusive: '2026-04-27',
    startAt: '2026-04-20T00:00:00.000Z',
    endAt: '2026-04-27T00:00:00.000Z',
    requestedStart: '2026-04-20',
    source: 'query' as const,
    reason: null,
    dayKeys: ['2026-04-20', '2026-04-21', '2026-04-22', '2026-04-23', '2026-04-24', '2026-04-25', '2026-04-26']
  };
}

function createShift(params: {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
}): CalendarShift {
  return {
    id: params.id,
    calendarId: 'aaaaaaaa-aaaa-1111-1111-111111111111',
    seriesId: null,
    title: params.title,
    startAt: params.startAt,
    endAt: params.endAt,
    occurrenceIndex: null,
    sourceKind: 'single'
  };
}

function createSchedule(shifts: CalendarShift[], status: CalendarScheduleView['status'] = 'ready'): CalendarScheduleView {
  const visibleWeek = createVisibleWeek();

  return {
    status,
    reason: status === 'ready' ? null : 'SCHEDULE_LOAD_FAILED',
    message: status === 'ready' ? 'Trusted week loaded.' : 'Trusted week failed.',
    visibleWeek,
    days: visibleWeek.dayKeys.map((dayKey) => ({
      dayKey,
      label: dayKey,
      shifts: shifts.filter((shift) => shift.startAt.slice(0, 10) === dayKey)
    })),
    totalShifts: shifts.length,
    shiftIds: shifts.map((shift) => shift.id)
  };
}

function createSnapshotResult(origin: 'server-sync' | 'local-write'): OfflineWeekSnapshotReadResult {
  return {
    status: 'available',
    snapshot: {
      scope: createScope(),
      visibleWeek: createVisibleWeek(),
      shifts: [
        createShift({
          id: 'shift-alpha',
          title: 'Alpha opening sweep',
          startAt: '2026-04-20T08:30:00.000Z',
          endAt: '2026-04-20T09:00:00.000Z'
        })
      ],
      cachedAt: '2026-04-15T10:05:00.000Z',
      origin
    }
  };
}

function createQueueRead(entries: OfflineMutationQueueEntry[]): OfflineMutationQueueReadResult {
  return {
    status: 'available',
    entries
  };
}

describe('sync engine', () => {
  it('replays create, edit, move, and delete entries in deterministic created-at order', () => {
    const trustedSchedule = createSchedule([
      createShift({
        id: 'shift-alpha',
        title: 'Alpha opening sweep',
        startAt: '2026-04-20T08:30:00.000Z',
        endAt: '2026-04-20T09:00:00.000Z'
      })
    ]);

    const localCreated = createShift({
      id: 'local-op-1',
      title: 'Offline prep',
      startAt: '2026-04-21T09:00:00.000Z',
      endAt: '2026-04-21T11:00:00.000Z'
    });

    const queueEntries: OfflineMutationQueueEntry[] = [
      {
        id: 'op-2',
        scope: createScope(),
        action: 'edit',
        shiftId: localCreated.id,
        createdAt: '2026-04-15T10:01:00.000Z',
        syncState: 'pending-server',
        errorReason: null,
        errorDetail: null,
        payload: {
          kind: 'edit',
          fields: {
            shiftId: localCreated.id,
            title: 'Offline prep revised',
            startAt: '2026-04-21T09:30',
            endAt: '2026-04-21T11:30'
          },
          previousShift: localCreated,
          nextShift: {
            ...localCreated,
            title: 'Offline prep revised',
            startAt: '2026-04-21T09:30:00.000Z',
            endAt: '2026-04-21T11:30:00.000Z'
          }
        }
      },
      {
        id: 'op-4',
        scope: createScope(),
        action: 'delete',
        shiftId: 'shift-alpha',
        createdAt: '2026-04-15T10:03:00.000Z',
        syncState: 'pending-server',
        errorReason: null,
        errorDetail: null,
        payload: {
          kind: 'delete',
          fields: {
            shiftId: 'shift-alpha',
            title: 'Alpha opening sweep',
            startAt: '2026-04-20T10:00',
            endAt: '2026-04-20T11:00'
          },
          deletedShift: createShift({
            id: 'shift-alpha',
            title: 'Alpha opening sweep',
            startAt: '2026-04-20T10:00:00.000Z',
            endAt: '2026-04-20T11:00:00.000Z'
          })
        }
      },
      {
        id: 'op-1',
        scope: createScope(),
        action: 'create',
        shiftId: localCreated.id,
        createdAt: '2026-04-15T10:00:00.000Z',
        syncState: 'pending-server',
        errorReason: null,
        errorDetail: null,
        payload: {
          kind: 'create',
          fields: {
            title: 'Offline prep',
            startAt: '2026-04-21T09:00',
            endAt: '2026-04-21T11:00'
          },
          createdShifts: [localCreated]
        }
      },
      {
        id: 'op-3',
        scope: createScope(),
        action: 'move',
        shiftId: 'shift-alpha',
        createdAt: '2026-04-15T10:02:00.000Z',
        syncState: 'pending-server',
        errorReason: null,
        errorDetail: null,
        payload: {
          kind: 'move',
          fields: {
            shiftId: 'shift-alpha',
            title: 'Alpha opening sweep',
            startAt: '2026-04-20T10:00',
            endAt: '2026-04-20T11:00'
          },
          previousShift: createShift({
            id: 'shift-alpha',
            title: 'Alpha opening sweep',
            startAt: '2026-04-20T08:30:00.000Z',
            endAt: '2026-04-20T09:00:00.000Z'
          }),
          nextShift: createShift({
            id: 'shift-alpha',
            title: 'Alpha opening sweep',
            startAt: '2026-04-20T10:00:00.000Z',
            endAt: '2026-04-20T11:00:00.000Z'
          })
        }
      }
    ];

    const result = rebaseTrustedScheduleWithLocalQueue({
      trustedSchedule,
      queueEntries
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.boardSource).toBe('cached-local');
    expect(result.snapshotOrigin).toBe('local-write');
    expect(result.schedule.totalShifts).toBe(1);
    expect(result.schedule.shiftIds).toEqual(['local-op-1']);
    expect(result.schedule.days[1]?.shifts[0]).toMatchObject({
      id: 'local-op-1',
      title: 'Offline prep revised',
      startAt: '2026-04-21T09:30:00.000Z',
      endAt: '2026-04-21T11:30:00.000Z'
    });
  });

  it('preserves local-only created shifts when the trusted refresh omits them', () => {
    const result = rebaseTrustedScheduleWithLocalQueue({
      trustedSchedule: createSchedule([
        createShift({
          id: 'shift-alpha',
          title: 'Alpha opening sweep',
          startAt: '2026-04-20T08:30:00.000Z',
          endAt: '2026-04-20T09:00:00.000Z'
        })
      ]),
      queueEntries: [
        {
          id: 'op-1',
          scope: createScope(),
          action: 'create',
          shiftId: 'local-op-1',
          createdAt: '2026-04-15T10:00:00.000Z',
          syncState: 'pending-server',
          errorReason: null,
          errorDetail: null,
          payload: {
            kind: 'create',
            fields: {
              title: 'Offline prep',
              startAt: '2026-04-21T09:00',
              endAt: '2026-04-21T11:00'
            },
            createdShifts: [
              createShift({
                id: 'local-op-1',
                title: 'Offline prep',
                startAt: '2026-04-21T09:00:00.000Z',
                endAt: '2026-04-21T11:00:00.000Z'
              })
            ]
          }
        }
      ]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.schedule.shiftIds).toEqual(['shift-alpha', 'local-op-1']);
    expect(result.schedule.days[1]?.shifts[0]?.id).toBe('local-op-1');
  });

  it('fails closed when a trusted refresh omits a shift needed by a queued move', () => {
    const result = rebaseTrustedScheduleWithLocalQueue({
      trustedSchedule: createSchedule([]),
      queueEntries: [
        {
          id: 'op-1',
          scope: createScope(),
          action: 'move',
          shiftId: 'shift-alpha',
          createdAt: '2026-04-15T10:00:00.000Z',
          syncState: 'pending-server',
          errorReason: null,
          errorDetail: null,
          payload: {
            kind: 'move',
            fields: {
              shiftId: 'shift-alpha',
              title: 'Alpha opening sweep',
              startAt: '2026-04-20T10:00',
              endAt: '2026-04-20T11:00'
            },
            previousShift: createShift({
              id: 'shift-alpha',
              title: 'Alpha opening sweep',
              startAt: '2026-04-20T08:30:00.000Z',
              endAt: '2026-04-20T09:00:00.000Z'
            }),
            nextShift: createShift({
              id: 'shift-alpha',
              title: 'Alpha opening sweep',
              startAt: '2026-04-20T10:00:00.000Z',
              endAt: '2026-04-20T11:00:00.000Z'
            })
          }
        }
      ]
    });

    expect(result).toEqual({
      ok: false,
      reason: 'REPLAY_MOVE_TARGET_MISSING',
      detail:
        'The trusted refreshed week no longer contained a shift needed for a queued local move, so the existing local board stayed authoritative.'
    });
  });

  it('fails closed when a queued payload is malformed', () => {
    const result = rebaseTrustedScheduleWithLocalQueue({
      trustedSchedule: createSchedule([]),
      queueEntries: [
        {
          id: 'op-1',
          scope: createScope(),
          action: 'create',
          shiftId: 'local-op-1',
          createdAt: '2026-04-15T10:00:00.000Z',
          syncState: 'pending-server',
          errorReason: null,
          errorDetail: null,
          payload: {
            kind: 'create',
            fields: {
              title: 'Offline prep',
              startAt: '2026-04-21T09:00',
              endAt: '2026-04-21T11:00'
            },
            createdShifts: [{ id: 'broken-shift' }]
          } as never
        }
      ]
    });

    expect(result).toEqual({
      ok: false,
      reason: 'QUEUE_ENTRY_INVALID',
      detail: 'A queued local create payload was malformed, so trusted replay failed closed.'
    });
  });

  it('protects a local-write snapshot from trusted overwrite while queue entries remain', () => {
    const decision = decideTrustedRefreshSnapshotWrite({
      currentSnapshot: createSnapshotResult('local-write'),
      queueReadResult: createQueueRead([
        {
          id: 'op-1',
          scope: createScope(),
          action: 'move',
          shiftId: 'shift-alpha',
          createdAt: '2026-04-15T10:00:00.000Z',
          syncState: 'pending-server',
          errorReason: null,
          errorDetail: null,
          payload: {
            kind: 'move',
            fields: {
              shiftId: 'shift-alpha',
              title: 'Alpha opening sweep',
              startAt: '2026-04-20T10:00',
              endAt: '2026-04-20T11:00'
            },
            previousShift: createShift({
              id: 'shift-alpha',
              title: 'Alpha opening sweep',
              startAt: '2026-04-20T08:30:00.000Z',
              endAt: '2026-04-20T09:00:00.000Z'
            }),
            nextShift: createShift({
              id: 'shift-alpha',
              title: 'Alpha opening sweep',
              startAt: '2026-04-20T10:00:00.000Z',
              endAt: '2026-04-20T11:00:00.000Z'
            })
          }
        }
      ])
    });

    expect(decision).toEqual({
      shouldPersist: false,
      reason: 'local-write-pending-queue',
      detail:
        'Pending browser-local mutations still exist for this week, so the trusted refresh did not replace the local-write snapshot.'
    });
  });

  it('protects a local-write snapshot when queue inspection is unavailable and allows replacement once clear', () => {
    expect(
      decideTrustedRefreshSnapshotWrite({
        currentSnapshot: createSnapshotResult('local-write'),
        queueReadResult: {
          status: 'unavailable',
          reason: 'repository-unavailable',
          detail: 'The offline repository is unavailable.'
        }
      })
    ).toEqual({
      shouldPersist: false,
      reason: 'local-write-queue-unavailable',
      detail:
        'The browser-local queue could not be inspected while a local-write snapshot existed, so the trusted refresh did not overwrite the cached week.'
    });

    expect(
      decideTrustedRefreshSnapshotWrite({
        currentSnapshot: createSnapshotResult('local-write'),
        queueReadResult: createQueueRead([])
      })
    ).toEqual({
      shouldPersist: true,
      reason: 'trusted-refresh-persisted',
      detail: 'The local-write snapshot had no remaining queue work, so the trusted refresh may replace it.',
      origin: 'server-sync'
    });
  });

  it('drains queued reconnect requests in deterministic order and stops on the first trusted failure', async () => {
    const localCreated = createShift({
      id: 'local-op-1',
      title: 'Offline prep',
      startAt: '2026-04-21T09:00:00.000Z',
      endAt: '2026-04-21T11:00:00.000Z'
    });

    const queueEntries: OfflineMutationQueueEntry[] = [
      {
        id: 'op-2',
        scope: createScope(),
        action: 'edit',
        shiftId: localCreated.id,
        createdAt: '2026-04-15T10:01:00.000Z',
        syncState: 'pending-server',
        errorReason: null,
        errorDetail: null,
        payload: {
          kind: 'edit',
          fields: {
            shiftId: localCreated.id,
            title: 'Offline prep revised',
            startAt: '2026-04-21T09:30',
            endAt: '2026-04-21T11:30'
          },
          previousShift: localCreated,
          nextShift: {
            ...localCreated,
            title: 'Offline prep revised',
            startAt: '2026-04-21T09:30:00.000Z',
            endAt: '2026-04-21T11:30:00.000Z'
          }
        }
      },
      {
        id: 'op-1',
        scope: createScope(),
        action: 'create',
        shiftId: localCreated.id,
        createdAt: '2026-04-15T10:00:00.000Z',
        syncState: 'pending-server',
        errorReason: null,
        errorDetail: null,
        payload: {
          kind: 'create',
          fields: {
            title: 'Offline prep',
            startAt: '2026-04-21T09:00',
            endAt: '2026-04-21T11:00'
          },
          createdShifts: [localCreated]
        }
      },
      {
        id: 'op-3',
        scope: createScope(),
        action: 'move',
        shiftId: 'shift-alpha',
        createdAt: '2026-04-15T10:02:00.000Z',
        syncState: 'pending-server',
        errorReason: null,
        errorDetail: null,
        payload: {
          kind: 'move',
          fields: {
            shiftId: 'shift-alpha',
            title: 'Alpha opening sweep',
            startAt: '2026-04-20T10:00',
            endAt: '2026-04-20T11:00'
          },
          previousShift: createShift({
            id: 'shift-alpha',
            title: 'Alpha opening sweep',
            startAt: '2026-04-20T08:30:00.000Z',
            endAt: '2026-04-20T09:00:00.000Z'
          }),
          nextShift: createShift({
            id: 'shift-alpha',
            title: 'Alpha opening sweep',
            startAt: '2026-04-20T10:00:00.000Z',
            endAt: '2026-04-20T11:00:00.000Z'
          })
        }
      }
    ];

    const submissionOrder: string[] = [];
    const finalizedOutcomes: string[] = [];

    const result = await drainReconnectQueue({
      entries: queueEntries,
      visibleWeekStart: '2026-04-20',
      submitAction: async (request) => {
        submissionOrder.push(`${request.actionKey}:${request.entryId}`);

        if (request.entryId === 'op-2') {
          return {
            type: 'failure',
            state: {
              action: request.action,
              status: 'forbidden',
              reason: 'SHIFT_CALENDAR_MISMATCH',
              message: 'That shift belongs to a different calendar than the current trusted route.',
              visibleWeekStart: request.visibleWeekStart,
              shiftId: request.shiftId,
              seriesId: null,
              affectedShiftIds: [],
              fields: request.fields
            }
          };
        }

        return {
          type: 'success',
          state: {
            action: request.action,
            status: 'success',
            reason: request.action === 'create' ? 'SHIFT_CREATED' : 'SHIFT_MOVED',
            message: 'Confirmed by trusted action.',
            visibleWeekStart: request.visibleWeekStart,
            shiftId: request.action === 'create' ? 'server-shift-1' : request.shiftId,
            seriesId: null,
            affectedShiftIds: request.action === 'create' ? ['server-shift-1'] : [request.shiftId ?? 'shift-alpha'],
            fields: request.fields
          }
        };
      },
      onOutcome: (entry, outcome) => {
        finalizedOutcomes.push(
          outcome.type === 'malformed-response'
            ? `${entry.id}:${outcome.reason}`
            : `${entry.id}:${outcome.state.status}`
        );
      }
    });

    expect(submissionOrder).toEqual(['createShift:op-1', 'editShift:op-2']);
    expect(finalizedOutcomes).toEqual(['op-1:success', 'op-2:forbidden']);
    expect(result).toMatchObject({
      status: 'stopped',
      attemptedCount: 2,
      succeededCount: 1,
      processedEntryIds: ['op-1'],
      stoppedEntryId: 'op-2',
      reason: 'SHIFT_CALENDAR_MISMATCH'
    });
  });

  it('refuses malformed reconnect requests before any trusted action submission', async () => {
    const submitAction = vi.fn();
    const finalizedOutcomes: string[] = [];

    const result = await drainReconnectQueue({
      entries: [
        {
          id: 'op-1',
          scope: createScope(),
          action: 'create',
          shiftId: 'local-op-1',
          createdAt: '2026-04-15T10:00:00.000Z',
          syncState: 'pending-server',
          errorReason: null,
          errorDetail: null,
          payload: {
            kind: 'create',
            fields: {
              title: '',
              startAt: '2026-04-21T09:00',
              endAt: '2026-04-21T11:00'
            },
            createdShifts: [
              createShift({
                id: 'local-op-1',
                title: 'Offline prep',
                startAt: '2026-04-21T09:00:00.000Z',
                endAt: '2026-04-21T11:00:00.000Z'
              })
            ]
          }
        }
      ],
      visibleWeekStart: '2026-04-20',
      submitAction,
      onOutcome: (entry, outcome) => {
        finalizedOutcomes.push(outcome.type === 'malformed-response' ? `${entry.id}:${outcome.reason}` : `${entry.id}:unexpected`);
      }
    });

    expect(submitAction).not.toHaveBeenCalled();
    expect(finalizedOutcomes).toEqual(['op-1:QUEUE_ENTRY_INVALID']);
    expect(result).toMatchObject({
      status: 'stopped',
      attemptedCount: 1,
      succeededCount: 0,
      stoppedEntryId: 'op-1',
      reason: 'QUEUE_ENTRY_INVALID'
    });
  });

  it('fails closed when a reconnect drain entry targets a different visible week scope', async () => {
    const submitAction = vi.fn();

    const result = await drainReconnectQueue({
      entries: [
        {
          id: 'op-1',
          scope: {
            ...createScope(),
            weekStart: '2026-04-27'
          },
          action: 'move',
          shiftId: 'shift-alpha',
          createdAt: '2026-04-15T10:00:00.000Z',
          syncState: 'pending-server',
          errorReason: null,
          errorDetail: null,
          payload: {
            kind: 'move',
            fields: {
              shiftId: 'shift-alpha',
              title: 'Alpha opening sweep',
              startAt: '2026-04-20T10:00',
              endAt: '2026-04-20T11:00'
            },
            previousShift: createShift({
              id: 'shift-alpha',
              title: 'Alpha opening sweep',
              startAt: '2026-04-20T08:30:00.000Z',
              endAt: '2026-04-20T09:00:00.000Z'
            }),
            nextShift: createShift({
              id: 'shift-alpha',
              title: 'Alpha opening sweep',
              startAt: '2026-04-20T10:00:00.000Z',
              endAt: '2026-04-20T11:00:00.000Z'
            })
          }
        }
      ],
      visibleWeekStart: '2026-04-20',
      submitAction
    });

    expect(submitAction).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 'stopped',
      stoppedEntryId: 'op-1',
      reason: 'QUEUE_SCOPE_MISMATCH'
    });
  });

  it('treats an empty reconnect queue as an immediate no-op success', async () => {
    const submitAction = vi.fn();

    const result = await drainReconnectQueue({
      entries: [],
      visibleWeekStart: '2026-04-20',
      submitAction
    });

    expect(submitAction).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'drained',
      attemptedCount: 0,
      succeededCount: 0,
      processedEntryIds: [],
      stoppedEntryId: null,
      reason: null,
      detail: 'No queued browser-local mutations were waiting for reconnect.'
    });
  });
});
