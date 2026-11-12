import { describe, expect, it } from 'vitest';
import { classifyNestStatus } from './classify-nest-status';

describe('classifyNestStatus', () => {
  it('classifies success statuses', () => {
    expect(classifyNestStatus(200)).toEqual({ kind: 'success' });
    expect(classifyNestStatus(202)).toEqual({ kind: 'success' });
  });

  it('classifies unauthorized', () => {
    expect(classifyNestStatus(401)).toEqual({ kind: 'unauthorized' });
  });

  it('classifies not_found', () => {
    expect(classifyNestStatus(404)).toEqual({ kind: 'not_found' });
  });

  it('keeps 503 distinct from not_found (negative)', () => {
    expect(classifyNestStatus(503)).toEqual({
      kind: 'transient',
      status: 503,
    });
    expect(classifyNestStatus(503).kind).not.toBe('not_found');
  });

  it('treats other non-success as transient', () => {
    expect(classifyNestStatus(429)).toEqual({ kind: 'transient', status: 429 });
    expect(classifyNestStatus(500)).toEqual({ kind: 'transient', status: 500 });
  });
});
