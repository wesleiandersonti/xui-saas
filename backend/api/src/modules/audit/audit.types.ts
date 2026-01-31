export interface AuditLog {
  id: number;
  tenantId: number;
  userId: number | null;
  action: string;
  entityType: string;
  entityId: number | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface CreateAuditLogDto {
  tenantId: number;
  userId?: number;
  action: string;
  entityType: string;
  entityId?: number;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}
