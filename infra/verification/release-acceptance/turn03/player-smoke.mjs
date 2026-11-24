/**
 * Source-only composition of the scripted player smoke.
 * Joins a caller-verified release identity to the existing public-route trace.
 * Never dials, reads S3, or labels a result as cross-Pod proof.
 */

import {
  assertFrozenIdentity,
  runPublicRouteTrace,
  TraceAbort,
} from './trace-route.mjs';

const LAB_CONTEXT = 'kind-offscreen-release';
const SOURCE_ONLY = 'source-only-observation';
const MAX_ATTEMPTS = 50;

/**
 * @param {{
 *   readiness?: unknown,
 *   verifiedFixture?: unknown,
 *   identity?: unknown,
 *   request?: unknown,
 *   maxAttempts?: unknown,
 *   sleep?: unknown,
 *   authorized?: unknown,
 * }} args
 */
export async function runScriptedPlayerSmoke(args) {
  // 1. Story writes need an explicit injected grant. A missing grant never dials.
  if (args?.authorized !== true) {
    return blocked('operator-authorization-required');
  }

  // 2. The caller must already have checked this lab release. We only compare it.
  const readiness = readReadiness(args.readiness);
  if (readiness.ok === false) return readiness.result;

  // 3. The fixture receipt is local. Its roots must match the frozen identity.
  const fixture = readVerifiedFixture(args.verifiedFixture, readiness.value);
  if (fixture.ok === false) return fixture.result;
  const roots = matchSourceRoots(args.identity, fixture.value);
  if (roots.ok === false) return roots.result;

  // 4. Freeze ids and require a bounded injected transport before the first call.
  let identity;
  try {
    identity = assertFrozenIdentity(args.identity);
  } catch (error) {
    return mapTraceError(error);
  }
  Object.freeze(identity);
  const transport = readTransport(args.request, args.maxAttempts, args.sleep);
  if (transport.ok === false) return transport.result;

  // 5. One public-route pass. An abort is mapped; the operation is not resent.
  try {
    const traced = await runPublicRouteTrace({
      identity,
      request: transport.request,
      maxAttempts: transport.maxAttempts,
      sleep: transport.sleep,
    });
    return observeTrace(identity, traced);
  } catch (error) {
    return mapTraceError(error, identity);
  }
}

/**
 * @param {unknown} readiness
 */
function readReadiness(readiness) {
  if (!isRecord(readiness)) {
    return refusal('readiness-incomplete');
  }
  const releaseSha = pickString(readiness.releaseSha);
  const bucket = pickString(readiness.bucket);
  const contextName = pickString(readiness.contextName);
  if (releaseSha == null || bucket == null || contextName == null) {
    return refusal('readiness-incomplete');
  }
  if (readiness.imagesCurrent !== true || readiness.sessionVerified !== true) {
    return refusal('readiness-unverified');
  }
  if (contextName !== LAB_CONTEXT) {
    return refusal('release-context-mismatch');
  }
  return { ok: true, value: { releaseSha, bucket, contextName } };
}

/**
 * @param {unknown} fixture
 * @param {{ releaseSha: string, bucket: string }} readiness
 */
function readVerifiedFixture(fixture, readiness) {
  if (!isRecord(fixture) || fixture.verified !== true) {
    return refusal('fixture-unverified');
  }
  const releaseSha = pickString(fixture.releaseSha);
  const bucket = pickString(fixture.bucket);
  const startRootHash = pickString(fixture.startRootHash);
  const rulesRootHash = pickString(fixture.rulesRootHash);
  if (
    releaseSha == null ||
    bucket == null ||
    startRootHash == null ||
    rulesRootHash == null
  ) {
    return refusal('fixture-incomplete');
  }
  if (releaseSha !== readiness.releaseSha || bucket !== readiness.bucket) {
    return refusal('release-identity-mismatch');
  }
  return { ok: true, value: { startRootHash, rulesRootHash } };
}

/**
 * @param {unknown} identity
 * @param {{ startRootHash: string, rulesRootHash: string }} fixture
 */
function matchSourceRoots(identity, fixture) {
  if (!isRecord(identity) || !isRecord(identity.sourcePins)) {
    return refusal('source-root-mismatch');
  }
  const start = isRecord(identity.sourcePins.start)
    ? identity.sourcePins.start
    : null;
  const rules = isRecord(identity.sourcePins.rules)
    ? identity.sourcePins.rules
    : null;
  const startRoot = start == null ? null : pickString(start.rootHash);
  const rulesRoot = rules == null ? null : pickString(rules.rootHash);
  if (
    startRoot !== fixture.startRootHash ||
    rulesRoot !== fixture.rulesRootHash
  ) {
    return refusal('source-root-mismatch');
  }
  return { ok: true };
}

/**
 * @param {unknown} request
 * @param {unknown} maxAttempts
 * @param {unknown} sleep
 */
function readTransport(request, maxAttempts, sleep) {
  if (typeof request !== 'function') {
    return refusal('request-required');
  }
  if (!isBoundedAttempts(maxAttempts)) {
    return refusal('attempt-bound-invalid');
  }
  if (typeof sleep !== 'function') {
    return refusal('sleeper-required');
  }
  return {
    ok: true,
    request:
      /** @type {(method: string, path: string, body?: unknown) => Promise<unknown>} */ (
        request
      ),
    maxAttempts,
    sleep: /** @type {(ms: number) => Promise<void>} */ (sleep),
  };
}

/**
 * The trace can return forkProved:false without throwing. That is a failure.
 * A scene2 body without a checkpoint hash is not checkpoint proof.
 *
 * @param {ReturnType<typeof assertFrozenIdentity>} identity
 * @param {Awaited<ReturnType<typeof runPublicRouteTrace>>} traced
 */
function observeTrace(identity, traced) {
  const scene2CheckpointHash = pickString(
    traced.scene2Checkpoint?.checkpointHash,
  );
  const summary = {
    ...frozenIds(identity),
    passage1Id: pickString(traced.scene1?.passageId),
    passage2Id: pickString(traced.scene2?.passageId),
    scene1CheckpointHash: pickString(traced.scene1?.checkpointHash),
    scene2CheckpointHash,
    forkLineage:
      traced.forkProved === true ? 'historical-fork-observed' : 'not-proved',
    evidence: SOURCE_ONLY,
  };
  if (scene2CheckpointHash == null) {
    return { ...summary, status: 'FAIL', code: 'scene2-checkpoint-unproved' };
  }
  if (traced.forkProved !== true) {
    return { ...summary, status: 'FAIL', code: 'fork-not-proved' };
  }
  return { ...summary, status: 'OBSERVED-LOCAL' };
}

/**
 * @param {unknown} error
 * @param {ReturnType<typeof assertFrozenIdentity>} [identity]
 */
function mapTraceError(error, identity) {
  if (error instanceof TraceAbort) {
    return {
      ...(identity == null ? {} : frozenIds(identity)),
      status: error.status,
      code: error.gateId,
      summary: error.summary,
      evidence: SOURCE_ONLY,
    };
  }
  return {
    ...(identity == null ? {} : frozenIds(identity)),
    status: 'FAIL',
    code: 'trace-failed',
    evidence: SOURCE_ONLY,
  };
}

/**
 * @param {ReturnType<typeof assertFrozenIdentity>} identity
 */
function frozenIds(identity) {
  return {
    draftId: identity.draftId,
    generationId: identity.generationId,
    storyId: identity.storyId,
    operationId: identity.operationId,
    forkId: identity.forkId,
  };
}

/**
 * @param {string} code
 */
function blocked(code) {
  return { status: 'BLOCKED', code, evidence: SOURCE_ONLY };
}

/**
 * @param {string} code
 */
function refusal(code) {
  return { ok: false, result: blocked(code) };
}

/**
 * @param {unknown} value
 * @returns {value is number}
 */
function isBoundedAttempts(value) {
  return Number.isInteger(value) && value >= 1 && value <= MAX_ATTEMPTS;
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function pickString(value) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}
