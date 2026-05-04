import { Preferences } from "@capacitor/preferences";
const STORAGE_TIMEOUT_MS = 750;
const WEEK_SNAPSHOT_PREFIX = "caluno.mobile.week-snapshot.v1";
const WEEK_METADATA_PREFIX = "caluno.mobile.week-metadata.v1";
const MUTATION_QUEUE_PREFIX = "caluno.mobile.mutation-queue.v1";
const defaultStorage = {
  async get(key) {
    const result = await Preferences.get({ key });
    return result.value ?? null;
  },
  async set(key, value) {
    await Preferences.set({ key, value });
  },
  async remove(key) {
    await Preferences.remove({ key });
  },
  async keys() {
    const result = await Preferences.keys();
    return result.keys;
  }
};
function createMobileOfflineRepository(options = {}) {
  const storage = options.storage ?? defaultStorage;
  const timeoutMs = options.timeoutMs ?? STORAGE_TIMEOUT_MS;
  let state = null;
  async function initialize() {
    try {
      await withTimeout(storage.keys(), timeoutMs, "Reading mobile offline keys timed out during repository bootstrap.");
      state = {
        status: "ready",
        engine: "memory",
        persistence: "persistent",
        database: "capacitor-preferences",
        sqliteVersion: null
      };
      return state;
    } catch (error) {
      state = {
        status: "unavailable",
        engine: "memory",
        reason: isTimeoutError(error) ? "repository-open-timeout" : "repository-open-failed",
        detail: error instanceof Error ? error.message : "Opening the mobile offline repository failed before device persistence could be inspected."
      };
      return state;
    }
  }
  const repository = {
    initialize,
    inspect() {
      return state;
    },
    async getWeekSnapshot(scope) {
      if (!isOfflineScheduleScope(scope)) {
        return malformedWeek("The requested offline week scope was malformed, so the trusted snapshot stayed hidden.");
      }
      const key = buildWeekSnapshotKey(scope);
      let raw;
      try {
        raw = await withTimeout(storage.get(key), timeoutMs, "Reading the stored offline week snapshot timed out.");
      } catch (error) {
        return unavailableWeek(error);
      }
      if (!raw) {
        return {
          status: "missing",
          reason: "snapshot-missing"
        };
      }
      try {
        const parsed = JSON.parse(raw);
        if (!isOfflineScheduleWeekSnapshot(parsed) || !sameScope(parsed.scope, scope)) {
          await safeRemove(storage, key, timeoutMs);
          return malformedWeek(
            "The stored offline week snapshot failed contract validation, so cached week continuity failed closed."
          );
        }
        return {
          status: "available",
          snapshot: parsed
        };
      } catch {
        await safeRemove(storage, key, timeoutMs);
        return malformedWeek("The stored offline week snapshot was corrupt and was cleared instead of being trusted.");
      }
    },
    async putWeekSnapshot(snapshot) {
      if (!isOfflineScheduleWeekSnapshot(snapshot)) {
        return invalidWrite("snapshot-invalid", "Refused to persist a malformed mobile offline week snapshot.");
      }
      const key = buildWeekSnapshotKey(snapshot.scope);
      const metadataKey = buildWeekMetadataKey(snapshot.scope);
      const raw = JSON.stringify(snapshot);
      const metadata = JSON.stringify({
        userId: snapshot.scope.userId,
        calendarId: snapshot.scope.calendarId,
        weekStart: snapshot.scope.weekStart,
        syncedAt: snapshot.cachedAt,
        source: snapshot.origin === "local-write" ? "local-write" : "server-sync"
      });
      try {
        const existingRaw = await withTimeout(storage.get(key), timeoutMs, "Reading the stored offline week snapshot timed out.");
        if (existingRaw !== raw) {
          await withTimeout(storage.set(key, raw), timeoutMs, "Persisting the offline week snapshot timed out.");
        }
        const existingMetadata = await withTimeout(
          storage.get(metadataKey),
          timeoutMs,
          "Reading the stored offline week metadata timed out."
        );
        if (existingMetadata !== metadata) {
          await withTimeout(storage.set(metadataKey, metadata), timeoutMs, "Persisting the offline week metadata timed out.");
        }
        return { ok: true };
      } catch (error) {
        return unavailableWrite("snapshot-invalid", error, "Persisting the mobile offline week snapshot failed.");
      }
    },
    async deleteWeekSnapshot(scope) {
      if (!isOfflineScheduleScope(scope)) {
        return invalidWrite("snapshot-invalid", "Refused to delete a malformed mobile offline week scope.");
      }
      try {
        await withTimeout(storage.remove(buildWeekSnapshotKey(scope)), timeoutMs, "Deleting the offline week snapshot timed out.");
        await withTimeout(storage.remove(buildWeekMetadataKey(scope)), timeoutMs, "Deleting the offline week metadata timed out.");
        return { ok: true };
      } catch (error) {
        return unavailableWrite("repository-unavailable", error, "Deleting the mobile offline week snapshot failed.");
      }
    },
    async listLocalMutations(scope) {
      if (!isOfflineScheduleScope(scope)) {
        return malformedMutations("The requested offline mutation scope was malformed, so queued work stayed hidden.");
      }
      const key = buildMutationQueueKey(scope);
      let raw;
      try {
        raw = await withTimeout(storage.get(key), timeoutMs, "Reading the stored offline mutation queue timed out.");
      } catch (error) {
        return unavailableMutations(error);
      }
      if (!raw) {
        return {
          status: "available",
          mutations: []
        };
      }
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.every((value) => isOfflineScheduleMutationRecord(value) && sameScope(value.scope, scope))) {
          await safeRemove(storage, key, timeoutMs);
          return malformedMutations(
            "The stored offline mutation queue failed contract validation, so queued work was cleared instead of being replayed."
          );
        }
        return {
          status: "available",
          mutations: parsed.sort(compareMutations)
        };
      } catch {
        await safeRemove(storage, key, timeoutMs);
        return malformedMutations("The stored offline mutation queue was corrupt and was cleared instead of being replayed.");
      }
    },
    async putLocalMutation(mutation) {
      if (!isOfflineScheduleMutationRecord(mutation)) {
        return invalidWrite("mutation-invalid", "Refused to persist a malformed mobile offline mutation record.");
      }
      const loaded = await this.listLocalMutations(mutation.scope);
      if (loaded.status !== "available") {
        return {
          ok: false,
          reason: loaded.reason === "mutation-invalid" ? "mutation-invalid" : "repository-unavailable",
          detail: loaded.detail
        };
      }
      const nextMutations = upsertMutation(loaded.mutations, mutation);
      return writeMutationQueue(storage, mutation.scope, nextMutations, timeoutMs);
    },
    async deleteLocalMutation(scope, mutationId) {
      if (!isOfflineScheduleScope(scope) || !isNonEmptyString(mutationId)) {
        return invalidWrite("mutation-invalid", "Refused to delete a malformed mobile offline mutation reference.");
      }
      const loaded = await this.listLocalMutations(scope);
      if (loaded.status !== "available") {
        return {
          ok: false,
          reason: loaded.reason === "mutation-invalid" ? "mutation-invalid" : "repository-unavailable",
          detail: loaded.detail
        };
      }
      const nextMutations = loaded.mutations.filter((mutation) => mutation.id !== mutationId);
      return writeMutationQueue(storage, scope, nextMutations, timeoutMs);
    },
    async clearLocalMutations(scope) {
      if (!isOfflineScheduleScope(scope)) {
        return invalidWrite("mutation-invalid", "Refused to clear a malformed mobile offline mutation scope.");
      }
      try {
        await withTimeout(storage.remove(buildMutationQueueKey(scope)), timeoutMs, "Clearing the offline mutation queue timed out.");
        return { ok: true };
      } catch (error) {
        return unavailableWrite("repository-unavailable", error, "Clearing the mobile offline mutation queue failed.");
      }
    },
    async listTrustedWeekSnapshots(params) {
      if (!isNonEmptyString(params.userId) || !isNonEmptyString(params.calendarId)) {
        return {
          status: "unavailable",
          reason: "repository-unavailable",
          detail: "The requested trusted week enumeration scope was malformed, so reminder resync failed closed."
        };
      }
      let keys;
      try {
        keys = await withTimeout(storage.keys(), timeoutMs, "Listing stored mobile week metadata timed out during reminder resync.");
      } catch (error) {
        return {
          status: "unavailable",
          reason: "repository-unavailable",
          detail: error instanceof Error ? error.message : "Listing stored mobile week metadata failed during reminder resync."
        };
      }
      const metadataKeys = keys.filter((key) => key.startsWith(buildWeekMetadataPrefix(params.userId, params.calendarId)));
      const metadataEntries = [];
      const snapshots = [];
      let discardedWeekCount = 0;
      for (const key of metadataKeys.sort()) {
        let raw;
        try {
          raw = await withTimeout(storage.get(key), timeoutMs, "Reading stored mobile week metadata timed out during reminder resync.");
        } catch (error) {
          return {
            status: "unavailable",
            reason: "repository-unavailable",
            detail: error instanceof Error ? error.message : "Reading stored mobile week metadata failed during reminder resync."
          };
        }
        if (!raw) {
          discardedWeekCount += 1;
          await safeRemove(storage, key, timeoutMs);
          continue;
        }
        let parsed = null;
        try {
          const candidate = JSON.parse(raw);
          if (isMobileOfflineWeekMetadata(candidate) && candidate.userId === params.userId && candidate.calendarId === params.calendarId) {
            parsed = candidate;
          }
        } catch {
          parsed = null;
        }
        if (!parsed) {
          discardedWeekCount += 1;
          await safeRemove(storage, key, timeoutMs);
          continue;
        }
        metadataEntries.push(parsed);
        const snapshotScope = {
          userId: parsed.userId,
          calendarId: parsed.calendarId,
          weekStart: parsed.weekStart
        };
        const snapshotResult = await repository.getWeekSnapshot(snapshotScope);
        if (snapshotResult.status === "available") {
          snapshots.push(snapshotResult.snapshot);
          continue;
        }
        if (snapshotResult.status === "missing" || snapshotResult.status === "malformed") {
          discardedWeekCount += 1;
          await safeRemove(storage, key, timeoutMs);
          continue;
        }
        return {
          status: "unavailable",
          reason: "repository-unavailable",
          detail: snapshotResult.detail
        };
      }
      metadataEntries.sort((left, right) => left.weekStart.localeCompare(right.weekStart) || left.syncedAt.localeCompare(right.syncedAt));
      snapshots.sort((left, right) => {
        return left.scope.weekStart.localeCompare(right.scope.weekStart) || left.cachedAt.localeCompare(right.cachedAt) || left.scope.calendarId.localeCompare(right.scope.calendarId);
      });
      return {
        status: "available",
        metadata: metadataEntries,
        snapshots,
        discardedWeekCount
      };
    },
    async close() {
      state = null;
    }
  };
  return repository;
}
createMobileOfflineRepository();
async function hasSyncedCalendarContinuity(params, options = {}) {
  if (!isNonEmptyString(params.userId) || !isNonEmptyString(params.calendarId)) {
    return {
      ok: false,
      detail: "The requested mobile continuity scope was malformed, so cached calendar reopen failed closed."
    };
  }
  const storage = options.storage ?? defaultStorage;
  const timeoutMs = options.timeoutMs ?? STORAGE_TIMEOUT_MS;
  const prefix = buildWeekMetadataPrefix(params.userId, params.calendarId);
  let keys;
  try {
    keys = await withTimeout(storage.keys(), timeoutMs, "Listing stored mobile week continuity keys timed out.");
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : "Listing stored mobile week continuity keys failed."
    };
  }
  const candidateKeys = keys.filter((key) => key.startsWith(prefix));
  if (candidateKeys.length === 0) {
    return {
      ok: true,
      hasWeek: false,
      latestSyncedAt: null
    };
  }
  let latestSyncedAt = null;
  for (const key of candidateKeys) {
    try {
      const raw = await withTimeout(storage.get(key), timeoutMs, "Reading stored mobile week continuity metadata timed out.");
      if (!raw) {
        continue;
      }
      const parsed = JSON.parse(raw);
      if (!isMobileOfflineWeekMetadata(parsed)) {
        await safeRemove(storage, key, timeoutMs);
        continue;
      }
      if (parsed.syncedAt > (latestSyncedAt ?? "")) {
        latestSyncedAt = parsed.syncedAt;
      }
    } catch (error) {
      return {
        ok: false,
        detail: error instanceof Error ? error.message : "Reading stored mobile week continuity metadata failed."
      };
    }
  }
  return {
    ok: true,
    hasWeek: latestSyncedAt !== null,
    latestSyncedAt
  };
}
async function clearMobileContinuityRepository(options = {}) {
  const storage = options.storage ?? defaultStorage;
  const timeoutMs = options.timeoutMs ?? STORAGE_TIMEOUT_MS;
  let keys;
  try {
    keys = await withTimeout(storage.keys(), timeoutMs, "Listing mobile continuity keys timed out during clear.");
  } catch {
    return;
  }
  const removable = keys.filter(
    (key) => key.startsWith(WEEK_METADATA_PREFIX) || key.startsWith(WEEK_SNAPSHOT_PREFIX) || key.startsWith(MUTATION_QUEUE_PREFIX)
  );
  await Promise.all(removable.map((key) => safeRemove(storage, key, timeoutMs)));
}
function buildWeekSnapshotKey(scope) {
  return `${WEEK_SNAPSHOT_PREFIX}:${scope.userId}:${scope.calendarId}:${scope.weekStart}`;
}
function buildWeekMetadataPrefix(userId, calendarId) {
  return `${WEEK_METADATA_PREFIX}:${userId}:${calendarId}:`;
}
function buildWeekMetadataKey(scope) {
  return `${WEEK_METADATA_PREFIX}:${scope.userId}:${scope.calendarId}:${scope.weekStart}`;
}
function buildMutationQueueKey(scope) {
  return `${MUTATION_QUEUE_PREFIX}:${scope.userId}:${scope.calendarId}:${scope.weekStart}`;
}
function compareMutations(left, right) {
  return left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
}
function upsertMutation(mutations, nextMutation) {
  const next = mutations.filter((mutation) => mutation.id !== nextMutation.id);
  next.push(nextMutation);
  return next.sort(compareMutations);
}
async function writeMutationQueue(storage, scope, mutations, timeoutMs) {
  try {
    const key = buildMutationQueueKey(scope);
    if (mutations.length === 0) {
      await withTimeout(storage.remove(key), timeoutMs, "Clearing the offline mutation queue timed out.");
      return { ok: true };
    }
    const raw = JSON.stringify(mutations);
    const existing = await withTimeout(storage.get(key), timeoutMs, "Reading the stored offline mutation queue timed out.");
    if (existing !== raw) {
      await withTimeout(storage.set(key, raw), timeoutMs, "Persisting the offline mutation queue timed out.");
    }
    return { ok: true };
  } catch (error) {
    return unavailableWrite("repository-unavailable", error, "Persisting the mobile offline mutation queue failed.");
  }
}
function sameScope(left, right) {
  return left.userId === right.userId && left.calendarId === right.calendarId && left.weekStart === right.weekStart;
}
function malformedWeek(detail) {
  return {
    status: "malformed",
    reason: "snapshot-invalid",
    detail
  };
}
function unavailableWeek(error) {
  return {
    status: "unavailable",
    reason: "repository-unavailable",
    detail: error instanceof Error ? error.message : "Reading the mobile offline week snapshot failed."
  };
}
function malformedMutations(detail) {
  return {
    status: "malformed",
    reason: "mutation-invalid",
    detail
  };
}
function unavailableMutations(error) {
  return {
    status: "unavailable",
    reason: "repository-unavailable",
    detail: error instanceof Error ? error.message : "Reading the mobile offline mutation queue failed."
  };
}
function invalidWrite(reason, detail) {
  return {
    ok: false,
    reason,
    detail
  };
}
function unavailableWrite(reason, error, fallback) {
  return {
    ok: false,
    reason,
    detail: error instanceof Error ? error.message : fallback
  };
}
async function safeRemove(storage, key, timeoutMs) {
  try {
    await withTimeout(storage.remove(key), timeoutMs, "Removing malformed mobile offline persistence timed out.");
  } catch {
  }
}
function isTimeoutError(error) {
  return error instanceof Error && /timed out/i.test(error.message);
}
function isOfflineScheduleScope(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value;
  return isNonEmptyString(candidate.userId) && isNonEmptyString(candidate.calendarId) && /^\d{4}-\d{2}-\d{2}$/.test(candidate.weekStart ?? "");
}
function isOfflineScheduleWeekSnapshot(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value;
  return isOfflineScheduleScope(candidate.scope) && isVisibleWeek(candidate.visibleWeek) && Array.isArray(candidate.shifts) && candidate.shifts.every(isCalendarShift) && isIsoTimestamp(candidate.cachedAt) && (candidate.origin === "server-sync" || candidate.origin === "local-write");
}
function isOfflineScheduleMutationRecord(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value;
  return isNonEmptyString(candidate.id) && isOfflineScheduleScope(candidate.scope) && (candidate.action === "create" || candidate.action === "edit" || candidate.action === "move" || candidate.action === "delete") && (candidate.shiftId === null || isNonEmptyString(candidate.shiftId)) && isPlainObject(candidate.payload) && isIsoTimestamp(candidate.createdAt);
}
function isMobileOfflineWeekMetadata(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value;
  return isNonEmptyString(candidate.userId) && isNonEmptyString(candidate.calendarId) && /^\d{4}-\d{2}-\d{2}$/.test(candidate.weekStart ?? "") && isIsoTimestamp(candidate.syncedAt) && (candidate.source === "trusted-online" || candidate.source === "server-sync" || candidate.source === "local-write");
}
function isVisibleWeek(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value;
  return /^\d{4}-\d{2}-\d{2}$/.test(String(candidate.start ?? "")) && /^\d{4}-\d{2}-\d{2}$/.test(String(candidate.endExclusive ?? "")) && isIsoTimestamp(candidate.startAt) && isIsoTimestamp(candidate.endAt) && (candidate.requestedStart === null || candidate.requestedStart === void 0 || /^\d{4}-\d{2}-\d{2}$/.test(String(candidate.requestedStart))) && (candidate.source === "query" || candidate.source === "default" || candidate.source === "fallback-invalid") && (candidate.reason === null || candidate.reason === "VISIBLE_WEEK_START_INVALID") && Array.isArray(candidate.dayKeys) && candidate.dayKeys.every((dayKey) => /^\d{4}-\d{2}-\d{2}$/.test(String(dayKey)));
}
function isCalendarShift(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value;
  return isNonEmptyString(candidate.id) && isNonEmptyString(candidate.calendarId) && typeof candidate.title === "string" && isIsoTimestamp(candidate.startAt) && isIsoTimestamp(candidate.endAt) && (candidate.seriesId === null || typeof candidate.seriesId === "string") && (candidate.occurrenceIndex === null || typeof candidate.occurrenceIndex === "number") && (candidate.sourceKind === "single" || candidate.sourceKind === "series");
}
function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function isIsoTimestamp(value) {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}
function withTimeout(promise, timeoutMs, detail) {
  let timer;
  const settled = Promise.resolve(promise);
  return Promise.race([
    settled.finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    }),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(detail)), timeoutMs);
    })
  ]);
}
export {
  clearMobileContinuityRepository as c,
  hasSyncedCalendarContinuity as h
};
