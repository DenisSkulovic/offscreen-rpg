import { describe, expect, it } from 'vitest';
import { classifyNestStatus } from './classify-nest-status';

describe('server classifyNestStatus re-export', () => {
  it('keeps the shared taxonomy available to Nest readers', () => {
    expect(classifyNestStatus(503).kind).toBe('transient');
  });
});
