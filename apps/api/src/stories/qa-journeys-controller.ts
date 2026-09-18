import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Inject,
  Param,
  Put,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  QaJourneyError,
  type createQaJourneys,
} from '@offscreen/application/developer-tools';
import { IdentityService } from '../auth/identity.js';

export const QA_JOURNEYS = Symbol('QA_JOURNEYS');

@Controller('chamber-tools/qa')
export class QaJourneysController {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(QA_JOURNEYS)
    private readonly journeys: ReturnType<typeof createQaJourneys>,
  ) {}

  private async run<T>(
    request: Request,
    work: (ownerId: string) => Promise<T>,
  ) {
    const user = await this.identity.requireUser(request.headers);
    try {
      return await work(user.id);
    } catch (error) {
      if (error instanceof QaJourneyError) {
        throw new HttpException(
          { code: error.code },
          {
            invalid: 400,
            not_found: 404,
            conflict: 409,
            unavailable: 409,
          }[error.code],
        );
      }
      throw new ServiceUnavailableException('QA journey unavailable');
    }
  }

  @Get('cases')
  catalogue(@Req() request: Request) {
    return this.run(request, async () => this.journeys.catalogue());
  }

  @Get('runs/:runId')
  read(@Req() request: Request, @Param('runId') runId: string) {
    return this.run(request, (ownerId) =>
      this.journeys.read({ ownerId, runId }),
    );
  }

  @Get('runs')
  list(@Req() request: Request) {
    return this.run(request, (ownerId) => this.journeys.list({ ownerId }));
  }

  @Get('runs/:runId/evidence')
  evidence(@Req() request: Request, @Param('runId') runId: string) {
    return this.run(request, (ownerId) =>
      this.journeys.evidence({ ownerId, runId }),
    );
  }

  @Put('runs/:runId')
  @HttpCode(201)
  open(
    @Req() request: Request,
    @Param('runId') runId: string,
    @Body() body: unknown,
  ) {
    return this.run(request, (ownerId) =>
      this.journeys.open({ ownerId, runId, body }),
    );
  }

  @Put('runs/:runId/stages/:stageId')
  recordStage(
    @Req() request: Request,
    @Param('runId') runId: string,
    @Param('stageId') stageId: string,
    @Body() body: unknown,
  ) {
    return this.run(request, (ownerId) =>
      this.journeys.recordStage({ ownerId, runId, stageId, body }),
    );
  }

  @Put('runs/:runId/finalization')
  finalize(
    @Req() request: Request,
    @Param('runId') runId: string,
    @Body() body: unknown,
  ) {
    return this.run(request, (ownerId) =>
      this.journeys.finalize({ ownerId, runId, body }),
    );
  }
}
