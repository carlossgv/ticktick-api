import { Module } from '@nestjs/common';
import { TicktickService } from './ticktick.service';
import { TicktickController } from './ticktick.controller';

@Module({
  controllers: [TicktickController],
  providers: [TicktickService],
})
export class TicktickModule {}
