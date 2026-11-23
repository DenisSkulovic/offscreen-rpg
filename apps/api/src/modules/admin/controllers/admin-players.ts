import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  campaignMetadataPageV1Schema,
  playerSearchPageV1Schema,
  playerSummaryEnvelopeV1Schema,
  type CampaignMetadataPageV1,
  type PlayerSearchPageV1,
  type PlayerSummaryEnvelopeV1,
} from '@offscreen/contracts/admin';
import {
  AdminSessionError,
  type AdminAccess,
  type AdminDiagnosticsReads,
  type AdminPlayerReads,
} from '@offscreen/admin';
import { adminError, mapAdminError } from '../admin-http-errors.js';
import {
  ADMIN_ACCESS,
  ADMIN_DIAGNOSTICS,
  ADMIN_PLAYER_READS,
  AdminActorService,
} from '../admin-actor-service.js';

@Controller('admin')
export class AdminPlayersController {
  constructor(
    @Inject(AdminActorService) private readonly actors: AdminActorService,
    @Inject(ADMIN_ACCESS) private readonly access: AdminAccess,
    @Inject(ADMIN_PLAYER_READS) private readonly players: AdminPlayerReads,
    @Inject(ADMIN_DIAGNOSTICS)
    private readonly diagnostics: AdminDiagnosticsReads,
  ) {}

  /** Exact-ref player finder. Unauthorized/missing → empty page (no leak). */
  @Get('players')
  async searchPlayers(
    @Req() request: Request,
    @Query('ref') ref: string | undefined,
    @Query('limit') limitRaw: string | undefined,
  ): Promise<PlayerSearchPageV1> {
    const { actor } = await this.actors.requireStaffActor(request);
    if (
      !ref ||
      typeof ref !== 'string' ||
      ref.length === 0 ||
      ref.length > 128
    ) {
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
}
