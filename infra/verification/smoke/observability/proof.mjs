#!/usr/bin/env node
import console from 'node:console';
import process from 'node:process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { observeObservability } from '../../../platform/observability/readiness.mjs';
import { runPlatformCommand } from '../../../platform/common/commands.mjs';

import {
  GRAFANA_DATASOURCE_UIDS,
  createEvidenceDirectory,
  defaultReceiptIo,
  gateImplemented,
  parseProofCli,
  refuseProofInvocation,
  runProofOperationSession,
} from './proof-host.mjs';
import { runSignalsProof } from './signals.mjs';
import { runOutageProof, runPersistenceProof } from './disruptions.mjs';
import {
  queryGrafanaDatasourceHealth,
  runResourcesProof,
} from './resources.mjs';
import { runPartialInstallProof } from './partial-install.mjs';

const MODULE_ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(MODULE_ROOT, '../../../..');

/**
 * @param {object} session
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
async function defaultObserve(session, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const remaining = session.remainingWorkMs();
  const deadline = session.clock.now() + Math.min(345_000, remaining);
  return observeObservability(session.profile, {
    run,
    now: session.clock.now,
    deadline,
    identity: session.identity,
    verifyArchive: false,
  });
}

async function defaultDatasourceHealth(session) {
  return queryGrafanaDatasourceHealth(session);
}

/**
 * @param {{ gate: string, profile: string, context: string }} parsed
 * @param {object} [sessionDeps]
 */
async function runLiveProof(parsed, sessionDeps = {}) {
  if (!gateImplemented(parsed.gate)) {
    return {
      ok: false,
      phase: 'not-implemented',
      reasonCode: 'gate-not-implemented',
      completed: false,
      cleanup: false,
    };
  }
  const { dir, receiptPath } = createEvidenceDirectory(REPO_ROOT);
  const io = defaultReceiptIo(dir);
  io.ensureDir(dir);
  return runProofOperationSession({
    ...parsed,
    ...sessionDeps,
    env: sessionDeps.env ?? process.env,
    evidenceDir: dir,
    receiptPath,
    io,
    readSourceSha:
      sessionDeps.readSourceSha ??
      (() => {
        const result = runPlatformCommand('git', ['rev-parse', 'HEAD'], {
          timeoutMs: 10_000,
        });
        if (!result.ok || !result.stdout.trim()) {
          throw new Error('source-sha-unreadable');
        }
        return result.stdout.trim();
      }),
    observe: sessionDeps.observe ?? ((session) => defaultObserve(session)),
    queryDatasourceHealth:
      sessionDeps.queryDatasourceHealth ??
      ((session) => defaultDatasourceHealth(session)),
    repeatObservation:
      sessionDeps.repeatObservation ?? ((session) => defaultObserve(session)),
    runSignals:
      sessionDeps.runSignals ??
      ((session) => runSignalsProof(session, sessionDeps.signalsDeps)),
    runPersistence:
      sessionDeps.runPersistence ??
      ((session) => runPersistenceProof(session, sessionDeps.disruptionsDeps)),
    runOutage:
      sessionDeps.runOutage ??
      ((session) => runOutageProof(session, sessionDeps.disruptionsDeps)),
    runResources:
      sessionDeps.runResources ??
      ((session) => runResourcesProof(session, sessionDeps.resourcesDeps)),
    runPartialInstall:
      sessionDeps.runPartialInstall ??
      ((session) =>
        runPartialInstallProof(session, sessionDeps.partialInstallDeps)),
  });
}

/**
 * @param {string[]} argv
 * @param {NodeJS.ProcessEnv} [env]
 */
export async function main(argv = process.argv, env = process.env) {
  const parsed = parseProofCli(argv);
  if (!parsed.ok) {
    console.error(
      'usage: node proof.mjs <health|signals|persistence|outage|resources|partial-install> dev kind-offscreen-dev',
    );
    return 2;
  }
  const refusal = refuseProofInvocation({
    gate: parsed.gate,
    profile: parsed.profile,
    context: parsed.context,
    env,
  });
  if (refusal.refused) {
    console.error(`REFUSED ${refusal.reasonCode}`);
    return 1;
  }
  if (!gateImplemented(parsed.gate)) {
    const sanitized = {
      schema: 1,
      gate: parsed.gate,
      ok: false,
      reasonCode: 'gate-not-implemented',
      completed: false,
      cleanup: false,
    };
    console.log(JSON.stringify(sanitized));
    return 1;
  }
  const result = await runLiveProof(parsed);
  console.log(JSON.stringify({ schema: 1, ...result }));
  return result.ok ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv).then((code) => process.exit(code));
}

export {
  runLiveProof,
  defaultObserve,
  defaultDatasourceHealth,
  queryGrafanaDatasourceHealth,
};
