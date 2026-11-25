const POSTGRES_URL_POSITIONAL = /^(postgres|postgresql):\/\//i;

export type CliCommand =
  | Readonly<{ kind: 'help' }>
  | Readonly<{ kind: 'list'; json: boolean }>
  | Readonly<{ kind: 'inspect'; key: string; json: boolean }>
  | Readonly<{ kind: 'target'; json: boolean }>
  | Readonly<{ kind: 'enroll'; confirmTarget: string; json: boolean }>
  | Readonly<{ kind: 'plan'; key: string; targetId: string; json: boolean }>
  | Readonly<{ kind: 'status'; key: string; targetId: string }>
  | Readonly<{
      kind: 'run';
      key: string;
      targetId: string;
      confirmTarget: string;
      actor: string;
      json: boolean;
      batchSize?: number;
      maxBatches?: number;
    }>
  | Readonly<{
      kind: 'resume';
      key: string;
      targetId: string;
      confirmTarget: string;
      actor: string;
      json: boolean;
      batchSize?: number;
      maxBatches?: number;
    }>;

type UsageFailure = Readonly<{ ok: false; exitCode: 2; message: string }>;

export type ArgumentParseResult =
  Readonly<{ ok: true; command: CliCommand }> | UsageFailure;

function refuseUsage(message: string): UsageFailure {
  return Object.freeze({ ok: false, exitCode: 2, message });
}

function refusePositionals(): UsageFailure {
  return refuseUsage('unexpected positional arguments');
}

function refuseUrlPositional(): UsageFailure {
  return refuseUsage('positional database URL refused');
}

type FlagParseResult = Readonly<{ json: boolean }>;
type FlagParseFailure = UsageFailure;

function isUsageRefusal(
  value: FlagParseResult | FlagParseFailure,
): value is FlagParseFailure {
  return 'ok' in value && value.ok === false;
}

type KeyedCommandOptions = Readonly<{
  requireConfirmTarget?: boolean;
  requireActor?: boolean;
  allowBatchDispatch?: boolean;
}>;

type RunLikeCommand = Readonly<{
  kind: 'run' | 'resume';
  key: string;
  targetId: string;
  confirmTarget: string;
  actor: string;
  json: boolean;
  batchSize?: number;
  maxBatches?: number;
}>;

function parseDispatchInt(
  head: string,
  flag: string,
  raw: string,
): number | UsageFailure {
  if (raw.length === 0) {
    return refuseUsage(`${head} ${flag} requires a value`);
  }
  if (!/^\d+$/.test(raw)) {
    return refuseUsage(`${head} ${flag} requires a decimal integer`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    return refuseUsage(`${head} ${flag} requires a decimal integer`);
  }
  return value;
}

function parseKeyedTargetCommand(
  head: string,
  rest: readonly string[],
  options: KeyedCommandOptions,
): ArgumentParseResult {
  if (rest.length === 0) {
    return refuseUsage(`${head} requires an operation key`);
  }
  const key = rest[0];
  if (key === undefined || key.startsWith('--')) {
    return refuseUsage(`${head} requires an operation key`);
  }
  if (POSTGRES_URL_POSITIONAL.test(key)) {
    return refuseUrlPositional();
  }

  let json = false;
  let targetId: string | undefined;
  let confirmTarget: string | undefined;
  let actor: string | undefined;
  let batchSize: number | undefined;
  let maxBatches: number | undefined;
  const seen = new Set<string>();

  for (let index = 1; index < rest.length; index += 1) {
    const token = rest[index];
    if (token === undefined) {
      continue;
    }
    if (token === '--json') {
      if (seen.has(token)) {
        return refuseUsage(`duplicate option: ${token}`);
      }
      seen.add(token);
      json = true;
      continue;
    }
    if (token === '--target-id') {
      const value = rest[index + 1];
      if (value === undefined || value.startsWith('--')) {
        return refuseUsage(`${head} --target-id requires a value`);
      }
      if (targetId !== undefined) {
        return refuseUsage('duplicate option: --target-id');
      }
      targetId = value;
      index += 1;
      continue;
    }
    if (token.startsWith('--target-id=')) {
      const value = token.slice('--target-id='.length);
      if (value.length === 0) {
        return refuseUsage(`${head} --target-id requires a value`);
      }
      if (targetId !== undefined) {
        return refuseUsage('duplicate option: --target-id');
      }
      targetId = value;
      continue;
    }
    if (token === '--confirm-target') {
      const value = rest[index + 1];
      if (value === undefined || value.startsWith('--')) {
        return refuseUsage(`${head} --confirm-target requires a value`);
      }
      if (confirmTarget !== undefined) {
        return refuseUsage('duplicate option: --confirm-target');
      }
      confirmTarget = value;
      index += 1;
      continue;
    }
    if (token.startsWith('--confirm-target=')) {
      const value = token.slice('--confirm-target='.length);
      if (value.length === 0) {
        return refuseUsage(`${head} --confirm-target requires a value`);
      }
      if (confirmTarget !== undefined) {
        return refuseUsage('duplicate option: --confirm-target');
      }
      confirmTarget = value;
      continue;
    }
    if (token === '--actor') {
      const value = rest[index + 1];
      if (value === undefined || value.startsWith('--')) {
        return refuseUsage(`${head} --actor requires a value`);
      }
      if (actor !== undefined) {
        return refuseUsage('duplicate option: --actor');
      }
      actor = value;
      index += 1;
      continue;
    }
    if (token.startsWith('--actor=')) {
      const value = token.slice('--actor='.length);
      if (value.length === 0) {
        return refuseUsage(`${head} --actor requires a value`);
      }
      if (actor !== undefined) {
        return refuseUsage('duplicate option: --actor');
      }
      actor = value;
      continue;
    }
    if (options.allowBatchDispatch === true) {
      if (token === '--batch-size') {
        const value = rest[index + 1];
        if (value === undefined || value.startsWith('--')) {
          return refuseUsage(`${head} --batch-size requires a value`);
        }
        if (batchSize !== undefined) {
          return refuseUsage('duplicate option: --batch-size');
        }
        const parsed = parseDispatchInt(head, '--batch-size', value);
        if (typeof parsed !== 'number') {
          return parsed;
        }
        batchSize = parsed;
        index += 1;
        continue;
      }
      if (token.startsWith('--batch-size=')) {
        const value = token.slice('--batch-size='.length);
        if (batchSize !== undefined) {
          return refuseUsage('duplicate option: --batch-size');
        }
        const parsed = parseDispatchInt(head, '--batch-size', value);
        if (typeof parsed !== 'number') {
          return parsed;
        }
        batchSize = parsed;
        continue;
      }
      if (token === '--max-batches') {
        const value = rest[index + 1];
        if (value === undefined || value.startsWith('--')) {
          return refuseUsage(`${head} --max-batches requires a value`);
        }
        if (maxBatches !== undefined) {
          return refuseUsage('duplicate option: --max-batches');
        }
        const parsed = parseDispatchInt(head, '--max-batches', value);
        if (typeof parsed !== 'number') {
          return parsed;
        }
        maxBatches = parsed;
        index += 1;
        continue;
      }
      if (token.startsWith('--max-batches=')) {
        const value = token.slice('--max-batches='.length);
        if (maxBatches !== undefined) {
          return refuseUsage('duplicate option: --max-batches');
        }
        const parsed = parseDispatchInt(head, '--max-batches', value);
        if (typeof parsed !== 'number') {
          return parsed;
        }
        maxBatches = parsed;
        continue;
      }
    }
    if (token.startsWith('--')) {
      return refuseUsage(`unknown option: ${token}`);
    }
    if (POSTGRES_URL_POSITIONAL.test(token)) {
      return refuseUrlPositional();
    }
    return refusePositionals();
  }

  if (targetId === undefined) {
    return refuseUsage(`${head} requires --target-id`);
  }
  if (options.requireConfirmTarget === true && confirmTarget === undefined) {
    return refuseUsage(`${head} requires --confirm-target`);
  }
  if (options.requireActor === true && actor === undefined) {
    return refuseUsage(`${head} requires --actor`);
  }

  if (head === 'plan') {
    return Object.freeze({
      ok: true,
      command: { kind: 'plan', key, targetId, json } as const,
    });
  }
  if (head === 'status') {
    return Object.freeze({
      ok: true,
      command: { kind: 'status', key, targetId } as const,
    });
  }
  const runLike: RunLikeCommand = Object.freeze({
    kind: head === 'resume' ? 'resume' : 'run',
    key,
    targetId,
    confirmTarget: confirmTarget ?? '',
    actor: actor ?? '',
    json,
    ...(batchSize === undefined ? {} : { batchSize }),
    ...(maxBatches === undefined ? {} : { maxBatches }),
  });
  return Object.freeze({
    ok: true,
    command: runLike,
  });
}

function parseFlags(
  tokens: readonly string[],
): FlagParseResult | FlagParseFailure {
  let json = false;
  const seen = new Set<string>();

  for (const token of tokens) {
    if (token === '--json') {
      if (seen.has(token)) {
        return refuseUsage(`duplicate option: ${token}`);
      }
      seen.add(token);
      json = true;
      continue;
    }
    if (token.startsWith('--')) {
      return refuseUsage(`unknown option: ${token}`);
    }
    if (POSTGRES_URL_POSITIONAL.test(token)) {
      return refuseUrlPositional();
    }
    return refusePositionals();
  }

  return Object.freeze({ json });
}

export function parseCliArguments(
  argv: readonly string[],
): ArgumentParseResult {
  if (argv.length === 0) {
    return refuseUsage('missing command');
  }

  const head = argv[0];
  if (head === undefined) {
    return refuseUsage('missing command');
  }

  if (head === 'help' || head === '--help') {
    if (argv.length > 1) {
      const tail = argv.slice(1);
      for (const token of tail) {
        if (token === '--help' || token === 'help') {
          return refuseUsage(`duplicate option: ${token}`);
        }
        if (token.startsWith('--')) {
          return refuseUsage(`unknown option: ${token}`);
        }
        if (POSTGRES_URL_POSITIONAL.test(token)) {
          return refuseUrlPositional();
        }
        return refusePositionals();
      }
    }
    return Object.freeze({
      ok: true,
      command: { kind: 'help' } as const,
    });
  }

  if (head === 'list') {
    const flags = parseFlags(argv.slice(1));
    if (isUsageRefusal(flags)) {
      return flags;
    }
    return Object.freeze({
      ok: true,
      command: { kind: 'list', json: flags.json } as const,
    });
  }

  if (head === 'inspect') {
    const rest = argv.slice(1);
    if (rest.length === 0) {
      return refuseUsage('inspect requires an operation key');
    }
    const key = rest[0];
    if (key === undefined || key.startsWith('--')) {
      return refuseUsage('inspect requires an operation key');
    }
    if (POSTGRES_URL_POSITIONAL.test(key)) {
      return refuseUrlPositional();
    }
    const flags = parseFlags(rest.slice(1));
    if (isUsageRefusal(flags)) {
      return flags;
    }
    return Object.freeze({
      ok: true,
      command: { kind: 'inspect', key, json: flags.json } as const,
    });
  }

  if (head === 'target') {
    const flags = parseFlags(argv.slice(1));
    if (isUsageRefusal(flags)) {
      return flags;
    }
    return Object.freeze({
      ok: true,
      command: { kind: 'target', json: flags.json } as const,
    });
  }

  if (head === 'plan') {
    return parseKeyedTargetCommand('plan', argv.slice(1), {});
  }

  if (head === 'status') {
    return parseKeyedTargetCommand('status', argv.slice(1), {});
  }

  if (head === 'run') {
    return parseKeyedTargetCommand('run', argv.slice(1), {
      requireConfirmTarget: true,
      requireActor: true,
      allowBatchDispatch: true,
    });
  }

  if (head === 'resume') {
    return parseKeyedTargetCommand('resume', argv.slice(1), {
      requireConfirmTarget: true,
      requireActor: true,
      allowBatchDispatch: true,
    });
  }

  if (head === 'enroll') {
    const rest = argv.slice(1);
    let json = false;
    let confirmTarget: string | undefined;
    const seen = new Set<string>();

    for (let index = 0; index < rest.length; index += 1) {
      const token = rest[index];
      if (token === undefined) {
        continue;
      }
      if (token === '--json') {
        if (seen.has(token)) {
          return refuseUsage(`duplicate option: ${token}`);
        }
        seen.add(token);
        json = true;
        continue;
      }
      if (token === '--confirm-target') {
        const value = rest[index + 1];
        if (value === undefined || value.startsWith('--')) {
          return refuseUsage('enroll --confirm-target requires a value');
        }
        if (confirmTarget !== undefined) {
          return refuseUsage('duplicate option: --confirm-target');
        }
        confirmTarget = value;
        index += 1;
        continue;
      }
      if (token.startsWith('--confirm-target=')) {
        const value = token.slice('--confirm-target='.length);
        if (value.length === 0) {
          return refuseUsage('enroll --confirm-target requires a value');
        }
        if (confirmTarget !== undefined) {
          return refuseUsage('duplicate option: --confirm-target');
        }
        confirmTarget = value;
        continue;
      }
      if (token.startsWith('--')) {
        return refuseUsage(`unknown option: ${token}`);
      }
      if (POSTGRES_URL_POSITIONAL.test(token)) {
        return refuseUrlPositional();
      }
      return refusePositionals();
    }

    if (confirmTarget === undefined) {
      return refuseUsage('enroll requires --confirm-target');
    }

    return Object.freeze({
      ok: true,
      command: { kind: 'enroll', confirmTarget, json } as const,
    });
  }

  if (head.startsWith('--')) {
    return refuseUsage(`unknown option: ${head}`);
  }
  if (POSTGRES_URL_POSITIONAL.test(head)) {
    return refuseUrlPositional();
  }

  return refuseUsage(`unknown command: ${head}`);
}
