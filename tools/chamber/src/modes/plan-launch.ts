/**
 * Pure Chamber launch plan. It decides the mode, database, and provider
 * denial. It does not read a key, open a port, or construct a provider.
 */
import type { ParsedLauncherFlags } from './cli-flags.js';

export type LaunchMode =
  | 'default'
  | 'smoke'
  | 'forensic-campaigns'
  | 'review'
  | 'packet-review'
  | 'memory-packet-review'
  | 'memory-comparison-packets'
  | 'memory-evaluation-packet'
  | 'memory-evaluation-run'
  | 'evaluation-packet'
  | 'evaluation-run'
  | 'story';

export type LaunchProviderDispatch =
  | 'disabled'
  | 'story-after-authority'
  | 'evaluation-after-authorization';

export type LaunchStory = {
  model: string;
  maxMicrousd: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  route: string;
};

export type LaunchPlan =
  | { ok: false; reason: string }
  | {
      ok: true;
      mode: LaunchMode;
      databaseName: 'offscreen_chamber' | 'offscreen_story_local';
      databaseUrl: string;
      resetDatabase: boolean;
      providerDispatch: LaunchProviderDispatch;
      story: LaunchStory | null;
      ports: { api: 3001; web: 3100 | null };
    };

const PERMITTED_STORY_MODELS = new Set([
  'openai/gpt-5.6-luna',
  'openai/gpt-5.6-terra',
  'openai/gpt-5.6-sol',
]);

function launchMode(flags: ParsedLauncherFlags): LaunchMode {
  if (flags.storyMode) return 'story';
  if (flags.smoke) return 'smoke';
  if (flags.forensicCampaigns) return 'forensic-campaigns';
  if (flags.review) return 'review';
  if (flags.packetReview) return 'packet-review';
  if (flags.memoryPacketReview) return 'memory-packet-review';
  if (flags.memoryComparisonPackets) return 'memory-comparison-packets';
  if (flags.memoryEvaluationPacket) return 'memory-evaluation-packet';
  if (flags.memoryEvaluationRun) return 'memory-evaluation-run';
  if (flags.evaluationPacket) return 'evaluation-packet';
  if (flags.evaluationRun) return 'evaluation-run';
  return 'default';
}

function providerDispatch(
  flags: ParsedLauncherFlags,
): LaunchProviderDispatch {
  if (flags.storyMode) return 'story-after-authority';
  if (flags.evaluationRun || flags.memoryEvaluationRun) {
    return 'evaluation-after-authorization';
  }
  return 'disabled';
}

function storyPlan(
  flags: ParsedLauncherFlags,
): { ok: true; story: LaunchStory | null } | { ok: false; reason: string } {
  if (!flags.storyMode) return { ok: true, story: null };
  const model = flags.storyModel ?? 'openai/gpt-5.6-luna';
  if (!PERMITTED_STORY_MODELS.has(model)) {
    return {
      ok: false,
      reason:
        'Story mode supports only the reviewed GPT-5.6 Luna, Terra, and Sol routes.',
    };
  }
  const maxMicrousd = flags.storyMaxMicrousd
    ? Number(flags.storyMaxMicrousd)
    : 10_000;
  if (
    !Number.isInteger(maxMicrousd) ||
    maxMicrousd < 1 ||
    maxMicrousd > 250_000
  ) {
    return {
      ok: false,
      reason: '--story-max-microusd must be an integer from 1 through 250000.',
    };
  }
  const maxOutputTokens = flags.storyMaxOutputTokens
    ? Number(flags.storyMaxOutputTokens)
    : 2_048;
  if (
    !Number.isInteger(maxOutputTokens) ||
    maxOutputTokens < 512 ||
    maxOutputTokens > 8_000
  ) {
    return {
      ok: false,
      reason:
        '--story-max-output-tokens must be an integer from 512 through 8000.',
    };
  }
  const maxInputTokens = flags.storyMaxInputTokens
    ? Number(flags.storyMaxInputTokens)
    : 12_000;
  if (
    !Number.isInteger(maxInputTokens) ||
    maxInputTokens < 8_000 ||
    maxInputTokens > 100_000
  ) {
    return {
      ok: false,
      reason:
        '--story-max-input-tokens must be an integer from 8000 through 100000.',
    };
  }
  if (
    (model !== 'openai/gpt-5.6-luna' || maxMicrousd > 10_000) &&
    flags.storyAuthorize !== `${model}@${maxMicrousd}`
  ) {
    return {
      ok: false,
      reason: `This Story route requires --authorize-story-model=${model}@${maxMicrousd}.`,
    };
  }
  return {
    ok: true,
    story: {
      model,
      maxMicrousd,
      maxInputTokens,
      maxOutputTokens,
      route: `openrouter:${model.slice('openai/'.length)}`,
    },
  };
}

function databaseDenial(
  storyMode: boolean,
  databaseName: string,
  databaseUrl: string,
): string | null {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    return `Local ${storyMode ? 'Story mode' : 'Chamber'} requires the ${databaseName} database, without connection query overrides.`;
  }
  if (
    !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
    !['127.0.0.1', 'localhost'].includes(parsed.hostname) ||
    parsed.pathname !== `/${databaseName}` ||
    parsed.search
  ) {
    return `Local ${storyMode ? 'Story mode' : 'Chamber'} requires the ${databaseName} database, without connection query overrides.`;
  }
  return null;
}

/** Validated flags and optional database URLs. No process or network access. */
export function planLaunch(input: {
  flags: ParsedLauncherFlags;
  chamberDatabaseUrl?: string;
  storyDatabaseUrl?: string;
}): LaunchPlan {
  const story = storyPlan(input.flags);
  if (!story.ok) return story;
  const databaseName = input.flags.storyMode
    ? 'offscreen_story_local'
    : 'offscreen_chamber';
  const databaseUrl = input.flags.storyMode
    ? (input.storyDatabaseUrl ??
      `postgresql://offscreen:local-development-only@127.0.0.1:5432/${databaseName}`)
    : (input.chamberDatabaseUrl ??
      `postgresql://offscreen:local-development-only@127.0.0.1:5432/${databaseName}`);
  const reason = databaseDenial(
    input.flags.storyMode,
    databaseName,
    databaseUrl,
  );
  if (reason) return { ok: false, reason };
  return {
    ok: true,
    mode: launchMode(input.flags),
    databaseName,
    databaseUrl,
    resetDatabase: input.flags.resetDatabase,
    providerDispatch: providerDispatch(input.flags),
    story: story.story,
    ports: { api: 3001, web: input.flags.noBrowser ? null : 3100 },
  };
}

/** The evaluation id check that already runs after the config file is read. */
export function evaluationAuthorizationDenial(input: {
  evaluationRun: boolean;
  memoryEvaluationRun: boolean;
  authorize: string | null;
  evaluationId: string | null;
}): string | null {
  if (input.evaluationRun && input.authorize !== input.evaluationId) {
    return '--evaluation-run requires --authorize=<evaluation-id> matching the config.';
  }
  if (input.memoryEvaluationRun && input.authorize !== input.evaluationId) {
    return '--memory-evaluation-run requires --authorize=<evaluation-id> matching the config.';
  }
  return null;
}
