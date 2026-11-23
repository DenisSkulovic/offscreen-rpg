import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  adminStaffAccessV1Schema,
  type AdminStaffAccessV1,
} from '@offscreen/contracts/admin';
import {
  clearAdminCookie,
  projectStaffAccess,
  serializeAdminCookie,
  type AdminAccess,
  type AdminSessions,
} from '@offscreen/admin';
import { mapAdminError } from '../admin-http-errors.js';
import {
  ADMIN_ACCESS,
  ADMIN_SESSIONS,
  AdminActorService,
  type AuthProof,
} from '../admin-actor-service.js';

@Controller('admin')
export class AdminSessionController {
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
        environment: this.actors.deploymentEnvironment(),
        hideDenialAsNotFound: false,
      });
    }
    const assignments = await this.access.listAssignments(staffId);
    return adminStaffAccessV1Schema.parse(
      projectStaffAccess(staffId, assignments),
    );
  }
}
