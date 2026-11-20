import { StoryError } from '@offscreen/application/stories';
import type { CampaignStart } from '@offscreen/contracts/campaign';
import {
  gameAuthorityActorIdSchema,
  gameAuthoritySeamVersion,
  gameAuthorityStoryIdSchema,
} from '@offscreen/contracts/game-authority';
import { startStorySchema } from '@offscreen/contracts/stories';
import { z } from 'zod';

export type StartFromCandidateInput = {
  ownerId: string;
  storyId: string;
  candidateId: string;
  expectedDraftRevision: number;
  campaign?: CampaignStart;
};

export type StorySeam = {
  read(args: { ownerId: string; storyId: string }): Promise<unknown>;
  startFromCandidate(args: StartFromCandidateInput): Promise<unknown>;
  admitResolution(args: {
    ownerId: string;
    storyId: string;
    operationId: string;
    body: unknown;
  }): Promise<unknown>;
};

export type StoryAuthorityConfig =
  | { readonly mode: 'compose' }
  | {
      readonly mode: 'distributed';
      readonly origin: string;
      readonly token: string;
      readonly timeoutMs: number;
    };

const timeoutMs = z.coerce
  .number()
  .int()
  .min(50)
  .max(10_000)
  .default(5000);

function failConfig(fields: string): never {
  throw new Error(`Invalid API configuration: ${fields}`);
}

export function readStoryAuthorityConfig(
  env: Record<string, string | undefined>,
): StoryAuthorityConfig {
  const mode = env['GAME_AUTHORITY_MODE'] ?? 'compose';
  if (mode === 'compose') return { mode: 'compose' };
  if (mode !== 'distributed') failConfig('GAME_AUTHORITY_MODE');
  const origin = env['GAME_AUTHORITY_ORIGIN'];
  const token = env['GAME_AUTHORITY_SERVICE_TOKEN'];
  if (!origin || !token || token.length < 16 || token.length > 256) {
    failConfig('GAME_AUTHORITY_ORIGIN, GAME_AUTHORITY_SERVICE_TOKEN');
  }
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    failConfig('GAME_AUTHORITY_ORIGIN');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    failConfig('GAME_AUTHORITY_ORIGIN');
  }
  const parsedTimeout = timeoutMs.safeParse(
    env['GAME_AUTHORITY_TIMEOUT_MS'] ?? 5000,
  );
  if (!parsedTimeout.success) failConfig('GAME_AUTHORITY_TIMEOUT_MS');
  return {
    mode: 'distributed',
    origin: url.origin,
    token,
    timeoutMs: parsedTimeout.data,
  };
}

function startRequestBody(
  input: Omit<StartFromCandidateInput, 'ownerId' | 'storyId'>,
) {
  return startStorySchema.parse({
    candidateId: input.candidateId,
    expectedDraftRevision: input.expectedDraftRevision,
    ...(input.campaign !== undefined ? { campaign: input.campaign } : {}),
  });
}

export function createLocalStorySeam(stories: StorySeam): StorySeam {
  return {
    read: (args) => stories.read(args),
    startFromCandidate: (args) => stories.startFromCandidate(args),
    admitResolution: (args) => stories.admitResolution(args),
  };
}

const errorCode = z.enum([
  'invalid',
  'not_found',
  'conflict',
  'unavailable',
]);

async function callGameAuthority(
  config: Extract<StoryAuthorityConfig, { mode: 'distributed' }>,
  request: {
    method: 'GET' | 'PUT';
    path: string;
    ownerId: string;
    body?: unknown;
  },
) {
  const actor = gameAuthorityActorIdSchema.safeParse(request.ownerId);
  if (!actor.success) throw new StoryError('invalid');
  let response: Response;
  try {
    response = await fetch(new URL(request.path, config.origin), {
      method: request.method,
      redirect: 'error',
      signal: AbortSignal.timeout(config.timeoutMs),
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${config.token}`,
        'x-offscreen-actor-id': actor.data,
        'x-offscreen-game-authority-version': gameAuthoritySeamVersion,
        ...(request.body === undefined
          ? {}
          : { 'content-type': 'application/json' }),
      },
      ...(request.body === undefined
        ? {}
        : { body: JSON.stringify(request.body) }),
    });
  } catch {
    throw new StoryError('unavailable');
  }
  const text = await response.text();
  let payload: unknown;
  if (text.length > 0) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      throw new StoryError('unavailable');
    }
  }
  if (response.status === 200 || response.status === 202) return payload;
  const code = errorCode.safeParse(
    payload && typeof payload === 'object' && 'code' in payload
      ? payload.code
      : undefined,
  );
  if (code.success) throw new StoryError(code.data);
  throw new StoryError('unavailable');
}

export function storySeamFor(
  stories: StorySeam,
  authority: StoryAuthorityConfig,
): StorySeam {
  return authority.mode === 'distributed'
    ? createRemoteStorySeam(authority)
    : createLocalStorySeam(stories);
}

export function createRemoteStorySeam(
  config: Extract<StoryAuthorityConfig, { mode: 'distributed' }>,
): StorySeam {
  return {
    read({ ownerId, storyId }) {
      const id = gameAuthorityStoryIdSchema.safeParse(storyId);
      if (!id.success) throw new StoryError('invalid');
      return callGameAuthority(config, {
        method: 'GET',
        path: `/internal/v1/stories/${id.data}`,
        ownerId,
      });
    },
    startFromCandidate({ ownerId, storyId, candidateId, expectedDraftRevision, campaign }) {
      const id = gameAuthorityStoryIdSchema.safeParse(storyId);
      if (!id.success) throw new StoryError('invalid');
      return callGameAuthority(config, {
        method: 'PUT',
        path: `/internal/v1/stories/${id.data}/start`,
        ownerId,
        body: startRequestBody({
          candidateId,
          expectedDraftRevision,
          ...(campaign !== undefined ? { campaign } : {}),
        }),
      });
    },
    admitResolution({ ownerId, storyId, operationId, body }) {
      const id = gameAuthorityStoryIdSchema.safeParse(storyId);
      const operation = gameAuthorityStoryIdSchema.safeParse(operationId);
      if (!id.success || !operation.success) throw new StoryError('invalid');
      return callGameAuthority(config, {
        method: 'PUT',
        path: `/internal/v1/stories/${id.data}/resolutions/${operation.data}`,
        ownerId,
        body,
      });
    },
  };
}
