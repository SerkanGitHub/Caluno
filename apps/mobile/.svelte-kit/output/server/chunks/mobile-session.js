import { g as get, w as writable } from "./index.js";
import { Preferences } from "@capacitor/preferences";
import "@supabase/ssr";
const APP_SHELL_CACHE_STORAGE_KEY = "caluno.offline.app-shell.v1";
const APP_SHELL_CACHE_VERSION = 1;
function readCachedAppShellSnapshot(params = {}) {
  const storage = params.storage ?? resolveStorageLike();
  if (!storage) {
    return unavailable(
      "storage-unavailable",
      "Browser-local storage is unavailable, so offline continuity stayed disabled."
    );
  }
  const raw = storage.getItem(APP_SHELL_CACHE_STORAGE_KEY);
  if (!raw) {
    return unavailable("cache-missing", "No trusted app-shell continuity snapshot has been stored on this browser yet.");
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    storage.removeItem(APP_SHELL_CACHE_STORAGE_KEY);
    return unavailable("cache-parse-failed", "The cached app-shell snapshot was corrupt and was cleared instead of being trusted.");
  }
  if (!isCachedAppShellSnapshot(parsed)) {
    storage.removeItem(APP_SHELL_CACHE_STORAGE_KEY);
    return unavailable(
      "cache-contract-invalid",
      "The cached app-shell snapshot failed contract validation and was cleared instead of widening offline scope."
    );
  }
  const snapshot = parsed;
  const nowMs = (params.now ?? /* @__PURE__ */ new Date()).getTime();
  if (snapshot.session.expiresAtMs <= nowMs) {
    return unavailable("session-stale", "The cached continuity session expired, so offline continuity failed closed.");
  }
  if (params.expectedUserId && snapshot.session.userId !== params.expectedUserId) {
    return unavailable(
      "session-user-mismatch",
      "The cached continuity session belongs to a different user, so the cached shell was not trusted."
    );
  }
  const requestedCalendar = params.calendarId ? snapshot.calendars.find((calendar) => calendar.id === params.calendarId) ?? null : null;
  if (params.calendarId && !requestedCalendar) {
    return unavailable(
      "calendar-not-synced",
      "That calendar id was never synced into the trusted browser-local scope, so offline continuity failed closed."
    );
  }
  const requestedGroup = requestedCalendar ? snapshot.groups.find((group) => group.id === requestedCalendar.groupId) ?? null : null;
  return {
    status: "available",
    snapshot,
    requestedCalendar,
    requestedGroup
  };
}
function resolveStorageLike() {
  const candidate = globalThis.localStorage;
  if (!candidate) {
    return null;
  }
  return candidate;
}
function isCachedAppShellSnapshot(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value;
  if (candidate.version !== APP_SHELL_CACHE_VERSION) {
    return false;
  }
  if (!isViewerSummary(candidate.viewer) || !isCachedSessionContinuity(candidate.session)) {
    return false;
  }
  if (!Array.isArray(candidate.groups) || !candidate.groups.every(isCachedGroupScope)) {
    return false;
  }
  if (!Array.isArray(candidate.calendars) || !candidate.calendars.every(isCachedCalendarScope)) {
    return false;
  }
  if (candidate.primaryCalendarId !== null && typeof candidate.primaryCalendarId !== "string") {
    return false;
  }
  if (candidate.onboardingState !== "needs-group" && candidate.onboardingState !== "ready") {
    return false;
  }
  if (!isIsoTimestamp$1(candidate.refreshedAt)) {
    return false;
  }
  const calendarIds = new Set(candidate.calendars.map((calendar) => calendar.id));
  for (const group of candidate.groups) {
    if (!group.calendarIds.every((calendarId) => calendarIds.has(calendarId))) {
      return false;
    }
  }
  if (candidate.primaryCalendarId && !calendarIds.has(candidate.primaryCalendarId)) {
    return false;
  }
  return candidate.session.userId === candidate.viewer.id;
}
function unavailable(reason, detail) {
  return {
    status: "unavailable",
    reason,
    detail
  };
}
function isCachedSessionContinuity(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value;
  return isNonEmptyString$1(candidate.userId) && isNonEmptyString$1(candidate.email) && isNonEmptyString$1(candidate.displayName) && typeof candidate.expiresAtMs === "number" && Number.isFinite(candidate.expiresAtMs) && isIsoTimestamp$1(candidate.refreshedAt);
}
function isCachedCalendarScope(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value;
  return isNonEmptyString$1(candidate.id) && isNonEmptyString$1(candidate.groupId) && isNonEmptyString$1(candidate.name) && typeof candidate.isDefault === "boolean";
}
function isCachedGroupScope(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value;
  return isNonEmptyString$1(candidate.id) && isNonEmptyString$1(candidate.name) && (candidate.role === "owner" || candidate.role === "member") && Array.isArray(candidate.calendarIds) && candidate.calendarIds.every(isNonEmptyString$1);
}
function isViewerSummary(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value;
  return isNonEmptyString$1(candidate.id) && isNonEmptyString$1(candidate.email) && isNonEmptyString$1(candidate.displayName);
}
function isNonEmptyString$1(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function isIsoTimestamp$1(value) {
  return isNonEmptyString$1(value) && !Number.isNaN(Date.parse(value));
}
const MOBILE_CONTINUITY_TIMEOUT_MS = 750;
const defaultStorage$1 = {
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
async function readMobileCachedAppShellSnapshot(params = {}) {
  const storage = params.storage ?? defaultStorage$1;
  const timeoutMs = params.timeoutMs ?? MOBILE_CONTINUITY_TIMEOUT_MS;
  let raw;
  try {
    raw = await withTimeout$2(
      storage.get(APP_SHELL_CACHE_STORAGE_KEY),
      timeoutMs,
      "Reading the device continuity snapshot timed out, so cached mobile reopen stayed disabled."
    );
  } catch (error) {
    return unavailableFromStorageError(error, "Reading the device continuity snapshot failed, so cached mobile reopen stayed disabled.");
  }
  const memoryStorage = createSingleKeyStorage(APP_SHELL_CACHE_STORAGE_KEY, raw);
  const lookup = readCachedAppShellSnapshot({
    storage: memoryStorage,
    expectedUserId: params.expectedUserId,
    calendarId: params.calendarId,
    now: params.now
  });
  const nextRaw = memoryStorage.getItem(APP_SHELL_CACHE_STORAGE_KEY);
  if (raw !== nextRaw) {
    try {
      if (nextRaw === null) {
        await withTimeout$2(
          storage.remove(APP_SHELL_CACHE_STORAGE_KEY),
          timeoutMs,
          "Clearing the corrupt device continuity snapshot timed out, so cached mobile reopen stayed disabled."
        );
      } else {
        await withTimeout$2(
          storage.set(APP_SHELL_CACHE_STORAGE_KEY, nextRaw),
          timeoutMs,
          "Refreshing the repaired device continuity snapshot timed out, so cached mobile reopen stayed disabled."
        );
      }
    } catch {
    }
  }
  if (lookup.status === "available") {
    return lookup;
  }
  return lookup;
}
async function clearMobileCachedAppShellSnapshot(params = {}) {
  const storage = params.storage ?? defaultStorage$1;
  const timeoutMs = params.timeoutMs ?? MOBILE_CONTINUITY_TIMEOUT_MS;
  try {
    await withTimeout$2(
      storage.remove(APP_SHELL_CACHE_STORAGE_KEY),
      timeoutMs,
      "Clearing the device continuity snapshot timed out."
    );
  } catch {
  }
}
function createSingleKeyStorage(key, initialValue) {
  let value = initialValue;
  return {
    getItem(requestedKey) {
      return requestedKey === key ? value : null;
    },
    setItem(requestedKey, nextValue) {
      if (requestedKey === key) {
        value = nextValue;
      }
    },
    removeItem(requestedKey) {
      if (requestedKey === key) {
        value = null;
      }
    }
  };
}
function snapshotContinuityUnavailable(reason, detail) {
  return {
    status: "unavailable",
    reason,
    detail
  };
}
function unavailableFromStorageError(error, fallbackDetail) {
  return snapshotContinuityUnavailable(resolveStorageErrorReason(error), error instanceof Error ? error.message : fallbackDetail);
}
function resolveStorageErrorReason(error) {
  if (error instanceof Error && /timed out/i.test(error.message)) {
    return "storage-timeout";
  }
  return "storage-unavailable";
}
function withTimeout$2(promise, timeoutMs, detail) {
  let timer;
  return Promise.race([
    promise.finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    }),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(detail)), timeoutMs);
    })
  ]);
}
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
      await withTimeout$1(storage.keys(), timeoutMs, "Reading mobile offline keys timed out during repository bootstrap.");
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
        reason: isTimeoutError$1(error) ? "repository-open-timeout" : "repository-open-failed",
        detail: error instanceof Error ? error.message : "Opening the mobile offline repository failed before device persistence could be inspected."
      };
      return state;
    }
  }
  return {
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
        raw = await withTimeout$1(storage.get(key), timeoutMs, "Reading the stored offline week snapshot timed out.");
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
        const existingRaw = await withTimeout$1(storage.get(key), timeoutMs, "Reading the stored offline week snapshot timed out.");
        if (existingRaw !== raw) {
          await withTimeout$1(storage.set(key, raw), timeoutMs, "Persisting the offline week snapshot timed out.");
        }
        const existingMetadata = await withTimeout$1(
          storage.get(metadataKey),
          timeoutMs,
          "Reading the stored offline week metadata timed out."
        );
        if (existingMetadata !== metadata) {
          await withTimeout$1(storage.set(metadataKey, metadata), timeoutMs, "Persisting the offline week metadata timed out.");
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
        await withTimeout$1(storage.remove(buildWeekSnapshotKey(scope)), timeoutMs, "Deleting the offline week snapshot timed out.");
        await withTimeout$1(storage.remove(buildWeekMetadataKey(scope)), timeoutMs, "Deleting the offline week metadata timed out.");
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
        raw = await withTimeout$1(storage.get(key), timeoutMs, "Reading the stored offline mutation queue timed out.");
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
        await withTimeout$1(storage.remove(buildMutationQueueKey(scope)), timeoutMs, "Clearing the offline mutation queue timed out.");
        return { ok: true };
      } catch (error) {
        return unavailableWrite("repository-unavailable", error, "Clearing the mobile offline mutation queue failed.");
      }
    },
    async close() {
      state = null;
    }
  };
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
    keys = await withTimeout$1(storage.keys(), timeoutMs, "Listing stored mobile week continuity keys timed out.");
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
      const raw = await withTimeout$1(storage.get(key), timeoutMs, "Reading stored mobile week continuity metadata timed out.");
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
    keys = await withTimeout$1(storage.keys(), timeoutMs, "Listing mobile continuity keys timed out during clear.");
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
      await withTimeout$1(storage.remove(key), timeoutMs, "Clearing the offline mutation queue timed out.");
      return { ok: true };
    }
    const raw = JSON.stringify(mutations);
    const existing = await withTimeout$1(storage.get(key), timeoutMs, "Reading the stored offline mutation queue timed out.");
    if (existing !== raw) {
      await withTimeout$1(storage.set(key, raw), timeoutMs, "Persisting the offline mutation queue timed out.");
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
    await withTimeout$1(storage.remove(key), timeoutMs, "Removing malformed mobile offline persistence timed out.");
  } catch {
  }
}
function isTimeoutError$1(error) {
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
function withTimeout$1(promise, timeoutMs, detail) {
  let timer;
  return Promise.race([
    promise.finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    }),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(detail)), timeoutMs);
    })
  ]);
}
function getSupabaseBrowserClient() {
  {
    throw new Error("getSupabaseBrowserClient() must only run in the browser.");
  }
}
const DEFAULT_SIGNED_OUT_DETAIL = "Sign in with your Caluno account before opening protected groups or calendars.";
function resolveDisplayName(user) {
  if (!user) {
    return null;
  }
  const metadata = user.user_metadata ?? {};
  const displayName = typeof metadata.display_name === "string" ? metadata.display_name.trim() : typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
  return displayName || user.email?.split("@")[0] || "Caluno member";
}
function withTimeout(promise, timeoutMs, error) {
  let timer;
  return Promise.race([
    promise.finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    }),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(error), timeoutMs);
    })
  ]);
}
function isMissingEnvError(error) {
  return error instanceof Error && error.message.includes("Missing required public Supabase env");
}
function isTimeoutError(error) {
  return error instanceof Error && /timeout/i.test(error.message);
}
function createSignedOutState(detail = DEFAULT_SIGNED_OUT_DETAIL) {
  return {
    phase: "signed-out",
    failurePhase: null,
    reasonCode: null,
    detail,
    retryable: false,
    session: null,
    user: null,
    displayName: null,
    lastValidatedAt: null
  };
}
function createBootstrappingState() {
  return {
    phase: "bootstrapping",
    failurePhase: "bootstrap",
    reasonCode: null,
    detail: "Validating any saved Supabase session before opening protected routes.",
    retryable: true,
    session: null,
    user: null,
    displayName: null,
    lastValidatedAt: null
  };
}
function createAuthenticatedState(session, user, now) {
  return {
    phase: "authenticated",
    failurePhase: null,
    reasonCode: null,
    detail: "This device holds a trusted session and can open protected mobile routes.",
    retryable: false,
    session,
    user,
    displayName: resolveDisplayName(user),
    lastValidatedAt: now.toISOString()
  };
}
function createInvalidSessionState() {
  return {
    phase: "invalid-session",
    failurePhase: "bootstrap",
    reasonCode: "INVALID_SESSION",
    detail: "The saved session failed trusted verification and was cleared locally before the mobile shell opened.",
    retryable: true,
    session: null,
    user: null,
    displayName: null,
    lastValidatedAt: null
  };
}
function createErrorState(params) {
  return {
    phase: "error",
    failurePhase: params.failurePhase,
    reasonCode: params.reasonCode,
    detail: params.detail,
    retryable: params.retryable,
    session: null,
    user: null,
    displayName: null,
    lastValidatedAt: null
  };
}
async function clearMobileContinuityState() {
  await Promise.all([clearMobileCachedAppShellSnapshot(), clearMobileContinuityRepository()]);
}
async function signOutLocally(client, clearContinuity) {
  await clearContinuity().catch(() => {
  });
  try {
    await client.auth.signOut();
  } catch {
  }
}
function createMobileSessionStore(dependencies = {}) {
  const timeoutMs = dependencies.timeoutMs ?? 5e3;
  const now = dependencies.now ?? (() => /* @__PURE__ */ new Date());
  const clientFactory = dependencies.clientFactory ?? getSupabaseBrowserClient;
  const clearContinuity = dependencies.clearContinuity ?? clearMobileContinuityState;
  const state = writable(createBootstrappingState());
  let client = null;
  let bootstrapPromise = null;
  let bootstrapped = false;
  let subscriptionCleanup = null;
  function setState(next) {
    state.set(next);
    return next;
  }
  function snapshot() {
    return get(state);
  }
  function getClient() {
    client ??= clientFactory();
    return client;
  }
  function ensureAuthListener() {
    if (subscriptionCleanup) {
      return;
    }
    const authClient = getClient();
    const {
      data: { subscription }
    } = authClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        void clearContinuity();
        setState(createSignedOutState("The session was cleared on this device. Sign in again to reopen protected routes."));
        return;
      }
      if ((event === "TOKEN_REFRESHED" || event === "USER_UPDATED") && session && snapshot().phase === "authenticated") {
        const currentUser = snapshot().user ?? session.user ?? null;
        if (currentUser) {
          setState(createAuthenticatedState(session, currentUser, now()));
        }
      }
    });
    subscriptionCleanup = () => {
      subscription.unsubscribe();
      subscriptionCleanup = null;
    };
  }
  async function bootstrap(options = {}) {
    if (bootstrapPromise) {
      return bootstrapPromise;
    }
    if (bootstrapped && !options.force) {
      return snapshot();
    }
    const task = (async () => {
      setState(createBootstrappingState());
      let authClient;
      try {
        authClient = getClient();
        ensureAuthListener();
      } catch (error) {
        bootstrapped = true;
        return setState(
          createErrorState({
            failurePhase: "config",
            reasonCode: "SUPABASE_ENV_MISSING",
            detail: error instanceof Error ? error.message : "Missing public Supabase configuration prevented mobile auth bootstrap.",
            retryable: false
          })
        );
      }
      try {
        const {
          data: { session }
        } = await withTimeout(
          authClient.auth.getSession(),
          timeoutMs,
          new Error("AUTH_BOOTSTRAP_TIMEOUT")
        );
        if (!session) {
          bootstrapped = true;
          return setState(createSignedOutState());
        }
        const {
          data: { user },
          error
        } = await withTimeout(
          authClient.auth.getUser(),
          timeoutMs,
          new Error("AUTH_BOOTSTRAP_TIMEOUT")
        );
        if (error || !user?.id || !user.email) {
          await signOutLocally(authClient, clearContinuity);
          bootstrapped = true;
          return setState(createInvalidSessionState());
        }
        bootstrapped = true;
        return setState(createAuthenticatedState(session, user, now()));
      } catch (error) {
        bootstrapped = true;
        if (isTimeoutError(error)) {
          return setState(
            createErrorState({
              failurePhase: "bootstrap",
              reasonCode: "AUTH_BOOTSTRAP_TIMEOUT",
              detail: "The saved session could not be revalidated in time, so the protected shell stayed closed. Retry when the auth service responds again.",
              retryable: true
            })
          );
        }
        if (isMissingEnvError(error)) {
          return setState(
            createErrorState({
              failurePhase: "config",
              reasonCode: "SUPABASE_ENV_MISSING",
              detail: error instanceof Error ? error.message : "Missing public Supabase configuration prevented mobile auth bootstrap.",
              retryable: false
            })
          );
        }
        return setState(
          createErrorState({
            failurePhase: "bootstrap",
            reasonCode: "AUTH_BOOTSTRAP_FAILED",
            detail: error instanceof Error ? error.message : "The saved session could not be verified, so Caluno kept the mobile shell closed.",
            retryable: true
          })
        );
      }
    })();
    bootstrapPromise = task.finally(() => {
      bootstrapPromise = null;
    });
    return bootstrapPromise;
  }
  async function signIn(credentials) {
    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password;
    if (!email || !password) {
      return setState(
        createErrorState({
          failurePhase: "sign-in",
          reasonCode: "SIGN_IN_FAILED",
          detail: "Enter both email and password before requesting a trusted session.",
          retryable: true
        })
      );
    }
    let authClient;
    try {
      authClient = getClient();
      ensureAuthListener();
    } catch (error) {
      return setState(
        createErrorState({
          failurePhase: "config",
          reasonCode: "SUPABASE_ENV_MISSING",
          detail: error instanceof Error ? error.message : "Missing public Supabase configuration prevented sign-in from starting.",
          retryable: false
        })
      );
    }
    setState(createBootstrappingState());
    try {
      const { data, error } = await withTimeout(
        authClient.auth.signInWithPassword({ email, password }),
        timeoutMs,
        new Error("SIGN_IN_TIMEOUT")
      );
      if (error) {
        return setState(
          createErrorState({
            failurePhase: "sign-in",
            reasonCode: /timeout/i.test(error.message) ? "SIGN_IN_TIMEOUT" : "SIGN_IN_FAILED",
            detail: /timeout/i.test(error.message) ? "The sign-in request timed out before the session could be verified. Retry in a moment." : "The supplied credentials were rejected. Check the email and password, then try again.",
            retryable: true
          })
        );
      }
      if (!data.session || !data.user) {
        await signOutLocally(authClient, clearContinuity);
        return setState(
          createErrorState({
            failurePhase: "sign-in",
            reasonCode: "CALLBACK_RESULT_INVALID",
            detail: "The auth service returned an incomplete session payload, so the mobile shell stayed signed out.",
            retryable: true
          })
        );
      }
      bootstrapped = true;
      return setState(createAuthenticatedState(data.session, data.user, now()));
    } catch (error) {
      return setState(
        createErrorState({
          failurePhase: "sign-in",
          reasonCode: isTimeoutError(error) ? "SIGN_IN_TIMEOUT" : "SIGN_IN_FAILED",
          detail: isTimeoutError(error) ? "The sign-in request timed out before the session could be verified. Retry in a moment." : error instanceof Error ? error.message : "The sign-in request failed before Caluno could establish a trusted session.",
          retryable: true
        })
      );
    }
  }
  async function signOut() {
    let authClient;
    try {
      authClient = getClient();
    } catch {
      await clearContinuity().catch(() => {
      });
      return setState(createSignedOutState("The local session state is already cleared on this device."));
    }
    setState(createBootstrappingState());
    try {
      const { error } = await withTimeout(
        authClient.auth.signOut(),
        timeoutMs,
        new Error("LOGOUT_TIMEOUT")
      );
      await clearContinuity().catch(() => {
      });
      if (error) {
        return setState(
          createErrorState({
            failurePhase: "sign-out",
            reasonCode: /timeout/i.test(error.message) ? "LOGOUT_TIMEOUT" : "LOGOUT_FAILED",
            detail: /timeout/i.test(error.message) ? "Sign-out timed out before the session could be cleared. Retry before reusing this device." : "Sign-out could not be confirmed. Retry before handing this device to someone else.",
            retryable: true
          })
        );
      }
      return setState(createSignedOutState("You are safely signed out on this device."));
    } catch (error) {
      await clearContinuity().catch(() => {
      });
      return setState(
        createErrorState({
          failurePhase: "sign-out",
          reasonCode: isTimeoutError(error) ? "LOGOUT_TIMEOUT" : "LOGOUT_FAILED",
          detail: isTimeoutError(error) ? "Sign-out timed out before the session could be cleared. Retry before reusing this device." : error instanceof Error ? error.message : "Sign-out could not be confirmed for this device.",
          retryable: true
        })
      );
    }
  }
  function reset(detail = DEFAULT_SIGNED_OUT_DETAIL) {
    return setState(createSignedOutState(detail));
  }
  function destroy() {
    subscriptionCleanup?.();
    client = null;
    bootstrapPromise = null;
    bootstrapped = false;
    setState(createBootstrappingState());
  }
  return {
    subscribe: state.subscribe,
    bootstrap,
    signIn,
    signOut,
    reset,
    snapshot,
    destroy
  };
}
const mobileSession = createMobileSessionStore();
function getMobileSessionSnapshot() {
  return mobileSession.snapshot();
}
export {
  getMobileSessionSnapshot as g,
  hasSyncedCalendarContinuity as h,
  mobileSession as m,
  readMobileCachedAppShellSnapshot as r
};
