import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { TelegramService } from '../telegram/telegram.service';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type {
  DailyGame,
  MarketingPost,
  PostType,
  PostStatus,
} from './marketing.types';
import type {
  CreateDailyGameDto,
  UpdateDailyGameDto,
  CreateMarketingPostDto,
  UpdateMarketingPostDto,
} from './dto/marketing.dto';

@Injectable()
export class MarketingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly telegramService: TelegramService,
  ) {}

  async createDailyGame(
    tenantId: number,
    data: CreateDailyGameDto,
  ): Promise<DailyGame> {
    const result = await this.db.query<ResultSetHeader>(
      `INSERT INTO daily_games (tenant_id, game_date, home_team, away_team, competition, game_time, channel_mapping, is_featured) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        data.gameDate,
        data.homeTeam,
        data.awayTeam,
        data.competition || null,
        data.gameTime || null,
        data.channelMapping || null,
        data.isFeatured ?? false,
      ],
    );

    const game = await this.findDailyGameById(result.insertId, tenantId);
    if (!game) {
      throw new Error('Falha ao criar jogo');
    }

    return game;
  }

  async findDailyGames(tenantId: number, date?: string): Promise<DailyGame[]> {
    let whereClause = 'WHERE tenant_id = ?';
    const params: any[] = [tenantId];

    if (date) {
      whereClause += ' AND game_date = ?';
      params.push(date);
    }

    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, game_date, home_team, away_team, competition, game_time, 
              channel_mapping, is_featured, created_at, updated_at
       FROM daily_games ${whereClause} ORDER BY game_time ASC, created_at DESC`,
      params,
    );

    return rows.map((row) => this.mapRowToDailyGame(row));
  }

  async findDailyGameById(
    id: number,
    tenantId: number,
  ): Promise<DailyGame | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, game_date, home_team, away_team, competition, game_time, 
              channel_mapping, is_featured, created_at, updated_at
       FROM daily_games WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [id, tenantId],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToDailyGame(rows[0]);
  }

  async updateDailyGame(
    id: number,
    tenantId: number,
    data: UpdateDailyGameDto,
  ): Promise<DailyGame> {
    const game = await this.findDailyGameById(id, tenantId);
    if (!game) {
      throw new NotFoundException('Jogo nao encontrado');
    }

    const updates: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, string> = {
      gameDate: 'game_date',
      homeTeam: 'home_team',
      awayTeam: 'away_team',
      competition: 'competition',
      gameTime: 'game_time',
      channelMapping: 'channel_mapping',
      isFeatured: 'is_featured',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (data[key as keyof UpdateDailyGameDto] !== undefined) {
        updates.push(`${dbField} = ?`);
        values.push(data[key as keyof UpdateDailyGameDto]);
      }
    }

    if (updates.length > 0) {
      values.push(id);
      values.push(tenantId);

      await this.db.query(
        `UPDATE daily_games SET ${updates.join(', ')}, updated_at = NOW() 
         WHERE id = ? AND tenant_id = ?`,
        values,
      );
    }

    const updated = await this.findDailyGameById(id, tenantId);
    if (!updated) {
      throw new NotFoundException('Jogo nao encontrado');
    }

    return updated;
  }

  async deleteDailyGame(id: number, tenantId: number): Promise<void> {
    const result = await this.db.query<ResultSetHeader>(
      'DELETE FROM daily_games WHERE id = ? AND tenant_id = ?',
      [id, tenantId],
    );

    if (result.affectedRows === 0) {
      throw new NotFoundException('Jogo nao encontrado');
    }
  }

  async createPost(
    tenantId: number,
    data: CreateMarketingPostDto,
  ): Promise<MarketingPost> {
    const result = await this.db.query<ResultSetHeader>(
      `INSERT INTO marketing_posts (tenant_id, post_type, title, content, media_url, telegram_channel_id, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        data.postType,
        data.title,
        data.content || null,
        data.mediaUrl || null,
        data.telegramChannelId || null,
        'draft',
      ],
    );

    const post = await this.findPostById(result.insertId, tenantId);
    if (!post) {
      throw new Error('Falha ao criar post');
    }

    return post;
  }

  async findPosts(
    tenantId: number,
    status?: PostStatus,
    postType?: PostType,
    page = 1,
    limit = 20,
  ): Promise<{ posts: MarketingPost[]; total: number }> {
    let whereClause = 'WHERE tenant_id = ?';
    const params: any[] = [tenantId];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (postType) {
      whereClause += ' AND post_type = ?';
      params.push(postType);
    }

    const countRows = await this.db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM marketing_posts ${whereClause}`,
      params,
    );
    const total = (countRows[0]?.total as number) ?? 0;

    const offset = (page - 1) * limit;
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, post_type, title, content, media_url, scheduled_for, 
              posted_at, status, telegram_channel_id, created_at, updated_at
       FROM marketing_posts ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return {
      posts: rows.map((row) => this.mapRowToMarketingPost(row)),
      total,
    };
  }

  async findPostById(
    id: number,
    tenantId: number,
  ): Promise<MarketingPost | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, post_type, title, content, media_url, scheduled_for, 
              posted_at, status, telegram_channel_id, created_at, updated_at
       FROM marketing_posts WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [id, tenantId],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToMarketingPost(rows[0]);
  }

  async schedulePost(
    tenantId: number,
    postId: number,
    scheduledFor: string,
  ): Promise<MarketingPost> {
    const post = await this.findPostById(postId, tenantId);
    if (!post) {
      throw new NotFoundException('Post nao encontrado');
    }

    if (post.status === 'published') {
      throw new BadRequestException(
        'Nao e possivel agendar um post ja publicado',
      );
    }

    await this.db.query(
      `UPDATE marketing_posts 
       SET scheduled_for = ?, status = 'scheduled', updated_at = NOW() 
       WHERE id = ? AND tenant_id = ?`,
      [scheduledFor, postId, tenantId],
    );

    const updated = await this.findPostById(postId, tenantId);
    if (!updated) {
      throw new NotFoundException('Post nao encontrado');
    }

    return updated;
  }

  async publishPost(
    tenantId: number,
    postId: number,
    channelId?: number,
  ): Promise<MarketingPost> {
    const post = await this.findPostById(postId, tenantId);
    if (!post) {
      throw new NotFoundException('Post nao encontrado');
    }

    if (post.status === 'published') {
      throw new BadRequestException('Post ja foi publicado');
    }

    const targetChannelId = channelId || post.telegramChannelId;
    if (!targetChannelId) {
      throw new BadRequestException('Canal do Telegram nao especificado');
    }

    const channel = await this.telegramService.findChannelById(
      targetChannelId,
      tenantId,
    );
    if (!channel) {
      throw new NotFoundException('Canal do Telegram nao encontrado');
    }

    if (!channel.isActive) {
      throw new BadRequestException('Canal do Telegram esta inativo');
    }

    let messageText = `**${post.title}**\n\n`;
    if (post.content) {
      messageText += post.content;
    }

    try {
      await this.telegramService.sendMessage(tenantId, {
        channelId: targetChannelId,
        messageText,
        mediaUrl: post.mediaUrl || undefined,
        mediaType: post.mediaUrl ? 'photo' : undefined,
        parseMode: 'Markdown',
      });

      await this.db.query(
        `UPDATE marketing_posts 
         SET status = 'published', posted_at = NOW(), updated_at = NOW() 
         WHERE id = ? AND tenant_id = ?`,
        [postId, tenantId],
      );
    } catch (error) {
      await this.db.query(
        `UPDATE marketing_posts 
         SET status = 'failed', updated_at = NOW() 
         WHERE id = ? AND tenant_id = ?`,
        [postId, tenantId],
      );
      throw new BadRequestException(
        'Falha ao publicar no Telegram: ' +
          (error instanceof Error ? error.message : 'Erro desconhecido'),
      );
    }

    const updated = await this.findPostById(postId, tenantId);
    if (!updated) {
      throw new NotFoundException('Post nao encontrado');
    }

    return updated;
  }

  async updatePost(
    tenantId: number,
    postId: number,
    data: UpdateMarketingPostDto,
  ): Promise<MarketingPost> {
    const post = await this.findPostById(postId, tenantId);
    if (!post) {
      throw new NotFoundException('Post nao encontrado');
    }

    if (post.status === 'published') {
      throw new BadRequestException(
        'Nao e possivel editar um post ja publicado',
      );
    }

    const updates: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, string> = {
      postType: 'post_type',
      title: 'title',
      content: 'content',
      mediaUrl: 'media_url',
      telegramChannelId: 'telegram_channel_id',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (data[key as keyof UpdateMarketingPostDto] !== undefined) {
        updates.push(`${dbField} = ?`);
        values.push(data[key as keyof UpdateMarketingPostDto]);
      }
    }

    if (updates.length > 0) {
      values.push(postId);
      values.push(tenantId);

      await this.db.query(
        `UPDATE marketing_posts SET ${updates.join(', ')}, updated_at = NOW() 
         WHERE id = ? AND tenant_id = ?`,
        values,
      );
    }

    const updated = await this.findPostById(postId, tenantId);
    if (!updated) {
      throw new NotFoundException('Post nao encontrado');
    }

    return updated;
  }

  async deletePost(tenantId: number, postId: number): Promise<void> {
    const result = await this.db.query<ResultSetHeader>(
      'DELETE FROM marketing_posts WHERE id = ? AND tenant_id = ?',
      [postId, tenantId],
    );

    if (result.affectedRows === 0) {
      throw new NotFoundException('Post nao encontrado');
    }
  }

  private mapRowToDailyGame(row: RowDataPacket): DailyGame {
    return {
      id: row.id as number,
      tenantId: row.tenant_id as number,
      gameDate: new Date(row.game_date as string),
      homeTeam: row.home_team as string,
      awayTeam: row.away_team as string,
      competition: row.competition as string | null,
      gameTime: row.game_time as string | null,
      channelMapping: row.channel_mapping as string | null,
      isFeatured: Boolean(row.is_featured),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapRowToMarketingPost(row: RowDataPacket): MarketingPost {
    return {
      id: row.id as number,
      tenantId: row.tenant_id as number,
      postType: row.post_type as PostType,
      title: row.title as string,
      content: row.content as string | null,
      mediaUrl: row.media_url as string | null,
      scheduledFor: row.scheduled_for
        ? new Date(row.scheduled_for as string)
        : null,
      postedAt: row.posted_at ? new Date(row.posted_at as string) : null,
      status: row.status as PostStatus,
      telegramChannelId: row.telegram_channel_id as number | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
