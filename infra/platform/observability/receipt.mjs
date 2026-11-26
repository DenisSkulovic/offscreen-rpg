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
]);

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
    return { ok: true, value: JSON.parse(last) };
  } catch {
    return { ok: false, reason: 'invalid-receipt' };
  }
}

/**
 * @param {{
 *   ok: true,
 *   exitCode: number | null,
 *   stdout: string,
 *   signal: string | null,
 *   timedOut: boolean,
 * }} command
 */
export function parseEnsureReceipt(command) {
  if (command.timedOut || command.signal != null) {
    return {
      ok: false,
      state: 'unreadable',
      reasonCode: 'unreadable',
      mutation: 'possible',
      completedPhases: [],
    };
  }
  if (command.exitCode === null) {
    return {
      ok: false,
      state: 'unreadable',
      reasonCode: 'unreadable',
      mutation: 'possible',
      completedPhases: [],
    };
  }

  const extracted = extractReceiptJson(command.stdout);
  if (!extracted.ok) {
    return {
      ok: false,
      state: 'unreadable',
      reasonCode: extracted.reason ?? 'invalid-receipt',
      mutation: command.exitCode === 0 ? 'possible' : 'none',
      completedPhases: [],
    };
  }
  const body = /** @type {Record<string, unknown>} */ (extracted.value);
  if (body.schema !== 1) {
    return {
      ok: false,
      state: 'unreadable',
      reasonCode: 'invalid-receipt',
      mutation: 'possible',
      completedPhases: [],
    };
  }
  if (typeof body.ok !== 'boolean') {
    return {
      ok: false,
      state: 'unreadable',
      reasonCode: 'invalid-receipt',
      mutation: 'possible',
      completedPhases: [],
    };
  }
  const state = typeof body.state === 'string' ? body.state : '';
  const reasonCode = typeof body.reasonCode === 'string' ? body.reasonCode : '';
  const mutation = typeof body.mutation === 'string' ? body.mutation : '';
  const pending = body.pending === true;
  const completedPhases = Array.isArray(body.completedPhases)
    ? body.completedPhases.map((phase) => String(phase))
    : null;

  if (
    !STRUCTURAL_STATES.has(state) ||
    !MUTATION_STATES.has(mutation) ||
    !KNOWN_REASON_CODES.has(reasonCode) ||
    completedPhases == null ||
    !isValidPhasePrefix(completedPhases)
  ) {
    return {
      ok: false,
      state: 'unreadable',
      reasonCode: 'invalid-receipt',
      mutation: 'possible',
      completedPhases: [],
    };
  }

  if (body.ok !== (command.exitCode === 0)) {
    return {
      ok: false,
      state,
      reasonCode: 'invalid-receipt',
      mutation: 'none',
      completedPhases: completedPhases.slice(),
    };
  }

  const successfulEnsure =
    command.exitCode === 0 &&
    body.ok === true &&
    state === 'ready' &&
    !pending &&
    ((mutation === 'none' && completedPhases.length === 0) ||
      (mutation === 'confirmed' &&
        completedPhases.length === OBSERVABILITY_MUTATION_PHASES.length));

  if (command.exitCode === 0 && body.ok === true && !successfulEnsure) {
    return {
      ok: false,
      state,
      reasonCode: 'invalid-receipt',
      mutation: mutation === 'none' ? 'none' : 'possible',
      completedPhases: completedPhases.slice(),
    };
  }

  if (command.exitCode !== 0 && body.ok === true) {
    return {
      ok: false,
      state,
      reasonCode: 'invalid-receipt',
      mutation: 'none',
      completedPhases: completedPhases.slice(),
    };
  }

  if (
    command.exitCode !== 0 &&
    body.ok === false &&
    mutation === 'none' &&
    completedPhases.length === 0
  ) {
    return {
      ok: false,
      state,
      reasonCode,
      mutation: 'none',
      completedPhases: [],
    };
  }

  if (command.exitCode !== 0 && body.ok === false && mutation === 'confirmed') {
    return {
      ok: false,
      state,
      reasonCode,
      mutation: 'possible',
      completedPhases: completedPhases.slice(),
    };
  }

  return {
    ok: body.ok === true && command.exitCode === 0,
    state,
    reasonCode,
    mutation,
    completedPhases: completedPhases.slice(),
  };
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
  const reason = KNOWN_REASON_CODES.has(reasonCode) ? reasonCode : 'unreadable';
  return {
    status: 'FAIL',
    reason,
    state: STRUCTURAL_STATES.has(state) ? state : 'unreadable',
    pending,
  };
}

/**
 * @param {unknown} result
 * @param {{ allowAbsent?: boolean }} [options]
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

  const body = /** @type {Record<string, unknown>} */ (extracted.value);
  if (body.schema !== 1) {
    return {
      status: 'FAIL',
      reason: 'invalid-receipt',
      state: 'unreadable',
      pending: false,
    };
  }
  for (const key of Object.keys(body)) {
    if (
      ![
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
      ].includes(key)
    ) {
      return {
        status: 'FAIL',
        reason: 'invalid-receipt',
        state: 'unreadable',
        pending: false,
      };
    }
  }
  if (body.ok === true && body.state === 'ready' && body.pending === true) {
    return {
      status: 'FAIL',
      reason: 'pending',
      state: 'ready',
      pending: true,
    };
  }
  return toObservationReceipt(
    {
      state: typeof body.state === 'string' ? body.state : 'unreadable',
      reasonCode:
        typeof body.reasonCode === 'string' ? body.reasonCode : 'unreadable',
      pending: body.pending === true,
    },
    options,
  );
}
