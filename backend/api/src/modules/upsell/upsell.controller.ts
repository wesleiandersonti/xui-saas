import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UpsellService } from './upsell.service';
import { AuditService } from '../audit/audit.service';
import { Roles } from '../auth/roles.decorator';
import { TrackUpsellViewDto, TrackUpsellClickDto } from './dto/upsell.dto';
import type { RequestWithUser } from '../../shared/types/request.types';

@Controller('upsell')
export class UpsellController {
  constructor(
    private readonly upsellService: UpsellService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Check if upsell banner should be shown
   * Returns banner data if user is near limits
   */
  @Get('check')
  async checkUpsell(@Req() req: RequestWithUser) {
    const banner = await this.upsellService.shouldSuggestUpsell(
      req.user.tenantId,
    );

    if (!banner) {
      return {
        success: true,
        data: { show: false },
      };
    }

    // Track the view
    await this.upsellService.trackUpsellView(req.user.tenantId, req.user.sub, {
      triggerType: banner.type,
      variant: banner.variant,
      pageUrl: req.url,
      sessionId: undefined,
    });

    return {
      success: true,
      data: banner,
    };
  }

  /**
   * Get current limit status for the tenant
   */
  @Get('limits')
  async getLimits(@Req() req: RequestWithUser) {
    const limits = await this.upsellService.checkLimits(req.user.tenantId);

    return {
      success: true,
      data: limits,
    };
  }

  /**
   * Get available upgrade options with pricing
   */
  @Get('options')
  async getUpgradeOptions(@Req() req: RequestWithUser) {
    const options = await this.upsellService.getUpsellOptions(
      req.user.tenantId,
    );

    return {
      success: true,
      data: options,
      count: options.length,
    };
  }

  /**
   * Track upsell banner view
   */
  @Post('track-view')
  @HttpCode(HttpStatus.OK)
  async trackView(
    @Body() dto: TrackUpsellViewDto,
    @Req() req: RequestWithUser,
  ) {
    await this.upsellService.trackUpsellView(
      req.user.tenantId,
      req.user.sub,
      {
        triggerType: dto.triggerType,
        variant: dto.variant,
        pageUrl: dto.pageUrl || req.url,
        sessionId: dto.sessionId || undefined,
      },
    );

    return {
      success: true,
      message: 'View tracked',
    };
  }

  /**
   * Track upsell banner click
   */
  @Post('track-click')
  @HttpCode(HttpStatus.OK)
  async trackClick(
    @Body() dto: TrackUpsellClickDto,
    @Req() req: RequestWithUser,
  ) {
    await this.upsellService.trackUpsellClick(
      req.user.tenantId,
      req.user.sub,
      {
        triggerType: dto.triggerType,
        variant: dto.variant,
        pageUrl: dto.pageUrl || req.url,
        sessionId: dto.sessionId || undefined,
        clickedPlanId: dto.clickedPlanId,
      },
    );

    // Audit log for upsell engagement
    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'UPSELL_CLICKED',
      entityType: 'upsell',
      entityId: dto.clickedPlanId,
      details: {
        triggerType: dto.triggerType,
        variant: dto.variant,
        planId: dto.clickedPlanId,
      },
    });

    return {
      success: true,
      message: 'Click tracked',
    };
  }

  /**
   * Dismiss upsell banner
   */
  @Post('dismiss')
  @HttpCode(HttpStatus.OK)
  async dismissBanner(@Req() req: RequestWithUser) {
    await this.upsellService.dismissBanner(req.user.tenantId, req.user.sub);

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'UPSELL_DISMISSED',
      entityType: 'upsell',
      details: {
        dismissedAt: new Date().toISOString(),
      },
    });

    return {
      success: true,
      message: 'Banner dismissed',
    };
  }

  /**
   * Get admin upsell statistics
   */
  @Get('admin/stats')
  @Roles('admin')
  async getAdminStats(@Req() req: RequestWithUser) {
    const stats = await this.upsellService.getConversionStats(
      req.user.tenantId,
    );

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get system-wide upsell analytics (super admin only)
   */
  @Get('admin/system-stats')
  @Roles('super_admin')
  async getSystemStats() {
    // This would aggregate stats across all tenants
    // For now, return placeholder structure
    return {
      success: true,
      data: {
        message: 'System-wide stats endpoint - requires multi-tenant aggregation',
        note: 'Implement based on business requirements',
      },
    };
  }
}
