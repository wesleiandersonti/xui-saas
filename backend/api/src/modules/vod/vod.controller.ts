import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { VodService } from './vod.service';
import { TmdbService } from './tmdb.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateContentDto,
  UpdateContentDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  SearchTmdbDto,
  ImportFromTmdbDto,
  AssignCategoryDto,
} from './dto/vod.dto';
import { Roles } from '../auth/roles.decorator';
import type { RequestWithUser } from '../../shared/types/request.types';
import type { ContentType } from './vod.types';

@Controller('vod')
export class VodController {
  constructor(
    private readonly vodService: VodService,
    private readonly tmdbService: TmdbService,
    private readonly auditService: AuditService,
  ) {}

  @Post('categories')
  @Roles('admin')
  async createCategory(
    @Body() dto: CreateCategoryDto,
    @Req() req: RequestWithUser,
  ) {
    const category = await this.vodService.createCategory(
      req.user.tenantId,
      dto,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'VOD_CATEGORY_CREATED',
      entityType: 'vod_category',
      entityId: category.id,
      details: { name: category.name },
    });

    return {
      success: true,
      data: category,
      message: 'Categoria criada com sucesso',
    };
  }

  @Get('categories')
  @Roles('admin')
  async findAllCategories(@Req() req: RequestWithUser) {
    const categories = await this.vodService.findAllCategories(
      req.user.tenantId,
    );
    return {
      success: true,
      data: categories,
      count: categories.length,
    };
  }

  @Get('categories/:id')
  @Roles('admin')
  async findCategoryById(@Param('id') id: string, @Req() req: RequestWithUser) {
    const category = await this.vodService.findCategoryById(
      parseInt(id, 10),
      req.user.tenantId,
    );
    if (!category) {
      return {
        success: false,
        message: 'Categoria nao encontrada',
      };
    }
    return {
      success: true,
      data: category,
    };
  }

  @Put('categories/:id')
  @Roles('admin')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @Req() req: RequestWithUser,
  ) {
    const category = await this.vodService.updateCategory(
      parseInt(id, 10),
      req.user.tenantId,
      dto,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'VOD_CATEGORY_UPDATED',
      entityType: 'vod_category',
      entityId: category.id,
      details: { changes: Object.keys(dto) },
    });

    return {
      success: true,
      data: category,
      message: 'Categoria atualizada com sucesso',
    };
  }

  @Delete('categories/:id')
  @Roles('admin')
  async deleteCategory(@Param('id') id: string, @Req() req: RequestWithUser) {
    await this.vodService.deleteCategory(parseInt(id, 10), req.user.tenantId);

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'VOD_CATEGORY_DELETED',
      entityType: 'vod_category',
      entityId: parseInt(id, 10),
    });

    return {
      success: true,
      message: 'Categoria removida com sucesso',
    };
  }

  @Post('content')
  @Roles('admin')
  async createContent(
    @Body() dto: CreateContentDto,
    @Req() req: RequestWithUser,
  ) {
    const content = await this.vodService.createContent(req.user.tenantId, dto);

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'VOD_CONTENT_CREATED',
      entityType: 'vod_content',
      entityId: content.id,
      details: { title: content.title, contentType: content.contentType },
    });

    return {
      success: true,
      data: content,
      message: 'Conteudo criado com sucesso',
    };
  }

  @Post('content/import-tmdb')
  @Roles('admin')
  async importFromTmdb(
    @Body() dto: ImportFromTmdbDto,
    @Req() req: RequestWithUser,
  ) {
    const content = await this.vodService.importFromTmdb(
      req.user.tenantId,
      dto.tmdbId,
      dto.contentType,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'VOD_CONTENT_IMPORTED',
      entityType: 'vod_content',
      entityId: content.id,
      details: {
        title: content.title,
        tmdbId: dto.tmdbId,
        contentType: dto.contentType,
      },
    });

    return {
      success: true,
      data: content,
      message: 'Conteudo importado com sucesso',
    };
  }

  @Get('content')
  @Roles('admin')
  async findAllContent(
    @Req() req: RequestWithUser,
    @Query('contentType') contentType?: ContentType,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.vodService.findAllContent(req.user.tenantId, {
      contentType,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    return {
      success: true,
      data: result.content,
      meta: {
        total: result.total,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      },
    };
  }

  @Get('content/:id')
  @Roles('admin')
  async findContentById(@Param('id') id: string, @Req() req: RequestWithUser) {
    const content = await this.vodService.findContentById(
      parseInt(id, 10),
      req.user.tenantId,
    );
    if (!content) {
      return {
        success: false,
        message: 'Conteudo nao encontrado',
      };
    }
    return {
      success: true,
      data: content,
    };
  }

  @Put('content/:id')
  @Roles('admin')
  async updateContent(
    @Param('id') id: string,
    @Body() dto: UpdateContentDto,
    @Req() req: RequestWithUser,
  ) {
    const content = await this.vodService.updateContent(
      parseInt(id, 10),
      req.user.tenantId,
      dto,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'VOD_CONTENT_UPDATED',
      entityType: 'vod_content',
      entityId: content.id,
      details: { changes: Object.keys(dto) },
    });

    return {
      success: true,
      data: content,
      message: 'Conteudo atualizado com sucesso',
    };
  }

  @Delete('content/:id')
  @Roles('admin')
  async deleteContent(@Param('id') id: string, @Req() req: RequestWithUser) {
    await this.vodService.deleteContent(parseInt(id, 10), req.user.tenantId);

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'VOD_CONTENT_DELETED',
      entityType: 'vod_content',
      entityId: parseInt(id, 10),
    });

    return {
      success: true,
      message: 'Conteudo removido com sucesso',
    };
  }

  @Post('content/:id/categories')
  @Roles('admin')
  async assignCategory(
    @Param('id') id: string,
    @Body() dto: AssignCategoryDto,
    @Req() req: RequestWithUser,
  ) {
    await this.vodService.assignCategory(parseInt(id, 10), dto.categoryId);

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'VOD_CATEGORY_ASSIGNED',
      entityType: 'vod_content',
      entityId: parseInt(id, 10),
      details: { categoryId: dto.categoryId },
    });

    return {
      success: true,
      message: 'Categoria atribuida com sucesso',
    };
  }

  @Post('tmdb/search')
  @Roles('admin')
  async searchTmdb(@Body() dto: SearchTmdbDto) {
    const [movies, tvShows] = await Promise.all([
      this.tmdbService.searchMovies(dto.query, dto.page || 1),
      this.tmdbService.searchTvShows(dto.query, dto.page || 1),
    ]);

    const results = [
      ...movies.results.map((r) => ({ ...r, media_type: 'movie' as const })),
      ...tvShows.results.map((r) => ({ ...r, media_type: 'tv' as const })),
    ].sort((a, b) => b.popularity - a.popularity);

    return {
      success: true,
      data: results,
      meta: {
        moviesTotal: movies.total_results,
        tvTotal: tvShows.total_results,
        page: dto.page || 1,
      },
    };
  }
}
