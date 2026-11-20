import { afterEach, describe, expect, it, vi } from 'vitest';
import { NestTransientError } from './nest-errors';

const LAB_NEST = 'http://game-api.lab-edge.svc.cluster.local:3001';

const previousInternal = process.env.API_INTERNAL_ORIGIN;
const previousProxy = process.env.API_PROXY_ORIGIN;
const previousHostname = process.env.HOSTNAME;

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
  if (previousInternal === undefined) delete process.env.API_INTERNAL_ORIGIN;
  else process.env.API_INTERNAL_ORIGIN = previousInternal;
  if (previousProxy === undefined) delete process.env.API_PROXY_ORIGIN;
  else process.env.API_PROXY_ORIGIN = previousProxy;
  if (previousHostname === undefined) delete process.env.HOSTNAME;
  else process.env.HOSTNAME = previousHostname;
});

describe('nestFetch', () => {
  it('refuses SSR fetch in release Pod when internal origin is loopback', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    process.env.HOSTNAME = '0.0.0.0';
    process.env.API_PROXY_ORIGIN = LAB_NEST;
    process.env.API_INTERNAL_ORIGIN = 'http://127.0.0.1:3001';

    const { nestFetch } = await import('./nest-reader');
    const error = await nestFetch(
      { cookie: 'session=1' },
      '/api/stories',
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(NestTransientError);
    expect(error).toMatchObject({ status: 0, kind: 'transient' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses SSR fetch in release Pod when internal origin mismatches proxy', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    process.env.HOSTNAME = '0.0.0.0';
    process.env.API_PROXY_ORIGIN = LAB_NEST;
    process.env.API_INTERNAL_ORIGIN = 'http://wrong.internal:3001';

    const { nestFetch } = await import('./nest-reader');
    const error = await nestFetch(
      { cookie: 'session=1' },
      '/api/stories',
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(NestTransientError);
    expect(error).toMatchObject({ status: 0, kind: 'transient' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls Nest Service with session cookie when release Pod origins match', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    process.env.HOSTNAME = '0.0.0.0';
    process.env.API_PROXY_ORIGIN = LAB_NEST;
    process.env.API_INTERNAL_ORIGIN = LAB_NEST;

    const { nestFetch } = await import('./nest-reader');
    await nestFetch({ cookie: 'session=abc' }, '/api/stories');

    expect(fetchMock).toHaveBeenCalledWith(
      `${LAB_NEST}/api/stories`,
      expect.objectContaining({
        headers: { cookie: 'session=abc' },
        cache: 'no-store',
      }),
    );
  });

  it('surfaces transport failure as NestTransientError, not not_found', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    const { nestFetch } = await import('./nest-reader');
    const error = await nestFetch(
      { cookie: 'session=1' },
      '/api/stories',
    ).catch((caught: unknown) => caught);
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
