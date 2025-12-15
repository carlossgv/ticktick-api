import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TickTickClient } from 'src/core/ticktick.client';

@Injectable()
export class TickTickClientProvider implements OnModuleInit {
  private readonly logger = new Logger(TickTickClientProvider.name);

  constructor(private readonly client: TickTickClient) {}

  async onModuleInit() {
    this.logger.log('Initializing TickTick client...');

    try {
      await this.client.init();
      this.logger.log('TickTick client initialized ✔');
    } catch (err) {
      // Caso esperado: no hay sesión aún
      this.logger.warn(
        'TickTick client could not be initialized at startup. ' +
          'No active session found. Waiting for /auth/login.',
      );

      // Debug opcional (solo si necesitas verlo)
      this.logger.debug(err instanceof Error ? err.message : String(err));
    }
  }

  get(): TickTickClient {
    return this.client;
  }
}
