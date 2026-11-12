import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { NestProtocolError } from './nest-errors';
import { parseNestJson } from './parse-nest-json';

const sampleSchema = z.object({ id: z.string(), title: z.string() });

describe('parseNestJson', () => {
  it('returns validated DTO on well-formed Nest JSON', async () => {
    const response = new Response(JSON.stringify({ id: 'a', title: 'Scene' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    await expect(parseNestJson(response, sampleSchema)).resolves.toEqual({
      id: 'a',
      title: 'Scene',
    });
  });

  it('throws NestProtocolError on malformed Nest body (negative)', async () => {
    const response = new Response(JSON.stringify({ id: 1 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    await expect(parseNestJson(response, sampleSchema)).rejects.toBeInstanceOf(
      NestProtocolError,
    );
  });

  it('throws NestProtocolError when body is not JSON (negative)', async () => {
    const response = new Response('not-json', {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    });
    await expect(parseNestJson(response, sampleSchema)).rejects.toBeInstanceOf(
      NestProtocolError,
    );
  });
});
