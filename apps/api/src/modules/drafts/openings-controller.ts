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
import type { createScriptedOpenings } from '@offscreen/application/generations';
import { OpeningInputError } from '@offscreen/application/generations';
import { GenerationError } from '@offscreen/application/generations';
import { requestOpeningSchema } from '@offscreen/contracts/openings';
import { IdentityService } from '../auth/identity.js';

export const OPENINGS = Symbol('OPENINGS');
@Controller('drafts/:draftId/openings')
export class OpeningsController {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(OPENINGS)
    private readonly openings: ReturnType<typeof createScriptedOpenings>,
  ) {}
  private async run<T>(request: Request, work: (owner: string) => Promise<T>) {
    const user = await this.identity.requireUser(request.headers);
    try {
      return await work(user.id);
    } catch (error) {
      if (error instanceof GenerationError)
        throw new HttpException(
          { code: error.code },
          { invalid: 400, not_found: 404, conflict: 409, busy: 409 }[
            error.code
          ],
        );
      // OpeningInputError contains a stable prerequisite code, never provider data.
      if (error instanceof OpeningInputError)
        throw new HttpException({ code: error.code }, 400);
      throw new ServiceUnavailableException('Opening unavailable');
    }
  }
  @Get('latest')
  latest(@Req() request: Request, @Param('draftId') draftId: string) {
    return this.run(request, (owner) =>
      this.openings.latest(owner, draftId).then((preview) => ({ preview })),
    );
  }
  @Get('catalogue')
  catalogue(@Req() request: Request) {
    return this.run(request, async () => this.openings.catalogue());
  }
  @Put(':id')
  @HttpCode(202)
  generate(
    @Req() request: Request,
    @Param('draftId') draftId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.run(request, (owner) => {
      const parsed = requestOpeningSchema.safeParse(body);
      if (!parsed.success) throw new GenerationError('invalid');
      return this.openings.request(
        owner,
        draftId,
        id,
        parsed.data.expectedRevision,
        parsed.data.contentId,
        parsed.data.startPackage,
      );
    });
  }
}
