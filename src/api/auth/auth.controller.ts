import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

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
