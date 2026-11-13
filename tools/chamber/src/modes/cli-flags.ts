/**
 * CH12: shared launcher flag grammar and mutual-exclusion checks.
 * Extracted so cheap CLIs and main.ts share one validation boundary.
 */

export const LAUNCHER_MODE_FLAGS = [
  '--smoke',
  '--review',
  '--packet-review',
  '--memory-packet-review',
  '--memory-comparison-packets',
  '--memory-evaluation-packet',
  '--memory-evaluation-run',
  '--evaluation-packet',
  '--evaluation-run',
  '--story-mode',
] as const;

export type LauncherModeFlag = (typeof LAUNCHER_MODE_FLAGS)[number];

const ALLOWED_BARE_FLAGS = new Set<string>([
  ...LAUNCHER_MODE_FLAGS,
  '--no-browser',
  '--reset-database',
  '--',
]);

const ALLOWED_PREFIXES = [
  '--config=',
  '--authorize=',
  '--story-model=',
  '--story-max-microusd=',
  '--story-max-input-tokens=',
  '--story-max-output-tokens=',
  '--authorize-story-model=',
] as const;

export type ParsedLauncherFlags = {
  smoke: boolean;
  review: boolean;
  packetReview: boolean;
  memoryPacketReview: boolean;
  memoryComparisonPackets: boolean;
  memoryEvaluationPacket: boolean;
  memoryEvaluationRun: boolean;
  evaluationPacket: boolean;
  evaluationRun: boolean;
  storyMode: boolean;
  noBrowser: boolean;
  resetDatabase: boolean;
  configPath: string | null;
  authorize: string | null;
  storyModel: string | null;
  storyMaxMicrousd: string | null;
  storyMaxInputTokens: string | null;
  storyMaxOutputTokens: string | null;
  storyAuthorize: string | null;
};

export class LauncherFlagError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LauncherFlagError';
  }
}

function readPrefixed(argv: string[], prefix: string): string | null {
  const hit = argv.find((argument) => argument.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

export function parseLauncherFlags(argv: string[]): ParsedLauncherFlags {
  const flags: ParsedLauncherFlags = {
    smoke: argv.includes('--smoke'),
    review: argv.includes('--review'),
    packetReview: argv.includes('--packet-review'),
    memoryPacketReview: argv.includes('--memory-packet-review'),
    memoryComparisonPackets: argv.includes('--memory-comparison-packets'),
    memoryEvaluationPacket: argv.includes('--memory-evaluation-packet'),
    memoryEvaluationRun: argv.includes('--memory-evaluation-run'),
    evaluationPacket: argv.includes('--evaluation-packet'),
    evaluationRun: argv.includes('--evaluation-run'),
    storyMode: argv.includes('--story-mode'),
    noBrowser: argv.includes('--no-browser'),
    resetDatabase: argv.includes('--reset-database'),
    configPath: readPrefixed(argv, '--config='),
    authorize: readPrefixed(argv, '--authorize='),
    storyModel: readPrefixed(argv, '--story-model='),
    storyMaxMicrousd: readPrefixed(argv, '--story-max-microusd='),
    storyMaxInputTokens: readPrefixed(argv, '--story-max-input-tokens='),
    storyMaxOutputTokens: readPrefixed(argv, '--story-max-output-tokens='),
    storyAuthorize: readPrefixed(argv, '--authorize-story-model='),
  };

  const runModes = [
    flags.smoke,
    flags.review,
    flags.packetReview,
    flags.memoryPacketReview,
    flags.memoryComparisonPackets,
    flags.memoryEvaluationPacket,
    flags.memoryEvaluationRun,
    flags.evaluationPacket,
    flags.evaluationRun,
    flags.storyMode,
  ].filter(Boolean);

  const unknown = argv.some(
    (arg) =>
      !ALLOWED_BARE_FLAGS.has(arg) &&
      !ALLOWED_PREFIXES.some((prefix) => arg.startsWith(prefix)),
  );

  if (runModes.length > 1 || unknown) {
    throw new LauncherFlagError(
      'Use at most one run mode; evaluation packet modes also require --config=<path>.',
    );
  }
  if (flags.noBrowser && !flags.storyMode) {
    throw new LauncherFlagError(
      '--no-browser is supported only with --story-mode.',
    );
  }
  if (
    !flags.storyMode &&
    (flags.storyModel ||
      flags.storyMaxMicrousd ||
      flags.storyMaxInputTokens ||
      flags.storyMaxOutputTokens ||
      flags.storyAuthorize)
  ) {
    throw new LauncherFlagError(
      'Story model arguments are supported only with --story-mode.',
    );
  }
  const evaluationNeedsConfig =
    flags.evaluationPacket ||
    flags.evaluationRun ||
    flags.memoryEvaluationPacket ||
    flags.memoryEvaluationRun;
  if (evaluationNeedsConfig !== Boolean(flags.configPath)) {
    throw new LauncherFlagError(
      'Evaluation modes require exactly one --config=<path>.',
    );
  }

  return flags;
}

/** Cheap Lab CLI grammar shared by scenario/inspect (no Nest/DB). */
export type LabCliArgs = {
  scenarioId: string | null;
  version: number;
  seed: number;
  lane: 'bench-policy' | 'sandbox-db';
  list: boolean;
};

export function parseLabCliArgs(argv: string[]): LabCliArgs {
  const positional = argv.filter((arg) => !arg.startsWith('--'));
  const read = (name: string) => {
    const prefix = `--${name}=`;
    const hit = argv.find((arg) => arg.startsWith(prefix));
    return hit ? hit.slice(prefix.length) : undefined;
  };
  const seedRaw = read('seed');
  const versionRaw = read('version');
  const laneRaw = read('lane') ?? 'bench-policy';
  const seed = seedRaw === undefined ? 141 : Number(seedRaw);
  const version = versionRaw === undefined ? 1 : Number(versionRaw);
  if (!Number.isInteger(seed) || !Number.isInteger(version) || version < 1) {
    throw new LauncherFlagError('Invalid --seed or --version');
  }
  if (laneRaw !== 'bench-policy' && laneRaw !== 'sandbox-db') {
    throw new LauncherFlagError(
      'Lab CLI supports only --lane=bench-policy|sandbox-db without Nest boot',
    );
  }
  const scenarioId = positional[0] ?? null;
  return {
    scenarioId,
    version,
    seed,
    lane: laneRaw,
    list: !scenarioId || scenarioId === 'list',
  };
}
