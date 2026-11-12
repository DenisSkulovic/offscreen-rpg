import { afterEach, describe, expect, it, vi } from 'vitest';
import { NestTransientError } from './nest-errors';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('nestFetch', () => {
  it('surfaces transport failure as NestTransientError, not not_found', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    const { nestFetch } = await import('./nest-reader');
    const error = await nestFetch({ cookie: 'session=1' }, '/api/stories').catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(NestTransientError);
    expect(error).toMatchObject({ status: 0, kind: 'transient' });
  });
});

describe('applyNestRoutePolicy', () => {
  it('redirects on 401 and notFounds on 404; 503 stays transient (negative)', async () => {
    const { redirect, notFound } = await import('next/navigation');
    const { applyNestRoutePolicy } = await import('./nest-reader');

    expect(() => applyNestRoutePolicy(401)).toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/sign-in');

    expect(() => applyNestRoutePolicy(404)).toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();

    expect(() => applyNestRoutePolicy(503)).toThrow(NestTransientError);
    try {
      applyNestRoutePolicy(503);
    } catch (error) {
      expect(error).toMatchObject({ kind: 'transient', status: 503 });
    }
  });
});
