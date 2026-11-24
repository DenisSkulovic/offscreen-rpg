#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { execPath } from 'node:process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runStackPreflight, CONTEXT_NAME } from './stack-preflight.mjs';
import { EXPECTED_IMPORT_ROOTS } from '../../infra/verification/release-acceptance/turn03/fixture-import-roots.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OWNED_RESOURCES_PATH = join(REPO_ROOT, 'infra/environments/release/owned-app-resources.json');

/** @typedef {'up' | 'down' | 'reset'} StackLifecycleCommand */

/** @typedef {{
 *   clusterPresent: boolean,
 *   migration: 'absent' | 'running' | 'complete' | 'failed' | 'unreadable',
 *   importRoots: { world: string, rule: string, start: string } | null,
 * }} StackObservation */

/**
 * @typedef {import('./stack-preflight.mjs').StackPreflightProbes} StackPreflightProbes
 */

/**
 * @typedef {{
 *   command: StackLifecycleCommand,
 *   probes: StackPreflightProbes,
 *   confirmation?: string,
 *   observation: StackObservation,
 * }} StackPlanInput
 */

/**
 * @typedef {{
 *   ok: boolean,
 *   exitCode: number,
 *   commands: string[][],
 *   messages: string[],
 *   urls: [],
 * }} StackPlanResult
 */

const RELEASE_DOWN_ALLOWLIST_COUNT = 11;
const ALLOWED_DOWN_KINDS = new Set(['Job', 'Deployment', 'Service', 'HTTPRoute']);

/**
 * @param {unknown} allowlist
 */
export function assertReleaseDownAllowlist(allowlist) {
  if (!Array.isArray(allowlist)) {
    throw new Error('downAllowlist must be an array');
  }
  if (allowlist.length !== RELEASE_DOWN_ALLOWLIST_COUNT) {
    throw new Error(
      `downAllowlist must contain exactly ${RELEASE_DOWN_ALLOWLIST_COUNT} entries, got ${allowlist.length}`,
    );
  }
  for (const entry of allowlist) {
    if (!entry || typeof entry !== 'object') {
      throw new Error('downAllowlist entry must be an object with namespace, kind, and name');
    }
    const { namespace, kind, name } = /** @type {{ namespace?: unknown, kind?: unknown, name?: unknown }} */ (
      entry
    );
    if (typeof namespace !== 'string' || !namespace) {
      throw new Error('downAllowlist entry namespace must be a non-empty string');
    }
    if (typeof name !== 'string' || !name) {
      throw new Error('downAllowlist entry name must be a non-empty string');
    }
    if (typeof kind !== 'string' || !ALLOWED_DOWN_KINDS.has(kind)) {
      throw new Error(`downAllowlist forbids kind ${String(kind)}`);
    }
  }
}

function loadOwnedResources() {
  const owned = JSON.parse(readFileSync(OWNED_RESOURCES_PATH, 'utf8'));
  assertReleaseDownAllowlist(owned.downAllowlist);
  return owned;
}

/**
 * @param {{ world: string, rule: string, start: string }} observed
 * @param {{ world: string, rule: string, start: string }} expected
 * @returns {string[]}
 */
function mismatchedImportRoots(observed, expected) {
  /** @type {string[]} */
  const bad = [];
  if (observed.world !== expected.world) {
    bad.push('wrong-root-world');
  }
  if (observed.rule !== expected.rule) {
    bad.push('wrong-root-rule');
  }
  if (observed.start !== expected.start) {
    bad.push('wrong-root-start');
  }
  return bad;
}

/**
 * @param {StackPlanInput} input
 * @returns {StackPlanResult}
 */
export function buildStackPlan(input) {
  const urls = /** @type {[]} */ ([]);
  const owned = loadOwnedResources();
  const preflight = runStackPreflight(input.probes, {
    requireHelm: input.command === 'up',
  });

  if (!preflight.ok) {
    return {
      ok: false,
      exitCode: 1,
      commands: [],
      messages: preflight.refusals.map((r) => r.message),
      urls,
    };
  }

  const { command, observation, confirmation } = input;

  if (command === 'up') {
    if (observation.clusterPresent) {
      if (observation.migration === 'failed') {
        return {
          ok: false,
          exitCode: 1,
          commands: [],
          messages: [
            'Refusing stack up: migration Job failed; fix migration before reapplying release.',
          ],
          urls,
        };
      }
      if (observation.migration === 'unreadable') {
        return {
          ok: false,
          exitCode: 1,
          commands: [],
          messages: [
            'Refusing stack up: migration Job is unreadable; fix cluster read access before reapplying release.',
          ],
          urls,
        };
      }
      if (observation.importRoots !== null) {
        const bad = mismatchedImportRoots(observation.importRoots, EXPECTED_IMPORT_ROOTS);
        if (bad.length > 0) {
          return {
            ok: false,
            exitCode: 1,
            commands: [],
            messages: bad.map(
              (id) => `Refusing stack up: ${id} (import root hash mismatch).`,
            ),
            urls,
          };
        }
      }
    } else if (observation.migration === 'failed') {
      return {
        ok: false,
        exitCode: 1,
        commands: [],
        messages: [
          'Refusing stack up: migration Job failed; fix migration before reapplying release.',
        ],
        urls,
      };
    }

    /** @type {string[][]} */
    const commands = [];
    if (!observation.clusterPresent) {
      commands.push(['bash', owned.clusterUp]);
    }
    commands.push([execPath, join(REPO_ROOT, owned.releasePlatformEnsure), 'ensure', CONTEXT_NAME]);
    commands.push(['bash', owned.releaseInstall]);

    return { ok: true, exitCode: 0, commands, messages: [], urls };
  }

  if (command === 'down') {
    const commands = owned.downAllowlist.map((entry) => [
      'kubectl',
      '--context',
      CONTEXT_NAME,
      '-n',
      entry.namespace,
      'delete',
      entry.kind,
      entry.name,
      '--ignore-not-found=true',
    ]);
    return { ok: true, exitCode: 0, commands, messages: [], urls };
  }

  if (command === 'reset') {
    if (confirmation === CONTEXT_NAME) {
      return {
        ok: true,
        exitCode: 0,
        commands: [['bash', owned.clusterReset, CONTEXT_NAME]],
        messages: [],
        urls,
      };
    }
    return {
      ok: false,
      exitCode: 1,
      commands: [],
      messages: [`Refusing stack reset: type exact confirmation "${CONTEXT_NAME}".`],
      urls,
    };
  }

  return {
    ok: false,
    exitCode: 1,
    commands: [],
    messages: [`Unknown stack lifecycle command: ${String(command)}.`],
    urls,
  };
}