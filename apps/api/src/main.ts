import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.ts';
import { readRuntimeConfig } from './runtime-config.ts';

async function bootstrap(): Promise<void> {
  const config = readRuntimeConfig();
  const app = await NestFactory.create(AppModule);
  await app.listen(config.port, config.host);
}

void bootstrap();
