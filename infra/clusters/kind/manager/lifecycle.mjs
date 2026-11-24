import { RELEASE_API_PORT, readKindProfile } from './config.mjs';

const CREATE_TIMEOUT_MS = 300000;
const RESTORE_TIMEOUT_MS = 15000;

/** @typedef {'dev' | 'release'} KindProfileId */

/**
 * Creates a Kind cluster for an allowed profile and restores the prior kubectl context.
 * @param {{
 *   profile: KindProfileId,
 *   port: number,
 *   previousContext: string | null,
 *   config: string,
 * }} input
 * @param {{
 *   run: (command: string, args: string[], options?: { input?: string, timeoutMs?: number }) => {
 *     ok: boolean,
 *     stdout?: string,
 *     stderr?: string,
 *   },
 * }} deps
 */
export function createKindCluster({ profile, port, previousContext, config }, deps) {
  if (profile !== 'dev' && profile !== 'release') {
    return {
      ok: false,
      mutated: false,
      clusterName: null,
      contextRestored: false,
      refusals: [{ id: 'invalid-profile', detail: `unknown kind profile ${profile}` }],
    };
  }

  const kindProfile = readKindProfile(profile);
  const clusterName = kindProfile.clusterName;

  if (profile === 'release' && port !== RELEASE_API_PORT) {
    return {
      ok: false,
      mutated: false,
      clusterName,
      contextRestored: false,
      refusals: [{ id: 'invalid-port', detail: `release create requires apiServerPort ${RELEASE_API_PORT}` }],
    };
  }

  let createOk = false;
  let createDetail = '';
  let contextRestored = false;
  let restoreFailed = false;
  let restoreDetail = '';

  try {
    const created = deps.run(
      'kind',
      ['create', 'cluster', '--name', clusterName, '--config', '-'],
      { input: String(config), timeoutMs: CREATE_TIMEOUT_MS },
    );
    createOk = created.ok;
    if (!created.ok) {
      createDetail = created.stderr || 'kind create cluster failed';
    }
  } finally {
    const restoreTarget =
      typeof previousContext === 'string' && previousContext.length > 0 ? previousContext : null;
    if (restoreTarget) {
      const restored = deps.run('kubectl', ['config', 'use-context', restoreTarget], {
        timeoutMs: RESTORE_TIMEOUT_MS,
      });
      contextRestored = restored.ok;
      if (!restored.ok) {
        restoreFailed = true;
        restoreDetail = restored.stderr || 'kubectl context restore failed';
      }
    }
  }

  if (createOk && !restoreFailed) {
    return { ok: true, mutated: true, clusterName, contextRestored };
  }

  /** @type {{ id: string, detail: string }[]} */
  const refusals = [];
  if (!createOk) {
    refusals.push({ id: 'cluster-create-failed', detail: createDetail });
  }
  if (restoreFailed) {
    refusals.push({ id: 'context-restore-failed', detail: restoreDetail });
  }

  return {
    ok: false,
    mutated: true,
    clusterName,
    contextRestored: contextRestored && !restoreFailed,
    refusals,
  };
}