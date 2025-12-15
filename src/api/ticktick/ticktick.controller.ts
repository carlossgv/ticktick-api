import { Body, Controller, Post } from '@nestjs/common';
import { TicktickService } from './ticktick.service';

@Controller()
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
}
