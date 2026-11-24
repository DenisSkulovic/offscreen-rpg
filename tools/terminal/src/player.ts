import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { actionCommandSchema } from '@offscreen/contracts/campaign';
import {
  forkStorySchema,
  respondToStorySchema,
  storySnapshotSchema,
  controlIntervalSchema,
  type StoryHistory,
  type StoryList,
  type StorySnapshot,
} from '@offscreen/contracts/stories';
import {
  storyLaunchRequestSchema,
  type StoryLaunchRequest,
  type StoryLaunchStatus,
} from '@offscreen/contracts/story-launch';
import type { TerminalTokenCurrent } from '@offscreen/identity-interface/terminal-auth';
import {
  clearStoredAuth,
  readStoredAuth,
  type StoredTerminalAuth,
} from './auth-store.js';
import { launchPointerFilePath, pendingResolutionFilePath } from './config.js';
import { digestResolutionRequest, hashStoryLaunchRequest } from './digest.js';
import { historicalForkStoryId } from './historical-fork-story-id.js';
import { TerminalHttpError, type TerminalHttpClient } from './http.js';
import {
  clearLaunchPointer,
  clearPendingResolution,
  loadLaunchPointer,
  loadPendingResolution,
  saveLaunchPointer,
  savePendingResolution,
  type FrozenResolutionEnvelope,
  type LaunchPointer,
} from './pending-intent.js';
import {
  offerChildren,
  offerNodes,
  isPathStaged,
} from './campaign-projections.js';
import {
  renderSnapshotHuman,
  toPublicLaunchStatus,
  toPublicStoryHistory,
  toPublicStoryList,
  toPublicStorySnapshot,
} from './render.js';

export type WhoamiResult = {
  profile: TerminalTokenCurrent;
  stories: StoryList;
};

export class TerminalPlayerError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'TerminalPlayerError';
    this.code = code;
  }
}

export async function loadBearerToken(
  authFilePath: string,
): Promise<StoredTerminalAuth> {
  const stored = await readStoredAuth(authFilePath);
  if (!stored) {
    throw new TerminalHttpError(401, 'not_signed_in');
  }
  const expiresAt = Date.parse(stored.expiresAt);
  if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
    throw new TerminalHttpError(401, 'token_expired');
  }
  return stored;
}

async function playerSession(
  client: TerminalHttpClient,
  authFilePath: string,
): Promise<{ token: string; profile: TerminalTokenCurrent }> {
  const stored = await loadBearerToken(authFilePath);
  const profile = await client.readCurrentToken(stored.token);
  return { token: stored.token, profile };
}

export async function whoami(
  client: TerminalHttpClient,
  authFilePath: string,
): Promise<WhoamiResult> {
  const stored = await loadBearerToken(authFilePath);
  const profile = await client.readCurrentToken(stored.token);
  const stories = await client.listStories(stored.token);
  return { profile, stories };
}

export async function logout(
  client: TerminalHttpClient,
  authFilePath: string,
): Promise<'revoked' | 'offline_cleared'> {
  const stored = await readStoredAuth(authFilePath);
  if (!stored) {
    return 'offline_cleared';
  }
  try {
    await client.revokeCurrentToken(stored.token);
    await clearStoredAuth(authFilePath);
    return 'revoked';
  } catch (error) {
    if (error instanceof TerminalHttpError && error.status === 0) {
      await clearStoredAuth(authFilePath);
      return 'offline_cleared';
    }
    if (error instanceof TerminalHttpError && error.status >= 400) {
      await clearStoredAuth(authFilePath);
      return 'revoked';
    }
    throw error;
  }
}

export async function listStoriesCommand(
  client: TerminalHttpClient,
  authFilePath: string,
  json: boolean,
): Promise<string> {
  const { token } = await playerSession(client, authFilePath);
  const list = await client.listStories(token);
  if (json) {
    return `${JSON.stringify(toPublicStoryList(list), null, 2)}\n`;
  }
  return list.items
    .map((item) => `${item.id}\t${item.title}\t${item.status}`)
    .join('\n');
}

export async function refreshStory(
  client: TerminalHttpClient,
  authFilePath: string,
  storyId: string,
  json: boolean,
): Promise<{ text: string; snapshot: StorySnapshot }> {
  const { token } = await playerSession(client, authFilePath);
  const snapshot = await client.readStory(token, storyId);
  if (json) {
    return {
      text: `${JSON.stringify(toPublicStorySnapshot(snapshot), null, 2)}\n`,
      snapshot,
    };
  }
  return {
    text: `${renderSnapshotHuman(snapshot, { path: [], successorPaths: [] })}\n`,
    snapshot,
  };
}

export async function readStoryHistory(
  client: TerminalHttpClient,
  authFilePath: string,
  storyId: string,
  json: boolean,
): Promise<string> {
  const { token } = await playerSession(client, authFilePath);
  const history = await client.readHistory(token, storyId);
  if (json) {
    return `${JSON.stringify(toPublicStoryHistory(history), null, 2)}\n`;
  }
  return formatHistoryHuman(history);
}

function formatHistoryHuman(history: StoryHistory): string {
  return history.items
    .map((item) => `${item.sequence}\t${item.content.title}`)
    .join('\n');
}

function parseSnapshotFromPut(bodyText: string): StorySnapshot | null {
  if (bodyText.length === 0) {
    return null;
  }
  try {
    const json = JSON.parse(bodyText) as unknown;
    const parsed = storySnapshotSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function consultReceiptBeforeRetry(args: {
  client: TerminalHttpClient;
  token: string;
  ownerId: string;
  storyId: string;
  envelope: FrozenResolutionEnvelope;
  pendingPath: string;
}): Promise<'retry' | 'settled' | 'digest_mismatch' | 'blocked'> {
  const receipt = await args.client.readResolutionReceipt(
    args.token,
    args.storyId,
    args.envelope.operationId,
  );
  if (receipt === 'unauthorized') {
    await clearPendingResolution(args.pendingPath);
    throw new TerminalPlayerError('unauthorized');
  }
  if (receipt === 'not_found') {
    return 'retry';
  }
  if (receipt.requestDigest !== args.envelope.requestDigest) {
    await clearPendingResolution(args.pendingPath);
    throw new TerminalPlayerError(
      'digest_mismatch',
      'Saved recovery request no longer matches the server receipt.',
    );
  }
  if (receipt.state === 'settled') {
    await clearPendingResolution(args.pendingPath);
    return 'settled';
  }
  if (receipt.state === 'failed' || receipt.state === 'uncertain') {
    return 'blocked';
  }
  return 'retry';
}

export async function submitStoryChoice(args: {
  client: TerminalHttpClient;
  authFilePath: string;
  apiOrigin: string;
  storyId: string;
  optionId: string;
  retryOnly?: boolean;
  json?: boolean;
}): Promise<{ text: string; snapshot: StorySnapshot; operationId: string }> {
  const { token, profile } = await playerSession(
    args.client,
    args.authFilePath,
  );
  const pendingPath = pendingResolutionFilePath(
    args.apiOrigin,
    profile.userId,
    args.storyId,
  );
  const snapshot = await args.client.readStory(token, args.storyId);
  const interaction = snapshot.current.interaction;
  if (!interaction || interaction.specification.kind !== 'choice.v1') {
    throw new TerminalPlayerError('no_choice', 'No choice is available.');
  }
  const offered = interaction.specification.options.some(
    (option) => option.id === args.optionId,
  );
  if (!offered) {
    throw new TerminalPlayerError('invalid_option');
  }
  const body = respondToStorySchema.parse({
    expectedRevision: snapshot.revision,
    submission: {
      interactionId: interaction.id,
      answer: { kind: 'choice.v1', optionId: args.optionId },
    },
  });
  const requestDigest = digestResolutionRequest(body);

  let envelope = await loadPendingResolution(
    pendingPath,
    profile.userId,
    args.storyId,
  );

  if (envelope) {
    if (envelope.requestDigest !== requestDigest) {
      throw new TerminalPlayerError(
        'digest_mismatch',
        'A different frozen choice is already saved for this story.',
      );
    }
  } else if (args.retryOnly) {
    throw new TerminalPlayerError('no_pending_intent');
  } else {
    const operationId = randomUUID();
    envelope = {
      version: 1,
      kind: 'resolution',
      ownerId: profile.userId,
      storyId: args.storyId,
      operationId,
      endpoint: `/api/stories/${args.storyId}/resolutions/${operationId}`,
      body,
      requestDigest,
      createdAt: Date.now(),
    };
    await savePendingResolution(pendingPath, envelope);
  }

  const receiptGate = await consultReceiptBeforeRetry({
    client: args.client,
    token,
    ownerId: profile.userId,
    storyId: args.storyId,
    envelope,
    pendingPath,
  });
  if (receiptGate === 'settled') {
    const fresh = await args.client.readStory(token, args.storyId);
    const text = args.json
      ? JSON.stringify(toPublicStorySnapshot(fresh), null, 2)
      : renderSnapshotHuman(fresh, { path: [], successorPaths: [] });
    return {
      text: `${text}\n`,
      snapshot: fresh,
      operationId: envelope.operationId,
    };
  }

  const put = await args.client.putStoryJson({
    path: envelope.endpoint,
    body: envelope.body,
    bearer: token,
  });
  if (put.status === 409) {
    await clearPendingResolution(pendingPath);
    throw new TerminalPlayerError(
      'stale_revision',
      'The situation changed. Refresh and try again.',
    );
  }
  if (put.status === 400 || put.status === 422) {
    await clearPendingResolution(pendingPath);
    throw new TerminalPlayerError('invalid_choice');
  }
  if (put.status === 401) {
    await clearPendingResolution(pendingPath);
    throw new TerminalHttpError(401, 'unauthorized');
  }
  if (put.status === 0) {
    throw new TerminalHttpError(0);
  }
  if (!put.status || put.status >= 500 || put.status === 429) {
    throw new TerminalPlayerError(
      'awaiting_ack',
      'Could not confirm this choice. Retry the same frozen request.',
    );
  }

  const fromBody = parseSnapshotFromPut(put.bodyText);
  const next = fromBody ?? (await args.client.readStory(token, args.storyId));
  await clearPendingResolution(pendingPath);

  const text = args.json
    ? JSON.stringify(toPublicStorySnapshot(next), null, 2)
    : renderSnapshotHuman(next, { path: [], successorPaths: [] });
  return {
    text: `${text}\n`,
    snapshot: next,
    operationId: envelope.operationId,
  };
}

export async function submitCampaignCommit(args: {
  client: TerminalHttpClient;
  authFilePath: string;
  storyId: string;
  path: string[];
  successorPaths?: string[][];
  horizonGameSeconds?: number;
  json?: boolean;
}): Promise<{ text: string; snapshot: StorySnapshot }> {
  const { token } = await playerSession(args.client, args.authFilePath);
  const snapshot = await args.client.readStory(token, args.storyId);
  const campaign = snapshot.campaign;
  if (!campaign?.offer) {
    throw new TerminalPlayerError('no_campaign_offer');
  }
  const nodes = offerNodes(snapshot, campaign);
  const leafId = args.path.at(-1);
  const leaf = nodes.find((node) => node.id === leafId);
  if (!leaf?.action) {
    throw new TerminalPlayerError(
      'browse_only',
      'Browse-only nodes do not spend fictional time; pick a committing action.',
    );
  }
  if (isPathStaged(args.successorPaths ?? [], args.path)) {
    throw new TerminalPlayerError('path_staged');
  }
  const body = actionCommandSchema.parse({
    expectedRevision: snapshot.revision,
    offerId: campaign.offer.id,
    path: args.path,
    ...(args.successorPaths?.length
      ? {
          successorPaths: args.successorPaths,
          horizonGameSeconds: args.horizonGameSeconds,
        }
      : {}),
  });
  const operationId = randomUUID();
  const put = await args.client.putStoryJson({
    path: `/api/stories/${args.storyId}/actions/${operationId}`,
    body,
    bearer: token,
  });
  if (put.status === 409) {
    throw new TerminalPlayerError('stale_revision');
  }
  if (!put.status || put.status >= 400) {
    throw new TerminalHttpError(put.status || 0);
  }
  const fromBody = parseSnapshotFromPut(put.bodyText);
  const next = fromBody ?? (await args.client.readStory(token, args.storyId));
  const text = args.json
    ? JSON.stringify(toPublicStorySnapshot(next), null, 2)
    : renderSnapshotHuman(next, { path: [], successorPaths: [] });
  return { text: `${text}\n`, snapshot: next };
}

export async function forkStoryAtSequence(args: {
  client: TerminalHttpClient;
  authFilePath: string;
  sourceStoryId: string;
  sequence: number;
  json?: boolean;
}): Promise<{ text: string; forkStoryId: string; snapshot: StorySnapshot }> {
  const { token } = await playerSession(args.client, args.authFilePath);
  const scene = await args.client.readHistoricalScene(
    token,
    args.sourceStoryId,
    args.sequence,
  );
  const forkStoryId = historicalForkStoryId(args.sourceStoryId, args.sequence);
  const body = forkStorySchema.parse({
    expectedRevision: args.sequence,
    sourcePassageId: scene.current.id,
  });
  const snapshot = await args.client.putFork(
    token,
    args.sourceStoryId,
    forkStoryId,
    body,
  );
  const text = args.json
    ? JSON.stringify(toPublicStorySnapshot(snapshot), null, 2)
    : `Forked to ${forkStoryId}\n`;
  return { text: `${text}\n`, forkStoryId, snapshot };
}

export async function resumeWaitingStory(args: {
  client: TerminalHttpClient;
  authFilePath: string;
  storyId: string;
  json?: boolean;
}): Promise<{ text: string; snapshot: StorySnapshot }> {
  const { token } = await playerSession(args.client, args.authFilePath);
  const snapshot = await args.client.readStory(token, args.storyId);
  if (!snapshot.waiting?.canControl) {
    throw new TerminalPlayerError('cannot_resume');
  }
  const body = controlIntervalSchema.parse({
    intervalId: snapshot.current.id,
    expectedControlRevision: snapshot.waiting.controlRevision,
    action: 'resume',
  });
  const operationId = randomUUID();
  const put = await args.client.putStoryJson({
    path: `/api/stories/${args.storyId}/controls/${operationId}`,
    body,
    bearer: token,
  });
  if (put.status === 409) {
    throw new TerminalPlayerError('stale_revision');
  }
  if (!put.status || put.status >= 400) {
    throw new TerminalHttpError(put.status || 0);
  }
  const fromBody = parseSnapshotFromPut(put.bodyText);
  const next = fromBody ?? (await args.client.readStory(token, args.storyId));
  const text = args.json
    ? JSON.stringify(toPublicStorySnapshot(next), null, 2)
    : renderSnapshotHuman(next, { path: [], successorPaths: [] });
  return { text: `${text}\n`, snapshot: next };
}

function buildLaunchRequest(prompt: string): StoryLaunchRequest {
  const operationId = randomUUID();
  if (prompt.trim().length === 0) {
    throw new TerminalPlayerError('empty_prompt');
  }
  const parsed = storyLaunchRequestSchema.parse({
    operationId,
    source: { kind: 'prompt', prompt },
  });
  return parsed;
}

export async function launchStoryFromPrompt(args: {
  client: TerminalHttpClient;
  authFilePath: string;
  apiOrigin: string;
  prompt: string;
  json?: boolean;
}): Promise<{ text: string; operationId: string }> {
  const { token, profile } = await playerSession(
    args.client,
    args.authFilePath,
  );
  const pointerPath = launchPointerFilePath(args.apiOrigin, profile.userId);
  const request = buildLaunchRequest(args.prompt);
  const requestHash = hashStoryLaunchRequest(request);
  const pointer: LaunchPointer = {
    version: 1,
    ownerId: profile.userId,
    operationId: request.operationId,
    requestHash,
    createdAt: Date.now(),
  };
  await saveLaunchPointer(pointerPath, pointer);

  const put = await args.client.putLaunch(token, request.operationId, request);
  if (put === 'unauthorized') {
    throw new TerminalHttpError(401);
  }
  if (put === 'recover') {
    const recovered = await args.client.getLaunch(token, request.operationId);
    if (recovered.kind !== 'status') {
      throw new TerminalPlayerError('launch_recover_failed');
    }
    const text = args.json
      ? JSON.stringify(toPublicLaunchStatus(recovered.status), null, 2)
      : formatLaunchStatusHuman(recovered.status);
    return { text: `${text}\n`, operationId: request.operationId };
  }
  const text = args.json
    ? JSON.stringify(toPublicLaunchStatus(put), null, 2)
    : formatLaunchStatusHuman(put);
  return { text: `${text}\n`, operationId: request.operationId };
}

export async function launchStatusCommand(args: {
  client: TerminalHttpClient;
  authFilePath: string;
  apiOrigin: string;
  operationId?: string;
  json?: boolean;
}): Promise<string> {
  const { token, profile } = await playerSession(
    args.client,
    args.authFilePath,
  );
  const pointerPath = launchPointerFilePath(args.apiOrigin, profile.userId);
  const operationId =
    args.operationId ??
    (await loadLaunchPointer(pointerPath, profile.userId))?.operationId;
  if (!operationId) {
    throw new TerminalPlayerError('no_launch_pointer');
  }
  const result = await args.client.getLaunch(token, operationId);
  if (result.kind === 'not_found') {
    await clearLaunchPointer(pointerPath);
    throw new TerminalPlayerError('launch_not_found');
  }
  if (result.kind === 'unauthorized') {
    throw new TerminalHttpError(401);
  }
  if (result.kind !== 'status') {
    throw new TerminalPlayerError('launch_malformed');
  }
  if (result.status.state === 'ready') {
    await clearLaunchPointer(pointerPath);
  }
  if (args.json) {
    return `${JSON.stringify(toPublicLaunchStatus(result.status), null, 2)}\n`;
  }
  return `${formatLaunchStatusHuman(result.status)}\n`;
}

function formatLaunchStatusHuman(status: StoryLaunchStatus): string {
  const base = `Launch ${status.operationId}: ${status.state}`;
  if (status.state === 'ready') {
    return `${base} → story ${status.storyId}`;
  }
  if (status.state === 'held' || status.state === 'failed') {
    return `${base} (${'reason' in status ? status.reason : 'attention'})`;
  }
  if (status.state === 'uncertain') {
    return `${base} — ${status.explanation}`;
  }
  return base;
}

export async function interactivePlay(args: {
  client: TerminalHttpClient;
  authFilePath: string;
  apiOrigin: string;
  storyId: string;
}): Promise<void> {
  const rl = createInterface({ input, output });
  let offerPath: string[] = [];
  const successorPaths: string[][] = [];
  try {
    let running = true;
    while (running) {
      const { text } = await refreshStory(
        args.client,
        args.authFilePath,
        args.storyId,
        false,
      );
      process.stdout.write(`${text}\n`);
      const { token } = await playerSession(args.client, args.authFilePath);
      const snapshot = await args.client.readStory(token, args.storyId);
      const interaction = snapshot.current.interaction;
      const campaign = snapshot.campaign;
      const nodes =
        campaign && campaign.offer
          ? offerChildren(offerNodes(snapshot, campaign), offerPath)
          : [];

      const promptParts = [
        'Command (choose ID, commit PATH with !, back, refresh, quit)',
      ];
      const answer = (await rl.question(`${promptParts.join(' ')}: `)).trim();
      if (answer === 'quit' || answer === 'q') {
        running = false;
        continue;
      }
      if (answer === 'refresh') {
        continue;
      }
      if (answer === 'back') {
        offerPath = offerPath.slice(0, -1);
        continue;
      }
      if (answer.startsWith('!') && campaign?.offer) {
        const path = answer
          .slice(1)
          .split('/')
          .map((part) => part.trim())
          .filter(Boolean);
        const result = await submitCampaignCommit({
          client: args.client,
          authFilePath: args.authFilePath,
          storyId: args.storyId,
          path,
          successorPaths,
          json: false,
        });
        process.stdout.write(result.text);
        offerPath = [];
        continue;
      }
      if (interaction?.specification.kind === 'choice.v1') {
        const result = await submitStoryChoice({
          client: args.client,
          authFilePath: args.authFilePath,
          apiOrigin: args.apiOrigin,
          storyId: args.storyId,
          optionId: answer,
        });
        process.stdout.write(result.text);
        continue;
      }
      const node = nodes.find((entry) => entry.id === answer);
      if (node) {
        if (!node.action) {
          offerPath = [...offerPath, node.id];
          continue;
        }
        const result = await submitCampaignCommit({
          client: args.client,
          authFilePath: args.authFilePath,
          storyId: args.storyId,
          path: [...offerPath, node.id],
          successorPaths,
          json: false,
        });
        process.stdout.write(result.text);
        offerPath = [];
        continue;
      }
      process.stdout.write('Unknown command.\n');
    }
  } finally {
    rl.close();
  }
}

export {
  loadPendingResolution,
  savePendingResolution,
  type FrozenResolutionEnvelope,
};
