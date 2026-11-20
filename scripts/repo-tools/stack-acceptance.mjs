#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { CONTEXT_NAME } from './stack-preflight.mjs';
import { assessStackHealth } from './stack-health.mjs';
import { readLiveStatusObservation } from './stack.mjs';

export const STABLE_ORIGINS = Object.freeze(['http://127.0.0.1:3000', 'http://localhost:3000']);

/**
 * @param {string[]} argv
 * @returns {{ ok: true, mode: 'check' | 'cold' | 'warm', execute: boolean } | { ok: false, exitCode: number, error: string }}
 */
export function resolveAcceptanceArgs(argv) {
  if (argv.includes('--reset') || argv.includes('reset')) {
    return {
      ok: false,
      exitCode: 2,
      error: 'Refusing acceptance: reset is not an acceptance command.',
    };
  }
  const modes = argv.filter((arg) => arg === 'check' || arg === 'cold' || arg === 'warm');
  if (modes.length > 1) {
    return { ok: false, exitCode: 2, error: 'Refusing acceptance: pass only one of check, cold, or warm.' };
  }
  const mode = modes[0] ?? 'check';
  if (argv.includes('--execute')) {
    return {
      ok: false,
      exitCode: 2,
      error: 'Refusing acceptance: this command is read-only and does not accept --execute.',
    };
  }
  return { ok: true, mode, execute: false };
}

/**
 * @param {{
 *   mode: 'check' | 'cold' | 'warm',
 *   execute?: boolean,
 *   context: string | null,
 *   apiServerAddress: string,
 *   portConflict?: boolean,
 *   nodesReady?: boolean,
 *   migration: 'absent' | 'running' | 'complete' | 'failed',
 *   deployments: Array<{ namespace: string, name: string, ready: boolean }>,
 *   pinnedObjectPresent?: boolean,
 *   importRoots?: { world: string, rule: string, start: string } | null,
 *   composeBootPresent?: boolean,
 *   origin?: string | null,
 *   actor?: { email: string, role: string } | null,
 *   healthOnly?: boolean,
 *   wrongActorStatus?: number | null,
 *   storyId?: string | null,
 *   checkpointId?: string | null,
 *   durations?: { coldMs?: number | null, warmMs?: number | null },
 *   peakMemoryKib?: number | null,
 *   preserved?: { email: string, storyId: string, checkpointId: string } | null,
 * }} input
 */
export function assessAcceptance(input) {
  const health = assessStackHealth({
    context: input.context,
    apiServerAddress: input.apiServerAddress,
    nodesReady: input.nodesReady !== false,
    memAvailableKib: input.peakMemoryKib ?? null,
    durations: {
      coldMs: input.durations?.coldMs ?? undefined,
      warmMs: input.durations?.warmMs ?? undefined,
    },
    migration: input.migration,
    deployments: input.deployments,
    pinnedObjectPresent: input.pinnedObjectPresent !== false,
    importRoots: input.importRoots ?? null,
    repeatStart: input.mode === 'warm',
  });

  /** @type {string[]} */
  const diagnostics = [
    ...health.cluster.diagnostics,
    ...health.service.diagnostics,
    ...health.playable.diagnostics,
  ];

  if (input.portConflict === true) {
    diagnostics.push('Refusing acceptance: loopback API port is occupied by a non-owned listener.');
  }
  if (input.composeBootPresent === true) {
    diagnostics.push('Refusing acceptance: an active Compose boot path is present.');
  }

  const playerMissing = input.healthOnly === true || input.actor == null;
  if (playerMissing) {
    diagnostics.push(
      'Refusing acceptance: a green health check without a signed-in player is not acceptance.',
    );
  } else if (!input.actor.email || input.actor.role !== 'player') {
    diagnostics.push(
      `Refusing acceptance: play session role must be player; got ${input.actor.role || 'none'}.`,
    );
  }

  if (!STABLE_ORIGINS.includes(input.origin ?? '')) {
    diagnostics.push(
      `Refusing acceptance: origin ${input.origin ?? 'null'} is not a stable loopback game origin.`,
    );
  }
  if (input.wrongActorStatus !== 401 && input.wrongActorStatus !== 403) {
    diagnostics.push(
      `Refusing acceptance: wrong actor was not denied (status ${input.wrongActorStatus ?? 'null'}).`,
    );
  }
  if (!input.storyId) {
    diagnostics.push('Refusing acceptance: no story id was observed.');
  }
  if (!input.checkpointId) {
    diagnostics.push('Refusing acceptance: no checkpoint id was observed.');
  }
  if (input.mode === 'warm') {
    const preserved = input.preserved;
    const same =
      preserved != null &&
      input.actor != null &&
      preserved.email === input.actor.email &&
      preserved.storyId === input.storyId &&
      preserved.checkpointId === input.checkpointId;
    if (!same) {
      diagnostics.push(
        'Refusing acceptance: warm repeat did not preserve story, checkpoint, and identity.',
      );
    }
  }

  const unique = [...new Set(diagnostics)];
  const safeContext = input.context === CONTEXT_NAME && input.apiServerAddress === '127.0.0.1' && input.portConflict !== true;
  /** @type {string[][]} */
  let commands = [];
  if (unique.length === 0 && safeContext && input.execute === true && input.mode === 'cold') {
    commands = [['pnpm', 'stack:up']];
  } else if (unique.length === 0 && safeContext && input.execute === true && input.mode === 'warm') {
    commands = [['pnpm', 'dev']];
  }

  return {
    ok: unique.length === 0,
    exitCode: unique.length === 0 ? 0 : 1,
    mode: input.mode,
    diagnostics: unique,
    commands,
    dataReset: false,
    durations: {
      coldMs: input.durations?.coldMs ?? null,
      warmMs: input.durations?.warmMs ?? null,
    },
    peakMemoryKib: input.peakMemoryKib ?? null,
  };
}

/**
 * A browser proof that only saw /health is a failure. Headlamp desktop remains an operator residual.
 * @param {{
 *   healthOnly?: boolean,
 *   signedIn?: boolean,
 *   started?: boolean,
 *   acted?: boolean,
 *   continued?: boolean,
 *   readBack?: boolean,
 *   forked?: boolean,
 *   adminControlStatus?: number | null,
 *   wrongActorStatus?: number | null,
 *   tiltRecovered?: boolean,
 *   headlampDesktop?: boolean,
 *   podUidBefore?: string | null,
 *   podUidAfter?: string | null,
 *   continuity?: boolean,
 * }} proof
 */
export function assessBrowserProof(proof) {
  if (proof.healthOnly === true) {
    return {
      ok: false,
      exitCode: 1,
      diagnostics: ['Browser acceptance refuses a smoke that only saw /health.'],
      residual: [],
      dataReset: false,
    };
  }
  /** @type {string[]} */
  const diagnostics = [];
  const steps = [
    ['signedIn', 'sign-in'],
    ['started', 'start'],
    ['acted', 'action'],
    ['continued', 'continue'],
    ['readBack', 'read'],
    ['forked', 'fork'],
  ];
  for (const [key, label] of steps) {
    if (proof[key] !== true) {
      diagnostics.push(`Browser acceptance missing step: ${label}.`);
    }
  }
  if (proof.adminControlStatus !== 200) {
    diagnostics.push(`Staff /control was not readable (status ${proof.adminControlStatus ?? 'null'}).`);
  }
  if (proof.wrongActorStatus !== 401 && proof.wrongActorStatus !== 403) {
    diagnostics.push(`Wrong actor was not forbidden (status ${proof.wrongActorStatus ?? 'null'}).`);
  }
  if (proof.tiltRecovered !== true) {
    diagnostics.push('Tilt rebuild failure and recovery were not observed.');
  }
  /** @type {string[]} */
  const residual = [];
  if (proof.headlampDesktop !== true) {
    residual.push('Headlamp desktop Pod delete is the operator task and was not run.');
  } else if (
    !proof.podUidBefore ||
    !proof.podUidAfter ||
    proof.podUidBefore === proof.podUidAfter ||
    proof.continuity !== true
  ) {
    diagnostics.push('Headlamp Pod replacement did not show a new UID and story continuity.');
  }
  return {
    ok: diagnostics.length === 0,
    exitCode: diagnostics.length === 0 ? 0 : 1,
    diagnostics,
    residual,
    dataReset: false,
  };
}

/**
 * @param {(argv: string[]) => { status: number | null, stdout?: string, stderr?: string }} runner
 */
export function readAcceptanceContext(runner) {
  const result = runner(['kubectl', 'config', 'current-context']);
  if (result.status !== 0) return null;
  const context = (result.stdout ?? '').trim();
  return context || null;
}

function defaultRunner(argv) {
  const result = spawnSync(argv[0], argv.slice(1), {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

/**
 * @param {ReturnType<typeof assessAcceptance>} report
 */
export function formatAcceptanceReport(report) {
  const lines = [
    `acceptance mode=${report.mode} ok=${report.ok} exit=${report.exitCode}`,
    `elapsed coldMs=${report.durations.coldMs ?? 'null'} warmMs=${report.durations.warmMs ?? 'null'}`,
    `peakMemoryKib=${report.peakMemoryKib ?? 'null'}`,
    `dataReset=${report.dataReset}`,
    ...report.diagnostics,
    ...report.commands.map((argv) => argv.join(' ')),
  ];
  return lines.join('\n');
}

const invokedAsScript = process.argv[1] && process.argv[1].endsWith('stack-acceptance.mjs');
if (invokedAsScript) {
  const resolved = resolveAcceptanceArgs(process.argv.slice(2));
  if (!resolved.ok) {
    console.error(resolved.error);
    process.exitCode = resolved.exitCode;
  } else {
    const runner = defaultRunner;
    const context = readAcceptanceContext(runner);
    const live = readLiveStatusObservation(runner);
    const report = assessAcceptance({
      mode: resolved.mode,
      execute: false,
      context,
      apiServerAddress: live.apiServerAddress,
      nodesReady: live.nodesReady,
      migration: live.migration,
      deployments: live.deployments,
      pinnedObjectPresent: live.pinnedObjectPresent,
      importRoots: live.importRoots,
      origin: null,
      actor: null,
      healthOnly: true,
      wrongActorStatus: null,
      storyId: null,
      checkpointId: null,
      durations: {},
      peakMemoryKib: Math.round(process.memoryUsage().rss / 1024),
      composeBootPresent: false,
    });
    const text = formatAcceptanceReport(report);
    if (report.ok) console.log(text);
    else console.error(text);
    console.error(
      'Live player, browser, Tilt recovery, and Headlamp desktop proof were not attached to this process.',
    );
    process.exitCode = report.ok ? 0 : report.exitCode;
  }
}
