import { Body, Controller, Post } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { QuickAddDto } from './dto/quick-add.dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('quick-add')
  async quickAdd(@Body() body: QuickAddDto) {
    await this.tasksService.quickAdd(body.text);
    return { status: 'ok' };
  }
}
