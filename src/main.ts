import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api'); // optional
  await app.listen(3000);
  Logger.log(`Application is running on: ${await app.getUrl()}`);
}
void bootstrap();
