import { afterEach, describe, expect, it } from 'vitest';
import { apiInternalOrigin, apiProxyOrigin } from './api-origin';

const previousInternal = process.env.API_INTERNAL_ORIGIN;
const previousProxy = process.env.API_PROXY_ORIGIN;

afterEach(() => {
  if (previousInternal === undefined) delete process.env.API_INTERNAL_ORIGIN;
  else process.env.API_INTERNAL_ORIGIN = previousInternal;
  if (previousProxy === undefined) delete process.env.API_PROXY_ORIGIN;
  else process.env.API_PROXY_ORIGIN = previousProxy;
});

describe('api origins', () => {
  it('defaults both origins to loopback Nest without NEXT_PUBLIC exposure', () => {
    delete process.env.API_INTERNAL_ORIGIN;
    delete process.env.API_PROXY_ORIGIN;
    expect(apiInternalOrigin()).toBe('http://127.0.0.1:3001');
    expect(apiProxyOrigin()).toBe('http://127.0.0.1:3001');
  });

  it('allows independent SSR vs proxy origins for non-loopback deploy topology', () => {
    process.env.API_INTERNAL_ORIGIN = 'http://api.internal:3001';
    process.env.API_PROXY_ORIGIN = 'http://127.0.0.1:3001';
    expect(apiInternalOrigin()).toBe('http://api.internal:3001');
    expect(apiProxyOrigin()).toBe('http://127.0.0.1:3001');
  });
});
