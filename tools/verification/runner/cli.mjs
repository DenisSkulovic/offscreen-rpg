#!/usr/bin/env node
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import {
  REPO_ROOT,
  buildVerificationCatalog,
  buildVerificationPlan,
  resolveSubject,
} from './catalog.mjs';
import { runVerification } from './execute.mjs';
import { buildDbVerificationDeps } from '../suites/packages/db/adapter.mjs';
import { buildInfraVerificationDeps } from '../suites/infra/adapter.mjs';

/**
 * @param {object} plan
 * @param {object} deps
 */
export function buildVerificationExecutionDeps(plan, deps) {
  return buildDbVerificationDeps(plan, buildInfraVerificationDeps(plan, deps));
}

/** @typedef {{ ok: true, command: 'list' } | { ok: true, kind: 'infra' | 'package' | 'app', name?: string, profile?: string, section?: string, plan: boolean, live: boolean, json: boolean } | { ok: false, exitCode: number, message: string }} ParsedArgs */

const KNOWN_SUBJECTS = new Set(['infra', 'package', 'app']);
const VALUE_FLAGS = new Set(['--profile', '--section']);

/**
 * @param {string[]} argv
 * @returns {ParsedArgs}
 */
export function parseCliArgs(argv) {
  if (argv.length === 0) {
    return { ok: false, exitCode: 2, message: 'missing command' };
  }

  if (argv[0] === 'list') {
    const seen = new Set();
    for (let index = 1; index < argv.length; index += 1) {
      const token = argv[index];
      if (token === '--json') continue;
      if (token.startsWith('--')) {
        return { ok: false, exitCode: 2, message: `unknown option: ${token}` };
      }
      return {
        ok: false,
        exitCode: 2,
        message: 'unexpected positional arguments',
      };
    }
    for (const token of argv) {
      if (token === '--json') {
        if (seen.has(token)) {
          return {
            ok: false,
            exitCode: 2,
            message: `duplicate option: ${token}`,
          };
        }
        seen.add(token);
        continue;
      }
      if (token.startsWith('--') && !seen.has(token)) {
        seen.add(token);
      }
    }
    return {
      ok: true,
      command: 'list',
      json: argv.includes('--json'),
    };
  }

  const kind = argv[0];
  if (!KNOWN_SUBJECTS.has(kind)) {
    return { ok: false, exitCode: 2, message: `unknown command: ${kind}` };
  }

  /** @type {Record<string, boolean | string | undefined>} */
  const flags = {
    profile: undefined,
    section: undefined,
    plan: false,
    live: false,
    json: false,
  };
  const flagCounts = new Map();
  let name;
  let index = 1;

  for (; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      if (kind === 'infra') {
        return {
          ok: false,
          exitCode: 2,
          message: 'unexpected positional arguments',
        };
      }
      if (name) {
        return {
          ok: false,
          exitCode: 2,
          message: 'unexpected positional arguments',
        };
      }
      name = token;
      continue;
    }

    if (VALUE_FLAGS.has(token)) {
      flagCounts.set(token, (flagCounts.get(token) ?? 0) + 1);
      if (flagCounts.get(token) > 1) {
        return {
          ok: false,
          exitCode: 2,
          message: `duplicate option: ${token}`,
        };
      }
      if (index + 1 >= argv.length) {
        return { ok: false, exitCode: 2, message: `${token} requires a value` };
      }
      index += 1;
      const value = argv[index];
      if (value.startsWith('--')) {
        return { ok: false, exitCode: 2, message: `${token} requires a value` };
      }
      if (token === '--profile') flags.profile = value;
      if (token === '--section') flags.section = value;
      continue;
    }

    if (token === '--plan' || token === '--live' || token === '--json') {
      flagCounts.set(token, (flagCounts.get(token) ?? 0) + 1);
      if (flagCounts.get(token) > 1) {
        return {
          ok: false,
          exitCode: 2,
          message: `duplicate option: ${token}`,
        };
      }
      if (token === '--plan') flags.plan = true;
      if (token === '--live') flags.live = true;
      if (token === '--json') flags.json = true;
      continue;
    }

    return { ok: false, exitCode: 2, message: `unknown option: ${token}` };
  }

  if (flags.plan && flags.live) {
    return {
      ok: false,
      exitCode: 2,
      message: '--plan and --live are mutually exclusive',
    };
  }

  return {
    ok: true,
    kind,
    name,
    profile: typeof flags.profile === 'string' ? flags.profile : undefined,
    section: typeof flags.section === 'string' ? flags.section : undefined,
    plan: Boolean(flags.plan),
    live: Boolean(flags.live),
    json: Boolean(flags.json),
  };
}

/**
 * @param {object} catalog
 * @param {{ json?: boolean }} options
 */
export function formatCatalog(catalog, options = {}) {
  if (options.json) {
    return `${JSON.stringify(catalog, null, 2)}\n`;
  }

  const lines = [
    'verification catalog',
    `infra: ${catalog.infra.implementationStatus} (${catalog.infra.adapter})`,
    'packages:',
  ];
  for (const row of catalog.packages) {
    lines.push(`  ${row.manifestName}: ${row.implementationStatus}`);
  }
  lines.push('apps:');
  for (const row of catalog.apps) {
    lines.push(`  ${row.manifestName}: ${row.implementationStatus}`);
  }
  return `${lines.join('\n')}\n`;
}

/**
 * @param {object} plan
 * @param {{ json?: boolean }} options
 */
export function formatPlan(plan, options = {}) {
  if (options.json) {
    return `${JSON.stringify(plan, null, 2)}\n`;
  }
  const sectionText = plan.sections
    .map(
      (row) =>
        `${row.id} tier=${row.tier} status=${row.plannedStatus ?? row.status ?? 'PLANNED'}`,
    )
    .join(', ');
  return `verify plan subject=${plan.subject.kind ?? plan.subject.id ?? plan.subject.manifestName} profile=${plan.profile} mode=${plan.mode} sections=[${sectionText}]\n`;
}

/**
 * @param {object} report
 * @param {{ json?: boolean }} options
 */
export function formatExecutionReport(report, options = {}) {
  if (options.json) {
    return `${JSON.stringify(report, null, 2)}\n`;
  }
  return `${JSON.stringify(report.counts)} exit=${report.exitCode}\nReport: ${report.reportPath}\n`;
}

/**
 * @param {string[]} argv
 * @param {{
 *   repoRoot?: string,
 *   write?: (chunk: string) => void,
 *   writeErr?: (chunk: string) => void,
 *   adapters?: Record<string, import('./execute.mjs').LiveResourceAdapter>,
 * }} [io]
 */
export async function runVerifyCliAsync(argv, io = {}) {
  const repoRoot = io.repoRoot ?? REPO_ROOT;
  const write = io.write ?? ((chunk) => process.stdout.write(chunk));
  const writeErr = io.writeErr ?? ((chunk) => process.stderr.write(chunk));

  const parsed = parseCliArgs(argv);
  if (!parsed.ok) {
    writeErr(`${parsed.message}\n`);
    return parsed.exitCode;
  }

  if ('command' in parsed && parsed.command === 'list') {
    const catalog = buildVerificationCatalog(repoRoot);
    write(formatCatalog(catalog, { json: parsed.json }));
    return 0;
  }

  const subjectResolved = resolveSubject(parsed.kind, parsed.name, repoRoot);
  if (!subjectResolved.ok) {
    writeErr(`${subjectResolved.message}\n`);
    return subjectResolved.message.startsWith('ambiguous') ||
      subjectResolved.message.startsWith('unknown')
      ? 2
      : 2;
  }

  if (parsed.plan) {
    const planBuilt = buildVerificationPlan({
      subject: subjectResolved.subject,
      profile: parsed.profile,
      section: parsed.section,
      live: parsed.live,
    });
    if (!planBuilt.ok) {
      writeErr(`${planBuilt.message}\n`);
      return 2;
    }
    write(formatPlan(planBuilt.plan, { json: parsed.json }));
    return 0;
  }

  if (subjectResolved.subject.implementationStatus === 'not-implemented') {
    writeErr(
      `suite not implemented: ${subjectResolved.subject.manifestName}\n`,
    );
    return 1;
  }

  const planBuilt = buildVerificationPlan({
    subject: subjectResolved.subject,
    profile: parsed.profile,
    section: parsed.section,
    live: parsed.live,
  });
  if (!planBuilt.ok) {
    writeErr(`${planBuilt.message}\n`);
    return planBuilt.exitCode === 1 ? 1 : 2;
  }

  const executionDeps = buildVerificationExecutionDeps(planBuilt.plan, {
    repoRoot,
    adapters: io.adapters,
    progress: (chunk) => writeErr(chunk),
  });
  const executed = await runVerification(planBuilt.plan, executionDeps);
  if (!executed.ok) {
    writeErr(`${executed.message}\n`);
    return executed.exitCode;
  }
  write(formatExecutionReport(executed.report, { json: parsed.json }));
  return executed.exitCode;
}

/**
 * Sync entry for list/plan paths used in unit tests.
 */
export function runVerifyCli(argv, io = {}) {
  const parsed = parseCliArgs(argv);
  if (!parsed.ok) {
    const writeErr = io.writeErr ?? ((chunk) => process.stderr.write(chunk));
    writeErr(`${parsed.message}\n`);
    return parsed.exitCode;
  }
  if ('command' in parsed && parsed.command === 'list') {
    return runVerifyCliSyncList(argv, io);
  }
  if (parsed.plan) {
    return runVerifyCliSyncPlan(argv, io);
  }
  if (parsed.kind === 'infra') {
    return runVerifyCliSyncInfra(argv, io);
  }
  const subjectResolved = resolveSubject(
    parsed.kind,
    parsed.name,
    io.repoRoot ?? REPO_ROOT,
  );
  if (
    subjectResolved.ok &&
    subjectResolved.subject.implementationStatus === 'not-implemented'
  ) {
    const writeErr = io.writeErr ?? ((chunk) => process.stderr.write(chunk));
    writeErr(
      `suite not implemented: ${subjectResolved.subject.manifestName}\n`,
    );
    return 1;
  }
  throw new Error('use runVerifyCliAsync for execution');
}

function runVerifyCliSyncList(argv, io) {
  const repoRoot = io.repoRoot ?? REPO_ROOT;
  const write = io.write ?? ((chunk) => process.stdout.write(chunk));
  const parsed = parseCliArgs(argv);
  const catalog = buildVerificationCatalog(repoRoot);
  write(formatCatalog(catalog, { json: parsed.ok && parsed.json }));
  return 0;
}

function runVerifyCliSyncPlan(argv, io) {
  const repoRoot = io.repoRoot ?? REPO_ROOT;
  const write = io.write ?? ((chunk) => process.stdout.write(chunk));
  const writeErr = io.writeErr ?? ((chunk) => process.stderr.write(chunk));
  const parsed = parseCliArgs(argv);
  if (!parsed.ok) return parsed.exitCode;
  const subjectResolved = resolveSubject(parsed.kind, parsed.name, repoRoot);
  if (!subjectResolved.ok) {
    writeErr(`${subjectResolved.message}\n`);
    return 2;
  }
  const planBuilt = buildVerificationPlan({
    subject: subjectResolved.subject,
    profile: parsed.profile,
    section: parsed.section,
    live: parsed.live,
  });
  if (!planBuilt.ok) {
    writeErr(`${planBuilt.message}\n`);
    return 2;
  }
  write(formatPlan(planBuilt.plan, { json: parsed.json }));
  return 0;
}

function runVerifyCliSyncInfra(argv, io) {
  const parsed = parseCliArgs(argv);
  if (parsed.plan) return runVerifyCliSyncPlan(argv, io);
  throw new Error('use runVerifyCliAsync for infra execution');
}

const IS_CLI_MAIN =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (IS_CLI_MAIN) {
  runVerifyCliAsync(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      process.stderr.write(`${diagnosticMessage(error)}\n`);
      process.exitCode = 1;
    });
}

function diagnosticMessage(error) {
  return error instanceof Error ? error.message : 'verify failed';
}
