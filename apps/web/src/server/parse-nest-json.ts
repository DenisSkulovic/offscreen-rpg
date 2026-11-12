import type { ZodType } from 'zod';
import { NestProtocolError } from './nest-errors';

export async function parseNestJson<T>(
  response: Response,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await response.json();
  } catch (cause) {
    throw new NestProtocolError('Nest response was not JSON', { cause });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new NestProtocolError('Nest response failed schema validation', {
      cause: parsed.error,
    });
  }
  return parsed.data;
}
