import { describe, expect, it, vi } from 'vitest';
import type { OfflineMutationQueueEntry, OfflineMutationQueueReadResult } from '@repo/caluno-core/offline/mutation-queue';
import type { OfflineWeekSnapshotReadResult, OfflineScheduleScope } from '@repo/caluno-core/offline/types';
import {
  decideTrustedRefreshSnapshotWrite,
  drainReconnectQueue,
  mergeRealtimeDiagnosticsForScopeReload,
  rebaseTrustedScheduleWithLocalQueue,
  shouldRefreshTrustedWeekFromShiftRealtimeEvent,
  type ShiftRealtimePayload
} from '@repo/caluno-core/offline/sync-engine';
import { createCalendarShiftRealtimeSubscription } from '../../src/lib/offline/sync-engine';
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

function createRealtimePayload(params: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  row?: Partial<{ id: string; calendar_id: string; start_at: string; end_at: string }>;
  oldRow?: Partial<{ id: string; calendar_id: string; start_at: string; end_at: string }>;
}): ShiftRealtimePayload {
  const toRow = (row?: Partial<{ id: string; calendar_id: string; start_at: string; end_at: string }> | null) =>
    row
      ? {
          id: row.id ?? null,
          calendar_id: row.calendar_id ?? null,
          start_at: row.start_at ?? null,
          end_at: row.end_at ?? null
        }
      : null;

  return {
    eventType: params.eventType,
    new: params.eventType === 'DELETE' ? null : toRow(params.row),
    old: params.eventType === 'DELETE' ? toRow(params.oldRow ?? params.row) : toRow(params.oldRow)
  };
}

class FakeRealtimeChannel {
  readonly name: string;
  private payloadHandler: ((payload: ShiftRealtimePayload) => void) | null = null;
  private statusHandler: ((status: string, error?: Error) => void) | null = null;

  constructor(name: string) {
    this.name = name;
  }

  on(
    _type: 'postgres_changes',
    _filter: { event: '*'; schema: 'public'; table: 'shifts'; filter: string },
    callback: (payload: ShiftRealtimePayload) => void
  ) {
    this.payloadHandler = callback;
    return this;
  }

  subscribe(callback?: (status: string, error?: Error) => void) {
    this.statusHandler = callback ?? null;
    return this;
  }

  emitPayload(payload: ShiftRealtimePayload) {
    this.payloadHandler?.(payload);
  }

  emitStatus(status: string, error?: Error) {
    this.statusHandler?.(status, error);
  }
}

class FakeRealtimeClient {
  readonly channels: FakeRealtimeChannel[] = [];
  readonly removedChannels: FakeRealtimeChannel[] = [];

  channel(name: string) {
    const channel = new FakeRealtimeChannel(name);
    this.channels.push(channel);
    return channel;
  }

  async removeChannel(channel: { emitStatus: (status: string, error?: Error) => void }) {
    this.removedChannels.push(channel as FakeRealtimeChannel);
    channel.emitStatus('CLOSED');
  }
}

class FakeRealtimeAuthClient extends FakeRealtimeClient {
  readonly callOrder: string[] = [];
  session: { access_token?: string | null } | null = {
    access_token: 'token-123'
  };
  authStateChangeCallback: ((event: string, session: { access_token?: string | null } | null) => void) | null = null;

  auth = {
    getSession: vi.fn(async () => {
      this.callOrder.push('getSession');
      return {
        data: {
          session: this.session
        }
      };
    }),
    onAuthStateChange: vi.fn(
      (callback: (event: string, session: { access_token?: string | null } | null) => void) => {
        this.authStateChangeCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn()
            }
          }
        };
      }
    )
  };

  realtime = {
    setAuth: vi.fn(async (_token?: string) => {
      this.callOrder.push('setAuth');
    })
  };

  override channel(name: string) {
    this.callOrder.push('channel');
    return super.channel(name);
  }
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

  it('ignores delete signals without calendar scope so realtime deletes cannot mis-scope refreshes', () => {
    const result = shouldRefreshTrustedWeekFromShiftRealtimeEvent({
      calendarId: createScope().calendarId,
      visibleWeek: createVisibleWeek(),
      payload: createRealtimePayload({
        eventType: 'DELETE',
        oldRow: {
          id: 'shift-alpha',
          start_at: '2026-04-20T08:30:00.000Z',
          end_at: '2026-04-20T09:00:00.000Z'
        }
      })
    });

    expect(result).toEqual({
      shouldRefresh: false,
      reason: 'REALTIME_DELETE_SCOPE_MISSING',
      detail:
        'The realtime delete payload did not include calendar scope, so it was ignored instead of refreshing the wrong shared calendar.'
    });
  });

  it('refreshes when an update moves a shift into or out of the visible week', () => {
    const movingIntoWeek = shouldRefreshTrustedWeekFromShiftRealtimeEvent({
      calendarId: createScope().calendarId,
      visibleWeek: createVisibleWeek(),
      payload: createRealtimePayload({
        eventType: 'UPDATE',
        row: {
          id: 'shift-alpha',
          calendar_id: createScope().calendarId,
          start_at: '2026-04-20T08:30:00.000Z',
          end_at: '2026-04-20T09:00:00.000Z'
        },
        oldRow: {
          id: 'shift-alpha',
          calendar_id: createScope().calendarId,
          start_at: '2026-04-28T08:30:00.000Z',
          end_at: '2026-04-28T09:00:00.000Z'
        }
      })
    });

    const movingOutOfWeek = shouldRefreshTrustedWeekFromShiftRealtimeEvent({
      calendarId: createScope().calendarId,
      visibleWeek: createVisibleWeek(),
      payload: createRealtimePayload({
        eventType: 'UPDATE',
        row: {
          id: 'shift-alpha',
          calendar_id: createScope().calendarId,
          start_at: '2026-04-28T08:30:00.000Z',
          end_at: '2026-04-28T09:00:00.000Z'
        },
        oldRow: {
          id: 'shift-alpha',
          calendar_id: createScope().calendarId,
          start_at: '2026-04-20T08:30:00.000Z',
          end_at: '2026-04-20T09:00:00.000Z'
        }
      })
    });

    expect(movingIntoWeek.shouldRefresh).toBe(true);
    expect(movingOutOfWeek.shouldRefresh).toBe(true);
  });

  it('coalesces bursty realtime collaborator edits into serialized trusted refreshes', async () => {
    vi.useFakeTimers();

    try {
      const client = new FakeRealtimeClient();
      const refreshSignals: string[] = [];
      const pendingRefreshResolvers: Array<() => void> = [];

      const subscription = createCalendarShiftRealtimeSubscription({
        calendarId: createScope().calendarId,
        visibleWeek: createVisibleWeek(),
        client: client as never,
        debounceMs: 50,
        subscribeTimeoutMs: 1_000,
        requestTrustedRefresh: (signal) =>
          new Promise((resolve) => {
            refreshSignals.push(signal.shiftId ?? signal.eventType);
            pendingRefreshResolvers.push(() =>
              resolve({
                status: 'applied',
                boardSource: 'cached-local',
                replayedQueueLength: 1,
                detail: 'trusted refresh applied'
              })
            );
          })
      });

      await Promise.resolve();
      const channel = client.channels[0] as FakeRealtimeChannel;
      channel.emitStatus('SUBSCRIBED');
      channel.emitPayload(
        createRealtimePayload({
          eventType: 'INSERT',
          row: {
            id: 'shift-alpha',
            calendar_id: createScope().calendarId,
            start_at: '2026-04-20T08:30:00.000Z',
            end_at: '2026-04-20T09:00:00.000Z'
          }
        })
      );
      channel.emitPayload(
        createRealtimePayload({
          eventType: 'UPDATE',
          row: {
            id: 'shift-beta',
            calendar_id: createScope().calendarId,
            start_at: '2026-04-21T08:30:00.000Z',
            end_at: '2026-04-21T09:00:00.000Z'
          }
        })
      );

      await vi.advanceTimersByTimeAsync(50);
      expect(refreshSignals).toHaveLength(1);

      channel.emitPayload(
        createRealtimePayload({
          eventType: 'UPDATE',
          row: {
            id: 'shift-gamma',
            calendar_id: createScope().calendarId,
            start_at: '2026-04-22T08:30:00.000Z',
            end_at: '2026-04-22T09:00:00.000Z'
          }
        })
      );
      await vi.advanceTimersByTimeAsync(50);
      expect(refreshSignals).toHaveLength(1);

      pendingRefreshResolvers.shift()?.();
      await Promise.resolve();
      await Promise.resolve();
      expect(refreshSignals).toHaveLength(2);

      pendingRefreshResolvers.shift()?.();
      await Promise.resolve();
      await subscription.close();
    } finally {
      vi.useRealTimers();
    }
  });

  it('authenticates realtime before opening the shared shift channel when a session token is available', async () => {
    const client = new FakeRealtimeAuthClient();

    const subscription = createCalendarShiftRealtimeSubscription({
      calendarId: createScope().calendarId,
      visibleWeek: createVisibleWeek(),
      client: client as never,
      requestTrustedRefresh: async () => ({
        status: 'applied',
        boardSource: 'server-sync',
        replayedQueueLength: 0,
        detail: 'trusted refresh applied'
      })
    });

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(client.callOrder).toEqual(expect.arrayContaining(['getSession', 'setAuth', 'channel']));
    expect(client.callOrder.indexOf('getSession')).toBeLessThan(client.callOrder.indexOf('setAuth'));
    expect(client.callOrder.indexOf('setAuth')).toBeLessThan(client.callOrder.indexOf('channel'));
    expect(client.channels).toHaveLength(1);

    await subscription.close();
  });

  it('waits for the initial browser session before opening the shared shift channel when auth hydration lags behind route mount', async () => {
    const client = new FakeRealtimeAuthClient();
    client.session = null;

    const subscription = createCalendarShiftRealtimeSubscription({
      calendarId: createScope().calendarId,
      visibleWeek: createVisibleWeek(),
      client: client as never,
      requestTrustedRefresh: async () => ({
        status: 'applied',
        boardSource: 'server-sync',
        replayedQueueLength: 0,
        detail: 'trusted refresh applied'
      })
    });

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(client.channels).toHaveLength(0);
    expect(subscription.getDiagnostics()).toMatchObject({
      channelState: 'subscribing',
      channelReason: 'REALTIME_AUTH_SESSION_PENDING',
      channelDetail: 'Waiting for the browser auth session before opening shared shift change detection for this calendar week.'
    });

    client.session = { access_token: 'token-123' };
    client.authStateChangeCallback?.('INITIAL_SESSION', client.session);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(client.channels).toHaveLength(1);
    client.channels[0]?.emitStatus('SUBSCRIBED');
    expect(subscription.getDiagnostics()).toMatchObject({
      channelState: 'ready',
      channelReason: null
    });

    await subscription.close();
  });

  it('does not recreate the realtime channel when duplicate auth-session events arrive during the initial subscribe handshake', async () => {
    const client = new FakeRealtimeAuthClient();

    const subscription = createCalendarShiftRealtimeSubscription({
      calendarId: createScope().calendarId,
      visibleWeek: createVisibleWeek(),
      client: client as never,
      requestTrustedRefresh: async () => ({
        status: 'applied',
        boardSource: 'server-sync',
        replayedQueueLength: 0,
        detail: 'trusted refresh applied'
      })
    });

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(client.channels).toHaveLength(1);
    client.authStateChangeCallback?.('INITIAL_SESSION', client.session);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(client.channels).toHaveLength(1);
    expect(client.removedChannels).toHaveLength(0);

    await subscription.close();
  });

  it('retains the last signal and applied refresh outcome when a same-scope subscription rebuild emits a fresh idle snapshot', () => {
    const merged = mergeRealtimeDiagnosticsForScopeReload({
      previous: {
        channelState: 'ready',
        channelReason: null,
        channelDetail: 'Listening for shared shift changes on this calendar week.',
        lastSignalAt: '2026-04-16T14:22:19.071Z',
        lastSignalEvent: 'INSERT',
        lastSignalDetail: 'A visible-week shared shift was inserted, so the route will reload the trusted week and replay pending local work.',
        remoteRefreshState: 'applied',
        lastRemoteRefreshAt: '2026-04-16T14:22:19.512Z',
        lastRemoteRefreshReason: null,
        lastRemoteRefreshDetail: 'INSERT signal reloaded the trusted week with no pending local work to replay.'
      },
      next: {
        channelState: 'subscribing',
        channelReason: null,
        channelDetail: 'Connecting to shared shift change detection for this calendar week.',
        lastSignalAt: null,
        lastSignalEvent: null,
        lastSignalDetail: null,
        remoteRefreshState: 'idle',
        lastRemoteRefreshAt: null,
        lastRemoteRefreshReason: null,
        lastRemoteRefreshDetail: null
      }
    });

    expect(merged).toMatchObject({
      channelState: 'subscribing',
      channelDetail: 'Connecting to shared shift change detection for this calendar week.',
      lastSignalEvent: 'INSERT',
      remoteRefreshState: 'applied',
      lastRemoteRefreshDetail: 'INSERT signal reloaded the trusted week with no pending local work to replay.'
    });
  });

  it('accepts a genuinely new idle diagnostic snapshot when there is no retained realtime history', () => {
    const next = {
      channelState: 'subscribing',
      channelReason: null,
      channelDetail: 'Connecting to shared shift change detection for this calendar week.',
      lastSignalAt: null,
      lastSignalEvent: null,
      lastSignalDetail: null,
      remoteRefreshState: 'idle',
      lastRemoteRefreshAt: null,
      lastRemoteRefreshReason: null,
      lastRemoteRefreshDetail: null
    } as const;

    expect(
      mergeRealtimeDiagnosticsForScopeReload({
        previous: null,
        next
      })
    ).toEqual(next);
  });

  it('retries timed-out realtime subscriptions and tears them down cleanly', async () => {
    vi.useFakeTimers();

    try {
      const client = new FakeRealtimeClient();
      const seenDiagnostics: Array<{ channelState: string; channelReason: string | null }> = [];

      const subscription = createCalendarShiftRealtimeSubscription({
        calendarId: createScope().calendarId,
        visibleWeek: createVisibleWeek(),
        client: client as never,
        subscribeTimeoutMs: 20,
        retryDelayMs: 10,
        requestTrustedRefresh: async () => ({
          status: 'applied',
          boardSource: 'server-sync',
          replayedQueueLength: 0,
          detail: 'trusted refresh applied'
        }),
        onDiagnostics: (diagnostics) => {
          seenDiagnostics.push({
            channelState: diagnostics.channelState,
            channelReason: diagnostics.channelReason
          });
        }
      });

      await Promise.resolve();
      expect(client.channels).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(20);
      expect(seenDiagnostics).toContainEqual({
        channelState: 'retrying',
        channelReason: 'REALTIME_SUBSCRIBE_TIMEOUT'
      });

      await vi.advanceTimersByTimeAsync(10);
      expect(client.channels).toHaveLength(2);
      expect(client.removedChannels).toHaveLength(1);

      await subscription.close();
      expect(client.removedChannels).toHaveLength(2);
      expect(subscription.getDiagnostics().channelState).toBe('closed');
    } finally {
      vi.useRealTimers();
    }
  });
});
