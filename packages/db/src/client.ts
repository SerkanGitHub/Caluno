export type Database = unknown;

export function getDb(): Database {
  throw new Error('Database client is not configured yet in this starter workspace.');
}
