import assert from 'node:assert/strict';
import {
  chmod,
  chown,
  lstat,
  mkdir,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { LiveHttpRefusal, createLiveHttpRequest } from './live-http.mjs';

const ORIGIN = 'http://127.0.0.1:3000';
const COOKIE = 'session=owned-cookie-value';

/**
 * @param {string} name
 * @param {{ mode?: number, origin?: string, cookie?: string, payload?: string }} [options]
 */
async function writeSession(name, options = {}) {
  const dir = join(tmpdir(), `turn03-r2a-${process.pid}-${Date.now()}-${name}`);
  await mkdir(dir, { mode: 0o700 });
  const file = join(dir, 'session.json');
  const payload =
    options.payload ??
    JSON.stringify({
      origin: options.origin ?? ORIGIN,
      cookie: options.cookie ?? COOKIE,
    });
  await writeFile(file, payload, { mode: options.mode ?? 0o600 });
  await chmod(file, options.mode ?? 0o600);
  return file;
}

/**
 * @param {{ status?: number, body?: string, type?: string }} [options]
 */
function jsonResponse(options = {}) {
  const text = options.body ?? '{"ok":true}';
  const bytes = new TextEncoder().encode(text);
  return {
    status: options.status ?? 200,
    type: options.type ?? 'basic',
    body: {
      getReader() {
        let sent = false;
        return {
          async read() {
            if (sent) return { done: true, value: undefined };
            sent = true;
            return { done: false, value: bytes };
          },
          async cancel() {},
        };
      },
    },
  };
}

describe('live HTTP session gate', () => {
  it('accepts an owner-only loopback session and an HTTPS origin', async () => {
    const file = await writeSession('ok');
    const request = await createLiveHttpRequest({
      origin: ORIGIN,
      sessionFile: file,
      fetchImpl: async () => jsonResponse(),
    });
    const result = await request('GET', '/api/me');
    assert.deepEqual(result, { status: 200, body: { ok: true } });

    const httpsFile = await writeSession('https', {
      origin: 'https://play.example',
    });
    await createLiveHttpRequest({
      origin: 'https://play.example',
      sessionFile: httpsFile,
      fetchImpl: async () => jsonResponse(),
    });
  });

  it('refuses group-readable files, symlinks, wrong origins and unsafe cookies', async () => {
    const loose = await writeSession('loose', { mode: 0o644 });
    await assert.rejects(
      () =>
        createLiveHttpRequest({
          origin: ORIGIN,
          sessionFile: loose,
          fetchImpl: async () => jsonResponse(),
        }),
      (error) =>
        error instanceof LiveHttpRefusal && !String(error).includes(COOKIE),
    );

    const real = await writeSession('link-target');
    const link = join(real, '..', 'session-link.json');
    await symlink(real, link);
    assert.equal((await lstat(link)).isSymbolicLink(), true);
    await assert.rejects(
      () =>
        createLiveHttpRequest({
          origin: ORIGIN,
          sessionFile: link,
          fetchImpl: async () => jsonResponse(),
        }),
      LiveHttpRefusal,
    );

    const wrong = await writeSession('wrong', {
      origin: 'https://elsewhere.example',
    });
    await assert.rejects(
      () =>
        createLiveHttpRequest({
          origin: ORIGIN,
          sessionFile: wrong,
          fetchImpl: async () => jsonResponse(),
        }),
      LiveHttpRefusal,
    );

    const broken = await writeSession('cookie', { cookie: 'a\nb' });
    await assert.rejects(
      () =>
        createLiveHttpRequest({
          origin: ORIGIN,
          sessionFile: broken,
          fetchImpl: async () => jsonResponse(),
        }),
      (error) =>
        error instanceof LiveHttpRefusal && !String(error).includes('a\nb'),
    );

    if (typeof process.getuid === 'function') {
      const foreign = await writeSession('foreign');
      try {
        await chown(foreign, process.getuid() + 1, process.getgid());
      } catch (error) {
        if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'EPERM')
          throw error;
        return;
      }
      await assert.rejects(
        () =>
          createLiveHttpRequest({
            origin: ORIGIN,
            sessionFile: foreign,
            fetchImpl: async () => jsonResponse(),
          }),
        LiveHttpRefusal,
      );
    }
  });
});

describe('live HTTP request policy', () => {
  it('sends the cookie and origin once and does not echo the cookie', async () => {
    const file = await writeSession('headers');
    /** @type {unknown[]} */
    const calls = [];
    const request = await createLiveHttpRequest({
      origin: ORIGIN,
      sessionFile: file,
      allowMutations: true,
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return jsonResponse();
      },
    });
    await request('PUT', '/api/drafts/draft-1', { expectedRevision: 0 });
    assert.equal(calls.length, 1);
    const call =
      /** @type {{ url: string, init: { headers: Record<string, string>, redirect: string, credentials: string } }} */ (
        calls[0]
      );
    assert.equal(call.url, `${ORIGIN}/api/drafts/draft-1`);
    assert.equal(call.init.headers.cookie, COOKIE);
    assert.equal(call.init.headers.origin, ORIGIN);
    assert.equal(call.init.redirect, 'manual');
    assert.equal(call.init.credentials, 'omit');
    assert.equal(JSON.stringify(calls).includes('owned-cookie-value'), true);
  });

  it('allows GET by default and refuses writes until opt-in', async () => {
    const file = await writeSession('methods');
    const request = await createLiveHttpRequest({
      origin: ORIGIN,
      sessionFile: file,
      fetchImpl: async () => jsonResponse(),
    });
    await request('GET', '/api/stories/story-1');
    await assert.rejects(
      () => request('PUT', '/api/stories/story-1', {}),
      LiveHttpRefusal,
    );
    await assert.rejects(
      () => request('POST', '/api/drafts/draft-1', {}),
      LiveHttpRefusal,
    );
    await assert.rejects(
      () => request('GET', '/api/drafts/%2e%2e/admin'),
      LiveHttpRefusal,
    );
    await assert.rejects(
      () => request('GET', 'https://evil.example/api/me'),
      LiveHttpRefusal,
    );
  });

  it('refuses redirects, hides raw bodies, caps bytes, and does not retry a PUT', async () => {
    const file = await writeSession('transport');
    let puts = 0;
    const redirecting = await createLiveHttpRequest({
      origin: ORIGIN,
      sessionFile: file,
      fetchImpl: async () =>
        jsonResponse({ status: 302, body: 'https://secret.example/token' }),
    });
    await assert.rejects(
      () => redirecting('GET', '/api/me'),
      (error) =>
        error instanceof LiveHttpRefusal &&
        !String(error).includes('secret.example'),
    );

    const opaque = await createLiveHttpRequest({
      origin: ORIGIN,
      sessionFile: file,
      fetchImpl: async () =>
        jsonResponse({ status: 0, type: 'opaqueredirect', body: 'hidden' }),
    });
    await assert.rejects(() => opaque('GET', '/api/me'), LiveHttpRefusal);

    const malformed = await createLiveHttpRequest({
      origin: ORIGIN,
      sessionFile: file,
      fetchImpl: async () => jsonResponse({ body: '<html>secret-body</html>' }),
    });
    await assert.rejects(
      () => malformed('GET', '/api/me'),
      (error) =>
        error instanceof LiveHttpRefusal &&
        !String(error).includes('secret-body'),
    );

    const huge = 'x'.repeat(1024 * 1024 + 2);
    const oversized = await createLiveHttpRequest({
      origin: ORIGIN,
      sessionFile: file,
      fetchImpl: async () => jsonResponse({ body: huge }),
    });
    await assert.rejects(() => oversized('GET', '/api/me'), LiveHttpRefusal);

    const once = await createLiveHttpRequest({
      origin: ORIGIN,
      sessionFile: file,
      allowMutations: true,
      fetchImpl: async () => {
        puts += 1;
        throw new Error('timeout raw cookie ' + COOKIE);
      },
    });
    await assert.rejects(
      () => once('PUT', '/api/stories/story-1/resolutions/op-1', { ok: 1 }),
      (error) =>
        error instanceof LiveHttpRefusal && !String(error).includes(COOKIE),
    );
    assert.equal(puts, 1);
  });

  it('preserves 401 and 403 and passes an unexpected JSON status', async () => {
    const file = await writeSession('status');
    const denied = await createLiveHttpRequest({
      origin: ORIGIN,
      sessionFile: file,
      fetchImpl: async () => jsonResponse({ status: 401, body: 'not-json' }),
    });
    assert.deepEqual(await denied('GET', '/api/me'), {
      status: 401,
      body: null,
    });

    const forbidden = await createLiveHttpRequest({
      origin: ORIGIN,
      sessionFile: file,
      fetchImpl: async () =>
        jsonResponse({ status: 403, body: '{"error":"no"}' }),
    });
    assert.deepEqual(await forbidden('GET', '/api/stories/story-1'), {
      status: 403,
      body: { error: 'no' },
    });

    const pending = await createLiveHttpRequest({
      origin: ORIGIN,
      sessionFile: file,
      allowMutations: true,
      fetchImpl: async () => jsonResponse({ status: 202, body: '' }),
    });
    assert.deepEqual(await pending('PUT', '/api/drafts/draft-1', {}), {
      status: 202,
      body: null,
    });

    const unexpected = await createLiveHttpRequest({
      origin: ORIGIN,
      sessionFile: file,
      fetchImpl: async () =>
        jsonResponse({ status: 500, body: '{"error":"later"}' }),
    });
    assert.deepEqual(await unexpected('GET', '/api/me'), {
      status: 500,
      body: { error: 'later' },
    });
  });
});
