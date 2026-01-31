import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { TmdbService } from './tmdb.service';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type {
  VodContent,
  VodCategory,
  ContentFilters,
  ContentType,
} from './vod.types';
import type {
  CreateContentDto,
  UpdateContentDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/vod.dto';

@Injectable()
export class VodService {
  constructor(
    private readonly db: DatabaseService,
    private readonly tmdbService: TmdbService,
  ) {}

  async createCategory(
    tenantId: number,
    data: CreateCategoryDto,
  ): Promise<VodCategory> {
    const result = await this.db.query<ResultSetHeader>(
      `INSERT INTO vod_categories (tenant_id, name, description, is_active) 
       VALUES (?, ?, ?, ?)`,
      [tenantId, data.name, data.description || null, data.isActive ?? true],
    );

    const category = await this.findCategoryById(result.insertId, tenantId);
    if (!category) {
      throw new Error('Falha ao criar categoria');
    }

    return category;
  }

  async findAllCategories(tenantId: number): Promise<VodCategory[]> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, name, description, is_active, created_at, updated_at
       FROM vod_categories WHERE tenant_id = ? ORDER BY name ASC`,
      [tenantId],
    );

    return rows.map((row) => this.mapRowToCategory(row));
  }

  async findCategoryById(
    id: number,
    tenantId: number,
  ): Promise<VodCategory | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, name, description, is_active, created_at, updated_at
       FROM vod_categories WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [id, tenantId],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToCategory(rows[0]);
  }

  async updateCategory(
    id: number,
    tenantId: number,
    data: UpdateCategoryDto,
  ): Promise<VodCategory> {
    const category = await this.findCategoryById(id, tenantId);
    if (!category) {
      throw new NotFoundException('Categoria nao encontrada');
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(data.isActive);
    }

    if (updates.length > 0) {
      values.push(id);
      values.push(tenantId);

      await this.db.query(
        `UPDATE vod_categories SET ${updates.join(', ')}, updated_at = NOW() 
         WHERE id = ? AND tenant_id = ?`,
        values,
      );
    }

    const updated = await this.findCategoryById(id, tenantId);
    if (!updated) {
      throw new NotFoundException('Categoria nao encontrada');
    }

    return updated;
  }

  async deleteCategory(id: number, tenantId: number): Promise<void> {
    const result = await this.db.query<ResultSetHeader>(
      'DELETE FROM vod_categories WHERE id = ? AND tenant_id = ?',
      [id, tenantId],
    );

    if (result.affectedRows === 0) {
      throw new NotFoundException('Categoria nao encontrada');
    }
  }

  async createContent(
    tenantId: number,
    data: CreateContentDto,
  ): Promise<VodContent> {
    const result = await this.db.query<ResultSetHeader>(
      `INSERT INTO vod_content 
       (tenant_id, tmdb_id, title, original_title, description, content_type, poster_url, 
        backdrop_url, release_date, duration_minutes, rating, genre, cast, director, 
        stream_url, is_active, adult_content) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        data.tmdbId || null,
        data.title,
        data.originalTitle || null,
        data.description || null,
        data.contentType,
        data.posterUrl || null,
        data.backdropUrl || null,
        data.releaseDate || null,
        data.durationMinutes || null,
        data.rating || null,
        data.genre || null,
        data.cast || null,
        data.director || null,
        data.streamUrl || null,
        data.isActive ?? true,
        data.adultContent ?? false,
      ],
    );

    if (data.categoryIds && data.categoryIds.length > 0) {
      await this.assignCategories(result.insertId, data.categoryIds);
    }

    const content = await this.findContentById(result.insertId, tenantId);
    if (!content) {
      throw new Error('Falha ao criar conteudo');
    }

    return content;
  }

  async importFromTmdb(
    tenantId: number,
    tmdbId: number,
    contentType: ContentType,
  ): Promise<VodContent> {
    let tmdbData;

    if (contentType === 'movie') {
      tmdbData = await this.tmdbService.getMovieDetails(tmdbId);
    } else if (contentType === 'tv_show' || contentType === 'series') {
      tmdbData = await this.tmdbService.getTvShowDetails(tmdbId);
    } else {
      throw new BadRequestException('Tipo de conteudo invalido');
    }

    if (!tmdbData) {
      throw new NotFoundException('Conteudo nao encontrado no TMDB');
    }

    const isMovie = contentType === 'movie';
    const title = isMovie ? tmdbData.title : tmdbData.name;
    const originalTitle = isMovie
      ? tmdbData.original_title
      : tmdbData.original_name;
    const releaseDate = isMovie
      ? tmdbData.release_date
      : tmdbData.first_air_date;
    const duration = isMovie
      ? tmdbData.runtime
      : tmdbData.episode_run_time?.[0] || null;

    const genreNames =
      tmdbData.genres?.map((g: any) => g.name).join(', ') || null;

    const result = await this.db.query<ResultSetHeader>(
      `INSERT INTO vod_content 
       (tenant_id, tmdb_id, title, original_title, description, content_type, poster_url, 
        backdrop_url, release_date, duration_minutes, rating, genre, adult_content, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        tmdbId,
        title,
        originalTitle,
        tmdbData.overview || null,
        contentType,
        this.tmdbService.getImageUrl(tmdbData.poster_path, 'w500'),
        this.tmdbService.getImageUrl(tmdbData.backdrop_path, 'original'),
        releaseDate || null,
        duration,
        tmdbData.vote_average ? tmdbData.vote_average.toString() : null,
        genreNames,
        tmdbData.adult || false,
        true,
      ],
    );

    const content = await this.findContentById(result.insertId, tenantId);
    if (!content) {
      throw new Error('Falha ao importar conteudo');
    }

    return content;
  }

  async findAllContent(
    tenantId: number,
    filters: ContentFilters = {},
  ): Promise<{ content: VodContent[]; total: number }> {
    const {
      contentType,
      categoryId,
      search,
      isActive,
      page = 1,
      limit = 20,
    } = filters;

    let whereClause = 'WHERE c.tenant_id = ?';
    const params: any[] = [tenantId];

    if (contentType) {
      whereClause += ' AND c.content_type = ?';
      params.push(contentType);
    }

    if (isActive !== undefined) {
      whereClause += ' AND c.is_active = ?';
      params.push(isActive);
    }

    if (search) {
      whereClause += ' AND (c.title LIKE ? OR c.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (categoryId) {
      whereClause +=
        ' AND EXISTS (SELECT 1 FROM vod_content_categories cc WHERE cc.content_id = c.id AND cc.category_id = ?)';
      params.push(categoryId);
    }

    const countRows = await this.db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM vod_content c ${whereClause}`,
      params,
    );
    const total = (countRows[0]?.total as number) ?? 0;

    const offset = (page - 1) * limit;
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT c.id, c.tenant_id, c.tmdb_id, c.title, c.original_title, c.description, 
              c.content_type, c.poster_url, c.backdrop_url, c.release_date, c.duration_minutes, 
              c.rating, c.genre, c.cast, c.director, c.stream_url, c.is_active, c.adult_content, 
              c.created_at, c.updated_at
       FROM vod_content c 
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const content = await Promise.all(
      rows.map(async (row) => {
        const item = this.mapRowToContent(row);
        item.categories = await this.findContentCategories(item.id);
        return item;
      }),
    );

    return { content, total };
  }

  async findContentById(
    id: number,
    tenantId: number,
  ): Promise<VodContent | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, tmdb_id, title, original_title, description, content_type, 
              poster_url, backdrop_url, release_date, duration_minutes, rating, genre, 
              cast, director, stream_url, is_active, adult_content, created_at, updated_at
       FROM vod_content WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [id, tenantId],
    );

    if (rows.length === 0) {
      return null;
    }

    const content = this.mapRowToContent(rows[0]);
    content.categories = await this.findContentCategories(content.id);
    return content;
  }

  async updateContent(
    id: number,
    tenantId: number,
    data: UpdateContentDto,
  ): Promise<VodContent> {
    const content = await this.findContentById(id, tenantId);
    if (!content) {
      throw new NotFoundException('Conteudo nao encontrado');
    }

    const updates: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, string> = {
      title: 'title',
      originalTitle: 'original_title',
      description: 'description',
      contentType: 'content_type',
      tmdbId: 'tmdb_id',
      posterUrl: 'poster_url',
      backdropUrl: 'backdrop_url',
      releaseDate: 'release_date',
      durationMinutes: 'duration_minutes',
      rating: 'rating',
      genre: 'genre',
      cast: 'cast',
      director: 'director',
      streamUrl: 'stream_url',
      isActive: 'is_active',
      adultContent: 'adult_content',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (data[key as keyof UpdateContentDto] !== undefined) {
        updates.push(`${dbField} = ?`);
        values.push(data[key as keyof UpdateContentDto]);
      }
    }

    if (updates.length > 0) {
      values.push(id);
      values.push(tenantId);

      await this.db.query(
        `UPDATE vod_content SET ${updates.join(', ')}, updated_at = NOW() 
         WHERE id = ? AND tenant_id = ?`,
        values,
      );
    }

    if (data.categoryIds !== undefined) {
      await this.db.query(
        'DELETE FROM vod_content_categories WHERE content_id = ?',
        [id],
      );
      if (data.categoryIds.length > 0) {
        await this.assignCategories(id, data.categoryIds);
      }
    }

    const updated = await this.findContentById(id, tenantId);
    if (!updated) {
      throw new NotFoundException('Conteudo nao encontrado');
    }

    return updated;
  }

  async deleteContent(id: number, tenantId: number): Promise<void> {
    const result = await this.db.query<ResultSetHeader>(
      'DELETE FROM vod_content WHERE id = ? AND tenant_id = ?',
      [id, tenantId],
    );

    if (result.affectedRows === 0) {
      throw new NotFoundException('Conteudo nao encontrado');
    }
  }

  async assignCategory(contentId: number, categoryId: number): Promise<void> {
    await this.db.query<ResultSetHeader>(
      `INSERT IGNORE INTO vod_content_categories (content_id, category_id) 
       VALUES (?, ?)`,
      [contentId, categoryId],
    );
  }

  private async assignCategories(
    contentId: number,
    categoryIds: number[],
  ): Promise<void> {
    const values = categoryIds.map((catId) => [contentId, catId]);
    await this.db.query<ResultSetHeader>(
      `INSERT IGNORE INTO vod_content_categories (content_id, category_id) 
       VALUES ?`,
      [values],
    );
  }

  private async findContentCategories(
    contentId: number,
  ): Promise<VodCategory[]> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT cat.id, cat.tenant_id, cat.name, cat.description, cat.is_active, cat.created_at, cat.updated_at
       FROM vod_categories cat
       INNER JOIN vod_content_categories cc ON cat.id = cc.category_id
       WHERE cc.content_id = ?`,
      [contentId],
    );

    return rows.map((row) => this.mapRowToCategory(row));
  }

  private mapRowToCategory(row: RowDataPacket): VodCategory {
    return {
      id: row.id as number,
      tenantId: row.tenant_id as number,
      name: row.name as string,
      description: row.description as string | null,
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapRowToContent(row: RowDataPacket): VodContent {
    return {
      id: row.id as number,
      tenantId: row.tenant_id as number,
      tmdbId: row.tmdb_id as number | null,
      title: row.title as string,
      originalTitle: row.original_title as string | null,
      description: row.description as string | null,
      contentType: row.content_type as ContentType,
      posterUrl: row.poster_url as string | null,
      backdropUrl: row.backdrop_url as string | null,
      releaseDate: row.release_date
        ? new Date(row.release_date as string)
        : null,
      durationMinutes: row.duration_minutes as number | null,
      rating: row.rating as string | null,
      genre: row.genre as string | null,
      cast: row.cast as string | null,
      director: row.director as string | null,
      streamUrl: row.stream_url as string | null,
      isActive: Boolean(row.is_active),
      adultContent: Boolean(row.adult_content),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
