
import { Module } from '@nestjs/common';
import { TickTickModule } from 'src/core/ticktick.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [TickTickModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
