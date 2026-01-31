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
import { MarketingService } from './marketing.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateDailyGameDto,
  UpdateDailyGameDto,
  CreateMarketingPostDto,
  UpdateMarketingPostDto,
  SchedulePostDto,
} from './dto/marketing.dto';
import { Roles } from '../auth/roles.decorator';
import type { RequestWithUser } from '../../shared/types/request.types';
import type { PostType, PostStatus } from './marketing.types';

@Controller('marketing')
export class MarketingController {
  constructor(
    private readonly marketingService: MarketingService,
    private readonly auditService: AuditService,
  ) {}

  @Post('games')
  @Roles('admin')
  async createGame(
    @Body() dto: CreateDailyGameDto,
    @Req() req: RequestWithUser,
  ) {
    const game = await this.marketingService.createDailyGame(
      req.user.tenantId,
      dto,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'DAILY_GAME_CREATED',
      entityType: 'daily_game',
      entityId: game.id,
      details: {
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        gameDate: game.gameDate.toISOString(),
      },
    });

    return {
      success: true,
      data: game,
      message: 'Jogo criado com sucesso',
    };
  }

  @Get('games')
  @Roles('admin')
  async findGames(@Req() req: RequestWithUser, @Query('date') date?: string) {
    const games = await this.marketingService.findDailyGames(
      req.user.tenantId,
      date,
    );
    return {
      success: true,
      data: games,
      count: games.length,
    };
  }

  @Get('games/:id')
  @Roles('admin')
  async findGameById(@Param('id') id: string, @Req() req: RequestWithUser) {
    const game = await this.marketingService.findDailyGameById(
      parseInt(id, 10),
      req.user.tenantId,
    );
    if (!game) {
      return {
        success: false,
        message: 'Jogo nao encontrado',
      };
    }
    return {
      success: true,
      data: game,
    };
  }

  @Put('games/:id')
  @Roles('admin')
  async updateGame(
    @Param('id') id: string,
    @Body() dto: UpdateDailyGameDto,
    @Req() req: RequestWithUser,
  ) {
    const game = await this.marketingService.updateDailyGame(
      parseInt(id, 10),
      req.user.tenantId,
      dto,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'DAILY_GAME_UPDATED',
      entityType: 'daily_game',
      entityId: game.id,
      details: { changes: Object.keys(dto) },
    });

    return {
      success: true,
      data: game,
      message: 'Jogo atualizado com sucesso',
    };
  }

  @Delete('games/:id')
  @Roles('admin')
  async deleteGame(@Param('id') id: string, @Req() req: RequestWithUser) {
    await this.marketingService.deleteDailyGame(
      parseInt(id, 10),
      req.user.tenantId,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'DAILY_GAME_DELETED',
      entityType: 'daily_game',
      entityId: parseInt(id, 10),
    });

    return {
      success: true,
      message: 'Jogo removido com sucesso',
    };
  }

  @Post('posts')
  @Roles('admin')
  async createPost(
    @Body() dto: CreateMarketingPostDto,
    @Req() req: RequestWithUser,
  ) {
    const post = await this.marketingService.createPost(req.user.tenantId, dto);

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'MARKETING_POST_CREATED',
      entityType: 'marketing_post',
      entityId: post.id,
      details: { title: post.title, postType: post.postType },
    });

    return {
      success: true,
      data: post,
      message: 'Post criado com sucesso',
    };
  }

  @Get('posts')
  @Roles('admin')
  async findPosts(
    @Req() req: RequestWithUser,
    @Query('status') status?: PostStatus,
    @Query('postType') postType?: PostType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.marketingService.findPosts(
      req.user.tenantId,
      status,
      postType,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );

    return {
      success: true,
      data: result.posts,
      meta: {
        total: result.total,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      },
    };
  }

  @Get('posts/:id')
  @Roles('admin')
  async findPostById(@Param('id') id: string, @Req() req: RequestWithUser) {
    const post = await this.marketingService.findPostById(
      parseInt(id, 10),
      req.user.tenantId,
    );
    if (!post) {
      return {
        success: false,
        message: 'Post nao encontrado',
      };
    }
    return {
      success: true,
      data: post,
    };
  }

  @Put('posts/:id')
  @Roles('admin')
  async updatePost(
    @Param('id') id: string,
    @Body() dto: UpdateMarketingPostDto,
    @Req() req: RequestWithUser,
  ) {
    const post = await this.marketingService.updatePost(
      req.user.tenantId,
      parseInt(id, 10),
      dto,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'MARKETING_POST_UPDATED',
      entityType: 'marketing_post',
      entityId: post.id,
      details: { changes: Object.keys(dto) },
    });

    return {
      success: true,
      data: post,
      message: 'Post atualizado com sucesso',
    };
  }

  @Delete('posts/:id')
  @Roles('admin')
  async deletePost(@Param('id') id: string, @Req() req: RequestWithUser) {
    await this.marketingService.deletePost(req.user.tenantId, parseInt(id, 10));

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'MARKETING_POST_DELETED',
      entityType: 'marketing_post',
      entityId: parseInt(id, 10),
    });

    return {
      success: true,
      message: 'Post removido com sucesso',
    };
  }

  @Put('posts/:id/schedule')
  @Roles('admin')
  async schedulePost(
    @Param('id') id: string,
    @Body() dto: SchedulePostDto,
    @Req() req: RequestWithUser,
  ) {
    const post = await this.marketingService.schedulePost(
      req.user.tenantId,
      parseInt(id, 10),
      dto.scheduledFor,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'MARKETING_POST_SCHEDULED',
      entityType: 'marketing_post',
      entityId: post.id,
      details: { scheduledFor: dto.scheduledFor },
    });

    return {
      success: true,
      data: post,
      message: 'Post agendado com sucesso',
    };
  }

  @Post('posts/:id/publish')
  @Roles('admin')
  async publishPost(
    @Param('id') id: string,
    @Query('channelId') channelId: string,
    @Req() req: RequestWithUser,
  ) {
    const post = await this.marketingService.publishPost(
      req.user.tenantId,
      parseInt(id, 10),
      channelId ? parseInt(channelId, 10) : undefined,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'MARKETING_POST_PUBLISHED',
      entityType: 'marketing_post',
      entityId: post.id,
      details: { channelId: channelId ? parseInt(channelId, 10) : null },
    });

    return {
      success: true,
      data: post,
      message: 'Post publicado com sucesso',
    };
  }
}
