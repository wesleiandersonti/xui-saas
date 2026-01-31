import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import axios from 'axios';
import { DatabaseService } from '../database/database.service';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import {
  TelegramConfig,
  TelegramChannel,
  TelegramMessage,
  SendTelegramMessageDto,
} from './telegram.types';

@Injectable()
export class TelegramService {
  constructor(private readonly db: DatabaseService) {}

  async getConfig(tenantId: number): Promise<TelegramConfig | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, bot_token, bot_username, default_chat_id, webhook_url, is_active, welcome_message, created_at, updated_at
       FROM telegram_configs WHERE tenant_id = ? LIMIT 1`,
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
      botToken: string;
      botUsername?: string;
      defaultChatId?: string;
      webhookUrl?: string;
      welcomeMessage?: string;
    },
  ): Promise<TelegramConfig> {
    const existing = await this.getConfig(tenantId);

    if (existing) {
      await this.db.query(
        `UPDATE telegram_configs SET 
         bot_token = ?, bot_username = ?, default_chat_id = ?, webhook_url = ?, welcome_message = ?, is_active = TRUE, updated_at = NOW() 
         WHERE id = ?`,
        [
          data.botToken,
          data.botUsername || null,
          data.defaultChatId || null,
          data.webhookUrl || null,
          data.welcomeMessage || null,
          existing.id,
        ],
      );
    } else {
      await this.db.query(
        `INSERT INTO telegram_configs (tenant_id, bot_token, bot_username, default_chat_id, webhook_url, welcome_message, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [
          tenantId,
          data.botToken,
          data.botUsername || null,
          data.defaultChatId || null,
          data.webhookUrl || null,
          data.welcomeMessage || null,
        ],
      );
    }

    const config = await this.getConfig(tenantId);
    if (!config) {
      throw new Error('Falha ao salvar configuracao');
    }

    return config;
  }

  async createChannel(
    tenantId: number,
    data: {
      channelId: string;
      channelName: string;
      channelType?: string;
      requiresAdult?: boolean;
      description?: string;
    },
  ): Promise<TelegramChannel> {
    const result = await this.db.query<ResultSetHeader>(
      `INSERT INTO telegram_channels (tenant_id, channel_id, channel_name, channel_type, requires_adult, description) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        data.channelId,
        data.channelName,
        data.channelType || null,
        data.requiresAdult || false,
        data.description || null,
      ],
    );

    const channel = await this.findChannelById(result.insertId, tenantId);
    if (!channel) {
      throw new Error('Falha ao criar canal');
    }

    return channel;
  }

  async findAllChannels(tenantId: number): Promise<TelegramChannel[]> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, channel_id, channel_name, channel_type, requires_adult, description, is_active, created_at, updated_at
       FROM telegram_channels WHERE tenant_id = ? ORDER BY created_at DESC`,
      [tenantId],
    );

    return rows.map((row) => this.mapRowToChannel(row));
  }

  async findChannelById(
    id: number,
    tenantId: number,
  ): Promise<TelegramChannel | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, channel_id, channel_name, channel_type, requires_adult, description, is_active, created_at, updated_at
       FROM telegram_channels WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [id, tenantId],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToChannel(rows[0]);
  }

  async updateChannel(
    id: number,
    tenantId: number,
    data: Partial<TelegramChannel>,
  ): Promise<TelegramChannel> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.channelId !== undefined) {
      updates.push('channel_id = ?');
      values.push(data.channelId);
    }
    if (data.channelName !== undefined) {
      updates.push('channel_name = ?');
      values.push(data.channelName);
    }
    if (data.channelType !== undefined) {
      updates.push('channel_type = ?');
      values.push(data.channelType);
    }
    if (data.requiresAdult !== undefined) {
      updates.push('requires_adult = ?');
      values.push(data.requiresAdult);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(data.isActive);
    }

    if (updates.length === 0) {
      const channel = await this.findChannelById(id, tenantId);
      if (!channel) {
        throw new NotFoundException('Canal nao encontrado');
      }
      return channel;
    }

    values.push(id);
    values.push(tenantId);

    await this.db.query(
      `UPDATE telegram_channels SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = ? AND tenant_id = ?`,
      values,
    );

    const updated = await this.findChannelById(id, tenantId);
    if (!updated) {
      throw new NotFoundException('Canal nao encontrado');
    }

    return updated;
  }

  async deleteChannel(id: number, tenantId: number): Promise<void> {
    const result = await this.db.query<ResultSetHeader>(
      'DELETE FROM telegram_channels WHERE id = ? AND tenant_id = ?',
      [id, tenantId],
    );

    if (result.affectedRows === 0) {
      throw new NotFoundException('Canal nao encontrado');
    }
  }

  async sendMessage(
    tenantId: number,
    dto: SendTelegramMessageDto,
  ): Promise<TelegramMessage> {
    const config = await this.getConfig(tenantId);
    if (!config || !config.isActive) {
      throw new BadRequestException('Telegram nao configurado ou inativo');
    }

    if (!config.botToken) {
      throw new BadRequestException('Bot token nao configurado');
    }

    let chatId: string | null = dto.chatId || null;
    let channelId: number | null = null;

    if (dto.channelId) {
      const channel = await this.findChannelById(dto.channelId, tenantId);
      if (!channel) {
        throw new BadRequestException('Canal nao encontrado');
      }
      if (!channel.isActive) {
        throw new BadRequestException('Canal esta inativo');
      }
      chatId = channel.channelId;
      channelId = channel.id;
    }

    if (!chatId) {
      chatId = config.defaultChatId;
    }

    if (!chatId) {
      throw new BadRequestException('Chat ID nao informado');
    }

    const result = await this.db.query<ResultSetHeader>(
      `INSERT INTO telegram_messages (tenant_id, channel_id, chat_id, message_text, media_url, media_type, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [
        tenantId,
        channelId,
        chatId,
        dto.messageText,
        dto.mediaUrl || null,
        dto.mediaType || null,
      ],
    );

    const messageId = result.insertId;

    try {
      const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;

      const payload: any = {
        chat_id: chatId,
        text: dto.messageText,
      };

      if (dto.parseMode) {
        payload.parse_mode = dto.parseMode;
      }

      const response = await axios.post(url, payload);
      const telegramMessageId =
        response.data?.result?.message_id?.toString() || null;

      await this.db.query(
        'UPDATE telegram_messages SET status = ?, telegram_message_id = ?, sent_at = NOW() WHERE id = ?',
        ['sent', telegramMessageId, messageId],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      await this.db.query(
        'UPDATE telegram_messages SET status = ?, error_message = ? WHERE id = ?',
        ['failed', errorMessage, messageId],
      );
    }

    const message = await this.findMessageById(messageId, tenantId);
    if (!message) {
      throw new Error('Falha ao criar mensagem');
    }

    return message;
  }

  async findMessagesByChannel(
    channelId: number,
    tenantId: number,
  ): Promise<TelegramMessage[]> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, channel_id, chat_id, message_text, media_url, media_type, status, error_message, telegram_message_id, sent_at, created_at
       FROM telegram_messages WHERE channel_id = ? AND tenant_id = ? ORDER BY created_at DESC`,
      [channelId, tenantId],
    );

    return rows.map((row) => this.mapRowToMessage(row));
  }

  async findMessageById(
    id: number,
    tenantId: number,
  ): Promise<TelegramMessage | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, channel_id, chat_id, message_text, media_url, media_type, status, error_message, telegram_message_id, sent_at, created_at
       FROM telegram_messages WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [id, tenantId],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToMessage(rows[0]);
  }

  private mapRowToConfig(row: RowDataPacket): TelegramConfig {
    return {
      id: row.id as number,
      tenantId: row.tenant_id as number,
      botToken: row.bot_token as string | null,
      botUsername: row.bot_username as string | null,
      defaultChatId: row.default_chat_id as string | null,
      webhookUrl: row.webhook_url as string | null,
      isActive: Boolean(row.is_active),
      welcomeMessage: row.welcome_message as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapRowToChannel(row: RowDataPacket): TelegramChannel {
    return {
      id: row.id as number,
      tenantId: row.tenant_id as number,
      channelId: row.channel_id as string,
      channelName: row.channel_name as string,
      channelType: row.channel_type as string | null,
      description: row.description as string | null,
      isActive: Boolean(row.is_active),
      requiresAdult: Boolean(row.requires_adult),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapRowToMessage(row: RowDataPacket): TelegramMessage {
    return {
      id: row.id as number,
      tenantId: row.tenant_id as number,
      channelId: row.channel_id as number | null,
      chatId: row.chat_id as string,
      messageText: row.message_text as string,
      mediaUrl: row.media_url as string | null,
      mediaType: row.media_type as string | null,
      status: row.status as TelegramMessage['status'],
      telegramMessageId: row.telegram_message_id as string | null,
      errorMessage: row.error_message as string | null,
      sentAt: row.sent_at ? new Date(row.sent_at as string) : null,
      createdAt: new Date(row.created_at as string),
    };
  }
}
