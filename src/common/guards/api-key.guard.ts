import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const headerKey =
      (req.headers['x-api-key'] as string | undefined) ??
      (req.headers['X-API-Key'] as string | undefined);

    const expected = process.env.TICKTICK_API_KEY;

    // Si no hay API key configurada en el servidor, no bloqueamos nada
    if (!expected) {
      return true;
    }

    if (!headerKey || headerKey !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
