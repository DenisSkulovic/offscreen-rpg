import {
  Controller,
  Get,
  Inject,
  Injectable,
  Post,
  Req,
  Res,
  HttpCode,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { fromNodeHeaders } from 'better-auth/node';
import type { AdminErrorV1, AdminSelfV1 } from '@offscreen/contracts/admin';
import {
  AdminSessionError,
  clearAdminCookie,
  readAdminTokenFromCookieHeader,
  selectAdminCookieMode,
  serializeAdminCookie,
  type AdminSessions,
} from '@offscreen/application/admin';
import type { Auth } from '../auth/auth.js';
import { AUTH } from '../auth/identity.js';

export const ADMIN_SESSIONS = Symbol('ADMIN_SESSIONS');
export const ADMIN_ORIGIN = Symbol('ADMIN_ORIGIN');

type AuthProof = Readonly<{
  userId: string;
  sessionId: string;
  sessionCreatedAt: Date;
}>;

@Injectable()
export class AdminActorService {
  constructor(
    @Inject(AUTH) private readonly auth: Auth,
    @Inject(ADMIN_SESSIONS) private readonly sessions: AdminSessions,
    @Inject(ADMIN_ORIGIN) private readonly origin: string,
  ) {}

  async requireAuthProof(headers: Request['headers']): Promise<AuthProof> {
    const session = await this.auth.api
      .getSession({
        headers: fromNodeHeaders(headers),
        query: { disableRefresh: true },
      })
      .catch(() => {
        throw new ServiceUnavailableException('Identity service unavailable');
      });
    if (!session?.session || !session.user) {
      throw new HttpException(adminError('unauthenticated'), HttpStatus.UNAUTHORIZED);
    }
    const createdAt = session.session.createdAt;
    if (!(createdAt instanceof Date) && typeof createdAt !== 'string') {
      throw new HttpException(adminError('step_up_required'), HttpStatus.FORBIDDEN);
    }
    return {
      userId: session.user.id,
      sessionId: session.session.id,
      sessionCreatedAt:
        createdAt instanceof Date ? createdAt : new Date(createdAt),
    };
  }

  cookieMode() {
    return selectAdminCookieMode(this.origin);
  }

  readToken(request: Request): string | null {
    return readAdminTokenFromCookieHeader(
      request.headers.cookie,
      this.cookieMode(),
    );
  }

  async requireStaff(request: Request): Promise<AdminSelfV1> {
    const proof = await this.requireAuthProof(request.headers);
    const token = this.readToken(request);
    if (!token) {
      throw new HttpException(
        adminError('staff_session_required'),
        HttpStatus.FORBIDDEN,
      );
    }
    try {
      const { self } = await this.sessions.resolve({
        token,
        authUserId: proof.userId,
        authSessionId: proof.sessionId,
      });
      return self;
    } catch (error) {
      throw mapAdminError(error);
    }
  }
}

function adminError(code: AdminErrorV1['code']): AdminErrorV1 {
  return { version: 1, code, requestId: randomUUID() };
}

function mapAdminError(error: unknown): HttpException {
  if (error instanceof AdminSessionError) {
    const body = adminError(error.code);
    switch (error.code) {
      case 'unauthenticated':
        return new HttpException(body, HttpStatus.UNAUTHORIZED);
      case 'step_up_required':
      case 'not_authorized':
      case 'staff_session_required':
        return new HttpException(body, HttpStatus.FORBIDDEN);
      case 'conflict':
        return new HttpException(body, HttpStatus.CONFLICT);
      case 'unavailable':
        return new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE);
      default:
        return new HttpException(body, HttpStatus.FORBIDDEN);
    }
  }
  return new HttpException(adminError('unavailable'), HttpStatus.SERVICE_UNAVAILABLE);
}

@Controller('admin')
export class AdminController {
  constructor(
    @Inject(AdminActorService) private readonly actors: AdminActorService,
    @Inject(ADMIN_SESSIONS) private readonly sessions: AdminSessions,
  ) {}

  @Post('session/enter')
  @HttpCode(HttpStatus.OK)
  async enter(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const proof = await this.actors.requireAuthProof(request.headers);
    try {
      const { token, self } = await this.sessions.enter({
        authUserId: proof.userId,
        authSessionId: proof.sessionId,
        authSessionCreatedAt: proof.sessionCreatedAt,
      });
      response.setHeader(
        'Set-Cookie',
        serializeAdminCookie(
          token,
          this.actors.cookieMode(),
          new Date(self.sessionExpiresAt),
        ),
      );
      return self;
    } catch (error) {
      throw mapAdminError(error);
    }
  }

  @Get('me')
  async me(@Req() request: Request) {
    return this.actors.requireStaff(request);
  }

  @Post('session/exit')
  @HttpCode(HttpStatus.OK)
  async exit(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    let proof: AuthProof | null = null;
    try {
      proof = await this.actors.requireAuthProof(request.headers);
    } catch {
      // Idempotent logout still clears the Admin cookie.
    }
    const token = this.actors.readToken(request);
    try {
      if (proof) {
        await this.sessions.exit({
          token,
          authUserId: proof.userId,
          authSessionId: proof.sessionId,
        });
      }
    } catch (error) {
      throw mapAdminError(error);
    }
    response.setHeader(
      'Set-Cookie',
      clearAdminCookie(this.actors.cookieMode()),
    );
    return { version: 1 as const, closed: true };
  }
}
