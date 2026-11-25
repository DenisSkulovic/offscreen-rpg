export type OperationKind = 'repair' | 'backfill' | 'reconciliation';
export type OperationRisk = 'low' | 'medium' | 'high';
export type OperationMode = 'atomic' | 'batched';
export type OperationRecovery =
  'roll-forward' | 'compensating' | 'restore' | 'reversible';

export type OperationManifest = Readonly<{
  id: string;
  version: number;
  title: string;
  owner: string;
  kind: OperationKind;
  risk: OperationRisk;
  mode: OperationMode;
  recovery: OperationRecovery;
  recoveryNotes: string;
  affectedTables: readonly string[];
}>;

const MANIFEST_FIELD_KEYS = [
  'id',
  'version',
  'title',
  'owner',
  'kind',
  'risk',
  'mode',
  'recovery',
  'recoveryNotes',
  'affectedTables',
] as const;

const LOWERCASE_KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const QUALIFIED_TABLE = /^[a-z_][a-z0-9_]{0,62}\.[a-z_][a-z0-9_]{0,62}$/;

const KIND_VALUES: readonly OperationKind[] = [
  'repair',
  'backfill',
  'reconciliation',
];
const RISK_VALUES: readonly OperationRisk[] = ['low', 'medium', 'high'];
const MODE_VALUES: readonly OperationMode[] = ['atomic', 'batched'];
const RECOVERY_VALUES: readonly OperationRecovery[] = [
  'roll-forward',
  'compensating',
  'restore',
  'reversible',
];

const MAX_VERSION = 1_000_000;
const MIN_AFFECTED_TABLES = 1;
const MAX_AFFECTED_TABLES = 20;

export class OperationManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OperationManifestError';
  }
}

function assertPlainRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new OperationManifestError('manifest must be a plain object');
  }
  return value as Record<string, unknown>;
}

function rejectUnknownFields(record: Record<string, unknown>): void {
  for (const key of Object.keys(record)) {
    if (
      !MANIFEST_FIELD_KEYS.includes(key as (typeof MANIFEST_FIELD_KEYS)[number])
    ) {
      throw new OperationManifestError(`unknown field: ${key}`);
    }
  }
}

function requireNonWhitespaceString(
  value: unknown,
  field: string,
  minLength: number,
  maxLength: number,
): string {
  if (typeof value !== 'string') {
    throw new OperationManifestError(`${field} must be a string`);
  }
  if (value.trim().length === 0) {
    throw new OperationManifestError(
      `${field} must not be empty or whitespace`,
    );
  }
  if (value.length < minLength || value.length > maxLength) {
    throw new OperationManifestError(
      `${field} length must be between ${minLength} and ${maxLength}`,
    );
  }
  return value;
}

function requireLowercaseKebab(
  value: unknown,
  field: string,
  minLength: number,
  maxLength: number,
): string {
  const raw = requireNonWhitespaceString(value, field, minLength, maxLength);
  if (!LOWERCASE_KEBAB.test(raw)) {
    throw new OperationManifestError(`${field} must be lowercase kebab-case`);
  }
  return raw;
}

function requireEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): T {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new OperationManifestError(`${field} must be a non-empty string`);
  }
  if (!allowed.includes(value as T)) {
    throw new OperationManifestError(`invalid ${field}: ${value}`);
  }
  return value as T;
}

function requireVersion(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new OperationManifestError('version must be a positive integer');
  }
  if (!Number.isSafeInteger(value)) {
    throw new OperationManifestError('version must be a safe integer');
  }
  if (value < 1 || value > MAX_VERSION) {
    throw new OperationManifestError(
      `version must be between 1 and ${MAX_VERSION}`,
    );
  }
  return value;
}

function requireAffectedTables(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    throw new OperationManifestError('affectedTables must be an array');
  }
  if (
    value.length < MIN_AFFECTED_TABLES ||
    value.length > MAX_AFFECTED_TABLES
  ) {
    throw new OperationManifestError(
      `affectedTables must contain between ${MIN_AFFECTED_TABLES} and ${MAX_AFFECTED_TABLES} entries`,
    );
  }
  const seen = new Set<string>();
  const tables: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      throw new OperationManifestError(
        'affectedTables entries must be non-empty strings',
      );
    }
    if (!QUALIFIED_TABLE.test(entry)) {
      throw new OperationManifestError(
        `invalid affectedTables identifier: ${entry}`,
      );
    }
    if (seen.has(entry)) {
      throw new OperationManifestError(
        `duplicate affectedTables identifier: ${entry}`,
      );
    }
    seen.add(entry);
    tables.push(entry);
  }
  return tables;
}

export function operationKey(manifest: OperationManifest): string {
  return `${manifest.id}@${manifest.version}`;
}

export function validateManifest(input: unknown): OperationManifest {
  const record = assertPlainRecord(input);
  rejectUnknownFields(record);

  const id = requireLowercaseKebab(record.id, 'id', 3, 64);
  const version = requireVersion(record.version);
  const title = requireNonWhitespaceString(record.title, 'title', 1, 120);
  const owner = requireLowercaseKebab(record.owner, 'owner', 2, 64);
  const kind = requireEnum(record.kind, 'kind', KIND_VALUES);
  const risk = requireEnum(record.risk, 'risk', RISK_VALUES);
  const mode = requireEnum(record.mode, 'mode', MODE_VALUES);
  const recovery = requireEnum(record.recovery, 'recovery', RECOVERY_VALUES);
  const recoveryNotes = requireNonWhitespaceString(
    record.recoveryNotes,
    'recoveryNotes',
    1,
    1000,
  );
  const affectedTables = requireAffectedTables(record.affectedTables);

  return Object.freeze({
    id,
    version,
    title,
    owner,
    kind,
    risk,
    mode,
    recovery,
    recoveryNotes,
    affectedTables: Object.freeze([...affectedTables]),
  });
}
