import { Inject, Injectable, Optional, type Provider } from '@nestjs/common';
import type { Database } from '@offscreen/db';
import type { Auth } from '../modules/auth/auth.js';
import {
  AUTH,
  IdentityService,
  type IdentityResolver,
} from '../modules/auth/identity.js';
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
} from '../modules/admin/controller.js';
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
import { createDrafts } from '@offscreen/story-engine/drafts';
import { DRAFTS } from '../modules/drafts/controller.js';
import { createScriptedOpenings } from '@offscreen/story-engine/generations';
import { OPENINGS } from '../modules/drafts/openings-controller.js';
import type { ExecutionPolicy } from '@offscreen/storyteller/tasks';
import type { EffectiveUsagePolicy } from '@offscreen/usage-policy/usage-policy';
import type { OpeningContentEntry } from '@offscreen/story-engine/storyteller/openings';
import type { DocumentStore } from '@offscreen/documents';
import {
  STORIES,
  STORY_SEAM,
  STORY_UPDATE_HUB,
} from '../modules/stories/controller.js';
import type { StorySeam } from '../modules/stories/game-authority-client.js';
import { StoryPlayerIdentity } from '../modules/stories/story-player-identity.js';
import type { StoryUpdateHub } from '../modules/stories/story-update-hub.js';
import { TerminalAuthService } from '../modules/terminal-auth/service.js';
import {
  TERMINAL_AUTH_ORIGIN,
  TERMINAL_PAIRING_HMAC_SECRET,
} from '../modules/terminal-auth/tokens.js';
import type { ApiOptionalExtension } from '../lab-host-contract.js';
import type { InjectedStoriesApplication } from '../app.js';
import { DATABASE } from '../database-token.js';

export const CACHE_CLOSE = Symbol('CACHE_CLOSE');

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

@Injectable()
export class DatabaseLifecycle {
  constructor(@Inject(DATABASE) private readonly database: Database) {}
  onApplicationShutdown() {
    return this.database.close();
  }
}

@Injectable()
export class CacheLifecycle {
  constructor(
    @Inject(CACHE_CLOSE) private readonly closeCache: () => Promise<void>,
  ) {}
  onApplicationShutdown() {
    return this.closeCache();
  }
}

@Injectable()
export class StoryUpdateHubLifecycle {
  constructor(
    @Optional()
    @Inject(STORY_UPDATE_HUB)
    private readonly hub: StoryUpdateHub | null,
  ) {}
  onApplicationShutdown() {
    return this.hub?.close();
  }
}

export type BuildApiProvidersInput = Readonly<{
  database: Database;
  auth: Auth;
  origin: string;
  identity?: IdentityResolver | undefined;
  optionalExtension?: ApiOptionalExtension | undefined;
  storytellerExecution?: ExecutionPolicy | undefined;
  storytellerUsagePolicy?: EffectiveUsagePolicy | null | undefined;
  closeCache?: (() => Promise<void>) | undefined;
  documentStore?: DocumentStore | undefined;
  openingContent?: readonly OpeningContentEntry[] | undefined;
  scriptedOpeningFallback?: boolean | undefined;
  storyUpdateHub: StoryUpdateHub | null;
  stories: InjectedStoriesApplication;
  storySeam: StorySeam;
  terminalPairingHmacSecret?: string | undefined;
}>;

/** Named Nest providers for production API composition; values only, no service locator. */
export function buildApiProviders(input: BuildApiProvidersInput): Provider[] {
  const {
    database,
    auth,
    origin,
    identity,
    optionalExtension,
    storytellerExecution,
    storytellerUsagePolicy,
    closeCache,
    documentStore,
    openingContent,
    scriptedOpeningFallback,
    storyUpdateHub,
    stories,
    storySeam,
    terminalPairingHmacSecret,
  } = input;

  return [
    identity
      ? { provide: IdentityService, useValue: identity }
      : IdentityService,
    StoryPlayerIdentity,
    DatabaseLifecycle,
    CacheLifecycle,
    StoryUpdateHubLifecycle,
    { provide: DATABASE, useValue: database },
    {
      provide: CACHE_CLOSE,
      useValue: closeCache ?? (async () => {}),
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
        storytellerExecution,
        storytellerUsagePolicy,
        {
          ...(documentStore ? { documentStore } : {}),
          ...(openingContent ? { content: openingContent } : {}),
          ...(scriptedOpeningFallback === undefined
            ? {}
            : { scriptedFallback: scriptedOpeningFallback }),
        },
      ),
    },
    { provide: STORIES, useValue: stories },
    { provide: STORY_SEAM, useValue: storySeam },
    TerminalAuthService,
    {
      provide: TERMINAL_PAIRING_HMAC_SECRET,
      useValue: terminalPairingHmacSecret ?? null,
    },
    { provide: TERMINAL_AUTH_ORIGIN, useValue: origin },
    ...(optionalExtension?.providers ?? []),
  ];
}
