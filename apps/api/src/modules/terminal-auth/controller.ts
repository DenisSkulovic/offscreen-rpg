import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  approveTerminalPairingSchema,
  createTerminalPairingSchema,
  exchangeTerminalPairingSchema,
} from '@offscreen/contracts/terminal-auth';
import { IdentityService } from '../auth/identity.js';
import { TerminalAuthService } from './service.js';
import { digestAccessToken } from './crypto.js';

function trustedClientIp(request: Request): string {
  const injected = request.headers['x-offscreen-client-ip'];
  if (typeof injected === 'string' && injected.length > 0) {
    return injected;
  }
  return request.socket.remoteAddress ?? '127.0.0.1';
}

function parseBearerToken(headers: Request['headers']): string | null {
  const authorization = headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  const token = authorization.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

function requireBearerWithoutCookie(headers: Request['headers']): string {
  if (headers.cookie) {
    throw new UnauthorizedException({ code: 'ambiguous_credentials' });
  }
  const token = parseBearerToken(headers);
  if (!token) {
    throw new UnauthorizedException();
  }
  return token;
}

@Controller('terminal-auth')
export class TerminalAuthController {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(TerminalAuthService)
    private readonly terminalAuth: TerminalAuthService,
  ) {}

  @Post('pairings')
  async createPairing(@Req() request: Request, @Body() body: unknown) {
    const parsed = createTerminalPairingSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        { code: 'invalid_pairing_request' },
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.terminalAuth.createPairing(
      trustedClientIp(request),
      parsed.data,
    );
  }

  @Get('pairings/:id/consent')
  async pairingConsent(@Req() request: Request, @Param('id') id: string) {
    if (parseBearerToken(request.headers)) {
      throw new UnauthorizedException({ code: 'bearer_not_allowed' });
    }
    await this.identity.requireUser(request.headers);
    return this.terminalAuth.readPairingConsent(id);
  }

  @Post('pairings/:id/approve')
  @HttpCode(204)
  async approvePairing(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    if (parseBearerToken(request.headers)) {
      throw new UnauthorizedException({ code: 'bearer_not_allowed' });
    }
    const parsed = approveTerminalPairingSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        { code: 'invalid_approval_request' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const owner = await this.identity.requireUser(request.headers);
    await this.terminalAuth.approvePairing(id, owner.id, parsed.data);
  }

  @Post('pairings/:id/exchange')
  async exchangePairing(@Param('id') id: string, @Body() body: unknown) {
    const parsed = exchangeTerminalPairingSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        { code: 'invalid_exchange_request' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const issued = await this.terminalAuth.exchangePairing(id, parsed.data);
    if (!issued) {
      throw new HttpException({ code: 'pairing_pending' }, HttpStatus.ACCEPTED);
    }
    return issued;
  }

  @Get('tokens/current')
  async currentToken(@Req() request: Request) {
    const token = requireBearerWithoutCookie(request.headers);
    return this.terminalAuth.readCurrentToken(token);
  }

  @Delete('tokens/current')
  @HttpCode(204)
  async revokeToken(@Req() request: Request) {
    const token = requireBearerWithoutCookie(request.headers);
    await this.terminalAuth.revokeCurrentToken(token);
  }
}

/** Exported for tests that must refuse cleartext token persistence. */
export function digestTerminalAccessToken(token: string): string {
  return digestAccessToken(token);
}
