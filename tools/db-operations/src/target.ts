import { Client } from 'pg';

const IDENTIFIER = /^[a-z][a-z0-9_]{0,62}$/;
const RESERVED_DATABASES = new Set(['postgres', 'template0', 'template1']);
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1']);
const AMBIENT_PG_KEYS = [
  'PGOPTIONS',
  'PGSERVICE',
  'PGSERVICEFILE',
  'PGSSLMODE',
] as const;

export const SESSION_CHECK_SQL =
  'SELECT current_database() AS database, current_user AS role, pg_is_in_recovery() AS recovery';

const EXPLICIT_PASSWORD_AUTHORITY = /^postgres(?:ql)?:\/\/[^:@/]+:[^@]*@/i;

export class TargetParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TargetParseError';
  }
}

export class TargetSessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TargetSessionError';
  }
}

export type TargetDisplay = Readonly<{
  host: string;
  port: number;
  database: string;
  role: string;
}>;

export type ParsedTarget = Readonly<{
  host: '127.0.0.1' | '::1';
  port: number;
  database: string;
  role: string;
  password: string;
  /** Local loopback endpoint only; not verified environment attestation. */
  localEndpointOnly: true;
}>;

export type SessionIdentity = Readonly<{
  database: string;
  role: string;
  recovery: boolean;
}>;

export interface OpsQueryable {
  query(sql: string): Promise<{ rows: Array<Record<string, unknown>> }>;
}

const clientFailureByClient = new WeakMap<Client, Error>();

function rejectAmbientPgEnv(env: Record<string, string | undefined>): void {
  for (const key of AMBIENT_PG_KEYS) {
    const value = env[key];
    if (value !== undefined && value.trim().length > 0) {
      throw new TargetParseError(`ambient PostgreSQL env refused: ${key}`);
    }
  }
}

function normalizeLoopbackHost(hostname: string): '127.0.0.1' | '::1' | null {
  if (hostname === '127.0.0.1') {
    return '127.0.0.1';
  }
  if (hostname === '::1' || hostname === '[::1]') {
    return '::1';
  }
  return null;
}

function requireLoopbackHost(hostname: string): '127.0.0.1' | '::1' {
  if (hostname.includes(',') || hostname.includes('/')) {
    throw new TargetParseError('multi-host or socket PostgreSQL URL refused');
  }
  const normalized = normalizeLoopbackHost(hostname);
  if (normalized === null || !LOOPBACK_HOSTS.has(normalized)) {
    throw new TargetParseError(
      'DB_OPS_URL must use literal loopback host 127.0.0.1 or [::1]',
    );
  }
  return normalized;
}

function requireIdentifier(value: string, field: string): string {
  if (value.length === 0) {
    throw new TargetParseError(`${field} must be a non-empty identifier`);
  }
  if (!IDENTIFIER.test(value)) {
    throw new TargetParseError(`invalid ${field} identifier`);
  }
  return value;
}

function parseDatabasePath(pathname: string): string {
  if (!pathname.startsWith('/') || pathname.length < 2) {
    throw new TargetParseError(
      'DB_OPS_URL must include an explicit database name',
    );
  }
  const raw = pathname.slice(1);
  if (raw.includes('/')) {
    throw new TargetParseError('DB_OPS_URL must name exactly one database');
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    throw new TargetParseError('invalid database name encoding');
  }
  return requireIdentifier(decoded, 'database');
}

function requireExplicitPassword(rawUrl: string): void {
  if (!EXPLICIT_PASSWORD_AUTHORITY.test(rawUrl)) {
    throw new TargetParseError(
      'DB_OPS_URL must include an explicit password component',
    );
  }
}

export function parseTarget(
  env: Record<string, string | undefined>,
): ParsedTarget {
  rejectAmbientPgEnv(env);

  const rawUrl = env.DB_OPS_URL;
  if (rawUrl === undefined || rawUrl.trim().length === 0) {
    throw new TargetParseError('DB_OPS_URL is required');
  }

  requireExplicitPassword(rawUrl);

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new TargetParseError('DB_OPS_URL is not a valid URL');
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new TargetParseError(
      'DB_OPS_URL must use postgres or postgresql scheme',
    );
  }

  if (url.search.length > 0 || url.hash.length > 0) {
    throw new TargetParseError('DB_OPS_URL must not include query or fragment');
  }

  const host = requireLoopbackHost(url.hostname);

  const portText = url.port;
  if (portText.length === 0) {
    throw new TargetParseError(
      'DB_OPS_URL must include an explicit numeric port',
    );
  }
  const port = Number(portText);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new TargetParseError('DB_OPS_URL port must be a nonzero integer');
  }

  let role: string;
  try {
    role = decodeURIComponent(url.username);
  } catch {
    throw new TargetParseError('invalid role encoding');
  }
  role = requireIdentifier(role, 'role');

  let password: string;
  try {
    password = decodeURIComponent(url.password);
  } catch {
    throw new TargetParseError('invalid password encoding');
  }

  const database = parseDatabasePath(url.pathname);
  if (RESERVED_DATABASES.has(database)) {
    throw new TargetParseError('reserved PostgreSQL database name refused');
  }

  return Object.freeze({
    host,
    port,
    database,
    role,
    password,
    localEndpointOnly: true as const,
  });
}

export function toTargetDisplay(target: ParsedTarget): TargetDisplay {
  return Object.freeze({
    host: target.host,
    port: target.port,
    database: target.database,
    role: target.role,
  });
}

export function targetLabel(display: TargetDisplay): string {
  const hostPart = display.host === '::1' ? '[::1]' : display.host;
  return `${hostPart}:${display.port}/${display.database}@${display.role}`;
}

export function createOpsClient(target: ParsedTarget): Client {
  const client = new Client({
    host: target.host,
    port: target.port,
    database: target.database,
    user: target.role,
    password: target.password,
    ssl: false,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
    idle_in_transaction_session_timeout: 15000,
    application_name: 'offscreen-db-ops',
  });

  client.on('error', (error) => {
    clientFailureByClient.set(client, error);
  });

  return client;
}

export function recordedClientFailure(client: Client): Error | undefined {
  return clientFailureByClient.get(client);
}

function parseSessionRow(row: Record<string, unknown>): SessionIdentity {
  const database = row.database;
  const role = row.role;
  const recovery = row.recovery;

  if (typeof database !== 'string' || typeof role !== 'string') {
    throw new TargetSessionError(
      'session identity query returned invalid shape',
    );
  }
  if (typeof recovery !== 'boolean') {
    throw new TargetSessionError('session recovery flag must be boolean');
  }

  return Object.freeze({ database, role, recovery });
}

export type VerifySessionOptions = Readonly<{
  /** When true, refuse standby (recovery) sessions for write readiness. */
  requirePrimary: boolean;
}>;

export async function verifySession(
  queryable: OpsQueryable,
  expected: Pick<ParsedTarget, 'database' | 'role'>,
  options: VerifySessionOptions = { requirePrimary: true },
): Promise<SessionIdentity> {
  const result = await queryable.query(SESSION_CHECK_SQL);
  const row = result.rows?.[0];
  if (
    !Array.isArray(result.rows) ||
    result.rows.length !== 1 ||
    row === undefined
  ) {
    throw new TargetSessionError(
      'session identity query must return exactly one row',
    );
  }

  const identity = parseSessionRow(row);

  if (identity.database !== expected.database) {
    throw new TargetSessionError(
      'connected database does not match DB_OPS_URL target',
    );
  }
  if (identity.role !== expected.role) {
    throw new TargetSessionError(
      'connected role does not match DB_OPS_URL target',
    );
  }
  if (options.requirePrimary && identity.recovery) {
    throw new TargetSessionError(
      'PostgreSQL session is in recovery; primary required for write readiness',
    );
  }

  return identity;
}
