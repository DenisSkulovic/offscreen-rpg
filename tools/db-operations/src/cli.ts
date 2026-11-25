import { fileURLToPath } from 'node:url';

import { parseCliArguments } from './arguments.js';
import { operationKey, type OperationManifest } from './contract.js';
import { lookup, manifests } from './registry.js';
import {
  TargetParseError,
  TargetSessionError,
  createOpsClient,
  parseTarget,
  targetLabel,
  toTargetDisplay,
  verifySession,
  type ParsedTarget,
} from './target.js';

export const CLI_HELP_TEXT = `offscreen database operations (read-only)

Commands:
  help
  list [--json]
  inspect <id@version> [--json]
  target [--json]

Environment:
  DB_OPS_URL  loopback PostgreSQL URL (required for target only)
`;

export interface CliWriter {
  write(chunk: string): void;
}

export interface ClientLike {
  connect(): Promise<void>;
  query(sql: string): Promise<{ rows: Array<Record<string, unknown>> }>;
  end(): Promise<void>;
}

export interface RunCliDeps {
  stdout: CliWriter;
  stderr: CliWriter;
  createClient?: (target: ParsedTarget) => ClientLike;
}

const SESSION_CHECK_SQL =
  'SELECT current_database() AS database, current_user AS role, pg_is_in_recovery() AS recovery';

export function redactCliError(error: unknown): string {
  if (error instanceof TargetParseError) {
    return 'invalid database operations target';
  }
  if (error instanceof TargetSessionError) {
    return 'database session verification failed';
  }
  return 'database operations failed';
}

function writeUsage(deps: RunCliDeps, message: string): void {
  deps.stderr.write(`${message}\n`);
}

function formatManifestHuman(manifest: OperationManifest): string {
  const lines = [
    `id: ${manifest.id}`,
    `version: ${String(manifest.version)}`,
    `title: ${manifest.title}`,
    `owner: ${manifest.owner}`,
    `kind: ${manifest.kind}`,
    `risk: ${manifest.risk}`,
    `mode: ${manifest.mode}`,
    `recovery: ${manifest.recovery}`,
    `recoveryNotes: ${manifest.recoveryNotes}`,
    `affectedTables: ${manifest.affectedTables.join(', ')}`,
  ];
  return `${lines.join('\n')}\n`;
}

function formatListHuman(entries: readonly OperationManifest[]): string {
  if (entries.length === 0) {
    return '';
  }
  return `${entries.map((entry) => operationKey(entry)).join('\n')}\n`;
}

function manifestJsonLine(manifest: OperationManifest): string {
  return `${JSON.stringify(manifest)}\n`;
}

function listJsonLine(entries: readonly OperationManifest[]): string {
  return `${JSON.stringify(entries)}\n`;
}

async function runTarget(
  command: Readonly<{ kind: 'target'; json: boolean }>,
  env: Record<string, string | undefined>,
  deps: RunCliDeps,
): Promise<number> {
  let target: ParsedTarget;
  try {
    target = parseTarget(env);
  } catch (error) {
    deps.stderr.write(`${redactCliError(error)}\n`);
    return 1;
  }

  const createClient = deps.createClient ?? createOpsClient;
  const client = createClient(target);

  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    await verifySession(client, target, { requirePrimary: false });

    const display = toTargetDisplay(target);
    if (command.json) {
      deps.stdout.write(
        `${JSON.stringify({ ...display, label: targetLabel(display) })}\n`,
      );
    } else {
      deps.stdout.write(`${targetLabel(display)}\n`);
    }
    return 0;
  } catch (error) {
    deps.stderr.write(`${redactCliError(error)}\n`);
    return 1;
  } finally {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Rollback failures are absorbed; connection teardown still runs.
    }
    try {
      await client.end();
    } catch {
      // Close failures are absorbed after redacted reporting above.
    }
  }
}

export async function runCli(
  argv: readonly string[],
  env: Record<string, string | undefined>,
  deps: RunCliDeps,
): Promise<number> {
  const parsed = parseCliArguments(argv);
  if (!parsed.ok) {
    writeUsage(deps, parsed.message);
    return parsed.exitCode;
  }

  const command = parsed.command;

  if (command.kind === 'help') {
    deps.stdout.write(CLI_HELP_TEXT);
    return 0;
  }

  if (command.kind === 'list') {
    if (command.json) {
      deps.stdout.write(listJsonLine(manifests));
    } else {
      const text = formatListHuman(manifests);
      if (text.length > 0) {
        deps.stdout.write(text);
      }
    }
    return 0;
  }

  if (command.kind === 'inspect') {
    const manifest = lookup(command.key);
    if (manifest === undefined) {
      deps.stderr.write('unknown operation\n');
      return 1;
    }
    if (command.json) {
      deps.stdout.write(manifestJsonLine(manifest));
    } else {
      deps.stdout.write(formatManifestHuman(manifest));
    }
    return 0;
  }

  return runTarget(command, env, deps);
}

export { SESSION_CHECK_SQL };

async function runExecutableMain(): Promise<number> {
  try {
    return await runCli(process.argv.slice(2), process.env, {
      stdout: process.stdout,
      stderr: process.stderr,
    });
  } catch (error) {
    process.stderr.write(`${redactCliError(error)}\n`);
    return 1;
  }
}

function isCliMain(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) {
    return false;
  }
  return fileURLToPath(import.meta.url) === entry;
}

if (isCliMain()) {
  void runExecutableMain()
    .then((code) => {
      process.exitCode = code;
    })
    .catch(() => {
      process.stderr.write('database operations failed\n');
      process.exitCode = 1;
    });
}
