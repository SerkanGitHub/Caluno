export const DB_AUTHORITY_MESSAGE =
  'Database client is not configured in @repo/db. M001/S01 keeps schema, joins, and row-level access in Supabase SQL migrations and RPCs; this package only exposes compile-safe helpers until a shared client is intentionally introduced.';

export type DatabasePlaceholder = {
  readonly configured: false;
  readonly authority: 'supabase-sql';
  readonly scope: 'M001/S01';
};

export function getDb(): never {
  throw new Error(DB_AUTHORITY_MESSAGE);
}
