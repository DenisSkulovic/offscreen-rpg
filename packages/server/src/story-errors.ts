import { z } from 'zod';

export class StoryError extends Error {
  constructor(readonly code: 'invalid' | 'not_found' | 'conflict') {
    super(code);
  }
}

export function parseStoryIdentifier(value: unknown) {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) {
    throw new StoryError('invalid');
  }
  return parsed.data;
}
