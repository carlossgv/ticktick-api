import { Module } from '@nestjs/common';
import { TickTickClient } from 'src/core/ticktick.client';
import { TickTickClientProvider } from './ticktick.provider';

@Module({
  providers: [TickTickClient, TickTickClientProvider],
  exports: [TickTickClientProvider, TickTickClient],
})
export class TickTickModule {}
