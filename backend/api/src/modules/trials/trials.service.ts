import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { Trial, CreateTrialDto } from './trials.types';

@Injectable()
export class TrialsService {
  private readonly defaultTrialDays = 7;

  constructor(
    private readonly db: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  async createTrial(dto: CreateTrialDto): Promise<Trial> {
    // Verifica se usuário já teve trial
    const existingTrial = await this.findActiveOrRecentTrial(
      dto.tenantId,
      dto.userId,
    );
    if (existingTrial) {
      throw new BadRequestException('Usuario ja utilizou o periodo de teste');
    }

    const durationDays = dto.durationDays || this.defaultTrialDays;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    const result = await this.db.query<ResultSetHeader>(
      `INSERT INTO trials (tenant_id, user_id, plan_id, expires_at) 
       VALUES (?, ?, ?, ?)`,
      [dto.tenantId, dto.userId, dto.planId, expiresAt],
    );

    const trial = await this.findById(result.insertId);
    if (!trial) {
      throw new Error('Falha ao criar trial');
    }

    await this.auditService.log({
      tenantId: dto.tenantId,
      userId: dto.userId,
      action: 'TRIAL_CREATED',
      entityType: 'trial',
      entityId: trial.id,
      details: { planId: dto.planId, durationDays, expiresAt },
    });

    return trial;
  }

  async findById(id: number): Promise<Trial | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, user_id, plan_id, status, started_at, expires_at,
              converted_to_paid, converted_at, payment_id, reminder_sent_3days,
              reminder_sent_1day, reminder_sent_expired, created_at, updated_at
       FROM trials WHERE id = ? LIMIT 1`,
      [id],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToTrial(rows[0]);
  }

  async findActiveOrRecentTrial(
    tenantId: number,
    userId: number,
  ): Promise<Trial | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, user_id, plan_id, status, started_at, expires_at,
              converted_to_paid, converted_at, payment_id, reminder_sent_3days,
              reminder_sent_1day, reminder_sent_expired, created_at, updated_at
       FROM trials 
       WHERE tenant_id = ? AND user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [tenantId, userId],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToTrial(rows[0]);
  }

  async findActiveTrial(
    tenantId: number,
    userId: number,
  ): Promise<Trial | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, user_id, plan_id, status, started_at, expires_at,
              converted_to_paid, converted_at, payment_id, reminder_sent_3days,
              reminder_sent_1day, reminder_sent_expired, created_at, updated_at
       FROM trials 
       WHERE tenant_id = ? AND user_id = ? AND status = 'active' AND expires_at > NOW()
       LIMIT 1`,
      [tenantId, userId],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToTrial(rows[0]);
  }

  async getTrialStatus(
    tenantId: number,
    userId: number,
  ): Promise<{
    hasTrial: boolean;
    isActive: boolean;
    daysRemaining: number;
    expiresAt: Date | null;
    canStartTrial: boolean;
  }> {
    const trial = await this.findActiveOrRecentTrial(tenantId, userId);

    if (!trial) {
      return {
        hasTrial: false,
        isActive: false,
        daysRemaining: 0,
        expiresAt: null,
        canStartTrial: true,
      };
    }

    const now = new Date();
    const isActive = trial.status === 'active' && trial.expiresAt > now;
    const daysRemaining = isActive
      ? Math.ceil(
          (trial.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        )
      : 0;

    return {
      hasTrial: true,
      isActive,
      daysRemaining: Math.max(0, daysRemaining),
      expiresAt: trial.expiresAt,
      canStartTrial: false,
    };
  }

  async convertToPaid(trialId: number, paymentId: number): Promise<Trial> {
    const trial = await this.findById(trialId);
    if (!trial) {
      throw new NotFoundException('Trial nao encontrado');
    }

    await this.db.query(
      `UPDATE trials SET 
       status = 'converted', 
       converted_to_paid = TRUE, 
       converted_at = NOW(), 
       payment_id = ?,
       updated_at = NOW()
       WHERE id = ?`,
      [paymentId, trialId],
    );

    const updated = await this.findById(trialId);
    if (!updated) {
      throw new Error('Falha ao converter trial');
    }

    await this.auditService.log({
      tenantId: trial.tenantId,
      userId: trial.userId,
      action: 'TRIAL_CONVERTED',
      entityType: 'trial',
      entityId: trialId,
      details: { paymentId },
    });

    return updated;
  }

  async markReminderSent(
    trialId: number,
    reminderType: '3days' | '1day' | 'expired',
  ): Promise<void> {
    const column =
      reminderType === '3days'
        ? 'reminder_sent_3days'
        : reminderType === '1day'
          ? 'reminder_sent_1day'
          : 'reminder_sent_expired';

    await this.db.query(
      `UPDATE trials SET ${column} = TRUE, updated_at = NOW() WHERE id = ?`,
      [trialId],
    );
  }

  async findTrialsNeedingReminders(): Promise<Trial[]> {
    const now = new Date();
    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);
    const in1Day = new Date(now);
    in1Day.setDate(in1Day.getDate() + 1);

    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, user_id, plan_id, status, started_at, expires_at,
              converted_to_paid, converted_at, payment_id, reminder_sent_3days,
              reminder_sent_1day, reminder_sent_expired, created_at, updated_at
       FROM trials 
       WHERE status = 'active' 
       AND (
         (DATE(expires_at) = DATE(?) AND reminder_sent_3days = FALSE) OR
         (DATE(expires_at) = DATE(?) AND reminder_sent_1day = FALSE) OR
         (expires_at <= NOW() AND reminder_sent_expired = FALSE)
       )`,
      [in3Days, in1Day],
    );

    return rows.map((row) => this.mapRowToTrial(row));
  }

  async expireTrials(): Promise<number> {
    const result = await this.db.query<ResultSetHeader>(
      `UPDATE trials 
       SET status = 'expired', updated_at = NOW() 
       WHERE status = 'active' AND expires_at <= NOW()`,
    );

    return result.affectedRows;
  }

  private mapRowToTrial(row: RowDataPacket): Trial {
    return {
      id: row.id as number,
      tenantId: row.tenant_id as number,
      userId: row.user_id as number,
      planId: row.plan_id as number,
      status: row.status as Trial['status'],
      startedAt: new Date(row.started_at as string),
      expiresAt: new Date(row.expires_at as string),
      convertedToPaid: Boolean(row.converted_to_paid),
      convertedAt: row.converted_at
        ? new Date(row.converted_at as string)
        : null,
      paymentId: row.payment_id as number | null,
      reminderSent3days: Boolean(row.reminder_sent_3days),
      reminderSent1day: Boolean(row.reminder_sent_1day),
      reminderSentExpired: Boolean(row.reminder_sent_expired),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
