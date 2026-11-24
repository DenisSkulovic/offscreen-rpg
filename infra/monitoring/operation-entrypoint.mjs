import process from 'node:process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createInjectableClock,
  createOperationEventWriter,
} from './operation-event.mjs';

/**
 * @param {number} exitCode
 * @param {{ refused?: boolean, cancelled?: boolean }} [options]
 */
export function classifyExitCode(exitCode, options = {}) {
  if (exitCode === 0) return 'success';
  if (options.refused === true) return 'refused';
  if (options.cancelled === true || exitCode === 130) return 'cancelled';
  return 'failure';
}

/**
 * @param {NonNullable<ReturnType<ReturnType<typeof createOperationEventWriter>['beginOperation']>>} op
 * @param {number} exitCode
 * @param {{ refused?: boolean, cancelled?: boolean }} [options]
 */
export function completeOperation(op, exitCode, options = {}) {
  const result = classifyExitCode(exitCode, options);
  if (result === 'success') return op.finish('success');
  if (result === 'refused') return op.fail('refused');
  if (result === 'cancelled') return op.fail('cancelled');
  return op.fail('failure');
}

/**
 * @param {string} name
 * @param {string} operationId
 * @param {number} exitCode
 * @param {{ refused?: boolean, cancelled?: boolean, repoRoot?: string }} [options]
 * @param {object} [deps]
 */
export function emitTerminalOperation(name, operationId, exitCode, options = {}, deps = {}) {
  const writer = createOperationEventWriter({
    repoRoot: options.repoRoot,
    skipGit: true,
    ...deps,
  });
  const clock = deps.clock ?? createInjectableClock(deps.wallSeconds, deps.hrtimeBigint);
  const result = classifyExitCode(exitCode, options);
  const event = result === 'success' ? 'end' : 'failure';
  return writer.emit(event, {
    operationId,
    name,
    result,
    observedAt: clock.observedAtUtc(),
    monotonicNs: clock.monotonicNs(),
  });
}

/**
 * @param {string} name
 * @param {{ repoRoot?: string, parentOperationId?: string | null }} [options]
 * @param {object} [deps]
 * @returns {{ operationId: string, name: string } | null}
 */
export function beginShellOperation(name, options = {}, deps = {}) {
  if (deps.disabled === true || process.env.OFFSCREEN_MONITOR_DISABLED === '1') {
    return null;
  }
  const writer = createOperationEventWriter({
    repoRoot: options.repoRoot,
    skipGit: true,
    ...deps,
  });
  const inherited =
    typeof process.env.OFFSCREEN_MONITOR_OPERATION_ID === 'string'
      ? process.env.OFFSCREEN_MONITOR_OPERATION_ID.trim()
      : options.parentOperationId ?? null;
  const parentOperationId =
    inherited && /^[0-9a-f-]{36}$/i.test(inherited) ? inherited : null;
  const op = writer.beginOperation({
    name,
    skipGit: true,
    parentOperationId,
  });
  if (!op) return null;
  return { operationId: op.operationId, name: op.name };
}

/**
 * @template T
 * @param {string} name
 * @param {(op: NonNullable<ReturnType<ReturnType<typeof createOperationEventWriter>['beginOperation']>> | null) => T} body
 * @param {object} [deps]
 */
export function runTrackedEntrypoint(name, body, deps = {}) {
  const writer = createOperationEventWriter(deps);
  const op = writer.beginOperation({ name, skipGit: deps.skipGit ?? true });
  if (!op) {
    return body(null);
  }
  const previousOperationId = process.env.OFFSCREEN_MONITOR_OPERATION_ID;
  const childEnv = op.childEnv();
  if (childEnv.OFFSCREEN_MONITOR_OPERATION_ID) {
    process.env.OFFSCREEN_MONITOR_OPERATION_ID = childEnv.OFFSCREEN_MONITOR_OPERATION_ID;
  }
  try {
    const outcome = body(op);
    /** @type {number} */
    let exitCode = 0;
    let refused = false;
    let cancelled = false;
    if (typeof outcome === 'number') {
      exitCode = outcome;
    } else if (outcome && typeof outcome === 'object') {
      exitCode = /** @type {{ exitCode?: number }} */ (outcome).exitCode ?? 0;
      refused = /** @type {{ refused?: boolean }} */ (outcome).refused === true;
      cancelled = /** @type {{ cancelled?: boolean }} */ (outcome).cancelled === true;
    }
    completeOperation(op, exitCode, { refused, cancelled });
    return outcome;
  } catch (error) {
    op.fail('failure');
    throw error;
  } finally {
    if (previousOperationId === undefined) {
      delete process.env.OFFSCREEN_MONITOR_OPERATION_ID;
    } else {
      process.env.OFFSCREEN_MONITOR_OPERATION_ID = previousOperationId;
    }
  }
}

const modulePath = fileURLToPath(import.meta.url);
const isCliMain =
  process.argv[1] !== undefined && resolve(process.argv[1]) === modulePath;

if (isCliMain) {
  const [command, name, operationId, exitCodeText] = process.argv.slice(2);
  const repoRoot = process.env.OFFSCREEN_REPO_ROOT?.trim() || process.cwd();
  if (command === 'begin' && name) {
    const started = beginShellOperation(name, { repoRoot });
    if (started) {
      process.stdout.write(`OFFSCREEN_SHELL_OPERATION_ID=${started.operationId}\n`);
      process.stdout.write(`OFFSCREEN_SHELL_OPERATION_NAME=${started.name}\n`);
    }
    process.exitCode = 0;
  } else if (command === 'end' && name && operationId && exitCodeText !== undefined) {
    const exitCode = Number.parseInt(exitCodeText, 10);
    const refused = process.env.OFFSCREEN_SHELL_OPERATION_REFUSED === '1';
    emitTerminalOperation(name, operationId, Number.isNaN(exitCode) ? 1 : exitCode, {
      refused,
      repoRoot,
    });
    process.exitCode = 0;
  } else {
    process.stderr.write('usage: operation-entrypoint.mjs begin <name> | end <name> <operationId> <exitCode>\n');
    process.exitCode = 2;
  }
}