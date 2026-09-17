import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

@Controller('health')
class HealthController {
  @Get('live')
  live() {
    return { status: 'ok' };
  }
}

@Module({ controllers: [HealthController] })
class AppModule {}

export async function createApp() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  app.setGlobalPrefix('api');
  return app;
}
