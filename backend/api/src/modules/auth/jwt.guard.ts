import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PUBLIC_KEY } from './auth.constants';
import { AuthUser } from './auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const header = request.headers?.authorization || request.headers?.Authorization;

    if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token ausente');
    }

    const token = header.slice('Bearer '.length).trim();

    try {
      const payload = await this.jwtService.verifyAsync<AuthUser>(token, {
        audience: process.env.JWT_AUDIENCE || 'xui-saas',
        issuer: process.env.JWT_ISSUER || 'xui-saas',
      });

      if (!payload || payload.tokenUse !== 'access') {
        throw new UnauthorizedException('Token invalido');
      }

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token invalido');
    }
  }
}
