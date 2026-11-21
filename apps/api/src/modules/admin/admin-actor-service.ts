import {
  Inject,
  Injectable,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import type { AdminSelfV1 } from '@offscreen/contracts/admin';
import {
  AdminSessionError,
  readAdminTokenFromCookieHeader,
  resourceKindForCapability,
  selectAdminCookieMode,
  type AdminAccess,
  type AdminActor,
  type AdminCapability,
  type AdminEnvironment,
  type AdminSessions,
} from '@offscreen/application/admin';
import type { Auth } from '../auth/auth.js';
import { AUTH } from '../auth/identity.js';
import { adminError, mapAdminError } from './admin-http-errors.js';

export const ADMIN_SESSIONS = Symbol('ADMIN_SESSIONS');
export const ADMIN_ACCESS = Symbol('ADMIN_ACCESS');
export const ADMIN_PLAYER_READS = Symbol('ADMIN_PLAYER_READS');
export const ADMIN_DIAGNOSTICS = Symbol('ADMIN_DIAGNOSTICS');
export const ADMIN_USAGE = Symbol('ADMIN_USAGE');
export const ADMIN_AUDIT = Symbol('ADMIN_AUDIT');
export const ADMIN_CASES = Symbol('ADMIN_CASES');
export const ADMIN_SITUATION = Symbol('ADMIN_SITUATION');
export const ADMIN_ORIGIN = Symbol('ADMIN_ORIGIN');
export const ADMIN_ENVIRONMENT = Symbol('ADMIN_ENVIRONMENT');

export type AuthProof = Readonly<{
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
    @Inject(ADMIN_ENVIRONMENT) private readonly environment: AdminEnvironment,
  ) {}

  deploymentEnvironment(): AdminEnvironment {
    return this.environment;
  }

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
    const parsedCreatedAt =
      createdAt instanceof Date ? createdAt : new Date(createdAt);
    if (Number.isFinite(parsedCreatedAt.getTime()) === false) {
      throw new HttpException(
        adminError('step_up_required'),
        HttpStatus.FORBIDDEN,
      );
    }
    return {
      userId: session.user.id,
      sessionId: session.session.id,
      sessionCreatedAt: parsedCreatedAt,
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
