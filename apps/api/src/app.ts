import type { ExecutionPolicy } from '@offscreen/storyteller/tasks';
import type { EffectiveUsagePolicy } from '@offscreen/contracts/usage-policy';
import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction, Express } from 'express';
import type { Database, DatabaseConfig } from '@offscreen/db';
import { toNodeHandler } from 'better-auth/node';
import type { Auth } from './modules/auth/auth.js';
import type { IdentityResolver } from './modules/auth/identity.js';
import type { OpeningContentEntry } from '@offscreen/story-engine/storyteller/openings';
import {
  readStoryAuthorityConfig,
  storySeamFor,
  type StoryAuthorityConfig,
} from './modules/stories/game-authority-client.js';
import { createGameAuthoritySeam } from '@offscreen/game-authority/application';
import { createStoryApplication } from '@offscreen/story-engine/stories';
import {
  createStoryUpdateHub,
  type StoryUpdateHub,
} from './modules/stories/story-update-hub.js';
import type { ReadCache } from '@offscreen/contracts/read-cache';
import type { CacheIncident } from '@offscreen/story-engine/stories/read-cache-options';
import type { DocumentStore, RulePackageReference } from '@offscreen/documents';
import type { ApiOptionalExtension } from './lab-host-contract.js';
import { buildApiControllers } from './bootstrap/api-controllers.js';
import { buildApiProviders } from './bootstrap/api-providers.js';

@Module({})
class AppModule {}

export type InjectedStoriesApplication = ReturnType<
  typeof createStoryApplication
>;

export type CreateAppOptions = Readonly<{
  /** Loopback harnesses may supply a fixed identity without changing normal auth. */
  identity?: IdentityResolver;
  /**
   * Outer tooling (API Lab) may register controllers and providers. Production
   * bootstrap leaves this unset, so Chamber and QA routes are not created.
   */
  optionalExtension?: ApiOptionalExtension;
  storytellerExecution?: ExecutionPolicy;
  storytellerUsagePolicy?: EffectiveUsagePolicy | null;
  readCache?: ReadCache;
  closeCache?: () => Promise<void>;
  onCacheIncident?: (incident: CacheIncident) => void;
  documentStore?: DocumentStore;
  defaultRules?: RulePackageReference;
  openingContent?: readonly OpeningContentEntry[];
  scriptedOpeningFallback?: boolean;
  /** Enables PostgreSQL LISTEN → SSE story view hints (W16). */
  databaseConfig?: DatabaseConfig;
  /** Test override; when set, skips creating a listener from databaseConfig. */
  storyUpdateHub?: StoryUpdateHub | null;
  /**
   * Embedded mode keeps the in-process writer. Distributed mode calls Game
   * Authority for the snapshot read and scripted resolution only.
   */
  storyAuthority?: StoryAuthorityConfig;
  /** BETTER_AUTH_SECRET drives HMAC rate limits for device pairing creation. */
  terminalPairingHmacSecret?: string;
}>;

export async function createApp(
  database: Database,
  auth: Auth,
  origin: string,
  options: CreateAppOptions = {},
) {
  let storyUpdateHub = options.storyUpdateHub ?? null;
  if (options.storyUpdateHub === undefined) {
    storyUpdateHub = options.databaseConfig
      ? createStoryUpdateHub(options.databaseConfig)
      : null;
  }
  if (storyUpdateHub) {
    await storyUpdateHub.start();
  }
  const stories = createStoryApplication(database, {
    ...(options.documentStore ? { documentStore: options.documentStore } : {}),
    ...(options.defaultRules ? { defaultRules: options.defaultRules } : {}),
    ...(options.readCache ? { cache: options.readCache } : {}),
    ...(options.onCacheIncident
      ? { onCacheIncident: options.onCacheIncident }
      : {}),
    ...(options.optionalExtension?.fixtureSourceCanRespond
      ? {
          fixtureSourceCanRespond:
            options.optionalExtension.fixtureSourceCanRespond,
        }
      : {}),
  });
  const requireExplicitStoryAuthority =
    (process.env['OFFSCREEN_DOCUMENT_STORE'] ?? '').trim().toLowerCase() ===
    's3';
  const storyAuthority =
    options.storyAuthority ??
    readStoryAuthorityConfig(process.env, {
      requireExplicitMode: requireExplicitStoryAuthority,
    });
  const launchAuthority =
    storyAuthority.mode === 'embedded'
      ? createGameAuthoritySeam(database, {
          ...(options.documentStore
            ? { documentStore: options.documentStore }
            : {}),
          ...(options.defaultRules
            ? { defaultRules: options.defaultRules }
            : {}),
        })
      : null;
  const storySeam = storySeamFor(
    {
      ...stories,
      ...(launchAuthority
        ? {
            putLaunch: (args) => launchAuthority.putLaunch(args),
            getLaunch: (args) => launchAuthority.getLaunch(args),
          }
        : {}),
    },
    storyAuthority,
  );
  const app = await NestFactory.create<NestExpressApplication>(
    {
      module: AppModule,
      controllers: buildApiControllers(options.optionalExtension),
      providers: buildApiProviders({
        database,
        auth,
        origin,
        identity: options.identity,
        optionalExtension: options.optionalExtension,
        storytellerExecution: options.storytellerExecution,
        storytellerUsagePolicy: options.storytellerUsagePolicy,
        closeCache: options.closeCache,
        documentStore: options.documentStore,
        openingContent: options.openingContent,
        scriptedOpeningFallback: options.scriptedOpeningFallback,
        storyUpdateHub,
        stories,
        storySeam,
        terminalPairingHmacSecret: options.terminalPairingHmacSecret,
      }),
    },
    {
      logger: ['error', 'warn', 'log'],
      bodyParser: false,
    },
  );
  const express: Express = app.getHttpAdapter().getInstance();
  express.use(
    '/api',
    (request: Request, response: Response, next: NextFunction) => {
      request.headers['x-offscreen-client-ip'] =
        request.socket.remoteAddress ?? '127.0.0.1';
      response.setHeader('Cache-Control', 'no-store');
      if (
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) &&
        !request.path.startsWith('/auth/') &&
        request.headers.origin !== origin
      ) {
        response.status(403).json({ code: 'invalid_origin' });
        return;
      }
      next();
    },
  );
  express.all('/api/auth/{*path}', toNodeHandler(auth));
  app.useBodyParser('json', { limit: '64kb' });
  app.setGlobalPrefix('api');
  return app;
}
