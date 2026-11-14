import {
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Param,
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
import type {
  AdminAccessDecisionV1,
  AdminErrorV1,
  AdminSelfV1,
  AdminStaffAccessV1,
} from '@offscreen/contracts/admin';
import {
  AdminSessionError,
  clearAdminCookie,
  createAdminAccess,
  getAdminPackage,
  readAdminTokenFromCookieHeader,
  resourceKindForCapability,
  selectAdminCookieMode,
  serializeAdminCookie,
  type AdminAccess,
  type AdminActor,
  type AdminCapability,
  type AdminEnvironment,
  type AdminSessions,
} from '@offscreen/application/admin';
import type { Database } from '@offscreen/db';
import type { Auth } from '../auth/auth.js';
import { AUTH } from '../auth/identity.js';

export const ADMIN_SESSIONS = Symbol('ADMIN_SESSIONS');
export const ADMIN_ACCESS = Symbol('ADMIN_ACCESS');
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
    @Inject(ADMIN_ACCESS) private readonly access: AdminAccess,
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
      throw new HttpException(
        adminError('unauthenticated'),
        HttpStatus.UNAUTHORIZED,
      );
    }
    const createdAt = session.session.createdAt;
    if (!(createdAt instanceof Date) && typeof createdAt !== 'string') {
      throw new HttpException(
        adminError('step_up_required'),
        HttpStatus.FORBIDDEN,
      );
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

  async requireStaffActor(
    request: Request,
  ): Promise<{ actor: AdminActor; self: AdminSelfV1 }> {
    const proof = await this.requireAuthProof(request.headers);
    const token = this.readToken(request);
    if (!token) {
      throw new HttpException(
        adminError('staff_session_required'),
        HttpStatus.FORBIDDEN,
      );
    }
    try {
      const { actor, self } = await this.sessions.resolve({
        token,
        authUserId: proof.userId,
        authSessionId: proof.sessionId,
      });
      const workspaceFamilies = await this.access.workspaceFamilies(
        actor.staffPrincipalId,
      );
      return {
        actor,
        self: { ...self, workspaceFamilies },
      };
    } catch (error) {
      throw mapAdminError(error);
    }
  }

  async requireStaff(request: Request): Promise<AdminSelfV1> {
    return (await this.requireStaffActor(request)).self;
  }

  /**
   * Deny-by-default capability gate. Missing authority → privacy 404.
   * Unknown capability strings → 403.
   */
  async requireCapability(
    request: Request,
    input: {
      capability: AdminCapability;
      resourceKind?: string;
      resourceId?: string | null;
      environment: AdminEnvironment;
      caseId?: string | null;
      /** Customer resource lookups hide denial as 404; staff/meta use 403. */
      hideDenialAsNotFound?: boolean;
    },
  ): Promise<{ actor: AdminActor; decisionId: string }> {
    const { actor } = await this.requireStaffActor(request);
    try {
      const result = await this.access.requireCapability(actor, {
        capability: input.capability,
        resourceKind:
          input.resourceKind ?? resourceKindForCapability(input.capability),
        resourceId: input.resourceId ?? null,
        environment: input.environment,
        caseId: input.caseId ?? null,
      });
      return { actor, decisionId: result.decisionId };
    } catch (error) {
      if (
        error instanceof AdminSessionError &&
        error.code === 'not_authorized' &&
        input.hideDenialAsNotFound !== false
      ) {
        throw new HttpException(adminError('not_found'), HttpStatus.NOT_FOUND);
      }
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
  return new HttpException(
    adminError('unavailable'),
    HttpStatus.SERVICE_UNAVAILABLE,
  );
}

type AccessCheckBody = {
  capability?: string;
  resourceKind?: string;
  resourceId?: string;
  environment?: string;
  caseId?: string;
};

@Controller('admin')
export class AdminController {
  constructor(
    @Inject(AdminActorService) private readonly actors: AdminActorService,
    @Inject(ADMIN_SESSIONS) private readonly sessions: AdminSessions,
    @Inject(ADMIN_ACCESS) private readonly access: AdminAccess,
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
      const workspaceFamilies = await this.access.workspaceFamilies(
        self.staffPrincipalId,
      );
      const enriched = { ...self, workspaceFamilies };
      response.setHeader(
        'Set-Cookie',
        serializeAdminCookie(
          token,
          this.actors.cookieMode(),
          new Date(self.sessionExpiresAt),
        ),
      );
      return enriched;
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

  /** Narrow self access view; other staff requires staff.access.inspect. */
  @Get('staff/:staffId/access')
  async staffAccess(
    @Req() request: Request,
    @Param('staffId') staffId: string,
  ): Promise<AdminStaffAccessV1> {
    const { actor } = await this.actors.requireStaffActor(request);
    if (staffId !== actor.staffPrincipalId) {
      await this.actors.requireCapability(request, {
        capability: 'staff.access.inspect',
        resourceKind: 'staff',
        resourceId: staffId,
        environment: 'local',
        hideDenialAsNotFound: false,
      });
    }
    const assignments = await this.access.listAssignments(staffId);
    return {
      version: 1,
      staffPrincipalId: staffId,
      packages: assignments.map((assignment) => {
        const pkg = getAdminPackage(
          assignment.packageId,
          assignment.packageVersion,
        );
        const workspaceFamilies = pkg
          ? [...new Set(pkg.grants.map((grant) => grant.workspaceFamily))].sort()
          : [];
        return {
          packageId: assignment.packageId,
          packageVersion: assignment.packageVersion,
          status: assignment.status,
          workspaceFamilies,
        };
      }),
    };
  }

  /**
   * Access Inspector internal decision (safe codes only).
   * Does not reveal whether a customer resource exists.
   */
  @Post('access/check')
  @HttpCode(HttpStatus.OK)
  async accessCheck(
    @Req() request: Request,
    @Body() body: AccessCheckBody,
  ): Promise<AdminAccessDecisionV1> {
    const { actor } = await this.actors.requireStaffActor(request);
    if (
      !body?.capability ||
      !body.resourceKind ||
      !body.environment ||
      (body.environment !== 'local' &&
        body.environment !== 'staging' &&
        body.environment !== 'production')
    ) {
      throw new HttpException(
        adminError('invalid_request'),
        HttpStatus.BAD_REQUEST,
      );
    }
    const result = await this.access.evaluate(actor, {
      capability: body.capability,
      resourceKind: body.resourceKind,
      resourceId: body.resourceId ?? null,
      environment: body.environment,
      caseId: body.caseId ?? null,
    });
    return {
      version: 1,
      decision: result.decision,
      reason: result.reason,
      decisionId: result.decisionId,
      ...(result.matchedPackageId
        ? { matchedPackageId: result.matchedPackageId }
        : {}),
    };
  }

  /**
   * Guard probe for AD02: player summary gate without AD03 DTO.
   * Denied → privacy 404; allowed → acknowledgement only.
   */
  @Get('players/:playerId/summary-probe')
  async playerSummaryProbe(
    @Req() request: Request,
    @Param('playerId') playerId: string,
  ) {
    const { decisionId } = await this.actors.requireCapability(request, {
      capability: 'player.summary.read',
      resourceKind: 'player',
      resourceId: playerId,
      environment: 'local',
    });
    return {
      version: 1 as const,
      allowed: true as const,
      playerId,
      decisionId,
    };
  }
}

export function createAdminAccessProvider(database: Database): AdminAccess {
  return createAdminAccess(database);
}
