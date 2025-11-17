import { Module } from '@nestjs/common';
import { TasksModule } from './api/tasks/tasks.module';
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from './common/guards/api-key.guard';

@Module({
  imports: [TasksModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule {}
