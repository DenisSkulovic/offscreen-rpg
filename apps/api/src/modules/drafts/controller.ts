import {
  Body,
  Controller,
  Get,
  Put,
  Param,
  Query,
  Req,
  Inject,
  HttpCode,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import { DraftError } from '@offscreen/application/drafts';
import type { Drafts } from '@offscreen/application/drafts';
import { IdentityService } from '../auth/identity.js';

export const DRAFTS = Symbol('DRAFTS');

@Controller('drafts')
export class DraftsController {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(DRAFTS) private readonly drafts: Drafts,
  ) {}

  private async run<T>(
    request: Request,
    operation: (ownerId: string) => Promise<T>,
  ) {
    const user = await this.identity.requireUser(request.headers);
    try {
      return await operation(user.id);
    } catch (error) {
      if (error instanceof DraftError)
        throw new HttpException(
          { code: error.code },
          { invalid: 400, not_found: 404, conflict: 409, unavailable: 503 }[
            error.code
          ],
        );
      throw new ServiceUnavailableException('Draft storage unavailable');
    }
  }
  @Get()
  list(@Req() req: Request, @Query('cursor') cursor?: string) {
    return this.run(req, (owner) => this.drafts.list(owner, cursor));
  }
  @Get(':id')
  read(@Req() req: Request, @Param('id') id: string) {
    return this.run(req, (owner) => this.drafts.read(owner, id));
  }
  @Put(':id')
  @HttpCode(200)
  save(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    return this.run(req, (owner) => this.drafts.save(owner, id, body));
  }
}
