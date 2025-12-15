import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TickTickModule } from 'src/core/ticktick.module';

@Module({
  imports: [TickTickModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
