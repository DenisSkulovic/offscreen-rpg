import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { Database } from '@offscreen/db';
import {
  readTerminalAccessToken,
  readUserDisplay,
} from '../terminal-auth/store.js';
import { IdentityService, type AuthenticatedUser } from '../auth/identity.js';
import { digestAccessToken } from '../terminal-auth/crypto.js';
import { DATABASE } from '../../database-token.js';

function parseBearerToken(headers: Request['headers']): string | null {
  const authorization = headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  const token = authorization.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

function hasCookieSession(headers: Request['headers']): boolean {
  const cookie = headers.cookie;
  return typeof cookie === 'string' && cookie.length > 0;
}

/**
 * Story-only identity: terminal bearer on StoriesController routes, otherwise
 * the existing Better Auth cookie session via IdentityService.
 */
@Injectable()
export class StoryPlayerIdentity {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(DATABASE) private readonly database: Database,
  ) {}

  async requireStoryPlayer(
    headers: Request['headers'],
  ): Promise<AuthenticatedUser> {
    if (hasCookieSession(headers)) {
      if (headers.authorization) {
        throw new UnauthorizedException({ code: 'ambiguous_credentials' });
      }
      return this.identity.requireUser(headers);
    }
    if (headers.authorization) {
      const token = parseBearerToken(headers);
      if (!token) {
        throw new UnauthorizedException();
      }
      const row = await readTerminalAccessToken(
        this.database,
        digestAccessToken(token),
        new Date(),
      );
      if (!row) {
        throw new UnauthorizedException();
      }
      const record = await readUserDisplay(this.database, row.userId);
      if (!record) {
        throw new UnauthorizedException();
      }
      return record;
    }
    return this.identity.requireUser(headers);
  }
}
