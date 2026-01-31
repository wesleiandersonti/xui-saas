import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TrialsService } from './trials.service';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { RowDataPacket } from 'mysql2/promise';

@Injectable()
export class TrialsCronService {
  private readonly logger = new Logger(TrialsCronService.name);

  constructor(
    private readonly trialsService: TrialsService,
    private readonly auditService: AuditService,
    private readonly db: DatabaseService,
  ) {}

  @Cron('0 9 * * *')
  async handleDailyTrialTasks() {
    this.logger.log('Iniciando tarefas diarias de trials - 9am');

    try {
      const expiredCount = await this.expireOldTrials();
      const reminderResults = await this.sendReminders();

      this.logger.log(
        `Tarefas diarias concluidas. Expirados: ${expiredCount}, Lembretes enviados: ${reminderResults.total}`,
      );
    } catch (error) {
      this.logger.error(
        'Erro nas tarefas diarias de trials:',
        (error as Error).message,
      );
      await this.auditService.log({
        tenantId: 0,
        userId: undefined,
        action: 'TRIAL_CRON_ERROR',
        entityType: 'system',
        details: { error: (error as Error).message },
      });
    }
  }

  private async expireOldTrials(): Promise<number> {
    this.logger.log('Verificando trials para expirar...');

    const affectedRows = await this.trialsService.expireTrials();

    if (affectedRows > 0) {
      this.logger.log(`${affectedRows} trial(s) expirado(s)`);

      const expiredTrials = await this.db.query<RowDataPacket[]>(
        `SELECT t.id, t.tenant_id, t.user_id, u.email
         FROM trials t
         JOIN users u ON t.user_id = u.id
         WHERE t.status = 'expired' 
         AND t.expires_at <= NOW() 
         AND t.expires_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)`,
      );

      for (const row of expiredTrials) {
        await this.auditService.log({
          tenantId: row.tenant_id as number,
          userId: row.user_id as number,
          action: 'TRIAL_AUTO_EXPIRED',
          entityType: 'trial',
          entityId: row.id as number,
          details: { email: row.email },
        });
      }
    }

    return affectedRows;
  }

  private async sendReminders(): Promise<{
    total: number;
    byType: Record<string, number>;
  }> {
    this.logger.log('Verificando lembretes de trials...');

    const trialsNeedingReminders =
      await this.trialsService.findTrialsNeedingReminders();
    const byType: Record<string, number> = {
      '3days': 0,
      '1day': 0,
      expired: 0,
    };

    for (const trial of trialsNeedingReminders) {
      const now = new Date();
      const daysUntilExpiry = Math.ceil(
        (trial.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      let reminderType: '3days' | '1day' | 'expired' | null = null;
      let notificationChannel: string | null = null;

      if (daysUntilExpiry <= 0 && !trial.reminderSentExpired) {
        reminderType = 'expired';
        notificationChannel = await this.sendExpiredNotification(trial);
      } else if (daysUntilExpiry === 1 && !trial.reminderSent1day) {
        reminderType = '1day';
        notificationChannel = await this.sendReminderNotification(trial, 1);
      } else if (daysUntilExpiry === 3 && !trial.reminderSent3days) {
        reminderType = '3days';
        notificationChannel = await this.sendReminderNotification(trial, 3);
      }

      if (reminderType) {
        await this.trialsService.markReminderSent(trial.id, reminderType);
        byType[reminderType]++;

        await this.auditService.log({
          tenantId: trial.tenantId,
          userId: trial.userId,
          action: `TRIAL_REMINDER_${reminderType.toUpperCase()}_SENT`,
          entityType: 'trial',
          entityId: trial.id,
          details: {
            reminderType,
            notificationChannel,
            daysUntilExpiry,
            expiresAt: trial.expiresAt,
          },
        });

        this.logger.log(
          `Lembrete ${reminderType} enviado para trial ${trial.id} (usuario ${trial.userId})`,
        );
      }
    }

    const total = Object.values(byType).reduce((sum, count) => sum + count, 0);
    return { total, byType };
  }

  private async sendReminderNotification(
    trial: {
      id: number;
      userId: number;
      tenantId: number;
      planId: number;
      expiresAt: Date;
    },
    days: number,
  ): Promise<string | null> {
    const userRows = await this.db.query<RowDataPacket[]>(
      'SELECT email, whatsapp FROM users WHERE id = ? LIMIT 1',
      [trial.userId],
    );

    if (userRows.length === 0) return null;

    const user = userRows[0];
    const channels: string[] = [];

    if (user.email) {
      this.logger.debug(
        `[SIMULACAO] Email enviado para ${user.email}: Trial expira em ${days} dias`,
      );
      channels.push('email');
    }

    if (user.whatsapp) {
      this.logger.debug(
        `[SIMULACAO] WhatsApp enviado para ${user.whatsapp}: Trial expira em ${days} dias`,
      );
      channels.push('whatsapp');
    }

    return channels.length > 0 ? channels.join(',') : null;
  }

  private async sendExpiredNotification(trial: {
    id: number;
    userId: number;
    tenantId: number;
    planId: number;
    expiresAt: Date;
  }): Promise<string | null> {
    const userRows = await this.db.query<RowDataPacket[]>(
      'SELECT email, whatsapp FROM users WHERE id = ? LIMIT 1',
      [trial.userId],
    );

    if (userRows.length === 0) return null;

    const user = userRows[0];
    const channels: string[] = [];

    if (user.email) {
      this.logger.debug(
        `[SIMULACAO] Email enviado para ${user.email}: Trial expirado`,
      );
      channels.push('email');
    }

    if (user.whatsapp) {
      this.logger.debug(
        `[SIMULACAO] WhatsApp enviado para ${user.whatsapp}: Trial expirado`,
      );
      channels.push('whatsapp');
    }

    return channels.length > 0 ? channels.join(',') : null;
  }
}
