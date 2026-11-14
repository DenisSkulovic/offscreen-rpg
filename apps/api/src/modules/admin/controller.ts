import {
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Param,
  Post,
  Query,
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
import {
  campaignMetadataPageV1Schema,
  playerSearchPageV1Schema,
  playerSummaryEnvelopeV1Schema,
  redactedOperationEnvelopeV1Schema,
  redactedOperationPageV1Schema,
  adminAuditPageV1Schema,
  adminStaffAccessV1Schema,
  caseAssignRequestV1Schema,
  caseCreateRequestV1Schema,
  caseStatusUpdateRequestV1Schema,
  caseSummaryPageV1Schema,
  caseSummaryV1Schema,
  usageStatusEnvelopeV1Schema,
  type AdminAccessDecisionV1,
  type AdminAuditPageV1,
  type AdminErrorV1,
  type AdminSelfV1,
  type AdminStaffAccessV1,
  type CampaignMetadataPageV1,
  type CaseSummaryPageV1,
  type CaseSummaryV1,
  type PlayerSearchPageV1,
  type PlayerSummaryEnvelopeV1,
  type RedactedOperationEnvelopeV1,
  type RedactedOperationPageV1,
  type UsageStatusEnvelopeV1,
} from '@offscreen/contracts/admin';
import {
  AdminSessionError,
  clearAdminCookie,
  createAdminAccess,
  createAdminAuditReads,
  createAdminCaseStore,
  createAdminDiagnosticsReads,
  createAdminPlayerReads,
  createAdminUsageReads,
  projectStaffAccess,
  readAdminTokenFromCookieHeader,
  resourceKindForCapability,
  selectAdminCookieMode,
  serializeAdminCookie,
  type AdminAccess,
  type AdminActor,
  type AdminAuditReads,
  type AdminCapability,
  type AdminCaseStore,
  type AdminDiagnosticsReads,
  type AdminEnvironment,
  type AdminPlayerReads,
  type AdminSessions,
  type AdminUsageReads,
} from '@offscreen/application/admin';
import type { Database } from '@offscreen/db';
import type { Auth } from '../auth/auth.js';
import { AUTH } from '../auth/identity.js';

export const ADMIN_SESSIONS = Symbol('ADMIN_SESSIONS');
export const ADMIN_ACCESS = Symbol('ADMIN_ACCESS');
export const ADMIN_PLAYER_READS = Symbol('ADMIN_PLAYER_READS');
export const ADMIN_DIAGNOSTICS = Symbol('ADMIN_DIAGNOSTICS');
export const ADMIN_USAGE = Symbol('ADMIN_USAGE');
export const ADMIN_AUDIT = Symbol('ADMIN_AUDIT');
export const ADMIN_CASES = Symbol('ADMIN_CASES');
export const ADMIN_ORIGIN = Symbol('ADMIN_ORIGIN');
export const ADMIN_ENVIRONMENT = Symbol('ADMIN_ENVIRONMENT');

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
    @Inject(ADMIN_PLAYER_READS) private readonly players: AdminPlayerReads,
    @Inject(ADMIN_DIAGNOSTICS)
    private readonly diagnostics: AdminDiagnosticsReads,
    @Inject(ADMIN_USAGE)
    private readonly usage: AdminUsageReads,
    @Inject(ADMIN_AUDIT)
    private readonly audit: AdminAuditReads,
    @Inject(ADMIN_CASES)
    private readonly cases: AdminCaseStore,
  ) {}

  /** Player- or campaign-scoped visibility for legacy-owned stories. */
  private async assertLegacyCampaignVisible(
    request: Request,
    campaignId: string,
  ): Promise<{ ownerId: string }> {
    const ownerId = await this.diagnostics.loadCampaignOwner(campaignId);
    if (!ownerId) {
      throw new HttpException(adminError('not_found'), HttpStatus.NOT_FOUND);
    }
    const { actor } = await this.actors.requireStaffActor(request);
    const env = this.actors.deploymentEnvironment();
    const playerGate = await this.access.evaluate(actor, {
      capability: 'player.summary.read',
      resourceKind: 'player',
      resourceId: ownerId,
      environment: env,
    });
    if (playerGate.decision === 'allow') {
      return { ownerId };
    }

    const campaignGate = await this.access.evaluate(actor, {
      capability: 'campaign.metadata.read',
      resourceKind: 'campaign',
      resourceId: campaignId,
      environment: env,
    });
    if (campaignGate.decision !== 'allow') {
      throw new HttpException(adminError('not_found'), HttpStatus.NOT_FOUND);
    }

    // Player-id scopes must not open every campaign via empty campaignIds.
    const assignments = await this.access.listAssignments(
      actor.staffPrincipalId,
    );
    const active = assignments.filter((row) => row.status === 'active');
    const namedCampaignIds = active.flatMap(
      (row) => row.scope.campaignIds ?? [],
    );
    if (namedCampaignIds.includes(campaignId)) {
      return { ownerId };
    }
    const playerRestricted = active.some(
      (row) => (row.scope.playerIds?.length ?? 0) > 0,
    );
    if (!playerRestricted && namedCampaignIds.length === 0) {
      return { ownerId };
    }
    throw new HttpException(adminError('not_found'), HttpStatus.NOT_FOUND);
  }

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

  @Get('audit')
  async auditPage(
    @Req() request: Request,
    @Query('cursor') cursor: string | undefined,
  ): Promise<AdminAuditPageV1> {
    await this.actors.requireCapability(request, {
      capability: 'audit.events.read',
      resourceKind: 'audit',
      resourceId: null,
      environment: this.actors.deploymentEnvironment(),
      hideDenialAsNotFound: false,
    });
    const page = await this.audit.listAuditEvents({
      cursor: cursor ?? null,
    });
    return adminAuditPageV1Schema.parse(page);
  }

  @Post('cases')
  @HttpCode(HttpStatus.OK)
  async createCase(
    @Req() request: Request,
    @Body() body: unknown,
  ): Promise<CaseSummaryV1> {
    const parsed = caseCreateRequestV1Schema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        adminError('invalid_request'),
        HttpStatus.BAD_REQUEST,
      );
    }
    const { actor } = await this.actors.requireCapability(request, {
      capability: 'case.create',
      resourceKind: 'case',
      resourceId: null,
      environment: this.actors.deploymentEnvironment(),
      hideDenialAsNotFound: false,
    });
    if (parsed.data.link?.kind === 'player') {
      await this.actors.requireCapability(request, {
        capability: 'player.summary.read',
        resourceKind: 'player',
        resourceId: parsed.data.link.id,
        environment: this.actors.deploymentEnvironment(),
        hideDenialAsNotFound: true,
      });
    }
    try {
      const created = await this.cases.createCase({
        actorStaffId: actor.staffPrincipalId,
        request: parsed.data,
      });
      return caseSummaryV1Schema.parse(created);
    } catch (error) {
      throw mapAdminError(error);
    }
  }

  @Get('cases')
  async listCases(
    @Req() request: Request,
    @Query('cursor') cursor: string | undefined,
  ): Promise<CaseSummaryPageV1> {
    await this.actors.requireCapability(request, {
      capability: 'case.summary.read',
      resourceKind: 'case',
      resourceId: null,
      environment: this.actors.deploymentEnvironment(),
      hideDenialAsNotFound: false,
    });
    const page = await this.cases.listCases({ cursor: cursor ?? null });
    return caseSummaryPageV1Schema.parse(page);
  }

  @Get('cases/:caseId')
  async readCase(
    @Req() request: Request,
    @Param('caseId') caseId: string,
  ): Promise<CaseSummaryV1> {
    if (!/^[0-9a-fA-F-]{36}$/.test(caseId)) {
      throw new HttpException(
        adminError('invalid_request'),
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.actors.requireCapability(request, {
      capability: 'case.summary.read',
      resourceKind: 'case',
      resourceId: caseId,
      environment: this.actors.deploymentEnvironment(),
      hideDenialAsNotFound: true,
    });
    try {
      return caseSummaryV1Schema.parse(await this.cases.readCase(caseId));
    } catch (error) {
      if (
        error instanceof AdminSessionError &&
        error.code === 'not_authorized'
      ) {
        throw new HttpException(adminError('not_found'), HttpStatus.NOT_FOUND);
      }
      throw mapAdminError(error);
    }
  }

  @Post('cases/:caseId/assign')
  @HttpCode(HttpStatus.OK)
  async assignCase(
    @Req() request: Request,
    @Param('caseId') caseId: string,
    @Body() body: unknown,
  ): Promise<CaseSummaryV1> {
    if (!/^[0-9a-fA-F-]{36}$/.test(caseId)) {
      throw new HttpException(
        adminError('invalid_request'),
        HttpStatus.BAD_REQUEST,
      );
    }
    const parsed = caseAssignRequestV1Schema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        adminError('invalid_request'),
        HttpStatus.BAD_REQUEST,
      );
    }
    const { actor } = await this.actors.requireCapability(request, {
      capability: 'case.assign',
      resourceKind: 'case',
      resourceId: caseId,
      environment: this.actors.deploymentEnvironment(),
      hideDenialAsNotFound: false,
    });
    try {
      return caseSummaryV1Schema.parse(
        await this.cases.assignCase({
          actorStaffId: actor.staffPrincipalId,
          caseId,
          assignedStaffId: parsed.data.assignedStaffId,
        }),
      );
    } catch (error) {
      throw mapAdminError(error);
    }
  }

  @Post('cases/:caseId/status')
  @HttpCode(HttpStatus.OK)
  async updateCaseStatus(
    @Req() request: Request,
    @Param('caseId') caseId: string,
    @Body() body: unknown,
  ): Promise<CaseSummaryV1> {
    if (!/^[0-9a-fA-F-]{36}$/.test(caseId)) {
      throw new HttpException(
        adminError('invalid_request'),
        HttpStatus.BAD_REQUEST,
      );
    }
    const parsed = caseStatusUpdateRequestV1Schema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        adminError('invalid_request'),
        HttpStatus.BAD_REQUEST,
      );
    }
    const { actor } = await this.actors.requireCapability(request, {
      capability: 'case.create',
      resourceKind: 'case',
      resourceId: caseId,
      environment: this.actors.deploymentEnvironment(),
      hideDenialAsNotFound: false,
    });
    try {
      return caseSummaryV1Schema.parse(
        await this.cases.updateStatus({
          actorStaffId: actor.staffPrincipalId,
          caseId,
          status: parsed.data.status,
        }),
      );
    } catch (error) {
      throw mapAdminError(error);
    }
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

  /** Exact-ref player finder. Unauthorized/missing → empty page (no leak). */
  @Get('players')
  async searchPlayers(
    @Req() request: Request,
    @Query('ref') ref: string | undefined,
    @Query('limit') limitRaw: string | undefined,
  ): Promise<PlayerSearchPageV1> {
    const { actor } = await this.actors.requireStaffActor(request);
    if (!ref || typeof ref !== 'string' || ref.length === 0 || ref.length > 128) {
      throw new HttpException(
        adminError('invalid_request'),
        HttpStatus.BAD_REQUEST,
      );
    }
    const limit = limitRaw ? Number(limitRaw) : 1;
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
      throw new HttpException(
        adminError('invalid_request'),
        HttpStatus.BAD_REQUEST,
      );
    }
    const decision = await this.access.evaluate(actor, {
      capability: 'player.summary.read',
      resourceKind: 'player',
      resourceId: ref,
      environment: this.actors.deploymentEnvironment(),
    });
    const page = await this.players.searchByExactRef({
      ref,
      limit,
      environment: this.actors.deploymentEnvironment(),
      authorized: decision.decision === 'allow',
    });
    return playerSearchPageV1Schema.parse(page);
  }

  /** Permission-safe Player 360 summary. Denied/missing → privacy 404. */
  @Get('players/:playerId')
  async playerSummary(
    @Req() request: Request,
    @Param('playerId') playerId: string,
  ): Promise<PlayerSummaryEnvelopeV1> {
    if (!playerId || playerId.length > 128) {
      throw new HttpException(
        adminError('invalid_request'),
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.actors.requireCapability(request, {
      capability: 'player.summary.read',
      resourceKind: 'player',
      resourceId: playerId,
      environment: this.actors.deploymentEnvironment(),
    });
    try {
      const envelope = await this.players.readSummary({
        playerId,
        environment: this.actors.deploymentEnvironment(),
      });
      return playerSummaryEnvelopeV1Schema.parse(envelope);
    } catch (error) {
      if (
        error instanceof AdminSessionError &&
        error.code === 'not_authorized'
      ) {
        throw new HttpException(adminError('not_found'), HttpStatus.NOT_FOUND);
      }
      throw mapAdminError(error);
    }
  }

  @Get('players/:playerId/campaigns')
  async playerCampaigns(
    @Req() request: Request,
    @Param('playerId') playerId: string,
    @Query('cursor') cursor: string | undefined,
  ): Promise<CampaignMetadataPageV1> {
    if (!playerId || playerId.length > 128) {
      throw new HttpException(
        adminError('invalid_request'),
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.actors.requireCapability(request, {
      capability: 'player.summary.read',
      resourceKind: 'player',
      resourceId: playerId,
      environment: this.actors.deploymentEnvironment(),
    });
    const { actor } = await this.actors.requireStaffActor(request);
    const campaignGate = await this.access.evaluate(actor, {
      capability: 'campaign.metadata.read',
      resourceKind: 'campaign',
      resourceId: null,
      environment: this.actors.deploymentEnvironment(),
    });
    if (campaignGate.decision !== 'allow') {
      // No campaign metadata capability → empty page (no leak of ownership).
      return campaignMetadataPageV1Schema.parse({
        version: 1,
        playerId,
        items: [],
        nextCursor: null,
      });
    }
    const assignments = await this.access.listAssignments(
      actor.staffPrincipalId,
    );
    const allowedCampaignIds = assignments
      .filter((row) => row.status === 'active')
      .flatMap((row) => row.scope.campaignIds ?? []);
    const page = await this.diagnostics.listPlayerCampaigns({
      playerId,
      cursor: cursor ?? null,
      allowedCampaignIds:
        allowedCampaignIds.length > 0 ? allowedCampaignIds : null,
    });
    return campaignMetadataPageV1Schema.parse(page);
  }

  @Get('campaigns/:campaignId/operations')
  async campaignOperations(
    @Req() request: Request,
    @Param('campaignId') campaignId: string,
    @Query('cursor') cursor: string | undefined,
  ): Promise<RedactedOperationPageV1> {
    if (!/^[0-9a-fA-F-]{36}$/.test(campaignId)) {
      throw new HttpException(
        adminError('invalid_request'),
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.assertLegacyCampaignVisible(request, campaignId);
    await this.actors.requireCapability(request, {
      capability: 'ai.operation.read',
      resourceKind: 'operation',
      resourceId: null,
      environment: this.actors.deploymentEnvironment(),
      hideDenialAsNotFound: true,
    });
    try {
      const page = await this.diagnostics.listCampaignOperations({
        campaignId,
        cursor: cursor ?? null,
      });
      return redactedOperationPageV1Schema.parse(page);
    } catch (error) {
      if (
        error instanceof AdminSessionError &&
        error.code === 'not_authorized'
      ) {
        throw new HttpException(adminError('not_found'), HttpStatus.NOT_FOUND);
      }
      throw mapAdminError(error);
    }
  }

  @Get('usage/status')
  async usageStatus(
    @Req() request: Request,
    @Query('accountRef') accountRefRaw: string | undefined,
  ): Promise<UsageStatusEnvelopeV1> {
    const accountRef =
      typeof accountRefRaw === 'string' ? accountRefRaw.trim() : '';
    if (!/^[0-9a-fA-F-]{36}$/.test(accountRef)) {
      throw new HttpException(
        adminError('invalid_request'),
        HttpStatus.BAD_REQUEST,
      );
    }
    const { actor } = await this.actors.requireStaffActor(request);
    const env = this.actors.deploymentEnvironment();
    const accountGate = await this.access.evaluate(actor, {
      capability: 'commercial.usage.read',
      resourceKind: 'account',
      resourceId: accountRef,
      environment: env,
    });
    const platformGate = await this.access.evaluate(actor, {
      capability: 'platform.spend.read',
      resourceKind: 'platform',
      resourceId: null,
      environment: env,
    });
    if (
      accountGate.decision !== 'allow' &&
      platformGate.decision !== 'allow'
    ) {
      throw new HttpException(adminError('not_found'), HttpStatus.NOT_FOUND);
    }
    try {
      const envelope = await this.usage.readUsageStatus({
        accountRef,
        environment: env,
      });
      return usageStatusEnvelopeV1Schema.parse(envelope);
    } catch (error) {
      if (
        error instanceof AdminSessionError &&
        error.code === 'not_authorized'
      ) {
        throw new HttpException(adminError('not_found'), HttpStatus.NOT_FOUND);
      }
      throw mapAdminError(error);
    }
  }

  @Get('operations/:operationId')
  async operationDetail(
    @Req() request: Request,
    @Param('operationId') operationId: string,
  ): Promise<RedactedOperationEnvelopeV1> {
    if (!/^[0-9a-fA-F-]{36}$/.test(operationId)) {
      throw new HttpException(
        adminError('invalid_request'),
        HttpStatus.BAD_REQUEST,
      );
    }
    const { actor } = await this.actors.requireStaffActor(request);
    try {
      const { envelope, ownerId, campaignId } =
        await this.diagnostics.readOperation({
          operationId,
          environment: this.actors.deploymentEnvironment(),
        });
      if (campaignId) {
        await this.assertLegacyCampaignVisible(request, campaignId);
      } else {
        const playerGate = await this.access.evaluate(actor, {
          capability: 'player.summary.read',
          resourceKind: 'player',
          resourceId: ownerId,
          environment: this.actors.deploymentEnvironment(),
        });
        if (playerGate.decision !== 'allow') {
          throw new HttpException(adminError('not_found'), HttpStatus.NOT_FOUND);
        }
      }
      await this.actors.requireCapability(request, {
        capability: 'ai.operation.read',
        resourceKind: 'operation',
        resourceId: operationId,
        environment: this.actors.deploymentEnvironment(),
      });
      return redactedOperationEnvelopeV1Schema.parse(envelope);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (
        error instanceof AdminSessionError &&
        error.code === 'not_authorized'
      ) {
        throw new HttpException(adminError('not_found'), HttpStatus.NOT_FOUND);
      }
      throw mapAdminError(error);
    }
  }
}

export function createAdminAccessProvider(database: Database): AdminAccess {
  return createAdminAccess(database);
}

export function createAdminPlayerReadsProvider(
  database: Database,
): AdminPlayerReads {
  return createAdminPlayerReads(database);
}

export function createAdminDiagnosticsReadsProvider(
  database: Database,
): AdminDiagnosticsReads {
  return createAdminDiagnosticsReads(database);
}

export function createAdminUsageReadsProvider(
  database: Database,
): AdminUsageReads {
  return createAdminUsageReads(database);
}

export function createAdminAuditReadsProvider(
  database: Database,
): AdminAuditReads {
  return createAdminAuditReads(database);
}

export function createAdminCaseStoreProvider(
  database: Database,
): AdminCaseStore {
  return createAdminCaseStore(database);
}
