import { Body, Controller, Get, Post, Req, Ip, Headers } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from './public.decorator';
import { AuditService } from '../audit/audit.service';
import type { RequestWithUser } from '../../shared/types/request.types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  @Public()
  @Throttle({ auth: { limit: 20, ttl: 60000 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.authService.register(dto);

    await this.auditService.log({
      tenantId: result.user.tenantId,
      userId: result.user.id,
      action: 'TENANT_CREATED',
      entityType: 'tenant',
      entityId: result.user.tenantId,
      details: { email: result.user.email },
      ipAddress: ip,
      userAgent,
    });

    return result;
  }

  @Public()
  @Throttle({ auth: { limit: 20, ttl: 60000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.authService.login(dto);

    await this.auditService.log({
      tenantId: result.user.tenantId,
      userId: result.user.id,
      action: 'USER_LOGIN',
      entityType: 'user',
      entityId: result.user.id,
      details: { email: result.user.email },
      ipAddress: ip,
      userAgent,
    });

    return result;
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @Get('me')
  me(@Req() req: RequestWithUser) {
    return this.authService.me(req.user);
  }
}
