import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { NodePgTransaction } from 'drizzle-orm/node-postgres';

type FullSchema = Record<string, never>;
type Schema = ExtractTablesWithRelations<FullSchema>;

/** Same Drizzle handle shape as `Database['db']['transaction']` callbacks. */
export type Transaction = NodePgTransaction<FullSchema, Schema>;
