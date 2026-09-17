import {
  Controller,
  Get,
  Inject,
  Injectable,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import type { Auth } from './auth.js';

export const AUTH = Symbol('AUTH');

@Injectable()
export class IdentityService {
  constructor(@Inject(AUTH) private readonly auth: Auth) {}

  async requireUser(headers: Request['headers']) {
    const session = await this.auth.api
      .getSession({
        headers: fromNodeHeaders(headers),
        query: { disableRefresh: true },
      })
      .catch(() => {
        // Driver errors can contain query parameters, including session tokens.
        throw new ServiceUnavailableException('Identity service unavailable');
      });
    if (!session) throw new UnauthorizedException();
    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    };
  }
}

@Controller('me')
export class IdentityController {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
  ) {}

  @Get()
  async me(@Req() request: Request) {
    return this.identity.requireUser(request.headers);
  }
}
