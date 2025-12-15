
import { Injectable } from '@nestjs/common';
import { TickTickClientProvider } from 'src/core/ticktick.provider';

@Injectable()
export class AuthService {
  constructor(private readonly ticktick: TickTickClientProvider) {}

  async login(email: string, password: string): Promise<void> {
    const client = this.ticktick.get();
    await client.login(email, password);

    // deja el singleton listo para usar
    await client.refreshMainData();
  }

  async logout(): Promise<void> {
    const client = this.ticktick.get();
    await client.logout();
  }
}
