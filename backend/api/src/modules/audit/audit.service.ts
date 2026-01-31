import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { AuditLog, CreateAuditLogDto } from './audit.types';

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    const result = await this.db.query<ResultSetHeader>(
      `INSERT INTO audit_logs 
       (tenant_id, user_id, action, entity_type, entity_id, details, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dto.tenantId,
        dto.userId ?? null,
        dto.action,
        dto.entityType,
        dto.entityId ?? null,
        dto.details ? JSON.stringify(dto.details) : null,
        dto.ipAddress ?? null,
        dto.userAgent ?? null,
      ],
    );

    const log = await this.findById(result.insertId);
    if (!log) {
      throw new Error('Falha ao criar log de auditoria');
    }

    return log;
  }

  async findById(id: number): Promise<AuditLog | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, user_id, action, entity_type, entity_id, 
              details, ip_address, user_agent, created_at
       FROM audit_logs 
       WHERE id = ? 
       LIMIT 1`,
      [id],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToAuditLog(rows[0]);
  }

  async findByTenant(
    tenantId: number,
    options: {
      limit?: number;
      offset?: number;
      action?: string;
      entityType?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const {
      limit = 50,
      offset = 0,
      action,
      entityType,
      startDate,
      endDate,
    } = options;

    let whereClause = 'WHERE tenant_id = ?';
    const params: (number | string | Date)[] = [tenantId];

    if (action) {
      whereClause += ' AND action = ?';
      params.push(action);
    }

    if (entityType) {
      whereClause += ' AND entity_type = ?';
      params.push(entityType);
    }

    if (startDate) {
      whereClause += ' AND created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND created_at <= ?';
      params.push(endDate);
    }

    const countRows = await this.db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
      params,
    );
    const total = (countRows[0]?.total as number) ?? 0;

    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, user_id, action, entity_type, entity_id, 
              details, ip_address, user_agent, created_at
       FROM audit_logs 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return {
      logs: rows.map((row) => this.mapRowToAuditLog(row)),
      total,
    };
  }

  private mapRowToAuditLog(row: RowDataPacket): AuditLog {
    return {
      id: row.id as number,
      tenantId: row.tenant_id as number,
      userId: row.user_id as number | null,
      action: row.action as string,
      entityType: row.entity_type as string,
      entityId: row.entity_id as number | null,
      details: row.details ? JSON.parse(row.details as string) : null,
      ipAddress: row.ip_address as string | null,
      userAgent: row.user_agent as string | null,
      createdAt: new Date(row.created_at as string),
    };
  }
}
