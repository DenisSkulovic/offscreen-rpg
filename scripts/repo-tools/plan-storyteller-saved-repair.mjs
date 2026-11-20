import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createDatabase } from '../../packages/db/dist/src/index.js';
import {
  applySavedRepair,
  SavedRepairApplyError,
} from '../../packages/application/dist/storyteller/saved-repair-apply.js';
import {
  previewSavedRepair,
  SavedRepairPlanRefusal,
} from '../../packages/application/dist/storyteller/saved-repair-plan.js';
import { SavedRepairInspectionRefusal } from '../../packages/application/dist/storyteller/saved-response-inspection.js';
import { fail } from './process.mjs';

const REPAIR_TEST_DB = '/offscreen_hk01_repair_test';

function parseArgs(argv) {
  const values = {
    plan: false,
    apply: false,
    localDisposable: false,
    databaseUrl: null,
    evidenceRoot: null,
    evidence: null,
    generation: null,
    attempt: null,
    planFingerprint: null,
    operator: null,
    reason: null,
    expectedStatusRevision: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--plan') {
      values.plan = true;
      continue;
    }
    if (token === '--apply') {
      values.apply = true;
      continue;
    }
    if (token === '--local-disposable') {
      values.localDisposable = true;
      continue;
    }
    if (token === '--database-url') {
      values.databaseUrl = argv[++index];
      continue;
    }
    if (token === '--evidence-root') {
      values.evidenceRoot = argv[++index];
      continue;
    }
    if (token === '--evidence') {
      values.evidence = argv[++index];
      continue;
    }
    if (token === '--generation') {
      values.generation = argv[++index];
      continue;
    }
    if (token === '--attempt') {
      values.attempt = argv[++index];
      continue;
    }
    if (token === '--plan-fingerprint') {
      values.planFingerprint = argv[++index];
      continue;
    }
    if (token === '--operator') {
      values.operator = argv[++index];
      continue;
    }
    if (token === '--reason') {
      values.reason = argv[++index];
      continue;
    }
    if (token === '--expected-status-revision') {
      const parsed = Number(argv[++index]);
      if (!Number.isInteger(parsed)) {
        fail('Expected status revision must be an integer.');
      }
      values.expectedStatusRevision = parsed;
      continue;
    }
    fail(`Unknown argument: ${token}`);
  }

  return values;
}

function hold(code) {
  process.stdout.write(`${JSON.stringify({ disposition: 'hold', code })}\n`);
  process.exit(1);
}

async function resolveEvidence(evidenceRoot, evidenceArgument) {
  if (!evidenceRoot || !evidenceArgument) {
    hold('evidence_missing');
  }
  const rootReal = await realpath(evidenceRoot);
  const target = path.resolve(evidenceRoot, evidenceArgument);
  let targetReal;
  try {
    targetReal = await realpath(target);
  } catch {
    hold('evidence_not_file');
  }
  const relative = path.relative(rootReal, targetReal);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    hold('evidence_escape');
  }
  const stats = await lstat(target);
  if (stats.isSymbolicLink()) {
    hold('evidence_symlink');
  }
  if (!stats.isFile() || path.extname(targetReal) !== '.json') {
    hold('evidence_not_file');
  }
  return readFile(targetReal);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.plan && !args.apply) {
    hold('plan_or_apply_required');
  }
  if (args.plan && args.apply) {
    hold('plan_apply_exclusive');
  }
  if (args.apply && !args.planFingerprint) {
    hold('plan_fingerprint_required');
  }
  if (args.apply && (!args.operator || !args.reason)) {
    hold('operator_reason_required');
  }
  if (!args.localDisposable) {
    hold('local_disposable_required');
  }
  if (!args.databaseUrl) {
    hold('database_url_required');
  }
  let databasePath;
  try {
    databasePath = new URL(args.databaseUrl).pathname;
  } catch {
    hold('database_url_invalid');
  }
  if (databasePath !== REPAIR_TEST_DB) {
    hold('database_url_not_allowed');
  }
  if (!args.generation || !args.attempt) {
    hold('generation_attempt_required');
  }

  const evidenceBytes = await resolveEvidence(args.evidenceRoot, args.evidence);

  const database = createDatabase(
    { connectionString: args.databaseUrl },
    () => {},
  );
  try {
    const sharedInput = {
      generationId: args.generation,
      attemptId: args.attempt,
      evidenceBytes,
      ...(args.expectedStatusRevision === undefined
        ? {}
        : { expectedStatusRevision: args.expectedStatusRevision }),
    };
    if (args.plan) {
      const plan = await previewSavedRepair(database, sharedInput);
      process.stdout.write(`${JSON.stringify(plan)}\n`);
      return;
    }
    const result = await applySavedRepair(database, {
      ...sharedInput,
      planFingerprint: args.planFingerprint,
      operatorId: args.operator,
      reason: args.reason,
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    if (
      error instanceof SavedRepairPlanRefusal ||
      error instanceof SavedRepairInspectionRefusal ||
      error instanceof SavedRepairApplyError
    ) {
      hold(error.code);
    }
    throw error;
  } finally {
    await database.close();
  }
}

main().catch((error) => fail(error));