import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { SellerProfile, SellerCustomer, SellerStats } from './sellers.types';
import {
  CreateSellerProfileDto,
  UpdateSellerProfileDto,
  CreateSellerCustomerDto,
  UpdateSellerCustomerDto,
} from './dto/sellers.dto';

@Injectable()
export class SellersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  async createSellerProfile(
    tenantId: number,
    data: CreateSellerProfileDto,
  ): Promise<SellerProfile> {
    const result = await this.db.query<ResultSetHeader>(
      `INSERT INTO seller_profiles 
       (tenant_id, user_id, custom_code, commission_percentage, monthly_goal, is_active) 
       VALUES (?, ?, ?, ?, ?, TRUE)`,
      [
        tenantId,
        data.userId,
        data.customCode ?? null,
        data.commissionPercentage ?? 0,
        data.monthlyGoal ?? 0,
      ],
    );

    const profile = await this.findSellerProfileById(result.insertId, tenantId);
    if (!profile) {
      throw new Error('Falha ao criar perfil de vendedor');
    }

    await this.auditService.log({
      tenantId,
      userId: data.userId,
      action: 'SELLER_PROFILE_CREATED',
      entityType: 'seller_profile',
      entityId: profile.id,
      details: { userId: data.userId, customCode: data.customCode },
    });

    return profile;
  }

  async findSellerProfile(
    userId: number,
    tenantId: number,
  ): Promise<SellerProfile | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, user_id, custom_code, commission_percentage, monthly_goal, is_active, created_at, updated_at
       FROM seller_profiles WHERE user_id = ? AND tenant_id = ? LIMIT 1`,
      [userId, tenantId],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToSellerProfile(rows[0]);
  }

  async findSellerProfileById(
    id: number,
    tenantId: number,
  ): Promise<SellerProfile | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, user_id, custom_code, commission_percentage, monthly_goal, is_active, created_at, updated_at
       FROM seller_profiles WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [id, tenantId],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToSellerProfile(rows[0]);
  }

  async findAllSellers(
    tenantId: number,
  ): Promise<(SellerProfile & { stats: SellerStats })[]> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT sp.id, sp.tenant_id, sp.user_id, sp.custom_code, sp.commission_percentage, 
              sp.monthly_goal, sp.is_active, sp.created_at, sp.updated_at,
              u.email as user_email, u.name as user_name
       FROM seller_profiles sp
       JOIN users u ON sp.user_id = u.id
       WHERE sp.tenant_id = ?`,
      [tenantId],
    );

    const sellers: (SellerProfile & { stats: SellerStats })[] = [];
    for (const row of rows) {
      const profile = this.mapRowToSellerProfile(row);
      const stats = await this.getSellerStats(profile.userId, tenantId);
      sellers.push({ ...profile, stats });
    }

    return sellers;
  }

  async updateSellerProfile(
    userId: number,
    tenantId: number,
    data: UpdateSellerProfileDto,
  ): Promise<SellerProfile> {
    const profile = await this.findSellerProfile(userId, tenantId);
    if (!profile) {
      throw new NotFoundException('Perfil de vendedor nao encontrado');
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.customCode !== undefined) {
      updates.push('custom_code = ?');
      values.push(data.customCode);
    }
    if (data.commissionPercentage !== undefined) {
      updates.push('commission_percentage = ?');
      values.push(data.commissionPercentage);
    }
    if (data.monthlyGoal !== undefined) {
      updates.push('monthly_goal = ?');
      values.push(data.monthlyGoal);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(data.isActive);
    }

    if (updates.length === 0) {
      return profile;
    }

    values.push(userId);
    values.push(tenantId);

    await this.db.query(
      `UPDATE seller_profiles SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE user_id = ? AND tenant_id = ?`,
      values,
    );

    const updated = await this.findSellerProfile(userId, tenantId);
    if (!updated) {
      throw new NotFoundException('Perfil de vendedor nao encontrado');
    }

    await this.auditService.log({
      tenantId,
      userId,
      action: 'SELLER_PROFILE_UPDATED',
      entityType: 'seller_profile',
      entityId: updated.id,
      details: { changes: Object.keys(data) },
    });

    return updated;
  }

  async deactivateSeller(
    userId: number,
    tenantId: number,
  ): Promise<SellerProfile> {
    const profile = await this.findSellerProfile(userId, tenantId);
    if (!profile) {
      throw new NotFoundException('Perfil de vendedor nao encontrado');
    }

    await this.db.query(
      `UPDATE seller_profiles SET is_active = FALSE, updated_at = NOW() 
       WHERE user_id = ? AND tenant_id = ?`,
      [userId, tenantId],
    );

    const updated = await this.findSellerProfile(userId, tenantId);
    if (!updated) {
      throw new NotFoundException('Perfil de vendedor nao encontrado');
    }

    await this.auditService.log({
      tenantId,
      userId,
      action: 'SELLER_DEACTIVATED',
      entityType: 'seller_profile',
      entityId: updated.id,
      details: { userId },
    });

    return updated;
  }

  async createCustomer(
    tenantId: number,
    sellerId: number,
    data: CreateSellerCustomerDto,
  ): Promise<SellerCustomer> {
    const xuiUsername = this.generateXuiUsername();
    const xuiPassword = this.generateXuiPassword();

    const result = await this.db.query<ResultSetHeader>(
      `INSERT INTO seller_customers 
       (tenant_id, seller_id, customer_name, customer_email, customer_phone, xui_username, xui_password, plan_id, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        tenantId,
        sellerId,
        data.customerName,
        data.customerEmail ?? null,
        data.customerPhone ?? null,
        xuiUsername,
        xuiPassword,
        data.planId ?? null,
      ],
    );

    const customer = await this.findCustomerById(result.insertId, tenantId);
    if (!customer) {
      throw new Error('Falha ao criar cliente do vendedor');
    }

    await this.auditService.log({
      tenantId,
      userId: sellerId,
      action: 'SELLER_CUSTOMER_CREATED',
      entityType: 'seller_customer',
      entityId: customer.id,
      details: { sellerId, customerName: data.customerName },
    });

    return customer;
  }

  async findCustomersBySeller(
    sellerId: number,
    tenantId: number,
    status?: string,
  ): Promise<SellerCustomer[]> {
    let query = `SELECT id, tenant_id, seller_id, customer_name, customer_email, customer_phone, 
                        xui_username, xui_password, plan_id, status, expires_at, created_at, updated_at
                 FROM seller_customers WHERE seller_id = ? AND tenant_id = ?`;
    const params: (number | string)[] = [sellerId, tenantId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const rows = await this.db.query<RowDataPacket[]>(query, params);
    return rows.map((row) => this.mapRowToSellerCustomer(row));
  }

  async findCustomerById(
    id: number,
    tenantId: number,
  ): Promise<SellerCustomer | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, seller_id, customer_name, customer_email, customer_phone, 
              xui_username, xui_password, plan_id, status, expires_at, created_at, updated_at
       FROM seller_customers WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [id, tenantId],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToSellerCustomer(rows[0]);
  }

  async updateCustomer(
    id: number,
    tenantId: number,
    data: UpdateSellerCustomerDto,
  ): Promise<SellerCustomer> {
    const customer = await this.findCustomerById(id, tenantId);
    if (!customer) {
      throw new NotFoundException('Cliente nao encontrado');
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.customerName !== undefined) {
      updates.push('customer_name = ?');
      values.push(data.customerName);
    }
    if (data.customerEmail !== undefined) {
      updates.push('customer_email = ?');
      values.push(data.customerEmail);
    }
    if (data.customerPhone !== undefined) {
      updates.push('customer_phone = ?');
      values.push(data.customerPhone);
    }
    if (data.planId !== undefined) {
      updates.push('plan_id = ?');
      values.push(data.planId);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.expiresAt !== undefined) {
      updates.push('expires_at = ?');
      values.push(data.expiresAt);
    }

    if (updates.length === 0) {
      return customer;
    }

    values.push(id);
    values.push(tenantId);

    await this.db.query(
      `UPDATE seller_customers SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = ? AND tenant_id = ?`,
      values,
    );

    const updated = await this.findCustomerById(id, tenantId);
    if (!updated) {
      throw new NotFoundException('Cliente nao encontrado');
    }

    await this.auditService.log({
      tenantId,
      userId: customer.sellerId,
      action: 'SELLER_CUSTOMER_UPDATED',
      entityType: 'seller_customer',
      entityId: id,
      details: { changes: Object.keys(data) },
    });

    return updated;
  }

  async deleteCustomer(id: number, tenantId: number): Promise<void> {
    const customer = await this.findCustomerById(id, tenantId);
    if (!customer) {
      throw new NotFoundException('Cliente nao encontrado');
    }

    await this.db.query(
      `DELETE FROM seller_customers WHERE id = ? AND tenant_id = ?`,
      [id, tenantId],
    );

    await this.auditService.log({
      tenantId,
      userId: customer.sellerId,
      action: 'SELLER_CUSTOMER_DELETED',
      entityType: 'seller_customer',
      entityId: id,
      details: { customerName: customer.customerName },
    });
  }

  async getSellerStats(
    sellerId: number,
    tenantId: number,
  ): Promise<SellerStats> {
    const [[customersRow]] = await this.db.query<RowDataPacket[][]>(
      `SELECT COUNT(*) as total FROM seller_customers WHERE seller_id = ? AND tenant_id = ?`,
      [sellerId, tenantId],
    );

    const [[activeRow]] = await this.db.query<RowDataPacket[][]>(
      `SELECT COUNT(*) as total FROM seller_customers 
       WHERE seller_id = ? AND tenant_id = ? AND status = 'active'`,
      [sellerId, tenantId],
    );

    const [[revenueRow]] = await this.db.query<RowDataPacket[][]>(
      `SELECT COALESCE(SUM(p.amount), 0) as total 
       FROM payments p
       JOIN seller_customers sc ON p.customer_id = sc.id
       WHERE sc.seller_id = ? AND sc.tenant_id = ? 
       AND MONTH(p.created_at) = MONTH(CURDATE()) 
       AND YEAR(p.created_at) = YEAR(CURDATE())`,
      [sellerId, tenantId],
    );

    const [[commissionsRow]] = await this.db.query<RowDataPacket[][]>(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM commissions WHERE seller_id = ? AND tenant_id = ?`,
      [sellerId, tenantId],
    );

    return {
      totalCustomers: customersRow?.total ?? 0,
      activeCustomers: activeRow?.total ?? 0,
      monthlyRevenue: parseFloat(revenueRow?.total ?? '0'),
      totalCommissions: parseFloat(commissionsRow?.total ?? '0'),
    };
  }

  private generateXuiUsername(): string {
    return `seller_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private generateXuiPassword(): string {
    return (
      Math.random().toString(36).substring(2, 12) +
      Math.random().toString(36).substring(2, 12)
    );
  }

  private mapRowToSellerProfile(row: RowDataPacket): SellerProfile {
    return {
      id: row.id as number,
      tenantId: row.tenant_id as number,
      userId: row.user_id as number,
      customCode: row.custom_code as string | null,
      commissionPercentage: parseFloat(row.commission_percentage as string),
      monthlyGoal: parseFloat(row.monthly_goal as string),
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapRowToSellerCustomer(row: RowDataPacket): SellerCustomer {
    return {
      id: row.id as number,
      tenantId: row.tenant_id as number,
      sellerId: row.seller_id as number,
      customerName: row.customer_name as string,
      customerEmail: row.customer_email as string | null,
      customerPhone: row.customer_phone as string | null,
      xuiUsername: row.xui_username as string,
      xuiPassword: row.xui_password as string,
      planId: row.plan_id as number,
      status: row.status as SellerCustomer['status'],
      expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
