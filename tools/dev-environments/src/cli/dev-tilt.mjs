#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  attachUnattachedEnvironment,
  isAllocatorRefusal,
  probeLoopbackPortBindableSync,
  reserveUnattachedEnvironment,
} from '../domain/dev-worktree-allocator.mjs';
import { readRegistryJson } from '../domain/dev-worktree-registry.mjs';
import { printDevStatus } from '../application/dev-status.mjs';
import { readProcessStartTicks } from '../domain/dev-process-identity.mjs';
import {
  environmentSessionRoot,
  isAllocatorRefusal as isSelectionRefusal,
  parseDevCliArgs,
  readEnvironmentSession,
  readLegacyDevSession,
  resolveDevEnvironmentSelection,
} from '../domain/dev-environment-session.mjs';
import {
  devWorktreeRegistryRoot,
  readDevSession,
  runDevEnvironmentStop,
  runDevTiltLaunch,
} from '../application/dev-lifecycle.mjs';

const REPO_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../',
);

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function runDevTiltCli() {
  await runDevTiltLaunch();
}

function runDevStatusCli() {
  const worktree = REPO_ROOT;
  const session = readDevSession(worktree);
  const code = printDevStatus(worktree, { pullSlotReceipts: true });
  if (code !== 0) {
    if (!session) {
      console.error(
        'No dev session for this worktree. Start one with: pnpm dev',
      );
    }
    process.exit(code);
  }
}

/**
 * @param {{ slotId: string, ports: { game: number, control: number, tilt: number, spare: number } }} record
 */
export function formatReservedEnvironmentLine(record) {
  const { game, control, tilt, spare } = record.ports;
  return `${record.slotId} game=${game} control=${control} tilt=${tilt} spare=${spare} RESERVED / UNATTACHED / UNPROVISIONED`;
}

/**
 * @param {{ slotId: string }} record
 */
export function formatAttachedEnvironmentLine(record) {
  return `${record.slotId} ATTACHED / UNPROVISIONED`;
}

/**
 * @param {{
 *   registryRoot?: string,
 *   reserve?: typeof reserveUnattachedEnvironment,
 *   reserveDeps?: import('../domain/dev-worktree-allocator.mjs').DevWorktreeAllocatorDeps,
 *   log?: (line: string) => void,
 *   exit?: (code: number) => void,
 * }} [deps]
 */
export function runDevReserveCli(deps = {}) {
  const registryRoot = deps.registryRoot ?? devWorktreeRegistryRoot();
  const reserve = deps.reserve ?? reserveUnattachedEnvironment;
  const log = deps.log ?? ((line) => console.log(line));
  const exit = deps.exit ?? ((code) => process.exit(code));
  try {
    const record = reserve(registryRoot, deps.reserveDeps);
    log(formatReservedEnvironmentLine(record));
    exit(0);
  } catch (error) {
    if (isAllocatorRefusal(error)) {
      console.error(`${error.id}: ${error.message}`);
      exit(1);
      return;
    }
    throw error;
  }
}

/**
 * @param {string} instance
 * @param {{
 *   worktree?: string,
 *   registryRoot?: string,
 *   attach?: typeof attachUnattachedEnvironment,
 *   attachDeps?: import('../domain/dev-worktree-allocator.mjs').AttachUnattachedEnvironmentDeps,
 *   log?: (line: string) => void,
 *   exit?: (code: number) => void,
 * }} [deps]
 */
export function runDevAttachCli(instance, deps = {}) {
  const registryRoot = deps.registryRoot ?? devWorktreeRegistryRoot();
  const worktree = deps.worktree ?? REPO_ROOT;
  const attach = deps.attach ?? attachUnattachedEnvironment;
  const log = deps.log ?? ((line) => console.log(line));
  const exit = deps.exit ?? ((code) => process.exit(code));
  const attachDeps = {
    isPortAvailable: probeLoopbackPortBindableSync,
    processDeps: {
      pidAlive,
      readStartTicks: (pid) => readProcessStartTicks(pid),
    },
    readLegacySession: readLegacyDevSession,
    ...deps.attachDeps,
  };
  try {
    const record = attach(worktree, registryRoot, instance, attachDeps);
    log(formatAttachedEnvironmentLine(record));
    exit(0);
  } catch (error) {
    if (isAllocatorRefusal(error)) {
      console.error(`${error.id}: ${error.message}`);
      exit(1);
      return;
    }
    throw error;
  }
}

async function runDevStopCli(selection) {
  await runDevEnvironmentStop(selection, { worktree: REPO_ROOT });
}

const invokedAsScript =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  let parsed;
  try {
    parsed = parseDevCliArgs(process.argv);
  } catch (error) {
    if (isSelectionRefusal(error)) {
      console.error(`${error.id}: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
  if (parsed.command === 'reserve') {
    runDevReserveCli();
  } else if (parsed.command === 'attach') {
    runDevAttachCli(parsed.instance);
  } else {
    const registryRoot = devWorktreeRegistryRoot();
    const registry = readRegistryJson(registryRoot);
    const registryV2 = registry?.version === 2;
    if (!registryV2 && parsed.command === 'up' && !parsed.instance) {
      await runDevTiltCli();
    } else if (!registryV2 && parsed.command === 'status' && !parsed.instance) {
      runDevStatusCli();
    } else if (!registryV2 && parsed.command === 'stop' && !parsed.instance) {
      await runDevStopCli(null);
    } else {
      let selection;
      try {
        selection = resolveDevEnvironmentSelection({
          command: parsed.command,
          instance: parsed.instance,
          worktree: REPO_ROOT,
          registryRoot,
          processDeps: {
            pidAlive,
            readStartTicks: (pid) => readProcessStartTicks(pid),
          },
        });
      } catch (error) {
        if (isSelectionRefusal(error)) {
          console.error(`${error.id}: ${error.message}`);
          process.exit(1);
        }
        throw error;
      }
      if (selection.action === 'up') {
        await runDevTiltLaunch({
          owner: selection.record,
          worktree: REPO_ROOT,
          registryRoot,
        });
      } else if (selection.action === 'status') {
        const session = readEnvironmentSession(
          environmentSessionRoot(devWorktreeRegistryRoot()),
          selection.record.slotId,
        );
        const code = printDevStatus(selection.record.worktreePath, {
          session,
          pullSlotReceipts: true,
        });
        process.exit(code);
      } else if (selection.action === 'stop') {
        await runDevStopCli(selection);
      }
    }
  }
}
