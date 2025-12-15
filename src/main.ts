import * as dotenv from 'dotenv';
dotenv.config();
process.env.TZ = process.env.TZ?.trim() || 'America/Santiago';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api'); // optional
  app.enableCors();
  await app.listen(3000);
  Logger.log(`Application is running on: ${await app.getUrl()}`);
  console.log('env TZ:', process.env.TZ);
  console.log('resolved tz:', Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.log('date:', new Date().toString());
}
void bootstrap();
