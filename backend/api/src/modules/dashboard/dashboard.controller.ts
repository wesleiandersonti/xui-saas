import { Controller, Get, Req, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../auth/roles.decorator';
import type { RequestWithUser } from '../../shared/types/request.types';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @Roles('admin')
  async getMetrics(@Req() req: RequestWithUser) {
    const metrics = await this.dashboardService.getMetrics(req.user.tenantId);
    return {
      success: true,
      data: metrics,
    };
  }

  @Get('activity')
  @Roles('admin')
  async getRecentActivity(
    @Req() req: RequestWithUser,
    @Query('limit') limit: string = '10',
  ) {
    const activity = await this.dashboardService.getRecentActivity(
      req.user.tenantId,
      parseInt(limit, 10),
    );
    return {
      success: true,
      data: activity,
    };
  }
}
