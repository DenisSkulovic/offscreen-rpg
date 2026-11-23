import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Database } from '@offscreen/db';
import { IdentityController } from '../modules/auth/identity.js';
import { ADMIN_HTTP_CONTROLLERS } from '../modules/admin/controller.js';
import { DraftsController } from '../modules/drafts/controller.js';
import { StorytellersController } from '../modules/drafts/storytellers-controller.js';
import { OpeningsController } from '../modules/drafts/openings-controller.js';
import { STORIES_HTTP_CONTROLLERS } from '../modules/stories/controller.js';
import { TerminalAuthController } from '../modules/terminal-auth/controller.js';
import type { ApiOptionalExtension } from '../lab-host-contract.js';
import { DATABASE } from '../database-token.js';
import type { Type } from '@nestjs/common';

@Controller('health')
export class HealthController {
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

/** Nest controller registration order: health/identity, admin, drafts, stories registries, terminal auth, optional lab extension. */
export function buildApiControllers(
  optionalExtension?: ApiOptionalExtension,
): Type<unknown>[] {
  return [
    HealthController,
    IdentityController,
    ...ADMIN_HTTP_CONTROLLERS,
    DraftsController,
    StorytellersController,
    OpeningsController,
    ...STORIES_HTTP_CONTROLLERS,
    TerminalAuthController,
    ...(optionalExtension?.controllers ?? []),
  ];
}
