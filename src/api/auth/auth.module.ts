import { Module } from '@nestjs/common';
import { TickTickModule } from 'src/core/ticktick.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [TickTickModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
