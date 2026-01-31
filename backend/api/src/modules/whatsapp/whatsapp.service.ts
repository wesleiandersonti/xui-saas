import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import axios from 'axios';
import { DatabaseService } from '../database/database.service';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import {
  WhatsappConfig,
  WhatsappTemplate,
  WhatsappLog,
  SendMessageDto,
  TemplateVariables,
} from './whatsapp.types';

@Injectable()
export class WhatsappService {
  constructor(private readonly db: DatabaseService) {}

  async getConfig(tenantId: number): Promise<WhatsappConfig | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, is_active, evolution_api_url, evolution_api_key, 
              instance_name, default_template, created_at, updated_at
       FROM whatsapp_configs WHERE tenant_id = ? LIMIT 1`,
      [tenantId],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToConfig(rows[0]);
  }

  async saveConfig(
    tenantId: number,
    data: {
      evolutionApiUrl: string;
      evolutionApiKey: string;
      instanceName: string;
      defaultTemplate?: string;
    },
  ): Promise<WhatsappConfig> {
    const existing = await this.getConfig(tenantId);

    if (existing) {
      await this.db.query(
        `UPDATE whatsapp_configs SET 
         evolution_api_url = ?, evolution_api_key = ?, instance_name = ?, 
         default_template = ?, is_active = TRUE, updated_at = NOW() 
         WHERE id = ?`,
        [
          data.evolutionApiUrl,
          data.evolutionApiKey,
          data.instanceName,
          data.defaultTemplate || null,
          existing.id,
        ],
      );
    } else {
      await this.db.query(
        `INSERT INTO whatsapp_configs (tenant_id, is_active, evolution_api_url, evolution_api_key, instance_name, default_template) 
         VALUES (?, TRUE, ?, ?, ?, ?)`,
        [
          tenantId,
          data.evolutionApiUrl,
          data.evolutionApiKey,
          data.instanceName,
          data.defaultTemplate || null,
        ],
      );
    }

    const config = await this.getConfig(tenantId);
    if (!config) {
      throw new Error('Falha ao salvar configuracao');
    }

    return config;
  }

  async createTemplate(
    tenantId: number,
    data: { name: string; eventType: string; template: string },
  ): Promise<WhatsappTemplate> {
    const result = await this.db.query<ResultSetHeader>(
      `INSERT INTO whatsapp_templates (tenant_id, name, event_type, template) 
       VALUES (?, ?, ?, ?)`,
      [tenantId, data.name, data.eventType, data.template],
    );

    const template = await this.findTemplateById(result.insertId, tenantId);
    if (!template) {
      throw new Error('Falha ao criar template');
    }

    return template;
  }

  async findTemplateById(
    id: number,
    tenantId: number,
  ): Promise<WhatsappTemplate | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, name, event_type, template, is_active, created_at, updated_at
       FROM whatsapp_templates WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [id, tenantId],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToTemplate(rows[0]);
  }

  async findTemplatesByEvent(
    tenantId: number,
    eventType: string,
  ): Promise<WhatsappTemplate[]> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, name, event_type, template, is_active, created_at, updated_at
       FROM whatsapp_templates 
       WHERE tenant_id = ? AND event_type = ? AND is_active = TRUE`,
      [tenantId, eventType],
    );

    return rows.map((row) => this.mapRowToTemplate(row));
  }

  async findAllTemplates(tenantId: number): Promise<WhatsappTemplate[]> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, name, event_type, template, is_active, created_at, updated_at
       FROM whatsapp_templates WHERE tenant_id = ? ORDER BY created_at DESC`,
      [tenantId],
    );

    return rows.map((row) => this.mapRowToTemplate(row));
  }

  async updateTemplate(
    id: number,
    tenantId: number,
    data: Partial<WhatsappTemplate>,
  ): Promise<WhatsappTemplate> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.eventType !== undefined) {
      updates.push('event_type = ?');
      values.push(data.eventType);
    }
    if (data.template !== undefined) {
      updates.push('template = ?');
      values.push(data.template);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(data.isActive);
    }

    if (updates.length === 0) {
      const template = await this.findTemplateById(id, tenantId);
      if (!template) {
        throw new NotFoundException('Template nao encontrado');
      }
      return template;
    }

    values.push(id);
    values.push(tenantId);

    await this.db.query(
      `UPDATE whatsapp_templates SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = ? AND tenant_id = ?`,
      values,
    );

    const updated = await this.findTemplateById(id, tenantId);
    if (!updated) {
      throw new NotFoundException('Template nao encontrado');
    }

    return updated;
  }

  async deleteTemplate(id: number, tenantId: number): Promise<void> {
    const result = await this.db.query<ResultSetHeader>(
      'DELETE FROM whatsapp_templates WHERE id = ? AND tenant_id = ?',
      [id, tenantId],
    );

    if (result.affectedRows === 0) {
      throw new NotFoundException('Template nao encontrado');
    }
  }

  async sendMessage(
    tenantId: number,
    dto: SendMessageDto,
  ): Promise<WhatsappLog> {
    const config = await this.getConfig(tenantId);
    if (!config || !config.isActive) {
      throw new BadRequestException('WhatsApp nao configurado ou inativo');
    }

    if (
      !config.evolutionApiUrl ||
      !config.evolutionApiKey ||
      !config.instanceName
    ) {
      throw new BadRequestException('Configuracao do WhatsApp incompleta');
    }

    const result = await this.db.query<ResultSetHeader>(
      `INSERT INTO whatsapp_logs (tenant_id, template_id, phone_number, message, status) 
       VALUES (?, ?, ?, ?, 'pending')`,
      [tenantId, dto.templateId || null, dto.phoneNumber, dto.message],
    );

    const logId = result.insertId;

    try {
      const cleanPhone = dto.phoneNumber.replace(/\D/g, '');
      const url = `${config.evolutionApiUrl}/message/sendText/${config.instanceName}`;

      await axios.post(
        url,
        {
          number: cleanPhone,
          text: dto.message,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            apikey: config.evolutionApiKey,
          },
        },
      );

      await this.db.query(
        'UPDATE whatsapp_logs SET status = ?, sent_at = NOW() WHERE id = ?',
        ['sent', logId],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      await this.db.query(
        'UPDATE whatsapp_logs SET status = ?, error_message = ? WHERE id = ?',
        ['failed', errorMessage, logId],
      );
    }

    const log = await this.findLogById(logId, tenantId);
    if (!log) {
      throw new Error('Falha ao criar log');
    }

    return log;
  }

  async sendTemplatedMessage(
    tenantId: number,
    phoneNumber: string,
    eventType: string,
    variables: TemplateVariables,
  ): Promise<WhatsappLog | null> {
    const templates = await this.findTemplatesByEvent(tenantId, eventType);
    if (templates.length === 0) {
      return null;
    }

    const template = templates[0];
    let message = template.template;

    Object.keys(variables).forEach((key) => {
      message = message.replace(new RegExp(`{${key}}`, 'g'), variables[key]);
    });

    return this.sendMessage(tenantId, {
      phoneNumber,
      message,
      templateId: template.id,
    });
  }

  async findLogById(id: number, tenantId: number): Promise<WhatsappLog | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, template_id, phone_number, message, status, error_message, sent_at, created_at
       FROM whatsapp_logs WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [id, tenantId],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToLog(rows[0]);
  }

  async findLogsByTenant(
    tenantId: number,
    limit: number = 50,
  ): Promise<WhatsappLog[]> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, template_id, phone_number, message, status, error_message, sent_at, created_at
       FROM whatsapp_logs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?`,
      [tenantId, limit],
    );

    return rows.map((row) => this.mapRowToLog(row));
  }

  private mapRowToConfig(row: RowDataPacket): WhatsappConfig {
    return {
      id: row.id as number,
      tenantId: row.tenant_id as number,
      isActive: Boolean(row.is_active),
      evolutionApiUrl: row.evolution_api_url as string | null,
      evolutionApiKey: row.evolution_api_key as string | null,
      instanceName: row.instance_name as string | null,
      defaultTemplate: row.default_template as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapRowToTemplate(row: RowDataPacket): WhatsappTemplate {
    return {
      id: row.id as number,
      tenantId: row.tenant_id as number,
      name: row.name as string,
      eventType: row.event_type as string,
      template: row.template as string,
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapRowToLog(row: RowDataPacket): WhatsappLog {
    return {
      id: row.id as number,
      tenantId: row.tenant_id as number,
      templateId: row.template_id as number | null,
      phoneNumber: row.phone_number as string,
      message: row.message as string,
      status: row.status as WhatsappLog['status'],
      errorMessage: row.error_message as string | null,
      sentAt: row.sent_at ? new Date(row.sent_at as string) : null,
      createdAt: new Date(row.created_at as string),
    };
  }
}
