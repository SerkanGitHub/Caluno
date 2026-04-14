export function tenantDb<T>(db: T, tenantId: string) {
  if (!tenantId) {
    throw new Error('tenantId is required');
  }

  return {
    db,
    tenantId
  };
}
import { and, eq, type SQL } from 'drizzle-orm';
import type { PgTable, TableConfig } from 'drizzle-orm/pg-core';
import type { Database } from './client.js';

/**
 * A table that has a tenant_id column.
 * Used to constrain the tenant-scoped helpers to only work with tenant-aware tables.
 */
type TenantTable = PgTable<TableConfig> & {
	tenantId: PgTable<TableConfig>['_']['columns'][string];
};

/**
 * A tenant table that also has an `id` column.
 * Required for update/delete operations that target a specific row by primary key.
 */
type TenantTableWithId = TenantTable & {
	id: PgTable<TableConfig>['_']['columns'][string];
};

/**
 * Create tenant-scoped query helpers.
 *
 * This is the "boring but correct" approach — explicit tenant_id
 * in every operation, no Proxy magic, no hidden middleware.
 *
 * @example
 * ```ts
 * const t = tenantDb(db, tenantId);
 *
 * // SELECT — auto-filtered by tenant_id
 * const rows = await t.query(services);
 * const filtered = await t.query(services, eq(services.active, true));
 *
 * // INSERT — auto-injects tenant_id
 * await t.insert(services, { name: 'Haircut', durationMinutes: 30, price: 2500 });
 * ```
 */
export function tenantDb(db: Database, tenantId: string) {
	if (!tenantId) {
		throw new Error('tenantDb: tenantId is required and cannot be empty');
	}

	return {
		/**
		 * SELECT from a tenant-scoped table.
		 * Automatically adds `WHERE tenant_id = ?`.
		 * Pass additional conditions to further filter.
		 */
		query<T extends TenantTable>(table: T, ...conditions: SQL[]) {
			const tenantCondition = eq(table.tenantId, tenantId);
			const allConditions =
				conditions.length > 0
					? and(tenantCondition, ...conditions)!
					: tenantCondition;

			return db.select().from(table).where(allConditions) as Promise<T['$inferSelect'][]>;
		},

		/**
		 * INSERT into a tenant-scoped table.
		 * Automatically injects `tenant_id` into the data.
		 */
		insert<T extends TenantTable>(
			table: T,
			data: Omit<T['$inferInsert'], 'tenantId' | 'id'>
		) {
			const withTenant = { ...data, tenantId } as T['$inferInsert'];
			return db.insert(table).values(withTenant).returning();
		},

		/**
		 * UPDATE a row in a tenant-scoped table by id.
		 * Automatically adds `WHERE tenant_id = ? AND id = ?`.
		 * Returns the array of affected rows — empty array means the id
		 * doesn't exist for this tenant (observable 404 signal).
		 */
		update<T extends TenantTableWithId>(
			table: T,
			id: string,
			data: Partial<Omit<T['$inferInsert'], 'tenantId' | 'id'>>
		) {
			return db
				.update(table)
				.set(data as T['$inferInsert'])
				.where(and(eq(table.tenantId, tenantId), eq(table.id, id)))
				.returning();
		},

		/**
		 * DELETE a row from a tenant-scoped table by id.
		 * Automatically adds `WHERE tenant_id = ? AND id = ?`.
		 * Returns the array of deleted rows — empty array means the id
		 * doesn't exist for this tenant (observable 404 signal).
		 */
		delete<T extends TenantTableWithId>(table: T, id: string) {
			return db
				.delete(table)
				.where(and(eq(table.tenantId, tenantId), eq(table.id, id)))
				.returning();
		},

		/**
		 * Build a tenant-scoped equality condition.
		 * Useful when composing complex queries manually.
		 */
		whereEq<T extends TenantTable>(table: T) {
			return eq(table.tenantId, tenantId);
		},

		/** The raw tenantId for logging / debugging. */
		tenantId
	};
}

export type TenantDb = ReturnType<typeof tenantDb>;
