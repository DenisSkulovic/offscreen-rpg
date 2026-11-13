import {
  Body,
  Controller,
  Get,
  HttpException,
  Inject,
  Param,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  LabWorkbenchError,
  type createLabWorkbenchService,
} from '@offscreen/application/developer-tools';
import { z } from 'zod';
import { IdentityService } from '../auth/identity.js';

export const CHAMBER_LAB = Symbol('CHAMBER_LAB');

const openBodySchema = z.strictObject({
  scenarioId: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  scenarioVersion: z.number().int().positive(),
  lane: z.enum([
    'bench-policy',
    'sandbox-db',
    'connected',
    'held-packet',
    'authorized-live',
  ]),
  seed: z.number().int().nonnegative().optional(),
});

const commandBodySchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('load') }),
  z.strictObject({
    kind: z.literal('inspect'),
    facets: z
      .array(z.enum(['activity', 'clock', 'items', 'decision', 'summary']))
      .min(1)
      .max(8)
      .optional(),
  }),
  z.strictObject({
    kind: z.literal('advanceClock'),
    targetGameSecond: z.number().int().nonnegative(),
  }),
  z.strictObject({
    kind: z.literal('assert'),
    invariantId: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
    expected: z.unknown().optional(),
  }),
  z.strictObject({ kind: z.literal('pause') }),
  z.strictObject({ kind: z.literal('resume') }),
  z.strictObject({ kind: z.literal('reset') }),
  z.strictObject({ kind: z.literal('export') }),
  z.strictObject({ kind: z.literal('finalize') }),
]);

function mapError(error: unknown): never {
  if (error instanceof LabWorkbenchError) {
    throw new HttpException(
      { code: error.code, message: error.message },
      {
        invalid: 400,
        not_found: 404,
        conflict: 409,
        unavailable: 503,
        'forbidden-lane': 409,
      }[error.code],
    );
  }
  throw error;
}

@Controller('chamber-tools/lab')
export class ChamberLabController {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(CHAMBER_LAB)
    private readonly lab: ReturnType<typeof createLabWorkbenchService>,
  ) {}

  @Get('commands')
  listCommands(@Req() request: Request) {
    return this.identity.requireUser(request.headers).then(() =>
      this.lab.listCommands(),
    );
  }

  @Get('scenarios')
  async listScenarios(
    @Req() request: Request,
    @Query('q') q?: string,
  ) {
    await this.identity.requireUser(request.headers);
    return this.lab.listScenarios(q);
  }

  @Put('runs')
  async open(@Req() request: Request, @Body() body: unknown) {
    const user = await this.identity.requireUser(request.headers);
    const parsed = openBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException({ code: 'invalid' }, 400);
    }
    try {
      return this.lab.open({
        ownerId: user.id,
        scenarioId: parsed.data.scenarioId,
        scenarioVersion: parsed.data.scenarioVersion,
        lane: parsed.data.lane,
        ...(parsed.data.seed !== undefined ? { seed: parsed.data.seed } : {}),
      });
    } catch (error) {
      mapError(error);
    }
  }

  @Get('runs/:runId')
  async get(@Req() request: Request, @Param('runId') runId: string) {
    const user = await this.identity.requireUser(request.headers);
    try {
      return this.lab.get({ ownerId: user.id, runId });
    } catch (error) {
      mapError(error);
    }
  }

  @Put('runs/:runId/commands/:commandId')
  async command(
    @Req() request: Request,
    @Param('runId') runId: string,
    @Param('commandId') commandId: string,
    @Body() body: unknown,
  ) {
    const user = await this.identity.requireUser(request.headers);
    const parsed = commandBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException({ code: 'invalid' }, 400);
    }
    void commandId;
    try {
      const command =
        parsed.data.kind === 'inspect'
          ? {
              kind: 'inspect' as const,
              ...(parsed.data.facets !== undefined
                ? { facets: parsed.data.facets }
                : {}),
            }
          : parsed.data.kind === 'assert'
            ? {
                kind: 'assert' as const,
                invariantId: parsed.data.invariantId,
                ...(parsed.data.expected !== undefined
                  ? { expected: parsed.data.expected }
                  : {}),
              }
            : parsed.data;
      return await this.lab.command({
        ownerId: user.id,
        runId,
        command,
      });
    } catch (error) {
      mapError(error);
    }
  }

  @Put('runs/:runId/replay/:operationId')
  async replay(
    @Req() request: Request,
    @Param('runId') runId: string,
    @Param('operationId') operationId: string,
  ) {
    const user = await this.identity.requireUser(request.headers);
    void operationId;
    try {
      return this.lab.replay({ ownerId: user.id, runId });
    } catch (error) {
      mapError(error);
    }
  }
}
