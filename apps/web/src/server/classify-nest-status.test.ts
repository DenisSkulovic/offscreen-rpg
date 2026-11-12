import { describe, expect, it } from 'vitest';
import { classifyNestStatus } from './classify-nest-status';
import { NestProtocolError, NestTransientError } from './nest-errors';

describe('classifyNestStatus', () => {
  it('treats 2xx as success for authorized SSR payloads', () => {
    expect(classifyNestStatus(200)).toEqual({ kind: 'success' });
    expect(classifyNestStatus(202)).toEqual({ kind: 'success' });
  });

  it('maps 401 to unauthorized (sign-in), not not_found', () => {
    expect(classifyNestStatus(401)).toEqual({ kind: 'unauthorized' });
  });

  it('maps 404 to not_found for hidden/other-owner resources', () => {
    expect(classifyNestStatus(404)).toEqual({ kind: 'not_found' });
  });

  it('maps 503 to transient and never to not_found (negative)', () => {
    expect(classifyNestStatus(503)).toEqual({
      kind: 'transient',
      status: 503,
    });
    expect(classifyNestStatus(503).kind).not.toBe('not_found');
  });

  it('maps other non-2xx statuses as transient', () => {
    expect(classifyNestStatus(429)).toEqual({ kind: 'transient', status: 429 });
    expect(classifyNestStatus(500)).toEqual({ kind: 'transient', status: 500 });
  });
});

describe('Nest error taxonomy', () => {
  it('distinguishes protocol malformed-body errors from transient upstream', () => {
    const protocol = new NestProtocolError(
      'Nest response failed schema validation',
    );
    const transient = new NestTransientError(503);
    expect(protocol.kind).toBe('protocol');
    expect(transient.kind).toBe('transient');
    expect(transient.status).toBe(503);
    expect(protocol.kind).not.toBe(transient.kind);
  });
});
