/**
 * CH04: refuse nonlocal / ordinary / reserved databases before any connect or DROP.
 */

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

/** Manual Chamber, Story local, auth/integration, and generic app DBs are never Sandbox targets. */
export const RESERVED_SANDBOX_DATABASE_NAMES = [
  'postgres',
  'offscreen',
  'offscreen_chamber',
  'offscreen_story_local',
  'offscreen_auth_test',
  'offscreen_db_test',
] as const;

const RUN_NAME_RE = /^offscreen_chamber_run_[a-f0-9]{32}$/;

export class SandboxGuardError extends Error {
  constructor(
    readonly code:
      | 'non-local-host'
      | 'bad-protocol'
      | 'query-overrides'
      | 'reserved-name'
      | 'bad-run-name'
      | 'name-mismatch'
      | 'destructive-not-confirmed',
    message: string,
  ) {
    super(message);
    this.name = 'SandboxGuardError';
  }
}

export function compactRunId(runId: string): string {
  const compact = runId.replace(/-/g, '').toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(compact)) {
    throw new SandboxGuardError(
      'bad-run-name',
      'Sandbox runId must be a UUID (hex, optional hyphens)',
    );
  }
  return compact;
}

export function sandboxDatabaseNameForRun(runId: string): string {
  return `offscreen_chamber_run_${compactRunId(runId)}`;
}

export function isReservedSandboxDatabaseName(name: string): boolean {
  if ((RESERVED_SANDBOX_DATABASE_NAMES as readonly string[]).includes(name)) {
    return true;
  }
  // Prefix collision: offscreen_chamber_run without full hex, or other offscreen_* leftovers.
  if (
    name === 'offscreen_chamber_run' ||
    name.startsWith('offscreen_chamber_run_')
  ) {
    return !RUN_NAME_RE.test(name);
  }
  return name.startsWith('offscreen_') && !RUN_NAME_RE.test(name);
}

export type SandboxDatabaseTarget = {
  connectionString: string;
  databaseName: string;
  runIdCompact: string;
  hostname: string;
};

/**
 * Validate a candidate Sandbox URL **before** connecting or issuing DROP/CREATE.
 * Allowed: localhost/127.0.0.1, no query string, name `offscreen_chamber_run_<32hex>`.
 */
export function assertSandboxDatabaseTarget(
  connectionString: string,
  expectedRunId?: string,
): SandboxDatabaseTarget {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new SandboxGuardError(
      'bad-protocol',
      'Sandbox DATABASE_URL is not a valid URL',
    );
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new SandboxGuardError(
      'bad-protocol',
      'Sandbox requires postgres:// or postgresql://',
    );
  }
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new SandboxGuardError(
      'non-local-host',
      `Sandbox refuses non-local host ${url.hostname}`,
    );
  }
  if (url.search) {
    throw new SandboxGuardError(
      'query-overrides',
      'Sandbox DATABASE_URL must not include query overrides',
    );
  }
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!databaseName) {
    throw new SandboxGuardError(
      'bad-run-name',
      'Sandbox DATABASE_URL missing database name',
    );
  }
  if (
    (RESERVED_SANDBOX_DATABASE_NAMES as readonly string[]).includes(
      databaseName,
    )
  ) {
    throw new SandboxGuardError(
      'reserved-name',
      `Sandbox refuses reserved database name ${databaseName}`,
    );
  }
  if (!RUN_NAME_RE.test(databaseName)) {
    throw new SandboxGuardError(
      'bad-run-name',
      `Sandbox database must match offscreen_chamber_run_<32hex>, got ${databaseName}`,
    );
  }
  const runIdCompact = databaseName.slice('offscreen_chamber_run_'.length);
  if (expectedRunId !== undefined) {
    const expected = compactRunId(expectedRunId);
    if (expected !== runIdCompact) {
      throw new SandboxGuardError(
        'name-mismatch',
        'Sandbox database name does not match runId',
      );
    }
  }
  return {
    connectionString,
    databaseName,
    runIdCompact,
    hostname: url.hostname,
  };
}

export function buildSandboxDatabaseUrl(args: {
  runId: string;
  user?: string;
  password?: string;
  host?: string;
  port?: number;
}): string {
  const name = sandboxDatabaseNameForRun(args.runId);
  const user = args.user ?? 'offscreen';
  const password = args.password ?? 'local-development-only';
  const host = args.host ?? '127.0.0.1';
  const port = args.port ?? 5432;
  if (!LOCAL_HOSTS.has(host)) {
    throw new SandboxGuardError(
      'non-local-host',
      `Sandbox refuses non-local host ${host}`,
    );
  }
  const url = `postgresql://${user}:${password}@${host}:${port}/${name}`;
  return assertSandboxDatabaseTarget(url, args.runId).connectionString;
}

/** Live DROP/CREATE requires an explicit confirm flag after the URL guard passes. */
export function assertDestructiveSandboxProvisionAllowed(args: {
  connectionString: string;
  runId: string;
  confirmDisposableProvision: boolean;
}): SandboxDatabaseTarget {
  const target = assertSandboxDatabaseTarget(args.connectionString, args.runId);
  if (!args.confirmDisposableProvision) {
    throw new SandboxGuardError(
      'destructive-not-confirmed',
      'Sandbox refuse DROP/CREATE without confirmDisposableProvision=true',
    );
  }
  return target;
}
