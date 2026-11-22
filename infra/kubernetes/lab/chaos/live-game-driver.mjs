/**
 * Live-game evidence collector (K8S10 T03). Injectable adapters only;
 * never opens DATABASE_URL, mints tokens, or imports Story Engine.
 */

export const LIVE_GAME_DRIVER_SCHEMA = 'offscreen.chaos-live-game-driver.v1';

/** @typedef {import('./oracle.mjs').SqlSnapshot} SqlSnapshot */
/** @typedef {import('./oracle.mjs').StoreSnapshot} StoreSnapshot */
/** @typedef {import('./oracle.mjs').HttpViewSnapshot} HttpViewSnapshot */
/** @typedef {import('./oracle.mjs').TelemetrySnapshot} TelemetrySnapshot */
/** @typedef {import('./oracle.mjs').OracleAssertions} OracleAssertions */

const SENSITIVE_BODY_KEYS = new Set([
  'authorization',
  'bearer',
  'bearerToken',
  'cookie',
  'cookies',
  'set-cookie',
  'setCookie',
  'prompt',
  'promptText',
  'session',
  'sessionToken',
  'accessToken',
  'refreshToken',
]);

/**
 * @param {unknown} value
 * @param {WeakSet<object>} [seen]
 * @returns {unknown}
 */
export function stripSensitiveFields(value, seen = new WeakSet()) {
  if (value == null || typeof value !== 'object') {
    return value;
  }
  if (seen.has(/** @type {object} */ (value))) {
    return value;
  }
  seen.add(/** @type {object} */ (value));
  if (Array.isArray(value)) {
    return value.map((item) => stripSensitiveFields(item, seen));
  }
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, child] of Object.entries(
    /** @type {Record<string, unknown>} */ (value),
  )) {
    if (
      SENSITIVE_BODY_KEYS.has(key) ||
      SENSITIVE_BODY_KEYS.has(key.toLowerCase())
    ) {
      continue;
    }
    out[key] = stripSensitiveFields(child, seen);
  }
  return out;
}

/**
 * @param {unknown} body
 * @returns {HttpViewSnapshot}
 */
function normalizeHttpView(body) {
  const clean = stripSensitiveFields(body);
  if (clean == null || typeof clean !== 'object') {
    return {};
  }
  const record = /** @type {Record<string, unknown>} */ (clean);
  /** @type {HttpViewSnapshot} */
  const view = {};
  if (typeof record.revision === 'number') {
    view.revision = record.revision;
  }
  if (typeof record.storyId === 'string') {
    view.storyId = record.storyId;
  }
  if (typeof record.ownerId === 'string') {
    view.ownerId = record.ownerId;
  }
  const passageIds = record.passageIds;
  if (Array.isArray(passageIds)) {
    view.passageIds = passageIds.filter((id) => typeof id === 'string');
  }
  if (typeof record.etag === 'string') {
    view.etag = record.etag;
  }
  return view;
}

/**
 * @param {{
 *   adapters?: {
 *     httpGet?: (path: string) => Promise<{ status: number, body: unknown }> | { status: number, body: unknown },
 *     sqlQuery?: (name: string, params: Record<string, unknown>) => Promise<unknown[]> | unknown[],
 *     readPrivateObject?: (key: string) => Promise<{ digest: string, present: boolean }> | { digest: string, present: boolean },
 *   },
 *   paths?: { storyOperation?: string },
 *   ids?: {
 *     storyId: string,
 *     ownerId: string,
 *     operationId: string,
 *     passageId?: string,
 *     rootObjectKey?: string,
 *     checkpointObjectKey?: string,
 *   },
 *   assertions?: OracleAssertions,
 *   telemetry?: TelemetrySnapshot,
 * }} deps
 */
export async function collectLiveGameEvidence(deps) {
  const adapters = deps?.adapters ?? {};
  const { httpGet, sqlQuery, readPrivateObject } = adapters;

  if (
    typeof httpGet !== 'function' ||
    typeof sqlQuery !== 'function' ||
    typeof readPrivateObject !== 'function'
  ) {
    return {
      schema: LIVE_GAME_DRIVER_SCHEMA,
      status: 'BLOCKED',
      reason: 'live-adapters-missing',
      evidence: null,
    };
  }

  const ids = deps.ids;
  const paths = deps.paths ?? {};
  if (!ids?.storyId || !ids?.operationId || !paths.storyOperation) {
    return {
      schema: LIVE_GAME_DRIVER_SCHEMA,
      status: 'BLOCKED',
      reason: 'live-target-incomplete',
      evidence: null,
    };
  }

  const httpRaw = await httpGet(paths.storyOperation);
  const storyRows = await sqlQuery('story', { storyId: ids.storyId });
  const passageRows = await sqlQuery('passages', {
    storyId: ids.storyId,
    operationId: ids.operationId,
    passageId: ids.passageId,
  });
  const operationRows = await sqlQuery('operations', {
    storyId: ids.storyId,
    operationId: ids.operationId,
  });

  /** @type {SqlSnapshot} */
  const sql = {
    story:
      Array.isArray(storyRows) &&
      storyRows[0] &&
      typeof storyRows[0] === 'object'
        ? /** @type {SqlSnapshot['story']} */ (storyRows[0])
        : undefined,
    passages: Array.isArray(passageRows)
      ? /** @type {NonNullable<SqlSnapshot['passages']>} */ (
          passageRows.filter((row) => row != null && typeof row === 'object')
        )
      : [],
    operations: Array.isArray(operationRows)
      ? /** @type {NonNullable<SqlSnapshot['operations']>} */ (
          operationRows.filter((row) => row != null && typeof row === 'object')
        )
      : [],
  };

  const rootKey =
    ids.rootObjectKey ??
    (sql.story?.rootHash != null ? String(sql.story.rootHash) : undefined);
  const checkpointKey =
    ids.checkpointObjectKey ??
    sql.passages?.find((p) => p.checkpointHash)?.checkpointHash ??
    undefined;

  /** @type {StoreSnapshot} */
  const store = { roots: {}, checkpoints: {} };

  if (rootKey) {
    const rootObject = await readPrivateObject(rootKey);
    if (rootObject?.present) {
      store.roots[rootKey] = {
        revision: sql.story?.rootRevision ?? 0,
        campaignId: ids.storyId,
      };
    }
  }

  if (checkpointKey) {
    const checkpointObject = await readPrivateObject(String(checkpointKey));
    if (checkpointObject?.present) {
      store.checkpoints[String(checkpointKey)] = {
        digest: checkpointObject.digest,
        storyId: ids.storyId,
      };
    }
  }

  const http = normalizeHttpView(httpRaw?.body);

  const telemetry = {
    modelDispatchAttempts: 0,
    forbiddenProviderInvoked: false,
    billableUsageRecords: 0,
    openRouterSecretMounted: false,
    ...deps.telemetry,
  };

  return {
    schema: LIVE_GAME_DRIVER_SCHEMA,
    status: 'OK',
    evidence: {
      sql,
      store,
      http,
      telemetry,
      httpStatus: httpRaw?.status,
    },
    assertions: deps.assertions,
  };
}
