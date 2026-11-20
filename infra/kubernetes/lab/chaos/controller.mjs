#!/usr/bin/env node
/**
 * Chaos lab controller — plan mode (dry-run) by default.
 * --execute is rejected until T04 implements mutation paths.
 */

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import { runPreflightPlan } from './preflight.mjs';

/**
 * @param {string[]} argv
 */
export function parseControllerArgs(argv) {
  const out = {
    mode: 'plan',
    dryRun: true,
    execute: false,
    seed: undefined,
    maxEvents: 1,
    runId: undefined,
    releaseRef: undefined,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--help':
      case '-h':
        out.help = true;
        break;
      case '--mode':
        out.mode = argv[++i] ?? 'plan';
        break;
      case '--dry-run':
        out.dryRun = true;
        break;
      case '--no-dry-run':
        out.dryRun = false;
        break;
      case '--execute':
        out.execute = true;
        break;
      case '--seed':
        out.seed = argv[++i];
        break;
      case '--max-events':
        out.maxEvents = Number(argv[++i]);
        break;
      case '--run-id':
        out.runId = argv[++i];
        break;
      case '--release-ref':
        out.releaseRef = argv[++i];
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return out;
}

/**
 * @param {ReturnType<typeof parseControllerArgs>} args
 */
export function controllerOutcome(args) {
  if (args.help) {
    return { type: 'help' };
  }
  if (args.execute || args.mode === 'execute') {
    return {
      type: 'refused',
      plan: {
        schema: 'offscreen.chaos-plan.v1',
        status: 'refused',
        reason: 'execute-not-implemented',
        detail: 'T04',
        mode: args.mode,
        dryRun: args.dryRun,
      },
      exitCode: 2,
    };
  }
  if (args.mode !== 'plan') {
    return {
      type: 'refused',
      plan: {
        schema: 'offscreen.chaos-plan.v1',
        status: 'refused',
        reason: 'mode-not-implemented',
        detail: args.mode,
      },
      exitCode: 2,
    };
  }
  if (!args.releaseRef) {
    return {
      type: 'refused',
      plan: {
        schema: 'offscreen.chaos-plan.v1',
        status: 'refused',
        reason: 'missing-release-ref',
      },
      exitCode: 2,
    };
  }
  if (!args.runId) {
    return {
      type: 'refused',
      plan: {
        schema: 'offscreen.chaos-plan.v1',
        status: 'refused',
        reason: 'missing-run-id',
      },
      exitCode: 2,
    };
  }

  return { type: 'plan', args };
}

/** @param {string} text */
export function usage(text = '') {
  return `${text}Usage: chaos-controller.mjs plan \\
  --run-id <id> --seed <seed> --release-ref <path> [--max-events N]

Defaults: --mode plan, --dry-run (read-only; no cluster mutations).
--execute is rejected until T04.
`.trim();
}

/**
 * @param {{
 *   argv?: string[],
 *   execFile?: typeof defaultExecFile,
 *   write?: (chunk: string) => void,
 * }} [options]
 */
export function runController(options = {}) {
  const argv = options.argv ?? process.argv.slice(2);
  const write = options.write ?? ((c) => process.stdout.write(c));
  const execFile = options.execFile ?? defaultExecFile;

  let parsed;
  try {
    parsed = parseControllerArgs(argv);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    write(`${usage(message)}\n`);
    return { exitCode: 2, plan: null };
  }

  const outcome = controllerOutcome(parsed);
  if (outcome.type === 'help') {
    write(`${usage()}\n`);
    return { exitCode: 0, plan: null };
  }
  if (outcome.type === 'refused') {
    write(`${JSON.stringify(outcome.plan)}\n`);
    return { exitCode: outcome.exitCode ?? 2, plan: outcome.plan };
  }

  const plan = runPreflightPlan({
    runId: parsed.runId,
    seed: parsed.seed,
    maxEvents: parsed.maxEvents,
    releaseRefPath: parsed.releaseRef,
    dryRun: parsed.dryRun,
    mode: parsed.mode,
    execFile,
    readMeminfo: options.readMeminfo,
    clusterLockExists: options.clusterLockExists,
    readReleaseRef: options.readReleaseRef,
  });

  write(`${JSON.stringify(plan)}\n`);
  const exitCode = plan.status === 'planned' ? 0 : 2;
  return { exitCode, plan };
}

/** @param {string} file @param {string[]} args @param {object} [opts] */
function defaultExecFile(file, args, opts = {}) {
  const result = spawnSync(file, args, {
    encoding: 'utf8',
    ...opts,
  });
  return {
    argv: [file, ...args],
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
}

const entryPath = process.argv[1] ?? '';
if (entryPath.endsWith('controller.mjs')) {
  const { exitCode } = runController();
  process.exit(exitCode);
}