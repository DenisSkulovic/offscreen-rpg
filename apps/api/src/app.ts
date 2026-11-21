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
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction, Express } from 'express';
import type { Database, DatabaseConfig } from '@offscreen/db';
import { toNodeHandler } from 'better-auth/node';
import type { Auth } from './modules/auth/auth.js';
import {
  AUTH,
  IdentityController,
  IdentityService,
  type IdentityResolver,
} from './modules/auth/identity.js';
import {
  ADMIN_ACCESS,
  ADMIN_AUDIT,
  ADMIN_CASES,
  ADMIN_DIAGNOSTICS,
  ADMIN_ENVIRONMENT,
  ADMIN_ORIGIN,
  ADMIN_PLAYER_READS,
  ADMIN_SESSIONS,
  ADMIN_SITUATION,
  ADMIN_USAGE,
  AdminActorService,
  AdminController,
} from './modules/admin/controller.js';
import {
  createAdminAccess,
  createAdminAuditReads,
  createAdminCaseStore,
  createAdminDiagnosticsReads,
  createAdminPlayerReads,
  createAdminSituationReads,
  createAdminSessions,
  createAdminUsageReads,
  type AdminEnvironment,
} from '@offscreen/admin';

function adminEnvironmentForOrigin(origin: string): AdminEnvironment {
  try {
    const host = new URL(origin).hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
      return 'local';
    }
  } catch {
    /* fall through */
  }
  return 'local';
}
import { createDrafts } from '@offscreen/story-engine/drafts';
import { DRAFTS, DraftsController } from './modules/drafts/controller.js';
import { createScriptedOpenings } from '@offscreen/story-engine/generations';
import {
  OPENINGS,
  OpeningsController,
} from './modules/drafts/openings-controller.js';
import {
  chamberAllowsResponse,
  createChamber,
  createLabWorkbenchService,
  createQaJourneys,
  type ChamberStorytellerControl,
} from '@offscreen/lab-support';
import { createStoryApplication } from '@offscreen/story-engine/stories';
import {
  readStoryAuthorityConfig,
  storySeamFor,
  type StoryAuthorityConfig,
} from './modules/stories/game-authority-client.js';
import { createGameAuthoritySeam } from '@offscreen/game-authority/application';
import {
  STORIES,
  STORY_SEAM,
  STORY_UPDATE_HUB,
  StoriesController,
} from './modules/stories/controller.js';
import {
  createStoryUpdateHub,
  type StoryUpdateHub,
} from './modules/stories/story-update-hub.js';
import {
  CHAMBER,
  ChamberStoriesController,
  ChamberToolsController,
} from './modules/stories/chamber-tools-controller.js';
import {
  CHAMBER_LAB,
  ChamberLabController,
} from './modules/stories/chamber-lab-controller.js';
import type { ReadCache } from '@offscreen/contracts/read-cache';
import type { CacheIncident } from '@offscreen/story-engine/stories/read-cache-options';
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

@Injectable()
class StoryUpdateHubLifecycle {
  constructor(
    @Optional()
    @Inject(STORY_UPDATE_HUB)
    private readonly hub: StoryUpdateHub | null,
  ) {}
  onApplicationShutdown() {
    return this.hub?.close();
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
  openingContent?: readonly import('@offscreen/story-engine/storyteller').OpeningContentEntry[];
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
  const storyUpdateHub =
    options.storyUpdateHub === undefined
      ? options.databaseConfig
        ? createStoryUpdateHub(options.databaseConfig)
        : null
      : options.storyUpdateHub;
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
    ...(options.developerTools === true
      ? { fixtureSourceCanRespond: chamberAllowsResponse }
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
          ...(options.defaultRules ? { defaultRules: options.defaultRules } : {}),
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
      controllers: [
        HealthController,
        IdentityController,
        AdminController,
        DraftsController,
        StorytellersController,
        OpeningsController,
        StoriesController,
        ...(options.developerTools === true
          ? [
              ChamberStoriesController,
              ChamberToolsController,
              ChamberLabController,
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
        StoryUpdateHubLifecycle,
        { provide: DATABASE, useValue: database },
        {
          provide: CACHE_CLOSE,
          useValue: options.closeCache ?? (async () => {}),
        },
        { provide: STORY_UPDATE_HUB, useValue: storyUpdateHub },
        { provide: AUTH, useValue: auth },
        { provide: ADMIN_ORIGIN, useValue: origin },
        {
          provide: ADMIN_ENVIRONMENT,
          useValue: adminEnvironmentForOrigin(origin),
        },
        {
          provide: ADMIN_SESSIONS,
          useValue: createAdminSessions(database),
        },
        {
          provide: ADMIN_ACCESS,
          useValue: createAdminAccess(database),
        },
        {
          provide: ADMIN_PLAYER_READS,
          useValue: createAdminPlayerReads(database),
        },
        {
          provide: ADMIN_DIAGNOSTICS,
          useValue: createAdminDiagnosticsReads(database),
        },
        {
          provide: ADMIN_USAGE,
          useValue: createAdminUsageReads(database),
        },
        {
          provide: ADMIN_AUDIT,
          useValue: createAdminAuditReads(database),
        },
        {
          provide: ADMIN_CASES,
          useValue: createAdminCaseStore(database),
        },
        {
          provide: ADMIN_SITUATION,
          useValue: createAdminSituationReads(database),
        },
        AdminActorService,
        { provide: DRAFTS, useValue: createDrafts(database) },
        {
          provide: OPENINGS,
          useValue: createScriptedOpenings(
            database,
            options.storytellerExecution,
            options.storytellerUsagePolicy,
            {
              ...(options.documentStore
                ? { documentStore: options.documentStore }
                : {}),
              ...(options.openingContent
                ? { content: options.openingContent }
                : {}),
              ...(options.scriptedOpeningFallback === undefined
                ? {}
                : { scriptedFallback: options.scriptedOpeningFallback }),
            },
          ),
        },
        { provide: STORIES, useValue: stories },
        { provide: STORY_SEAM, useValue: storySeam },
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
              {
                provide: CHAMBER_LAB,
                useValue: createLabWorkbenchService({
                  gitCommit: options.qaContext?.git.commit ?? 'unrecorded',
                  dirty: options.qaContext?.git.dirty ?? true,
                }),
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
