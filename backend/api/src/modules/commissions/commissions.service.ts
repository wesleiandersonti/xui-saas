import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import {
  Commission,
  SellerConfig,
  CommissionSummary,
} from './commissions.types';

@Injectable()
export class CommissionsService {
  constructor(private readonly db: DatabaseService) {}

  async createSellerConfig(
    tenantId: number,
    sellerId: number,
    commissionPercentage: number,
  ): Promise<SellerConfig> {
    const result = await this.db.query<ResultSetHeader>(
      `INSERT INTO seller_configs (tenant_id, seller_id, commission_percentage, is_active) 
       VALUES (?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE commission_percentage = ?, is_active = TRUE`,
      [tenantId, sellerId, commissionPercentage, commissionPercentage],
    );

    const config = await this.findSellerConfig(tenantId, sellerId);
    if (!config) {
      throw new Error('Falha ao criar configuracao de comissao');
    }

    return config;
  }

  async findSellerConfig(
    tenantId: number,
    sellerId: number,
  ): Promise<SellerConfig | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, seller_id, commission_percentage, is_active, created_at, updated_at
       FROM seller_configs WHERE tenant_id = ? AND seller_id = ? LIMIT 1`,
      [tenantId, sellerId],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToSellerConfig(rows[0]);
  }

  async findAllSellerConfigs(tenantId: number): Promise<SellerConfig[]> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT sc.id, sc.tenant_id, sc.seller_id, sc.commission_percentage, sc.is_active, 
              sc.created_at, sc.updated_at, u.email as seller_email
       FROM seller_configs sc
       JOIN users u ON sc.seller_id = u.id
       WHERE sc.tenant_id = ? AND sc.is_active = TRUE`,
      [tenantId],
    );

    return rows.map((row) => this.mapRowToSellerConfig(row));
  }

  async updateSellerConfig(
    tenantId: number,
    sellerId: number,
    data: Partial<SellerConfig>,
  ): Promise<SellerConfig> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.commissionPercentage !== undefined) {
      updates.push('commission_percentage = ?');
      values.push(data.commissionPercentage);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(data.isActive);
    }

    if (updates.length === 0) {
      const config = await this.findSellerConfig(tenantId, sellerId);
      if (!config) {
        throw new NotFoundException('Configuracao nao encontrada');
      }
      return config;
    }

    values.push(tenantId);
    values.push(sellerId);

    await this.db.query(
      `UPDATE seller_configs SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE tenant_id = ? AND seller_id = ?`,
      values,
    );

    const updated = await this.findSellerConfig(tenantId, sellerId);
    if (!updated) {
      throw new NotFoundException('Configuracao nao encontrada');
    }

    return updated;
  }

  async calculateCommission(
    tenantId: number,
    paymentId: number,
    amount: number,
    sellerId?: number,
  ): Promise<Commission | null> {
    if (!sellerId) {
      return null;
    }

    const config = await this.findSellerConfig(tenantId, sellerId);
    if (!config || !config.isActive) {
      return null;
    }

    const commissionAmount = (amount * config.commissionPercentage) / 100;

    const result = await this.db.query<ResultSetHeader>(
      `INSERT INTO commissions (tenant_id, seller_id, payment_id, amount, percentage, status) 
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [
        tenantId,
        sellerId,
        paymentId,
        commissionAmount,
        config.commissionPercentage,
      ],
    );

    const commission = await this.findCommissionById(result.insertId, tenantId);
    if (!commission) {
      throw new Error('Falha ao criar comissao');
    }

    return commission;
  }

  async findCommissionById(
    id: number,
    tenantId: number,
  ): Promise<Commission | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, seller_id, payment_id, amount, percentage, status, paid_at, created_at, updated_at
       FROM commissions WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [id, tenantId],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToCommission(rows[0]);
  }

  async findCommissionsBySeller(
    sellerId: number,
    tenantId: number,
    status?: string,
  ): Promise<Commission[]> {
    let query = `SELECT id, tenant_id, seller_id, payment_id, amount, percentage, status, paid_at, created_at, updated_at
       FROM commissions WHERE seller_id = ? AND tenant_id = ?`;
    const params: (number | string)[] = [sellerId, tenantId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const rows = await this.db.query<RowDataPacket[]>(query, params);
    return rows.map((row) => this.mapRowToCommission(row));
  }

  async getSellerSummary(
    sellerId: number,
    tenantId: number,
  ): Promise<CommissionSummary> {
    const [[pendingRow]] = await this.db.query<RowDataPacket[][]>(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
       FROM commissions WHERE seller_id = ? AND tenant_id = ? AND status = 'pending'`,
      [sellerId, tenantId],
    );

    const [[paidRow]] = await this.db.query<RowDataPacket[][]>(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
       FROM commissions WHERE seller_id = ? AND tenant_id = ? AND status = 'paid'`,
      [sellerId, tenantId],
    );

    const [[salesRow]] = await this.db.query<RowDataPacket[][]>(
      `SELECT COUNT(*) as count FROM commissions WHERE seller_id = ? AND tenant_id = ?`,
      [sellerId, tenantId],
    );

    return {
      totalCommissions: (pendingRow?.count ?? 0) + (paidRow?.count ?? 0),
      pendingAmount: parseFloat(pendingRow?.total ?? '0'),
      paidAmount: parseFloat(paidRow?.total ?? '0'),
      totalSales: salesRow?.count ?? 0,
    };
  }

  async payCommission(id: number, tenantId: number): Promise<Commission> {
    const commission = await this.findCommissionById(id, tenantId);
    if (!commission) {
      throw new NotFoundException('Comissao nao encontrada');
    }

    if (commission.status !== 'pending') {
      throw new NotFoundException('Comissao ja foi processada');
    }

    await this.db.query(
      `UPDATE commissions SET status = 'paid', paid_at = NOW(), updated_at = NOW() 
       WHERE id = ? AND tenant_id = ?`,
      [id, tenantId],
    );

    const updated = await this.findCommissionById(id, tenantId);
    if (!updated) {
      throw new Error('Falha ao atualizar comissao');
    }

    return updated;
  }

  private mapRowToSellerConfig(row: RowDataPacket): SellerConfig {
    return {
      id: row.id as number,
      tenantId: row.tenant_id as number,
      sellerId: row.seller_id as number,
      commissionPercentage: parseFloat(row.commission_percentage as string),
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapRowToCommission(row: RowDataPacket): Commission {
    return {
      id: row.id as number,
      tenantId: row.tenant_id as number,
      sellerId: row.seller_id as number,
      paymentId: row.payment_id as number,
      amount: parseFloat(row.amount as string),
      percentage: parseFloat(row.percentage as string),
      status: row.status as Commission['status'],
      paidAt: row.paid_at ? new Date(row.paid_at as string) : null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
