#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runStackPreflight } from './stack-preflight.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OWNED_RESOURCES_PATH = join(REPO_ROOT, 'infra/kubernetes/lab/dev/owned-app-resources.json');

/** @typedef {'up' | 'down' | 'reset'} StackLifecycleCommand */

/** @typedef {{
 *   clusterPresent: boolean,
 *   migration: 'absent' | 'running' | 'complete' | 'failed',
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

function loadOwnedResources() {
  return JSON.parse(readFileSync(OWNED_RESOURCES_PATH, 'utf8'));
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
  const preflight = runStackPreflight(input.probes);

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
    if (observation.migration === 'failed') {
      return {
        ok: false,
        exitCode: 1,
        commands: [],
        messages: ['Refusing stack up: migration Job failed; fix migration before reapplying release.'],
        urls,
      };
    }

    if (observation.importRoots !== null) {
      const bad = mismatchedImportRoots(observation.importRoots, owned.expectedImportRoots);
      if (bad.length > 0) {
        return {
          ok: false,
          exitCode: 1,
          commands: [],
          messages: bad.map((id) => `Refusing stack up: ${id} (import root hash mismatch).`),
          urls,
        };
      }
    }

    /** @type {string[][]} */
    const commands = [];
    if (!observation.clusterPresent) {
      commands.push(['bash', owned.clusterUp]);
    }
    commands.push(['bash', owned.releaseInstall]);

    return { ok: true, exitCode: 0, commands, messages: [], urls };
  }

  if (command === 'down') {
    const commands = owned.downAllowlist.map((entry) => [
      'kubectl',
      '--context',
      owned.contextName,
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
    if (confirmation === owned.resetConfirmation) {
      return {
        ok: true,
        exitCode: 0,
        commands: [['bash', owned.clusterReset]],
        messages: [],
        urls,
      };
    }
    return {
      ok: false,
      exitCode: 1,
      commands: [],
      messages: [`Refusing stack reset: type exact confirmation "${owned.resetConfirmation}".`],
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