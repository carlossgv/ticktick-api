import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { TasksModule } from './api/tasks/tasks.module';
import { AuthModule } from './api/auth/auth.module';

@Module({
  imports: [TasksModule, AuthModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule {}
