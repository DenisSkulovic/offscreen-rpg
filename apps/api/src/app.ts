import { StorytellersController } from './modules/drafts/storytellers-controller.js';
import type { ExecutionPolicy } from '@offscreen/storyteller/tasks';
import type { EffectiveUsagePolicy } from '@offscreen/contracts/usage-policy';
import type { z } from 'zod';
import type {
  qaEnvironmentSchema,
  qaGitStateSchema,
} from '@offscreen/contracts/qa';
import 'reflect-metadata';
import {
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  ServiceUnavailableException,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction, Express } from 'express';
import type { Database } from '@offscreen/db';
import { toNodeHandler } from 'better-auth/node';
import type { Auth } from './modules/auth/auth.js';
import {
  AUTH,
  IdentityController,
  IdentityService,
  type IdentityResolver,
} from './modules/auth/identity.js';
import { createDrafts } from '@offscreen/application/drafts';
import { DRAFTS, DraftsController } from './modules/drafts/controller.js';
import { createScriptedOpenings } from '@offscreen/application/generations';
import {
  OPENINGS,
  OpeningsController,
} from './modules/drafts/openings-controller.js';
import {
  createChamber,
  type ChamberStorytellerControl,
} from '@offscreen/application/developer-tools';
import { createStoryApplication } from '@offscreen/application/stories';
import { STORIES, StoriesController } from './modules/stories/controller.js';
import {
  CHAMBER,
  ChamberStoriesController,
  ChamberToolsController,
} from './modules/stories/chamber-tools-controller.js';
import { createQaJourneys } from '@offscreen/application/developer-tools';
import type { CacheIncident, ReadCache } from '@offscreen/application/cache';
import type { DocumentStore, RulePackageReference } from '@offscreen/documents';
import {
  QA_JOURNEYS,
  QaJourneysController,
} from './modules/stories/qa-journeys-controller.js';

const DATABASE = Symbol('DATABASE');
const CACHE_CLOSE = Symbol('CACHE_CLOSE');

@Injectable()
class DatabaseLifecycle {
  constructor(@Inject(DATABASE) private readonly database: Database) {}
  onApplicationShutdown() {
    return this.database.close();
  }
}

@Injectable()
class CacheLifecycle {
  constructor(
    @Inject(CACHE_CLOSE) private readonly closeCache: () => Promise<void>,
  ) {}
  onApplicationShutdown() {
    return this.closeCache();
  }
}

@Controller('health')
class HealthController {
  constructor(@Inject(DATABASE) private readonly database: Database) {}
  @Get('live')
  live() {
    return { status: 'ok' };
  }
  @Get('ready')
  async ready() {
    try {
      await this.database.checkConnection();
    } catch {
      throw new ServiceUnavailableException();
    }
    return { status: 'ok' };
  }
}

@Module({})
class AppModule {}

export type CreateAppOptions = Readonly<{
  /** Loopback harnesses may supply a fixed identity without changing normal auth. */
  identity?: IdentityResolver;
  developerTools?: boolean;
  chamberStorytellerControl?: ChamberStorytellerControl;
  storytellerExecution?: ExecutionPolicy;
  storytellerUsagePolicy?: EffectiveUsagePolicy | null;
  readCache?: ReadCache;
  closeCache?: () => Promise<void>;
  onCacheIncident?: (incident: CacheIncident) => void;
  documentStore?: DocumentStore;
  defaultRules?: RulePackageReference;
  qaContext?: {
    git: z.infer<typeof qaGitStateSchema>;
    environment: z.infer<typeof qaEnvironmentSchema>;
  };
}>;

export async function createApp(
  database: Database,
  auth: Auth,
  origin: string,
  options: CreateAppOptions = {},
) {
  const app = await NestFactory.create<NestExpressApplication>(
    {
      module: AppModule,
      controllers: [
        HealthController,
        IdentityController,
        DraftsController,
        StorytellersController,
        OpeningsController,
        StoriesController,
        ...(options.developerTools === true
          ? [
              ChamberStoriesController,
              ChamberToolsController,
              QaJourneysController,
            ]
          : []),
      ],
      providers: [
        options.identity
          ? { provide: IdentityService, useValue: options.identity }
          : IdentityService,
        DatabaseLifecycle,
        CacheLifecycle,
        { provide: DATABASE, useValue: database },
        {
          provide: CACHE_CLOSE,
          useValue: options.closeCache ?? (async () => {}),
        },
        { provide: AUTH, useValue: auth },
        { provide: DRAFTS, useValue: createDrafts(database) },
        {
          provide: OPENINGS,
          useValue: createScriptedOpenings(
            database,
            options.storytellerExecution,
            options.storytellerUsagePolicy,
          ),
        },
        {
          provide: STORIES,
          useValue: createStoryApplication(database, {
            ...(options.documentStore
              ? { documentStore: options.documentStore }
              : {}),
            ...(options.defaultRules
              ? { defaultRules: options.defaultRules }
              : {}),
            ...(options.readCache ? { cache: options.readCache } : {}),
            ...(options.onCacheIncident
              ? { onCacheIncident: options.onCacheIncident }
              : {}),
          }),
        },
        ...(options.developerTools === true
          ? [
              {
                provide: CHAMBER,
                useValue: createChamber(database, {
                  ...(options.documentStore
                    ? { documentStore: options.documentStore }
                    : {}),
                  ...(options.readCache ? { cache: options.readCache } : {}),
                  ...(options.onCacheIncident
                    ? { onCacheIncident: options.onCacheIncident }
                    : {}),
                  ...(options.chamberStorytellerControl
                    ? {
                        storytellerControl: options.chamberStorytellerControl,
                      }
                    : {}),
                }),
              },
              {
                provide: QA_JOURNEYS,
                useValue: createQaJourneys(
                  database,
                  options.qaContext ?? {
                    git: { commit: 'unrecorded', dirty: true },
                    environment: { identity: 'local-test' },
                  },
                ),
              },
            ]
          : []),
      ],
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
