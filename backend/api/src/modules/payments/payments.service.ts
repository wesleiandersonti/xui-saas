import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import axios from 'axios';
import { DatabaseService } from '../database/database.service';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import {
  Payment,
  PaymentConfig,
  Plan,
  CreatePaymentDto,
  MercadoPagoPreference,
  MercadoPagoPayment,
} from './payments.types';

@Injectable()
export class PaymentsService {
  constructor(private readonly db: DatabaseService) {}

  async createPlan(
    tenantId: number,
    data: {
      name: string;
      description?: string;
      price: number;
      durationDays: number;
    },
  ): Promise<Plan> {
    const result = await this.db.query<ResultSetHeader>(
      `INSERT INTO plans (tenant_id, name, description, price, duration_days) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        tenantId,
        data.name,
        data.description || null,
        data.price,
        data.durationDays,
      ],
    );

    const plan = await this.findPlanById(result.insertId, tenantId);
    if (!plan) {
      throw new Error('Falha ao criar plano');
    }

    return plan;
  }

  async findPlanById(id: number, tenantId: number): Promise<Plan | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, name, description, price, duration_days, is_active, created_at, updated_at
       FROM plans WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [id, tenantId],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToPlan(rows[0]);
  }

  async findAllPlansByTenant(tenantId: number): Promise<Plan[]> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, name, description, price, duration_days, is_active, created_at, updated_at
       FROM plans WHERE tenant_id = ? AND is_active = TRUE 
       ORDER BY price ASC`,
      [tenantId],
    );

    return rows.map((row) => this.mapRowToPlan(row));
  }

  async updatePlan(
    id: number,
    tenantId: number,
    data: Partial<Plan>,
  ): Promise<Plan> {
    const plan = await this.findPlanById(id, tenantId);
    if (!plan) {
      throw new NotFoundException('Plano nao encontrado');
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.price !== undefined) {
      updates.push('price = ?');
      values.push(data.price);
    }
    if (data.durationDays !== undefined) {
      updates.push('duration_days = ?');
      values.push(data.durationDays);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(data.isActive);
    }

    if (updates.length === 0) {
      return plan;
    }

    values.push(id);
    values.push(tenantId);

    await this.db.query(
      `UPDATE plans SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
      values,
    );

    const updated = await this.findPlanById(id, tenantId);
    if (!updated) {
      throw new Error('Falha ao atualizar plano');
    }

    return updated;
  }

  async deletePlan(id: number, tenantId: number): Promise<void> {
    const result = await this.db.query<ResultSetHeader>(
      'DELETE FROM plans WHERE id = ? AND tenant_id = ?',
      [id, tenantId],
    );

    if (result.affectedRows === 0) {
      throw new NotFoundException('Plano nao encontrado');
    }
  }

  async getPaymentConfig(
    tenantId: number,
    provider: 'mercadopago' | 'cora',
  ): Promise<PaymentConfig | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, provider, is_active, config_json, created_at, updated_at
       FROM payment_configs WHERE tenant_id = ? AND provider = ? LIMIT 1`,
      [tenantId, provider],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToPaymentConfig(rows[0]);
  }

  async savePaymentConfig(
    tenantId: number,
    provider: 'mercadopago' | 'cora',
    config: PaymentConfig['configJson'],
  ): Promise<PaymentConfig> {
    const existing = await this.getPaymentConfig(tenantId, provider);

    if (existing) {
      await this.db.query(
        `UPDATE payment_configs SET config_json = ?, is_active = TRUE, updated_at = NOW() 
         WHERE id = ?`,
        [JSON.stringify(config), existing.id],
      );
    } else {
      await this.db.query(
        `INSERT INTO payment_configs (tenant_id, provider, is_active, config_json) 
         VALUES (?, ?, TRUE, ?)`,
        [tenantId, provider, JSON.stringify(config)],
      );
    }

    const updated = await this.getPaymentConfig(tenantId, provider);
    if (!updated) {
      throw new Error('Falha ao salvar configuracao');
    }

    return updated;
  }

  async createPayment(
    tenantId: number,
    userId: number,
    dto: CreatePaymentDto & { planId: number },
  ): Promise<{ payment: Payment; checkoutUrl?: string; pixQrCode?: string }> {
    const plan = await this.findPlanById(dto.planId, tenantId);
    if (!plan) {
      throw new NotFoundException('Plano nao encontrado');
    }

    const config = await this.getPaymentConfig(tenantId, dto.provider);
    if (!config || !config.isActive) {
      throw new BadRequestException('Provedor de pagamento nao configurado');
    }

    const result = await this.db.query<ResultSetHeader>(
      `INSERT INTO payments (tenant_id, user_id, plan_id, seller_id, provider, amount, status, payment_method) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        tenantId,
        userId,
        dto.planId,
        dto.sellerId || null,
        dto.provider,
        plan.price,
        dto.paymentMethod,
      ],
    );

    const payment = await this.findPaymentById(result.insertId, tenantId);
    if (!payment) {
      throw new Error('Falha ao criar pagamento');
    }

    let checkoutUrl: string | undefined;
    let pixQrCode: string | undefined;

    if (dto.provider === 'mercadopago') {
      const mpResult = await this.createMercadoPagoPayment(
        payment,
        plan,
        config,
      );
      checkoutUrl = mpResult.checkoutUrl;
      pixQrCode = mpResult.pixQrCode;
    }

    return { payment, checkoutUrl, pixQrCode };
  }

  private async createMercadoPagoPayment(
    payment: Payment,
    plan: Plan,
    config: PaymentConfig,
  ): Promise<{ checkoutUrl?: string; pixQrCode?: string }> {
    const accessToken = config.configJson.accessToken;
    if (!accessToken) {
      throw new BadRequestException(
        'Token de acesso do Mercado Pago nao configurado',
      );
    }

    const preference: MercadoPagoPreference = {
      items: [
        {
          title: plan.name,
          description: plan.description || undefined,
          unit_price: plan.price,
          quantity: 1,
          currency_id: 'BRL',
        },
      ],
      external_reference: String(payment.id),
      notification_url: `${process.env.API_URL || 'http://localhost:5000'}/payments/webhook/mercadopago`,
      auto_return: 'approved',
    };

    try {
      const response = await axios.post(
        'https://api.mercadopago.com/checkout/preferences',
        preference,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const preferenceId = response.data.id;
      const initPoint = response.data.init_point;

      await this.db.query(
        'UPDATE payments SET external_id = ?, metadata = ? WHERE id = ?',
        [
          preferenceId,
          JSON.stringify({ preference_id: preferenceId }),
          payment.id,
        ],
      );

      return { checkoutUrl: initPoint };
    } catch (error) {
      throw new BadRequestException(
        'Erro ao criar preferencia no Mercado Pago',
      );
    }
  }

  async findPaymentById(id: number, tenantId: number): Promise<Payment | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, user_id, plan_id, seller_id, external_id, provider, amount, 
              status, payment_method, paid_at, metadata, created_at, updated_at
       FROM payments WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [id, tenantId],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToPayment(rows[0]);
  }

  async findPaymentsByUser(
    userId: number,
    tenantId: number,
  ): Promise<Payment[]> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, user_id, plan_id, seller_id, external_id, provider, amount, 
              status, payment_method, paid_at, metadata, created_at, updated_at
       FROM payments WHERE user_id = ? AND tenant_id = ? 
       ORDER BY created_at DESC`,
      [userId, tenantId],
    );

    return rows.map((row) => this.mapRowToPayment(row));
  }

  async processWebhook(provider: string, data: unknown): Promise<void> {
    if (provider === 'mercadopago') {
      await this.processMercadoPagoWebhook(data as MercadoPagoPayment);
    }
  }

  private async processMercadoPagoWebhook(
    data: MercadoPagoPayment,
  ): Promise<void> {
    const paymentId = parseInt(data.external_reference, 10);
    if (!paymentId) {
      throw new BadRequestException('Referencia externa invalida');
    }

    const payment = await this.db.query<RowDataPacket[]>(
      'SELECT * FROM payments WHERE id = ? LIMIT 1',
      [paymentId],
    );

    if (payment.length === 0) {
      throw new NotFoundException('Pagamento nao encontrado');
    }

    const status = this.mapMercadoPagoStatus(data.status);
    const paidAt = data.date_approved ? new Date(data.date_approved) : null;

    await this.db.query(
      `UPDATE payments SET status = ?, paid_at = ?, payment_method = ?, 
       external_id = ?, updated_at = NOW() 
       WHERE id = ?`,
      [status, paidAt, data.payment_method_id, data.id, paymentId],
    );

    if (status === 'approved') {
      await this.activateUserPlan(
        payment[0].user_id as number,
        payment[0].plan_id as number,
      );
    }
  }

  private mapMercadoPagoStatus(mpStatus: string): Payment['status'] {
    const statusMap: Record<string, Payment['status']> = {
      approved: 'approved',
      pending: 'pending',
      in_process: 'pending',
      rejected: 'rejected',
      cancelled: 'cancelled',
      refunded: 'refunded',
    };
    return statusMap[mpStatus] || 'pending';
  }

  private async activateUserPlan(
    userId: number,
    planId: number,
  ): Promise<void> {
    // Implementação futura: ativar plano no XUI
    console.log(`Ativando plano ${planId} para usuario ${userId}`);
  }

  private mapRowToPlan(row: RowDataPacket): Plan {
    return {
      id: row.id as number,
      tenantId: row.tenant_id as number,
      name: row.name as string,
      description: row.description as string | null,
      price: parseFloat(row.price as string),
      durationDays: row.duration_days as number,
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapRowToPaymentConfig(row: RowDataPacket): PaymentConfig {
    return {
      id: row.id as number,
      tenantId: row.tenant_id as number,
      provider: row.provider as 'mercadopago' | 'cora',
      isActive: Boolean(row.is_active),
      configJson: JSON.parse(row.config_json as string),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapRowToPayment(row: RowDataPacket): Payment {
    return {
      id: row.id as number,
      tenantId: row.tenant_id as number,
      userId: row.user_id as number,
      planId: row.plan_id as number | null,
      sellerId: row.seller_id as number | null,
      externalId: row.external_id as string | null,
      provider: row.provider as string,
      amount: parseFloat(row.amount as string),
      status: row.status as Payment['status'],
      paymentMethod: row.payment_method as string | null,
      paidAt: row.paid_at ? new Date(row.paid_at as string) : null,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
