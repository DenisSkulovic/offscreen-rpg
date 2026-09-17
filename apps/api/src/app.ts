import 'reflect-metadata';
import {
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  ServiceUnavailableException,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction, Express } from 'express';
import type { Database } from '@offscreen/db';
import { toNodeHandler } from 'better-auth/node';
import type { Auth } from './auth/auth.js';
import { AUTH, IdentityController, IdentityService } from './auth/identity.js';
import { createDrafts } from '@offscreen/server/drafts';
import { DRAFTS, DraftsController } from './drafts/controller.js';

const DATABASE = Symbol('DATABASE');

@Injectable()
class DatabaseLifecycle {
  constructor(@Inject(DATABASE) private readonly database: Database) {}
  onApplicationShutdown() {
    return this.database.close();
  }
}

@Controller('health')
class HealthController {
  constructor(@Inject(DATABASE) private readonly database: Database) {}
  @Get('live')
  live() {
    return { status: 'ok' };
  }
  @Get('ready')
  async ready() {
    try {
      await this.database.checkConnection();
    } catch {
      throw new ServiceUnavailableException();
    }
    return { status: 'ok' };
  }
}

@Module({})
class AppModule {}

export async function createApp(
  database: Database,
  auth: Auth,
  origin: string,
) {
  const app = await NestFactory.create<NestExpressApplication>(
    {
      module: AppModule,
      controllers: [HealthController, IdentityController, DraftsController],
      providers: [
        IdentityService,
        DatabaseLifecycle,
        { provide: DATABASE, useValue: database },
        { provide: AUTH, useValue: auth },
        { provide: DRAFTS, useValue: createDrafts(database) },
      ],
    },
    {
      logger: ['error', 'warn', 'log'],
      bodyParser: false,
    },
  );
  const express: Express = app.getHttpAdapter().getInstance();
  express.use(
    '/api',
    (request: Request, response: Response, next: NextFunction) => {
      request.headers['x-offscreen-client-ip'] =
        request.socket.remoteAddress ?? '127.0.0.1';
      response.setHeader('Cache-Control', 'no-store');
      if (
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) &&
        !request.path.startsWith('/auth/') &&
        request.headers.origin !== origin
      ) {
        response.status(403).json({ code: 'invalid_origin' });
        return;
      }
      next();
    },
  );
  express.all('/api/auth/{*path}', toNodeHandler(auth));
  app.useBodyParser('json', { limit: '64kb' });
  app.setGlobalPrefix('api');
  return app;
}
