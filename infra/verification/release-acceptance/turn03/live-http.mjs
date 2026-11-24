import { constants } from 'node:fs';
import { open } from 'node:fs/promises';

const MAX_SESSION_BYTES = 4096;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Failure that is safe to surface. The message never includes the session
 * cookie, response body, or response headers.
 */
export class LiveHttpRefusal extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = 'LiveHttpRefusal';
  }
}

/**
 * Operator HTTP adapter for the public TURN03 route trace.
 * `allowMutations` only enables PUT on the draft and story families. It does
 * not approve a live run. Callers inject `fetchImpl`; this module never dials.
 *
 * @param {{
 *   origin: string,
 *   sessionFile: string,
 *   fetchImpl: typeof fetch,
 *   allowMutations?: boolean,
 * }} options
 * @returns {(method: string, path: string, body?: unknown) => Promise<{ status: number, body: unknown }>}
 */
export async function createLiveHttpRequest(options) {
  const origin = assertOperatorOrigin(options.origin);
  const allowMutations = options.allowMutations === true;
  const session = await readOwnedSession(options.sessionFile, origin);

  return async function request(method, path, body) {
    const target = assertAllowedTarget(method, path, allowMutations);
    const headers = {
      cookie: session.cookie,
      accept: 'application/json',
    };
    if (body !== undefined) {
      headers['content-type'] = 'application/json';
    }
    if (target.method === 'PUT') {
      headers.origin = origin;
    }

    // One attempt. A write timeout or transport error is not replayed.
    let response;
    try {
      response = await options.fetchImpl(`${origin}${target.path}`, {
        method: target.method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: 'manual',
        credentials: 'omit',
        cache: 'no-store',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new LiveHttpRefusal('Live HTTP request failed');
    }

    return readTraceResponse(response);
  };
}

/**
 * @param {string} sessionFile
 * @param {string} origin
 */
async function readOwnedSession(sessionFile, origin) {
  // 1. Open the operator file without following a symlink.
  let handle;
  try {
    handle = await open(sessionFile, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch {
    throw new LiveHttpRefusal('Session file is not a readable regular file');
  }

  try {
    const stat = await handle.stat();
    const uid =
      typeof process.getuid === 'function' ? process.getuid() : undefined;
    const groupOrOther = (stat.mode & 0o077) !== 0;
    if (
      !stat.isFile() ||
      stat.size > MAX_SESSION_BYTES ||
      groupOrOther ||
      (uid !== undefined && stat.uid !== uid)
    ) {
      throw new LiveHttpRefusal('Session file permissions are not owner-only');
    }

    // 2. Accept only the exact {origin, cookie} handoff.
    const raw = await handle.readFile({ encoding: 'utf8' });
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new LiveHttpRefusal('Session file is not valid JSON');
    }
    if (
      !isExactSession(parsed) ||
      parsed.origin !== origin ||
      !isSafeCookie(parsed.cookie)
    ) {
      throw new LiveHttpRefusal(
        'Session file does not match the selected origin',
      );
    }
    return { cookie: parsed.cookie };
  } finally {
    await handle.close();
  }
}

/**
 * @param {unknown} value
 * @returns {value is { origin: string, cookie: string }}
 */
function isExactSession(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    return false;
  const keys = Object.keys(value);
  if (keys.length !== 2 || !keys.includes('origin') || !keys.includes('cookie'))
    return false;
  const record = /** @type {Record<string, unknown>} */ (value);
  return typeof record.origin === 'string' && typeof record.cookie === 'string';
}

/**
 * @param {string} cookie
 */
function isSafeCookie(cookie) {
  return cookie.length > 0 && !/[\u0000-\u001F\u007F]/.test(cookie);
}

/**
 * Absolute HTTPS origin, or HTTP loopback, with no userinfo or extra URL parts.
 * @param {string} value
 */
function assertOperatorOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new LiveHttpRefusal('Origin is not an absolute URL');
  }
  const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  const allowedProtocol =
    url.protocol === 'https:' || (url.protocol === 'http:' && loopback);
  if (
    !allowedProtocol ||
    url.username !== '' ||
    url.password !== '' ||
    url.pathname !== '/' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new LiveHttpRefusal('Origin is not an allowed absolute origin');
  }
  return url.origin;
}

/**
 * @param {string} method
 * @param {string} path
 * @param {boolean} allowMutations
 */
function assertAllowedTarget(method, path, allowMutations) {
  if (typeof path !== 'string' || !isCanonicalApiPath(path)) {
    throw new LiveHttpRefusal('Request path is outside the public API routes');
  }
  const identity = path === '/api/me';
  const family =
    path.startsWith('/api/drafts/') || path.startsWith('/api/stories/');
  if (method === 'GET' && (identity || family)) {
    return { method, path };
  }
  if (method === 'PUT' && allowMutations && family) {
    return { method, path };
  }
  throw new LiveHttpRefusal('HTTP method is not allowed for this path');
}

/**
 * @param {string} path
 */
function isCanonicalApiPath(path) {
  if (
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.includes('?') ||
    path.includes('#')
  ) {
    return false;
  }
  if (
    /%2f|%5c|%00|%2e%2e/i.test(path) ||
    path.includes('\\') ||
    path.includes('..')
  ) {
    return false;
  }
  const segments = path.split('/');
  return segments.every((segment) => {
    if (segment === '.' || segment === '..') return false;
    try {
      const decoded = decodeURIComponent(segment);
      return (
        !decoded.includes('/') &&
        !decoded.includes('\\') &&
        !decoded.includes('..')
      );
    } catch {
      return false;
    }
  });
}

/**
 * @param {Response} response
 * @returns {Promise<{ status: number, body: unknown }>}
 */
async function readTraceResponse(response) {
  // Redirects are refused before any body is interpreted.
  if (
    response.type === 'opaqueredirect' ||
    (response.status >= 300 && response.status < 400)
  ) {
    throw new LiveHttpRefusal('Redirect responses are refused');
  }

  const bytes = await readBoundedBody(response);
  if (
    (response.status === 202 || response.status === 204) &&
    bytes.byteLength === 0
  ) {
    return { status: response.status, body: null };
  }

  const text = new TextDecoder('utf8', { fatal: true }).decode(bytes);
  if (response.status === 401 || response.status === 403) {
    return { status: response.status, body: parseJsonOrNull(text) };
  }
  if (text.length === 0) {
    throw new LiveHttpRefusal('Response body was empty');
  }

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new LiveHttpRefusal('Response body was not JSON');
  }
  return { status: response.status, body };
}

/**
 * @param {string} text
 */
function parseJsonOrNull(text) {
  if (text.length === 0) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * @param {Response} response
 */
async function readBoundedBody(response) {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  /** @type {Uint8Array[]} */
  const chunks = [];
  let total = 0;
  while (true) {
    const step = await reader.read();
    if (step.done) break;
    total += step.value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new LiveHttpRefusal('Response exceeded the size limit');
    }
    chunks.push(step.value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
