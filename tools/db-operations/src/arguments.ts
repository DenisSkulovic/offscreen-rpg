const POSTGRES_URL_POSITIONAL = /^(postgres|postgresql):\/\//i;

export type CliCommand =
  | Readonly<{ kind: 'help' }>
  | Readonly<{ kind: 'list'; json: boolean }>
  | Readonly<{ kind: 'inspect'; key: string; json: boolean }>
  | Readonly<{ kind: 'target'; json: boolean }>;

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

  if (head.startsWith('--')) {
    return refuseUsage(`unknown option: ${head}`);
  }
  if (POSTGRES_URL_POSITIONAL.test(head)) {
    return refuseUrlPositional();
  }

  return refuseUsage(`unknown command: ${head}`);
}
