import {
  terminalAccessTokenIssuedSchema,
  terminalPairingCreatedSchema,
  terminalTokenCurrentSchema,
  type CreateTerminalPairingRequest,
  type TerminalAccessTokenIssued,
  type TerminalPairingCreated,
  type TerminalTokenCurrent,
} from '@offscreen/identity-interface/terminal-auth';
import {
  historicalSceneSchema,
  resolutionOperationReceiptSchema,
  storyHistorySchema,
  storyListSchema,
  storySnapshotSchema,
  type HistoricalScene,
  type ResolutionOperationReceipt,
  type StoryHistory,
  type StoryList,
  type StorySnapshot,
} from '@offscreen/story-interface/stories';
import {
  storyLaunchRequestSchema,
  storyLaunchStatusSchema,
  type StoryLaunchRequest,
  type StoryLaunchStatus,
} from '@offscreen/story-interface/story-launch';
import { assertAllowedApiOrigin, normalizeApiOrigin } from './config.js';

const REQUEST_TIMEOUT_MS = 10_000;

export class TerminalHttpError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, code?: string) {
    super(
      code
        ? `Request failed (${status}: ${code})`
        : `Request failed (${status})`,
    );
    this.name = 'TerminalHttpError';
    this.status = status;
    if (code !== undefined) {
      this.code = code;
    }
  }
}

export class TerminalRedirectError extends Error {
  constructor() {
    super('Refusing HTTP redirect that could leak credentials.');
    this.name = 'TerminalRedirectError';
  }
}

export type PutStoryResult = {
  status: number;
  bodyText: string;
};

export type TerminalHttpClient = {
  apiOrigin: string;
  requestJson<T>(args: {
    method: string;
    path: string;
    body?: unknown;
    bearer?: string;
    signal?: AbortSignal;
  }): Promise<T>;
  putStoryJson(args: {
    path: string;
    body: unknown;
    bearer: string;
    signal?: AbortSignal;
  }): Promise<PutStoryResult>;
  createPairing(
    body: CreateTerminalPairingRequest,
  ): Promise<TerminalPairingCreated>;
  exchangePairing(
    pairingId: string,
    verifier: string,
  ): Promise<TerminalAccessTokenIssued | 'pending'>;
  readCurrentToken(bearer: string): Promise<TerminalTokenCurrent>;
  revokeCurrentToken(bearer: string): Promise<void>;
  listStories(bearer: string): Promise<StoryList>;
  readStory(bearer: string, storyId: string): Promise<StorySnapshot>;
  readHistory(
    bearer: string,
    storyId: string,
    before?: number,
  ): Promise<StoryHistory>;
  readHistoricalScene(
    bearer: string,
    storyId: string,
    sequence: number,
  ): Promise<HistoricalScene>;
  readResolutionReceipt(
    bearer: string,
    storyId: string,
    operationId: string,
  ): Promise<ResolutionOperationReceipt | 'not_found' | 'unauthorized'>;
  putLaunch(
    bearer: string,
    operationId: string,
    body: StoryLaunchRequest,
  ): Promise<StoryLaunchStatus | 'recover' | 'unauthorized'>;
  getLaunch(
    bearer: string,
    operationId: string,
  ): Promise<
    | { kind: 'status'; status: StoryLaunchStatus }
    | { kind: 'not_found' }
    | { kind: 'malformed' }
    | { kind: 'unauthorized' }
  >;
  putFork(
    bearer: string,
    sourceStoryId: string,
    forkStoryId: string,
    body: unknown,
  ): Promise<StorySnapshot>;
};

function buildSignal(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return signal === undefined ? timeout : AbortSignal.any([signal, timeout]);
}

function sanitizeBodyForLogs(body: string): string {
  const tokenPattern = /[A-Za-z0-9_-]{20,}/g;
  return body.replace(tokenPattern, '[redacted]');
}

export function createTerminalHttpClient(
  rawOrigin: string,
  options?: { fetchImpl?: typeof fetch },
): TerminalHttpClient {
  assertAllowedApiOrigin(rawOrigin);
  const apiOrigin = normalizeApiOrigin(rawOrigin);
  const originUrl = new URL(apiOrigin);
  const fetchImpl = options?.fetchImpl ?? fetch;

  async function requestJson<T>(args: {
    method: string;
    path: string;
    body?: unknown;
    bearer?: string;
    signal?: AbortSignal;
  }): Promise<T> {
    const url = new URL(args.path, `${apiOrigin}/`);
    const headers: Record<string, string> = {
      accept: 'application/json',
    };
    if (args.body !== undefined) {
      headers['content-type'] = 'application/json';
    }
    if (args.bearer) {
      headers.authorization = `Bearer ${args.bearer}`;
    }
    if (args.method !== 'GET' && args.method !== 'HEAD') {
      headers.origin = originUrl.origin;
    }
    let response: Response;
    const requestInit: RequestInit = {
      method: args.method,
      headers,
      redirect: 'manual',
      signal: buildSignal(args.signal),
    };
    if (args.body !== undefined) {
      requestInit.body = JSON.stringify(args.body);
    }
    try {
      response = await fetchImpl(url, requestInit);
    } catch (error) {
      if (args.signal?.aborted) {
        throw error;
      }
      throw new TerminalHttpError(0);
    }
    if (response.status >= 300 && response.status < 400) {
      throw new TerminalRedirectError();
    }
    const text = await response.text();
    if (!response.ok) {
      let code: string | undefined;
      try {
        const json = JSON.parse(text) as { code?: string };
        if (typeof json.code === 'string') {
          code = json.code;
        }
      } catch {
        // ignore parse errors; never echo raw body (may contain secrets)
      }
      void sanitizeBodyForLogs(text);
      throw new TerminalHttpError(response.status, code);
    }
    if (text.length === 0) {
      return undefined as T;
    }
    return JSON.parse(text) as T;
  }

  async function putStoryJson(args: {
    path: string;
    body: unknown;
    bearer: string;
    signal?: AbortSignal;
  }): Promise<PutStoryResult> {
    const url = new URL(args.path, `${apiOrigin}/`);
    const headers: Record<string, string> = {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${args.bearer}`,
      origin: originUrl.origin,
    };
    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(args.body),
        redirect: 'manual',
        signal: buildSignal(args.signal),
      });
    } catch (error) {
      if (args.signal?.aborted) {
        throw error;
      }
      throw new TerminalHttpError(0);
    }
    if (response.status >= 300 && response.status < 400) {
      throw new TerminalRedirectError();
    }
    const bodyText = await response.text();
    return { status: response.status, bodyText };
  }

  return {
    apiOrigin,
    requestJson,
    putStoryJson,
    async createPairing(body) {
      const json = await requestJson<unknown>({
        method: 'POST',
        path: '/api/terminal-auth/pairings',
        body,
      });
      return terminalPairingCreatedSchema.parse(json);
    },
    async exchangePairing(pairingId, verifier) {
      const url = `/api/terminal-auth/pairings/${pairingId}/exchange`;
      const urlObj = new URL(url, `${apiOrigin}/`);
      const response = await fetchImpl(urlObj, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          origin: originUrl.origin,
        },
        body: JSON.stringify({ verifier }),
        redirect: 'manual',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.status >= 300 && response.status < 400) {
        throw new TerminalRedirectError();
      }
      if (response.status === 202) {
        return 'pending';
      }
      const text = await response.text();
      if (!response.ok) {
        let code: string | undefined;
        try {
          const json = JSON.parse(text) as { code?: string };
          if (typeof json.code === 'string') {
            code = json.code;
          }
        } catch {
          // ignore
        }
        throw new TerminalHttpError(response.status, code);
      }
      return terminalAccessTokenIssuedSchema.parse(JSON.parse(text));
    },
    async readCurrentToken(bearer) {
      const json = await requestJson<unknown>({
        method: 'GET',
        path: '/api/terminal-auth/tokens/current',
        bearer,
      });
      return terminalTokenCurrentSchema.parse(json);
    },
    async revokeCurrentToken(bearer) {
      await requestJson<void>({
        method: 'DELETE',
        path: '/api/terminal-auth/tokens/current',
        bearer,
      });
    },
    async listStories(bearer) {
      const json = await requestJson<unknown>({
        method: 'GET',
        path: '/api/stories',
        bearer,
      });
      return storyListSchema.parse(json);
    },
    async readStory(bearer, storyId) {
      const json = await requestJson<unknown>({
        method: 'GET',
        path: `/api/stories/${storyId}`,
        bearer,
      });
      return storySnapshotSchema.parse(json);
    },
    async readHistory(bearer, storyId, before) {
      const path =
        before === undefined
          ? `/api/stories/${storyId}/history`
          : `/api/stories/${storyId}/history?before=${before}`;
      const json = await requestJson<unknown>({
        method: 'GET',
        path,
        bearer,
      });
      return storyHistorySchema.parse(json);
    },
    async readHistoricalScene(bearer, storyId, sequence) {
      const json = await requestJson<unknown>({
        method: 'GET',
        path: `/api/stories/${storyId}/scenes/${sequence}`,
        bearer,
      });
      return historicalSceneSchema.parse(json);
    },
    async readResolutionReceipt(bearer, storyId, operationId) {
      const url = new URL(
        `/api/stories/${storyId}/resolutions/${operationId}/receipt`,
        `${apiOrigin}/`,
      );
      let response: Response;
      try {
        response = await fetchImpl(url, {
          method: 'GET',
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${bearer}`,
          },
          redirect: 'manual',
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch {
        throw new TerminalHttpError(0);
      }
      if (response.status === 404) {
        return 'not_found';
      }
      if (response.status === 401) {
        return 'unauthorized';
      }
      if (!response.ok) {
        throw new TerminalHttpError(response.status);
      }
      const text = await response.text();
      return resolutionOperationReceiptSchema.parse(JSON.parse(text));
    },
    async putLaunch(bearer, operationId, body) {
      storyLaunchRequestSchema.parse(body);
      if (body.operationId !== operationId) {
        throw new TerminalHttpError(400, 'launch_operation_mismatch');
      }
      const result = await putStoryJson({
        path: `/api/stories/launch/${operationId}`,
        body,
        bearer,
      });
      if (result.status === 401) {
        return 'unauthorized';
      }
      if (result.status === 202) {
        return 'recover';
      }
      let json: unknown;
      try {
        json = result.bodyText.length > 0 ? JSON.parse(result.bodyText) : null;
      } catch {
        return 'recover';
      }
      const parsed = storyLaunchStatusSchema.safeParse(json);
      if (parsed.success) {
        return parsed.data;
      }
      return 'recover';
    },
    async getLaunch(bearer, operationId) {
      let json: unknown;
      try {
        json = await requestJson<unknown>({
          method: 'GET',
          path: `/api/stories/launch/${operationId}`,
          bearer,
        });
      } catch (error) {
        if (error instanceof TerminalHttpError) {
          if (error.status === 401) {
            return { kind: 'unauthorized' as const };
          }
          if (error.status === 404) {
            return { kind: 'not_found' as const };
          }
        }
        return { kind: 'malformed' as const };
      }
      const parsed = storyLaunchStatusSchema.safeParse(json);
      if (!parsed.success) {
        return { kind: 'malformed' as const };
      }
      return { kind: 'status' as const, status: parsed.data };
    },
    async putFork(bearer, sourceStoryId, forkStoryId, body) {
      const json = await requestJson<unknown>({
        method: 'PUT',
        path: `/api/stories/${sourceStoryId}/forks/${forkStoryId}`,
        body,
        bearer,
      });
      return storySnapshotSchema.parse(json);
    },
  };
}
