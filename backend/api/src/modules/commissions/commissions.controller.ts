import { Controller, Get, Post, Put, Body, Param, Req } from '@nestjs/common';
import { CommissionsService } from './commissions.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateSellerConfigDto,
  UpdateSellerConfigDto,
} from './dto/seller-config.dto';
import { Roles } from '../auth/roles.decorator';
import type { RequestWithUser } from '../../shared/types/request.types';

@Controller('commissions')
export class CommissionsController {
  constructor(
    private readonly commissionsService: CommissionsService,
    private readonly auditService: AuditService,
  ) {}

  @Post('sellers')
  @Roles('admin')
  async createSellerConfig(
    @Body() dto: CreateSellerConfigDto,
    @Req() req: RequestWithUser,
  ) {
    const config = await this.commissionsService.createSellerConfig(
      req.user.tenantId,
      dto.sellerId,
      dto.commissionPercentage,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'SELLER_CONFIG_CREATED',
      entityType: 'seller_config',
      entityId: config.id,
      details: { sellerId: dto.sellerId, percentage: dto.commissionPercentage },
    });

    return {
      success: true,
      data: config,
      message: 'Configuracao de comissao criada',
    };
  }

  @Get('sellers')
  @Roles('admin')
  async findAllSellerConfigs(@Req() req: RequestWithUser) {
    const configs = await this.commissionsService.findAllSellerConfigs(
      req.user.tenantId,
    );
    return {
      success: true,
      data: configs,
      count: configs.length,
    };
  }

  @Put('sellers/:sellerId')
  @Roles('admin')
  async updateSellerConfig(
    @Param('sellerId') sellerId: string,
    @Body() dto: UpdateSellerConfigDto,
    @Req() req: RequestWithUser,
  ) {
    const config = await this.commissionsService.updateSellerConfig(
      req.user.tenantId,
      parseInt(sellerId, 10),
      dto,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'SELLER_CONFIG_UPDATED',
      entityType: 'seller_config',
      entityId: config.id,
      details: { sellerId, changes: Object.keys(dto) },
    });

    return {
      success: true,
      data: config,
      message: 'Configuracao atualizada',
    };
  }

  @Get('my-commissions')
  async getMyCommissions(@Req() req: RequestWithUser) {
    const commissions = await this.commissionsService.findCommissionsBySeller(
      req.user.sub,
      req.user.tenantId,
    );
    const summary = await this.commissionsService.getSellerSummary(
      req.user.sub,
      req.user.tenantId,
    );

    return {
      success: true,
      data: {
        commissions,
        summary,
      },
    };
  }

  @Get('summary')
  @Roles('admin')
  async getSummary(@Req() req: RequestWithUser) {
    const summary = await this.commissionsService.getSellerSummary(
      req.user.sub,
      req.user.tenantId,
    );
    return {
      success: true,
      data: summary,
    };
  }

  @Put('pay/:id')
  @Roles('admin')
  async payCommission(@Param('id') id: string, @Req() req: RequestWithUser) {
    const commission = await this.commissionsService.payCommission(
      parseInt(id, 10),
      req.user.tenantId,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'COMMISSION_PAID',
      entityType: 'commission',
      entityId: commission.id,
      details: { sellerId: commission.sellerId, amount: commission.amount },
    });

    return {
      success: true,
      data: commission,
      message: 'Comissao paga com sucesso',
    };
  }
}
