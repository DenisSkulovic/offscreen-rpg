import { describe, expect, it } from 'vitest';
import { StorySnapshotReadError } from '@/src/lib/story-transport';
import { NestTransientError } from '@/src/server/nest-errors';
import { classifyReadRecovery, readRecoveryCopy } from './read-error';

describe('classifyReadRecovery', () => {
  it('keeps 503 distinct from not_found (negative)', () => {
    expect(classifyReadRecovery(new StorySnapshotReadError(503))).toEqual({
      kind: 'transient',
      status: 503,
    });
    expect(classifyReadRecovery(new NestTransientError(503)).kind).toBe(
      'transient',
    );
    expect(readRecoveryCopy('transient', 'story').title).toMatch(/Temporary/i);
    expect(readRecoveryCopy('transient', 'story').title).not.toMatch(
      /unavailable/i,
    );
  });

  it('maps 401 to sign-in without implying a command ran', () => {
    expect(classifyReadRecovery(new StorySnapshotReadError(401))).toEqual({
      kind: 'unauthorized',
      status: 401,
    });
    expect(readRecoveryCopy('unauthorized', 'story').body).toMatch(
      /No command was sent/i,
    );
  });

  it('maps 404 to owner-hidden not found', () => {
    expect(classifyReadRecovery(new StorySnapshotReadError(404))).toEqual({
      kind: 'not_found',
      status: 404,
    });
  });
});
