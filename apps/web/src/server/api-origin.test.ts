import { afterEach, describe, expect, it } from 'vitest';
import {
  apiInternalOrigin,
  apiProxyOrigin,
  releasePodAllowsSsr,
} from './api-origin';

const LAB_NEST = 'http://game-api.lab-edge.svc.cluster.local:3001';

const previousInternal = process.env.API_INTERNAL_ORIGIN;
const previousProxy = process.env.API_PROXY_ORIGIN;
const previousHostname = process.env.HOSTNAME;

afterEach(() => {
  if (previousInternal === undefined) delete process.env.API_INTERNAL_ORIGIN;
  else process.env.API_INTERNAL_ORIGIN = previousInternal;
  if (previousProxy === undefined) delete process.env.API_PROXY_ORIGIN;
  else process.env.API_PROXY_ORIGIN = previousProxy;
  if (previousHostname === undefined) delete process.env.HOSTNAME;
  else process.env.HOSTNAME = previousHostname;
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

describe('releasePodAllowsSsr', () => {
  it('allows matching lab Service origin when Pod HOSTNAME is 0.0.0.0', () => {
    process.env.HOSTNAME = '0.0.0.0';
    process.env.API_PROXY_ORIGIN = LAB_NEST;
    expect(releasePodAllowsSsr(LAB_NEST)).toBe(true);
  });

  it('refuses loopback SSR origin inside release Pod', () => {
    process.env.HOSTNAME = '0.0.0.0';
    process.env.API_PROXY_ORIGIN = LAB_NEST;
    expect(releasePodAllowsSsr('http://127.0.0.1:3001')).toBe(false);
  });

  it('refuses SSR origin that does not match API_PROXY_ORIGIN in Pod', () => {
    process.env.HOSTNAME = '0.0.0.0';
    process.env.API_PROXY_ORIGIN = LAB_NEST;
    expect(releasePodAllowsSsr('http://other.internal:3001')).toBe(false);
  });

  it('allows loopback when HOSTNAME is unset (local dev/start)', () => {
    delete process.env.HOSTNAME;
    delete process.env.API_PROXY_ORIGIN;
    expect(releasePodAllowsSsr('http://127.0.0.1:3001')).toBe(true);
  });
});
