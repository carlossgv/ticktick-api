import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { QuickAddDto } from './dto/quick-add.dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('quick-add')
  async quickAdd(@Body() body: QuickAddDto, @Query('dryRun') dryRun?: string) {
    const isDryRun = dryRun === 'true' || dryRun === '1';
    const result = await this.tasksService.quickAdd(body.text, {
      dryRun: isDryRun,
    });

    return {
      status: 'ok',
      dryRun: isDryRun,
      taskBody: result.taskBody,
    };
  }

  @Get('today')
  async today() {
    const result = await this.tasksService.getTodayTasks();

    return {
      status: 'ok',
      ...result,
    };
  }

  @Get('next-week')
  async nextWeek() {
    const result = await this.tasksService.getNextWeekTasks();

    return {
      status: 'ok',
      ...result,
    };
  }
}
