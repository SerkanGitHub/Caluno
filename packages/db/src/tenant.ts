export type ScopeRecord<TKey extends string = string> = Record<TKey, string>;

export type ScopedDb<TDb, TKey extends string = string> = {
  db: TDb;
  scopeKey: TKey;
  scopeId: string;
  attach<TRecord extends Record<string, unknown>>(record: TRecord): TRecord & Record<TKey, string>;
  canAccess(record: Record<TKey, string>): boolean;
  assertAccess(record: Record<TKey, string>): void;
};

function assertScopeKey(scopeKey: string): string {
  const normalizedScopeKey = scopeKey.trim();

  if (!normalizedScopeKey) {
    throw new Error('scopedDb: scopeKey is required and cannot be empty');
  }

  return normalizedScopeKey;
}

function assertScopeId(scopeId: string): string {
  const normalizedScopeId = scopeId.trim();

  if (!normalizedScopeId) {
    throw new Error('scopedDb: scopeId is required and cannot be empty');
  }

  return normalizedScopeId;
}

export function scopedDb<TDb, TKey extends string>(
  db: TDb,
  scopeKey: TKey,
  scopeId: string
): ScopedDb<TDb, TKey> {
  const normalizedScopeKey = assertScopeKey(scopeKey) as TKey;
  const normalizedScopeId = assertScopeId(scopeId);

  return {
    db,
    scopeKey: normalizedScopeKey,
    scopeId: normalizedScopeId,
    attach<TRecord extends Record<string, unknown>>(record: TRecord) {
      return {
        ...record,
        [normalizedScopeKey]: normalizedScopeId
      } as TRecord & Record<TKey, string>;
    },
    canAccess(record) {
      return record[normalizedScopeKey] === normalizedScopeId;
    },
    assertAccess(record) {
      if (record[normalizedScopeKey] !== normalizedScopeId) {
        throw new Error(
          `scopedDb: expected ${normalizedScopeKey}=${normalizedScopeId} but received ${record[normalizedScopeKey]}`
        );
      }
    }
  };
}

export type TenantScopedRecord = ScopeRecord<'tenantId'>;
export type TenantScope<TDb> = ScopedDb<TDb, 'tenantId'>;

export function tenantDb<TDb>(db: TDb, tenantId: string): TenantScope<TDb> {
  return scopedDb(db, 'tenantId', tenantId);
}

export type TenantDb<TDb = unknown> = ReturnType<typeof tenantDb<TDb>>;
