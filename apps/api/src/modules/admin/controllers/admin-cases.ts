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
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  caseAssignRequestV1Schema,
  caseCreateRequestV1Schema,
  caseStatusUpdateRequestV1Schema,
  caseSummaryPageV1Schema,
  caseSummaryV1Schema,
  supportSituationV1Schema,
  type CaseSummaryPageV1,
  type CaseSummaryV1,
  type SupportSituationV1,
} from '@offscreen/admin-interface/admin';
import {
  AdminSessionError,
  type AdminCaseStore,
  type AdminSituationReads,
} from '@offscreen/admin';
import { adminError, mapAdminError } from '../admin-http-errors.js';
import {
  ADMIN_CASES,
  ADMIN_SITUATION,
  AdminActorService,
} from '../admin-actor-service.js';

@Controller('admin')
export class AdminCasesController {
  constructor(
    @Inject(AdminActorService) private readonly actors: AdminActorService,
    @Inject(ADMIN_CASES) private readonly cases: AdminCaseStore,
    @Inject(ADMIN_SITUATION) private readonly situations: AdminSituationReads,
  ) {}

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

  /**
   * OBS06 case-scoped Support Situation → Why. Body-free S1 projection.
   * All gates are server-side and independent of case-link authorship:
   * case.summary.read + assigned-to-actor case + exact campaign link +
   * a single steward-issued forensics.campaign.situation.read assignment whose
   * scope.campaignIds and provenance.authorizedCaseIds name this exact pair.
   * Every denial is the same privacy 404.
   */
  @Get('cases/:caseId/campaigns/:campaignId/situation')
  async campaignSituation(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('caseId') caseId: string,
    @Param('campaignId') campaignId: string,
  ): Promise<SupportSituationV1> {
    response.setHeader('Cache-Control', 'private, no-store');
    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuid.test(caseId) || !uuid.test(campaignId)) {
      throw new HttpException(
        adminError('invalid_request'),
        HttpStatus.BAD_REQUEST,
      );
    }
    const env = this.actors.deploymentEnvironment();
    await this.actors.requireCapability(request, {
      capability: 'case.summary.read',
      resourceKind: 'case',
      resourceId: caseId,
      environment: env,
      hideDenialAsNotFound: true,
    });
    const { actor } = await this.actors.requireCapability(request, {
      capability: 'forensics.campaign.situation.read',
      resourceKind: 'campaign',
      resourceId: campaignId,
      environment: env,
      caseId,
      hideDenialAsNotFound: true,
    });
    try {
      const situation = await this.situations.readSituation({
        caseId,
        campaignId,
        actorStaffId: actor.staffPrincipalId,
      });
      return supportSituationV1Schema.parse(situation);
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
}
