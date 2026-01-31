import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  Ip,
  Headers,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { AuditService } from '../audit/audit.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';
import { Roles } from '../auth/roles.decorator';
import type { RequestWithUser } from '../../shared/types/request.types';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly auditService: AuditService,
  ) {}

  @Post('plans')
  @Roles('admin')
  async createPlan(@Body() dto: CreatePlanDto, @Req() req: RequestWithUser) {
    const plan = await this.paymentsService.createPlan(req.user.tenantId, dto);

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'PLAN_CREATED',
      entityType: 'plan',
      entityId: plan.id,
      details: { name: plan.name, price: plan.price },
    });

    return {
      success: true,
      data: plan,
      message: 'Plano criado com sucesso',
    };
  }

  @Get('plans')
  @Roles('admin')
  async findAllPlans(@Req() req: RequestWithUser) {
    const plans = await this.paymentsService.findAllPlansByTenant(
      req.user.tenantId,
    );
    return {
      success: true,
      data: plans,
      count: plans.length,
    };
  }

  @Get('plans/:id')
  @Roles('admin')
  async findOnePlan(@Param('id') id: string, @Req() req: RequestWithUser) {
    const plan = await this.paymentsService.findPlanById(
      parseInt(id, 10),
      req.user.tenantId,
    );
    if (!plan) {
      return {
        success: false,
        message: 'Plano nao encontrado',
      };
    }
    return {
      success: true,
      data: plan,
    };
  }

  @Put('plans/:id')
  @Roles('admin')
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
    @Req() req: RequestWithUser,
  ) {
    const plan = await this.paymentsService.updatePlan(
      parseInt(id, 10),
      req.user.tenantId,
      dto,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'PLAN_UPDATED',
      entityType: 'plan',
      entityId: plan.id,
      details: { changes: Object.keys(dto) },
    });

    return {
      success: true,
      data: plan,
      message: 'Plano atualizado com sucesso',
    };
  }

  @Delete('plans/:id')
  @Roles('admin')
  async deletePlan(@Param('id') id: string, @Req() req: RequestWithUser) {
    await this.paymentsService.deletePlan(parseInt(id, 10), req.user.tenantId);

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'PLAN_DELETED',
      entityType: 'plan',
      entityId: parseInt(id, 10),
    });

    return {
      success: true,
      message: 'Plano removido com sucesso',
    };
  }

  @Post('config/:provider')
  @Roles('admin')
  async saveConfig(
    @Param('provider') provider: 'mercadopago' | 'cora',
    @Body() config: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    const paymentConfig = await this.paymentsService.savePaymentConfig(
      req.user.tenantId,
      provider,
      config,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'PAYMENT_CONFIG_UPDATED',
      entityType: 'payment_config',
      details: { provider },
    });

    return {
      success: true,
      data: paymentConfig,
      message: 'Configuracao salva com sucesso',
    };
  }

  @Get('config/:provider')
  @Roles('admin')
  async getConfig(
    @Param('provider') provider: 'mercadopago' | 'cora',
    @Req() req: RequestWithUser,
  ) {
    const config = await this.paymentsService.getPaymentConfig(
      req.user.tenantId,
      provider,
    );
    if (!config) {
      return {
        success: false,
        message: 'Configuracao nao encontrada',
      };
    }
    return {
      success: true,
      data: config,
    };
  }

  @Post('checkout')
  async createPayment(
    @Body() dto: CreatePaymentDto,
    @Req() req: RequestWithUser,
  ) {
    const result = await this.paymentsService.createPayment(
      req.user.tenantId,
      req.user.sub,
      dto,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'PAYMENT_CREATED',
      entityType: 'payment',
      entityId: result.payment.id,
      details: {
        planId: dto.planId,
        provider: dto.provider,
        amount: result.payment.amount,
      },
    });

    return {
      success: true,
      data: {
        payment: result.payment,
        checkoutUrl: result.checkoutUrl,
        pixQrCode: result.pixQrCode,
      },
      message: 'Pagamento criado com sucesso',
    };
  }

  @Get('my-payments')
  async getMyPayments(@Req() req: RequestWithUser) {
    const payments = await this.paymentsService.findPaymentsByUser(
      req.user.sub,
      req.user.tenantId,
    );
    return {
      success: true,
      data: payments,
      count: payments.length,
    };
  }

  @Post('webhook/:provider')
  async handleWebhook(
    @Param('provider') provider: string,
    @Body() data: unknown,
    @Ip() ip: string,
  ) {
    console.log(`Webhook recebido de ${provider} - IP: ${ip}`);

    await this.paymentsService.processWebhook(provider, data);

    return {
      success: true,
      message: 'Webhook processado',
    };
  }
}
