import type { Database } from '../database';

export type Transaction = Parameters<
  Parameters<Database['db']['transaction']>[0]
>[0];