import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Query,
  BadRequestException,
  NotFoundException,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import { TrialsService } from './trials.service';
import { AuditService } from '../audit/audit.service';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import type { RequestWithUser } from '../../shared/types/request.types';
import type {
  StartTrialDto,
  ConvertTrialDto,
  ExpireTrialsDto,
  TrialListQuery,
} from './trials.types';
import { DatabaseService } from '../database/database.service';
import { RowDataPacket } from 'mysql2/promise';

@Controller('trials')
export class TrialsController {
  constructor(
    private readonly trialsService: TrialsService,
    private readonly auditService: AuditService,
    private readonly db: DatabaseService,
  ) {}

  @Post('start')
  @Public()
  async startTrial(@Body() dto: StartTrialDto) {
    try {
      if (!dto.tenantId || !dto.email || !dto.password || !dto.planId) {
        throw new BadRequestException('Dados incompletos para iniciar trial');
      }

      const users = await this.db.query<RowDataPacket[]>(
        'SELECT id, tenant_id FROM users WHERE email = ? AND tenant_id = ? LIMIT 1',
        [dto.email, dto.tenantId],
      );

      let userId: number;

      if (users.length === 0) {
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const result = await this.db.query<
          { insertId: number } & RowDataPacket[]
        >(
          'INSERT INTO users (email, password, tenant_id, role, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
          [dto.email, hashedPassword, dto.tenantId, 'user'],
        );
        userId = result.insertId;

        await this.auditService.log({
          tenantId: dto.tenantId,
          userId,
          action: 'USER_REGISTERED_TRIAL',
          entityType: 'user',
          entityId: userId,
          details: { email: dto.email },
        });
      } else {
        userId = users[0].id as number;
      }

      const existingStatus = await this.trialsService.getTrialStatus(
        dto.tenantId,
        userId,
      );
      if (!existingStatus.canStartTrial) {
        throw new BadRequestException(
          'Usuario ja utilizou o periodo de teste ou possui trial ativo',
        );
      }

      const trial = await this.trialsService.createTrial({
        tenantId: dto.tenantId,
        userId,
        planId: dto.planId,
        durationDays: dto.durationDays,
      });

      return {
        success: true,
        data: trial,
        message: 'Trial iniciado com sucesso',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Erro ao iniciar trial: ' + (error as Error).message,
      );
    }
  }

  @Get('status')
  async checkStatus(@Req() req: RequestWithUser) {
    const status = await this.trialsService.getTrialStatus(
      req.user.tenantId,
      req.user.sub,
    );

    return {
      success: true,
      data: status,
    };
  }

  @Post(':id/convert')
  async convertTrial(
    @Param(
      'id',
      new ParseIntPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    id: number,
    @Body() dto: ConvertTrialDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      if (!dto.paymentId) {
        throw new BadRequestException('paymentId eh obrigatorio');
      }

      const trial = await this.trialsService.findById(id);
      if (!trial) {
        throw new NotFoundException('Trial nao encontrado');
      }

      if (trial.tenantId !== req.user.tenantId) {
        throw new BadRequestException('Acesso negado a este trial');
      }

      if (trial.userId !== req.user.sub && req.user.role !== 'admin') {
        throw new BadRequestException('Acesso negado');
      }

      const converted = await this.trialsService.convertToPaid(
        id,
        dto.paymentId,
      );

      return {
        success: true,
        data: converted,
        message: 'Trial convertido para pago com sucesso',
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Erro ao converter trial: ' + (error as Error).message,
      );
    }
  }

  @Get('admin/list')
  @Roles('admin')
  async listAllTrials(
    @Req() req: RequestWithUser,
    @Query() query: TrialListQuery,
  ) {
    const limit = Math.min(
      Math.max(parseInt(query.limit as unknown as string) || 50, 1),
      100,
    );
    const offset = Math.max(
      parseInt(query.offset as unknown as string) || 0,
      0,
    );

    let whereClause = 'WHERE t.tenant_id = ?';
    const params: (number | string)[] = [req.user.tenantId];

    if (query.status) {
      whereClause += ' AND t.status = ?';
      params.push(query.status);
    }

    const countRows = await this.db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM trials t ${whereClause}`,
      params,
    );
    const total = (countRows[0]?.total as number) ?? 0;

    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT t.*, u.email as user_email, p.name as plan_name
       FROM trials t
       JOIN users u ON t.user_id = u.id
       JOIN plans p ON t.plan_id = p.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'TRIAL_LIST_VIEWED',
      entityType: 'trial',
      details: { status: query.status, limit, offset },
    });

    return {
      success: true,
      data: rows,
      total,
      limit,
      offset,
    };
  }

  @Post('admin/expire')
  @Roles('admin')
  async manuallyExpireTrials(
    @Body() dto: ExpireTrialsDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      let affectedRows = 0;

      if (dto.trialIds && dto.trialIds.length > 0) {
        for (const trialId of dto.trialIds) {
          const trial = await this.trialsService.findById(trialId);
          if (trial && trial.tenantId === req.user.tenantId) {
            await this.db.query(
              `UPDATE trials SET status = 'expired', updated_at = NOW() WHERE id = ?`,
              [trialId],
            );
            affectedRows++;

            await this.auditService.log({
              tenantId: req.user.tenantId,
              userId: req.user.sub,
              action: 'TRIAL_MANUALLY_EXPIRED',
              entityType: 'trial',
              entityId: trialId,
              details: { manual: true },
            });
          }
        }
      } else if (dto.expireAllExpired) {
        affectedRows = await this.trialsService.expireTrials();

        await this.auditService.log({
          tenantId: req.user.tenantId,
          userId: req.user.sub,
          action: 'TRIALS_BULK_EXPIRED',
          entityType: 'trial',
          details: { affectedRows, method: 'bulk' },
        });
      } else {
        throw new BadRequestException('Informe trialIds ou expireAllExpired');
      }

      return {
        success: true,
        message: `${affectedRows} trial(s) expirado(s) com sucesso`,
        affectedRows,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Erro ao expirar trials: ' + (error as Error).message,
      );
    }
  }
}
