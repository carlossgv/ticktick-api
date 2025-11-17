import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { TicktickService } from './ticktick.service';

@Controller('ticktick')
export class TicktickController {
  constructor(private readonly service: TicktickService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    await this.service.login(body.email, body.password);
    return { ok: true };
  }

  @Post('logout')
  async logout() {
    await this.service.logout();
    return { ok: true };
  }

  @Post('quick-add')
  async quickAdd(@Body() body: { text: string }) {
    return this.service.quickAdd(body.text);
  }

  @Get('lists')
  async getLists() {
    return this.service.getLists();
  }

  @Get('tasks/inbox')
  async inbox() {
    return this.service.getInboxTasks();
  }

  @Get('tasks')
  async byProject(@Query('projectId') projectId: string) {
    return this.service.getTasksByProject(projectId);
  }
}
