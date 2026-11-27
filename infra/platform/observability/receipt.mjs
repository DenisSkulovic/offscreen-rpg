export const RECEIPT_MAX_BYTES = 16 * 1024;

export const OBSERVABILITY_MUTATION_PHASES = Object.freeze([
  'namespace',
  'secret',
  'obs-prometheus',
  'obs-loki',
  'obs-tempo',
  'obs-collector',
  'obs-grafana',
]);

/** @type {ReadonlySet<string>} */
export const STRUCTURAL_STATES = new Set([
  'absent',
  'ready',
  'partial',
  'foreign',
  'legacy',
  'refused',
  'unreadable',
  'not-ready',
]);

/** @type {ReadonlySet<string>} */
export const MUTATION_STATES = new Set(['none', 'confirmed', 'possible']);

/** @type {ReadonlySet<string>} */
export const KNOWN_REASON_CODES = new Set([
  'absent',
  'ready',
  'partial',
  'foreign',
  'legacy',
  'refused',
  'unreadable',
  'not-ready',
  'pending',
  'deadline',
  'invalid-receipt',
  'identity-changed',
  'artifact-invalid',
  'lock-unavailable',
  'phase-failed',
  'cleanup-failed',
  'ensure-not-authorized',
  'context-mismatch',
  'invalid-invocation',
  'launch-failed',
  'worker-terminated',
  'worker-receipt-missing',
  'worker-receipt-malformed',
  'upgrade-required',
]);

const OBSERVATION_OPERATIONS = new Set(['plan', 'status']);
const PROFILE_IDS = new Set(['dev', 'release']);

const RECEIPT_CLOSED_KEYS = new Set([
  'schema',
  'operation',
  'profile',
  'ok',
  'state',
  'reasonCode',
  'pending',
  'detail',
  'mutation',
  'completedPhases',
]);

/**
 * @param {unknown} value
 */
function isPlainObject(value) {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * @param {unknown} phases
 */
function exactPhasePrefix(phases) {
  if (!Array.isArray(phases)) {
    return null;
  }
  const copy = [];
  for (const phase of phases) {
    if (typeof phase !== 'string') {
      return null;
    }
    copy.push(phase);
  }
  return isValidPhasePrefix(copy) ? copy : null;
}

/**
 * @param {unknown} result
 * @returns {{ok: false, error: string} | {ok: true, exitCode: number, stdout: string, signal: string | null, timedOut: boolean}}
 */
export function normalizePlatformResult(result) {
  if (result == null || typeof result !== 'object') {
    return { ok: false, error: 'missing-result' };
  }
  const value = /** @type {Record<string, unknown>} */ (result);
  if (value.missing === true) {
    return { ok: false, error: 'missing-launch' };
  }
  const timedOut = value.timedOut === true;
  const stdout = typeof value.stdout === 'string' ? value.stdout : '';
  const signal =
    value.signal == null
      ? null
      : typeof value.signal === 'string'
        ? value.signal
        : String(value.signal);
  const exitCode =
    value.status === undefined || value.status === null
      ? null
      : Number(value.status);
  if (exitCode !== null && !Number.isFinite(exitCode)) {
    return { ok: false, error: 'invalid-exit' };
  }
  if (exitCode === null) {
    return { ok: false, error: 'missing-exit' };
  }
  if (value.ok === true && exitCode !== 0) {
    return {
      ok: true,
      exitCode: exitCode ?? 1,
      stdout,
      signal,
      timedOut: true,
    };
  }
  if (value.ok === true && timedOut) {
    return {
      ok: true,
      exitCode: exitCode ?? null,
      stdout,
      signal,
      timedOut: true,
    };
  }
  return {
    ok: true,
    exitCode,
    stdout,
    signal,
    timedOut,
  };
}

/**
 * @param {unknown} result
 * @returns {{ok: false, error: string} | {ok: true, exitCode: number | null, stdout: string, signal: string | null, timedOut: boolean}}
 */
export function normalizeDiagnosticResult(result) {
  if (result == null || typeof result !== 'object') {
    return { ok: false, error: 'missing-result' };
  }
  const value = /** @type {Record<string, unknown>} */ (result);
  if (value.reason === 'ENOENT') {
    return { ok: false, error: 'missing-launch' };
  }
  const stdout = typeof value.stdout === 'string' ? value.stdout : '';
  const signal =
    value.signal == null
      ? null
      : typeof value.signal === 'string'
        ? value.signal
        : String(value.signal);
  const exitCode =
    value.code === undefined || value.code === null ? null : Number(value.code);
  const timedOut =
    value.reason === 'timeout' || signal === 'SIGKILL' || signal === 'SIGTERM';
  if (exitCode !== null && !Number.isFinite(exitCode)) {
    return { ok: false, error: 'invalid-exit' };
  }
  return {
    ok: true,
    exitCode,
    stdout,
    signal,
    timedOut,
  };
}

/**
 * @param {string[]} phases
 */
export function isValidPhasePrefix(phases) {
  if (!Array.isArray(phases)) {
    return false;
  }
  if (phases.length === 0) {
    return true;
  }
  const seen = new Set();
  for (const phase of phases) {
    if (typeof phase !== 'string' || seen.has(phase)) {
      return false;
    }
    seen.add(phase);
  }
  for (let index = 0; index < phases.length; index += 1) {
    if (phases[index] !== OBSERVABILITY_MUTATION_PHASES[index]) {
      return false;
    }
  }
  return true;
}

/**
 * @param {string} stdout
 */
function extractReceiptJson(stdout) {
  const lines = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const last = lines.at(-1) ?? '';
  if (last.length === 0 || last.length > RECEIPT_MAX_BYTES) {
    return { ok: false, reason: 'invalid-receipt' };
  }
  try {
    const value = JSON.parse(last);
    if (!isPlainObject(value)) {
      return { ok: false, reason: 'invalid-receipt' };
    }
    return { ok: true, value };
  } catch {
    return { ok: false, reason: 'invalid-receipt' };
  }
}

/**
 * @param {{
 *   ok: false,
 *   state: string,
 *   reasonCode: string,
 *   mutation: string,
 *   completedPhases: string[],
 *   pending: boolean,
 * }} row
 */
function ensureReceipt(row) {
  return row;
}

/**
 * @param {Record<string, unknown>} body
 * @param {{ expectedProfile?: string }} [options]
 */
function validateEnsureReceiptBody(body, options = {}) {
  if (body.operation !== undefined && body.operation !== 'ensure') {
    return { ok: false, reason: 'invalid-receipt' };
  }
  if (
    body.profile !== undefined &&
    (typeof body.profile !== 'string' || !PROFILE_IDS.has(body.profile))
  ) {
    return { ok: false, reason: 'invalid-receipt' };
  }
  if (
    options.expectedProfile &&
    body.profile !== undefined &&
    body.profile !== options.expectedProfile
  ) {
    return { ok: false, reason: 'invalid-receipt' };
  }
  if (typeof body.ok !== 'boolean' || typeof body.pending !== 'boolean') {
    return { ok: false, reason: 'invalid-receipt' };
  }
  if (body.schema !== 1) {
    return { ok: false, reason: 'invalid-receipt' };
  }
  const state = typeof body.state === 'string' ? body.state : '';
  const reasonCode = typeof body.reasonCode === 'string' ? body.reasonCode : '';
  const mutation = typeof body.mutation === 'string' ? body.mutation : '';
  const completedPhases = exactPhasePrefix(body.completedPhases);
  if (
    !STRUCTURAL_STATES.has(state) ||
    !MUTATION_STATES.has(mutation) ||
    !KNOWN_REASON_CODES.has(reasonCode) ||
    completedPhases == null
  ) {
    return { ok: false, reason: 'invalid-receipt' };
  }
  return {
    ok: true,
    state,
    reasonCode,
    mutation,
    pending: body.pending === true,
    completedPhases,
  };
}

/**
 * @param {{
 *   ok: true,
 *   exitCode: number | null,
 *   stdout: string,
 *   signal: string | null,
 *   timedOut: boolean,
 * }} command
 * @param {{ expectedProfile?: string }} [options]
 */
export function parseEnsureReceipt(command, options = {}) {
  if (command.timedOut || command.signal != null) {
    return ensureReceipt({
      ok: false,
      state: 'unreadable',
      reasonCode: 'unreadable',
      mutation: 'possible',
      completedPhases: [],
      pending: true,
    });
  }
  if (command.exitCode === null) {
    return ensureReceipt({
      ok: false,
      state: 'unreadable',
      reasonCode: 'unreadable',
      mutation: 'possible',
      completedPhases: [],
      pending: true,
    });
  }

  const extracted = extractReceiptJson(command.stdout);
  if (!extracted.ok) {
    const uncertain = command.exitCode === 0;
    return ensureReceipt({
      ok: false,
      state: 'unreadable',
      reasonCode: extracted.reason ?? 'invalid-receipt',
      mutation: uncertain ? 'possible' : 'none',
      completedPhases: [],
      pending: uncertain,
    });
  }
  const validated = validateEnsureReceiptBody(
    /** @type {Record<string, unknown>} */ (extracted.value),
    options,
  );
  if (!validated.ok) {
    const uncertain = command.exitCode === 0;
    return ensureReceipt({
      ok: false,
      state: 'unreadable',
      reasonCode: validated.reason ?? 'invalid-receipt',
      mutation: uncertain ? 'possible' : 'none',
      completedPhases: [],
      pending: uncertain,
    });
  }

  const { state, reasonCode, mutation, pending, completedPhases } = validated;
  const bodyOk = /** @type {boolean} */ (
    /** @type {Record<string, unknown>} */ (extracted.value).ok
  );

  if (bodyOk !== (command.exitCode === 0)) {
    return ensureReceipt({
      ok: false,
      state,
      reasonCode: 'invalid-receipt',
      mutation: 'none',
      completedPhases: completedPhases.slice(),
      pending: pending || command.exitCode === 0,
    });
  }

  const successfulEnsure =
    command.exitCode === 0 &&
    bodyOk === true &&
    state === 'ready' &&
    !pending &&
    ((mutation === 'none' && completedPhases.length === 0) ||
      (mutation === 'confirmed' &&
        completedPhases.length === OBSERVABILITY_MUTATION_PHASES.length));

  if (command.exitCode === 0 && bodyOk === true && !successfulEnsure) {
    return ensureReceipt({
      ok: false,
      state,
      reasonCode: 'invalid-receipt',
      mutation: mutation === 'none' ? 'none' : 'possible',
      completedPhases: completedPhases.slice(),
      pending: pending || mutation !== 'none',
    });
  }

  if (command.exitCode !== 0 && bodyOk === true) {
    return ensureReceipt({
      ok: false,
      state,
      reasonCode: 'invalid-receipt',
      mutation: 'none',
      completedPhases: completedPhases.slice(),
      pending: false,
    });
  }

  if (
    command.exitCode !== 0 &&
    bodyOk === false &&
    mutation === 'none' &&
    completedPhases.length === 0
  ) {
    return ensureReceipt({
      ok: false,
      state,
      reasonCode,
      mutation: 'none',
      completedPhases: [],
      pending,
    });
  }

  if (command.exitCode !== 0 && bodyOk === false && mutation === 'confirmed') {
    return ensureReceipt({
      ok: false,
      state,
      reasonCode,
      mutation: 'possible',
      completedPhases: completedPhases.slice(),
      pending: pending || true,
    });
  }

  return ensureReceipt({
    ok: bodyOk === true && command.exitCode === 0,
    state,
    reasonCode,
    mutation,
    completedPhases: completedPhases.slice(),
    pending,
  });
}

/**
 * @param {{ state?: string, reasonCode?: string, pending?: boolean }} observation
 * @param {{ allowAbsent?: boolean }} [options]
 */
export function toObservationReceipt(observation, options = {}) {
  const allowAbsent = options.allowAbsent === true;
  const state = typeof observation.state === 'string' ? observation.state : '';
  const reasonCode =
    typeof observation.reasonCode === 'string' ? observation.reasonCode : '';
  const pending = observation.pending === true;

  if (state === 'ready' && !pending) {
    return {
      status: 'PASS',
      reason: 'ready',
      state: 'ready',
      pending: false,
    };
  }
  if (state === 'absent' && !pending && allowAbsent) {
    return {
      status: 'NOT-RUN',
      reason: 'optional-observability-absent',
      state: 'absent',
      pending: false,
    };
  }
  if (state === 'absent' && !pending && !allowAbsent) {
    return {
      status: 'FAIL',
      reason: 'not-installed',
      state: 'absent',
      pending: false,
    };
  }
  if (reasonCode === 'upgrade-required') {
    return {
      status: 'FAIL',
      reason: 'upgrade-required',
      state: state || 'not-ready',
      pending,
    };
  }
  if (reasonCode === 'pending' || pending) {
    return {
      status: 'FAIL',
      reason: 'pending',
      state: state || 'not-ready',
      pending: true,
    };
  }
  const reason = KNOWN_REASON_CODES.has(reasonCode) ? reasonCode : 'unreadable';
  return {
    status: 'FAIL',
    reason,
    state: STRUCTURAL_STATES.has(state) ? state : 'unreadable',
    pending,
  };
}

/**
 * @param {Record<string, unknown>} body
 * @param {{ expectedProfile?: string }} options
 */
function validateObservationReceiptBody(body, options) {
  for (const key of Object.keys(body)) {
    if (!RECEIPT_CLOSED_KEYS.has(key)) {
      return { ok: false, reason: 'invalid-receipt' };
    }
  }
  if (!isPlainObject(body) || body.schema !== 1) {
    return { ok: false, reason: 'invalid-receipt' };
  }
  const operation = typeof body.operation === 'string' ? body.operation : '';
  if (!OBSERVATION_OPERATIONS.has(operation)) {
    return { ok: false, reason: 'invalid-receipt' };
  }
  if (
    body.profile !== undefined &&
    (typeof body.profile !== 'string' || !PROFILE_IDS.has(body.profile))
  ) {
    return { ok: false, reason: 'invalid-receipt' };
  }
  if (
    options.expectedProfile &&
    body.profile !== undefined &&
    body.profile !== options.expectedProfile
  ) {
    return { ok: false, reason: 'invalid-receipt' };
  }
  if (typeof body.ok !== 'boolean' || typeof body.pending !== 'boolean') {
    return { ok: false, reason: 'invalid-receipt' };
  }
  const mutation = typeof body.mutation === 'string' ? body.mutation : '';
  const completedPhases = exactPhasePrefix(body.completedPhases ?? []);
  if (
    mutation !== 'none' ||
    completedPhases == null ||
    completedPhases.length !== 0
  ) {
    return { ok: false, reason: 'invalid-receipt' };
  }
  const state = typeof body.state === 'string' ? body.state : '';
  const reasonCode = typeof body.reasonCode === 'string' ? body.reasonCode : '';
  if (!STRUCTURAL_STATES.has(state) || !KNOWN_REASON_CODES.has(reasonCode)) {
    return { ok: false, reason: 'invalid-receipt' };
  }
  return {
    ok: true,
    state,
    reasonCode,
    pending: body.pending === true,
  };
}

/**
 * @param {unknown} result
 * @param {{ allowAbsent?: boolean, expectedProfile?: string }} [options]
 */
export function evaluateObservationReceipt(result, options = {}) {
  const normalized = normalizeDiagnosticResult(result);
  if (!normalized.ok) {
    return {
      status: 'FAIL',
      reason: 'unreadable',
      state: 'unreadable',
      pending: false,
    };
  }
  if (normalized.timedOut) {
    return {
      status: 'FAIL',
      reason: 'unreadable',
      state: 'unreadable',
      pending: false,
    };
  }
  if (normalized.exitCode !== 0 && normalized.signal != null) {
    return {
      status: 'FAIL',
      reason: 'unreadable',
      state: 'unreadable',
      pending: false,
    };
  }
  if (normalized.exitCode !== 0) {
    return {
      status: 'FAIL',
      reason: 'unreadable',
      state: 'unreadable',
      pending: false,
    };
  }

  const extracted = extractReceiptJson(normalized.stdout);
  if (!extracted.ok) {
    return {
      status: 'FAIL',
      reason: 'invalid-receipt',
      state: 'unreadable',
      pending: false,
    };
  }

  const validated = validateObservationReceiptBody(
    /** @type {Record<string, unknown>} */ (extracted.value),
    options,
  );
  if (!validated.ok) {
    return {
      status: 'FAIL',
      reason: 'invalid-receipt',
      state: 'unreadable',
      pending: false,
    };
  }

  const body = /** @type {Record<string, unknown>} */ (extracted.value);
  if (body.ok !== true) {
    return {
      status: 'FAIL',
      reason: 'unreadable',
      state: validated.state,
      pending: validated.pending,
    };
  }
  if (validated.state === 'ready' && validated.pending) {
    return {
      status: 'FAIL',
      reason: 'pending',
      state: 'ready',
      pending: true,
    };
  }
  return toObservationReceipt(
    {
      state: validated.state,
      reasonCode: validated.reasonCode,
      pending: validated.pending,
    },
    options,
  );
}
