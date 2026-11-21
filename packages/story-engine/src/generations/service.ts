import { isDeepStrictEqual } from 'node:util';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';

export type Transaction = Parameters<
  Parameters<Database['db']['transaction']>[0]
>[0];
export class GenerationError extends Error {
  constructor(
    public readonly code: 'invalid' | 'not_found' | 'conflict' | 'busy',
  ) {
    super(code);
  }
}

export function validId(value: unknown): string {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) throw new GenerationError('invalid');
  return parsed.data;
}

/** Server-only operations. Callers supply a verified owner, never model arguments. */
export function createGenerations<I, O>(
  database: Database,
  definition: {
    kind: string;
    input: z.ZodType<I>;
    output: z.ZodType<O>;
  },
) {
  const owned = (owner: string, id: string) =>
    and(
      eq(generation.id, validId(id)),
      eq(generation.ownerId, owner),
      eq(generation.kind, definition.kind),
    );
  const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
    const result = schema.safeParse(value);
    if (!result.success) throw new GenerationError('invalid');
    return result.data;
  };
  const present = (row: typeof generation.$inferSelect) => ({
    id: row.id,
    state: row.state,
    attemptId: row.attemptId,
    input: parse(definition.input, row.input),
    output:
      row.state === 'succeeded' ? parse(definition.output, row.output) : null,
    failureCode: row.failureCode,
  });
  async function find(tx: Transaction, owner: string, id: string) {
    const [row] = await tx
      .select()
      .from(generation)
      .where(owned(owner, id))
      .for('update');
    if (!row) throw new GenerationError('not_found');
    return row;
  }
  return {
    // Allows a domain module to save its source link in the same transaction.
    async insert(tx: Transaction, owner: string, id: string, input: I) {
      const checked = parse(definition.input, input);
      const [row] = await tx
        .insert(generation)
        .values({
          id: validId(id),
          ownerId: owner,
          kind: definition.kind,
          input: checked,
        })
        .onConflictDoNothing()
        .returning();
      if (row) return present(row);
      const existing = await find(tx, owner, id);
      if (!isDeepStrictEqual(existing.input, checked))
        throw new GenerationError('conflict');
      return present(existing);
    },
    async read(owner: string, id: string) {
      const [row] = await database.db
        .select()
        .from(generation)
        .where(owned(owner, id));
      if (!row) throw new GenerationError('not_found');
      return present(row);
    },
    async claim(owner: string, id: string, attemptId: string) {
      validId(attemptId);
      return database.db.transaction(async (tx) => {
        const row = await find(tx, owner, id);
        if (row.state !== 'pending') return { claimed: false as const };
        await tx
          .update(generation)
          .set({
            state: 'running',
            attemptId,
            updatedAt: sql`clock_timestamp()`,
          })
          .where(owned(owner, id));
        return {
          claimed: true as const,
          input: parse(definition.input, row.input),
        };
      });
    },
    async settle(
      owner: string,
      id: string,
      attemptId: string,
      outcome:
        | { state: 'succeeded'; output: O }
        | { state: 'failed'; failureCode: string }
        | { state: 'uncertain' },
    ) {
      validId(attemptId);
      const output =
        outcome.state === 'succeeded'
          ? parse(definition.output, outcome.output)
          : null;
      const failureCode =
        outcome.state === 'failed'
          ? parse(
              z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),
              outcome.failureCode,
            )
          : null;
      return database.db.transaction(async (tx) => {
        const row = await find(tx, owner, id);
        if (row.attemptId !== attemptId) throw new GenerationError('conflict');
        if (
          row.state === outcome.state &&
          isDeepStrictEqual(row.output, output) &&
          row.failureCode === failureCode
        )
          return present(row);
        if (row.state !== 'running' && row.state !== 'uncertain')
          throw new GenerationError('conflict');
        const [saved] = await tx
          .update(generation)
          .set({
            state: outcome.state,
            output,
            failureCode,
            updatedAt: sql`clock_timestamp()`,
          })
          .where(owned(owner, id))
          .returning();
        return present(saved!);
      });
    },
  };
}
