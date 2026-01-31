import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RowDataPacket } from 'mysql2/promise';

export interface DashboardMetrics {
  totalUsers: number;
  totalXuiInstances: number;
  activeXuiInstances: number;
  primaryXuiInstances: number;
  recentLogins: number;
  recentAuditLogs: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly db: DatabaseService) {}

  async getMetrics(tenantId: number): Promise<DashboardMetrics> {
    const [[usersRow]] = await this.db.query<RowDataPacket[][]>(
      'SELECT COUNT(*) as count FROM users WHERE tenant_id = ?',
      [tenantId],
    );

    const [[instancesRow]] = await this.db.query<RowDataPacket[][]>(
      'SELECT COUNT(*) as count FROM xui_instances WHERE tenant_id = ?',
      [tenantId],
    );

    const [[activeInstancesRow]] = await this.db.query<RowDataPacket[][]>(
      'SELECT COUNT(*) as count FROM xui_instances WHERE tenant_id = ? AND is_active = TRUE',
      [tenantId],
    );

    const [[primaryInstancesRow]] = await this.db.query<RowDataPacket[][]>(
      'SELECT COUNT(*) as count FROM xui_instances WHERE tenant_id = ? AND is_primary = TRUE',
      [tenantId],
    );

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [[recentLoginsRow]] = await this.db.query<RowDataPacket[][]>(
      `SELECT COUNT(*) as count FROM audit_logs 
       WHERE tenant_id = ? AND action = 'USER_LOGIN' AND created_at >= ?`,
      [tenantId, thirtyDaysAgo],
    );

    const [[recentLogsRow]] = await this.db.query<RowDataPacket[][]>(
      `SELECT COUNT(*) as count FROM audit_logs 
       WHERE tenant_id = ? AND created_at >= ?`,
      [tenantId, thirtyDaysAgo],
    );

    return {
      totalUsers: usersRow?.count ?? 0,
      totalXuiInstances: instancesRow?.count ?? 0,
      activeXuiInstances: activeInstancesRow?.count ?? 0,
      primaryXuiInstances: primaryInstancesRow?.count ?? 0,
      recentLogins: recentLoginsRow?.count ?? 0,
      recentAuditLogs: recentLogsRow?.count ?? 0,
    };
  }

  async getRecentActivity(
    tenantId: number,
    limit: number = 10,
  ): Promise<RowDataPacket[]> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT action, entity_type, details, created_at
       FROM audit_logs
       WHERE tenant_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [tenantId, limit],
    );

    return rows;
  }
}
