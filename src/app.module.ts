import { Module } from '@nestjs/common';
import { TicktickModule } from './api/ticktick/ticktick.module';

@Module({
  imports: [TicktickModule],
})
export class AppModule {}
