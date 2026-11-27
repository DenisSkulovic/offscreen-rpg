import type { MissionOutcomeV1 } from '../missions/contracts.js';

/** SDK terminal observation. Outcome mapping does not catch cancellation. */
export type Terminal = {
  finishReason: string;
  text: string;
  hasUnfinishedCalls: boolean;
};

export interface MissionLedger {
  readonly maxSteps: number;
  readonly steps: number;
  readonly toolCalls: number;
  readonly deniedCode: string | undefined;
  readonly limitCode: string | undefined;
  readonly failureCode: string | undefined;
  recordStep(): void;
  deny(code: string): void;
  limit(code: string): void;
  fail(code: string): void;
  reserveTool(): boolean;
}

const TEXT_LIMIT = 4096;
const TOOL_ATTEMPT_LIMIT = 2;
const NONNORMAL = new Set(['length', 'content-filter', 'error', 'interrupted']);

function hasFault(ledger: MissionLedger): boolean {
  return (
    ledger.deniedCode !== undefined ||
    ledger.limitCode !== undefined ||
    ledger.failureCode !== undefined
  );
}

/** Per-run counters. No clock and no shared store. */
export function createMissionLedger(maxSteps: number): MissionLedger {
  let steps = 0;
  let toolCalls = 0;
  let deniedCode: string | undefined;
  let limitCode: string | undefined;
  let failureCode: string | undefined;
  const ledger: MissionLedger = {
    get maxSteps() {
      return maxSteps;
    },
    get steps() {
      return steps;
    },
    get toolCalls() {
      return toolCalls;
    },
    get deniedCode() {
      return deniedCode;
    },
    get limitCode() {
      return limitCode;
    },
    get failureCode() {
      return failureCode;
    },
    recordStep() {
      steps += 1;
      if (steps > maxSteps && limitCode === undefined) limitCode = 'step-limit';
    },
    deny(code) {
      if (deniedCode === undefined) deniedCode = code;
    },
    limit(code) {
      if (limitCode === undefined) limitCode = code;
    },
    fail(code) {
      if (failureCode === undefined) failureCode = code;
    },
    reserveTool() {
      if (hasFault(ledger)) return false;
      if (toolCalls >= TOOL_ATTEMPT_LIMIT) {
        limitCode = 'tool-limit';
        return false;
      }
      toolCalls += 1;
      return true;
    },
  };
  return ledger;
}

function counts(ledger: MissionLedger): { steps: number; toolCalls: number } {
  return { steps: ledger.steps, toolCalls: ledger.toolCalls };
}

/**
 * Map a finished run. Denial outranks limit, then failure, then a normal stop.
 * Callers must observe Temporal cancellation before this function.
 */
export function resolveOutcome(
  ledger: MissionLedger,
  terminal?: Terminal,
): MissionOutcomeV1 {
  const base = counts(ledger);
  if (ledger.deniedCode !== undefined) {
    return { status: 'denied', code: ledger.deniedCode, ...base };
  }
  if (ledger.limitCode !== undefined) {
    return { status: 'limit-reached', code: ledger.limitCode, ...base };
  }
  if (ledger.failureCode !== undefined) {
    return { status: 'failed', code: ledger.failureCode, ...base };
  }
  const atCeiling = ledger.steps >= ledger.maxSteps;
  if (terminal === undefined) {
    if (atCeiling) return { status: 'limit-reached', code: 'step-limit', ...base };
    return { status: 'failed', code: 'missing-terminal-output', ...base };
  }
  if (NONNORMAL.has(terminal.finishReason)) {
    return { status: 'failed', code: 'nonterminal-model-output', ...base };
  }
  if (terminal.text.length > TEXT_LIMIT) {
    return { status: 'limit-reached', code: 'output-limit', ...base };
  }
  const answer = terminal.text.trim().length > 0;
  const normalStop =
    terminal.finishReason === 'stop' && answer && !terminal.hasUnfinishedCalls;
  if (normalStop) {
    return { status: 'completed', text: terminal.text, ...base };
  }
  if (atCeiling) {
    return { status: 'limit-reached', code: 'step-limit', ...base };
  }
  if (!answer || terminal.hasUnfinishedCalls) {
    return {
      status: 'failed',
      code: terminal.hasUnfinishedCalls
        ? 'nonterminal-model-output'
        : 'missing-terminal-output',
      ...base,
    };
  }
  return { status: 'failed', code: 'execution-failed', ...base };
}
