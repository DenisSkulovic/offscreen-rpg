import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  adminAuditPageV1Schema,
  redactedOperationEnvelopeV1Schema,
  redactedOperationPageV1Schema,
  usageStatusEnvelopeV1Schema,
  type AdminAccessDecisionV1,
  type AdminAuditPageV1,
  type RedactedOperationEnvelopeV1,
  type RedactedOperationPageV1,
  type UsageStatusEnvelopeV1,
} from '@offscreen/admin-interface/admin';
import {
  AdminSessionError,
  type AdminAccess,
  type AdminAuditReads,
  type AdminDiagnosticsReads,
  type AdminUsageReads,
} from '@offscreen/admin';
import { adminError, mapAdminError } from '../admin-http-errors.js';
import {
  ADMIN_ACCESS,
  ADMIN_AUDIT,
  ADMIN_DIAGNOSTICS,
  ADMIN_USAGE,
  AdminActorService,
} from '../admin-actor-service.js';

type AccessCheckBody = {
  capability?: string;
  resourceKind?: string;
  resourceId?: string;
  environment?: string;
  caseId?: string;
};

@Controller('admin')
export class AdminEvidenceController {
  constructor(
    @Inject(AdminActorService) private readonly actors: AdminActorService,
    @Inject(ADMIN_ACCESS) private readonly access: AdminAccess,
    @Inject(ADMIN_DIAGNOSTICS)
    private readonly diagnostics: AdminDiagnosticsReads,
    @Inject(ADMIN_USAGE)
    private readonly usage: AdminUsageReads,
    @Inject(ADMIN_AUDIT)
    private readonly audit: AdminAuditReads,
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
    if (accountGate.decision !== 'allow' && platformGate.decision !== 'allow') {
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
          throw new HttpException(
            adminError('not_found'),
            HttpStatus.NOT_FOUND,
          );
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
      if (error instanceof HttpException) {
        throw error;
      }
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
