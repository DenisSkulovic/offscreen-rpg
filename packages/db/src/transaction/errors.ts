import { DatabaseAdmissionError } from '../connection/admission.js';
import type { DatabaseErrorCategory, TransactionRetry } from './policy.js';

export const MAX_CAUSE_LINKS = 4;
export const MIN_RETRY_JITTER_MS = 25;
export const MAX_RETRY_JITTER_MS = 200;
export const MAX_TRANSACTION_ATTEMPTS = 3;

const RETRYABLE_SQLSTATES = new Set(['40001', '40P01']);

export type JitterFn = (minMs: number, maxMs: number) => number;

export type TransactionRetryDecision =
  | { readonly action: 'retry'; readonly afterMs: number }
  | { readonly action: 'propagate'; readonly error: DatabaseTransactionError };

export class DatabaseTransactionError extends Error {
  readonly category: DatabaseErrorCategory;
  declare readonly cause: unknown;

  constructor(
    category: DatabaseErrorCategory,
    message: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = 'DatabaseTransactionError';
    this.category = category;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readSqlState(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }
  const code = error.code;
  if (typeof code === 'string' && code.length >= 2) {
    return code.toUpperCase();
  }
  return undefined;
}

function categoryForSqlState(
  sqlState: string,
): DatabaseErrorCategory | undefined {
  if (sqlState === '40001') {
    return 'serialization';
  }
  if (sqlState === '40P01') {
    return 'deadlock';
  }
  if (sqlState === '57014') {
    return 'timeout';
  }
  if (sqlState === '55P03') {
    return 'lock-timeout';
  }
  if (sqlState.startsWith('23')) {
    return 'constraint';
  }
  if (sqlState.startsWith('08')) {
    return 'unavailable';
  }
  if (sqlState.startsWith('28')) {
    return 'application';
  }
  if (sqlState.startsWith('0F') || sqlState.startsWith('3D')) {
    return 'invalid-config';
  }
  return undefined;
}

function categoryForAdmission(
  error: DatabaseAdmissionError,
): DatabaseErrorCategory {
  return error.category;
}

function messageForCategory(
  category: DatabaseErrorCategory,
  internalCause: unknown,
): string {
  if (internalCause instanceof Error && internalCause.message) {
    return internalCause.message;
  }
  return `Database transaction failed (${category}).`;
}

function nextCauseLink(error: unknown): unknown | undefined {
  if (!isRecord(error)) {
    return undefined;
  }
  if ('cause' in error) {
    return error.cause;
  }
  return undefined;
}

export function classifyDatabaseError(
  error: unknown,
): DatabaseTransactionError {
  if (error instanceof DatabaseTransactionError) {
    return error;
  }

  const visited = new WeakSet<object>();
  let current: unknown = error;
  let depth = 0;
  const internalCause: unknown = error;

  while (current !== undefined && depth < MAX_CAUSE_LINKS) {
    if (isRecord(current)) {
      if (visited.has(current)) {
        break;
      }
      visited.add(current);
    }

    if (current instanceof DatabaseAdmissionError) {
      const category = categoryForAdmission(current);
      return new DatabaseTransactionError(
        category,
        messageForCategory(category, internalCause),
        internalCause,
      );
    }

    if (current instanceof DatabaseTransactionError) {
      return new DatabaseTransactionError(
        current.category,
        current.message,
        internalCause,
      );
    }

    const sqlState = readSqlState(current);
    if (sqlState !== undefined) {
      const category = categoryForSqlState(sqlState);
      if (category !== undefined) {
        return new DatabaseTransactionError(
          category,
          messageForCategory(category, internalCause),
          internalCause,
        );
      }
    }

    const next = nextCauseLink(current);
    if (next === undefined || next === current) {
      break;
    }
    current = next;
    depth += 1;
  }

  return new DatabaseTransactionError(
    'application',
    messageForCategory('application', internalCause),
    internalCause,
  );
}

function defaultJitter(minMs: number, maxMs: number): number {
  if (maxMs <= minMs) {
    return minMs;
  }
  return minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
}

function computeRetryDelayMs(
  remainingMs: number,
  jitter: JitterFn,
): number | undefined {
  if (remainingMs < MIN_RETRY_JITTER_MS) {
    return undefined;
  }
  const cappedMax = Math.min(MAX_RETRY_JITTER_MS, remainingMs);
  return jitter(MIN_RETRY_JITTER_MS, cappedMax);
}

export function decideTransactionRetry(
  error: unknown,
  retry: TransactionRetry,
  confirmedRollback: boolean,
  attemptIndex: number,
  remainingMs: number,
  jitter: JitterFn = defaultJitter,
): TransactionRetryDecision {
  const classified = classifyDatabaseError(error);

  if (classified.category === 'commit-unknown') {
    return { action: 'propagate', error: classified };
  }

  if (retry !== 'sql-only-conflicts' || !confirmedRollback) {
    return { action: 'propagate', error: classified };
  }

  if (attemptIndex >= MAX_TRANSACTION_ATTEMPTS - 1) {
    return { action: 'propagate', error: classified };
  }

  const sqlState = findRetrySqlState(error);
  if (sqlState === undefined || !RETRYABLE_SQLSTATES.has(sqlState)) {
    return { action: 'propagate', error: classified };
  }

  const afterMs = computeRetryDelayMs(remainingMs, jitter);
  if (afterMs === undefined) {
    return { action: 'propagate', error: classified };
  }

  return { action: 'retry', afterMs };
}

function findRetrySqlState(error: unknown): string | undefined {
  const visited = new WeakSet<object>();
  let current: unknown = error;
  let depth = 0;

  while (current !== undefined && depth < MAX_CAUSE_LINKS) {
    if (isRecord(current)) {
      if (visited.has(current)) {
        break;
      }
      visited.add(current);
    }

    const sqlState = readSqlState(current);
    if (sqlState !== undefined && RETRYABLE_SQLSTATES.has(sqlState)) {
      return sqlState;
    }

    const next = nextCauseLink(current);
    if (next === undefined || next === current) {
      break;
    }
    current = next;
    depth += 1;
  }

  return undefined;
}

export function databaseTransactionError(
  category: DatabaseErrorCategory,
  cause?: unknown,
  message?: string,
): DatabaseTransactionError {
  const resolvedMessage =
    message ?? messageForCategory(category, cause ?? new Error(category));
  return new DatabaseTransactionError(category, resolvedMessage, cause);
}
