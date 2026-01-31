import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { AuditService } from '../audit/audit.service';
import {
  SaveTelegramConfigDto,
  CreateChannelDto,
  UpdateChannelDto,
  SendTelegramMessageDto,
} from './dto/telegram.dto';
import { Roles } from '../auth/roles.decorator';
import type { RequestWithUser } from '../../shared/types/request.types';

@Controller('telegram')
export class TelegramController {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly auditService: AuditService,
  ) {}

  @Post('config')
  @Roles('admin')
  async saveConfig(
    @Body() dto: SaveTelegramConfigDto,
    @Req() req: RequestWithUser,
  ) {
    const config = await this.telegramService.saveConfig(
      req.user.tenantId,
      dto,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'TELEGRAM_CONFIG_UPDATED',
      entityType: 'telegram_config',
      entityId: config.id,
    });

    return {
      success: true,
      data: config,
      message: 'Configuracao salva com sucesso',
    };
  }

  @Get('config')
  @Roles('admin')
  async getConfig(@Req() req: RequestWithUser) {
    const config = await this.telegramService.getConfig(req.user.tenantId);
    if (!config) {
      return {
        success: false,
        message: 'Configuracao nao encontrada',
      };
    }
    return {
      success: true,
      data: config,
    };
  }

  @Post('channels')
  @Roles('admin')
  async createChannel(
    @Body() dto: CreateChannelDto,
    @Req() req: RequestWithUser,
  ) {
    const channel = await this.telegramService.createChannel(
      req.user.tenantId,
      dto,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'TELEGRAM_CHANNEL_CREATED',
      entityType: 'telegram_channel',
      entityId: channel.id,
      details: {
        channelName: channel.channelName,
        channelId: channel.channelId,
      },
    });

    return {
      success: true,
      data: channel,
      message: 'Canal criado com sucesso',
    };
  }

  @Get('channels')
  @Roles('admin')
  async findAllChannels(@Req() req: RequestWithUser) {
    const channels = await this.telegramService.findAllChannels(
      req.user.tenantId,
    );
    return {
      success: true,
      data: channels,
      count: channels.length,
    };
  }

  @Get('channels/:id')
  @Roles('admin')
  async findChannelById(@Param('id') id: string, @Req() req: RequestWithUser) {
    const channel = await this.telegramService.findChannelById(
      parseInt(id, 10),
      req.user.tenantId,
    );
    if (!channel) {
      return {
        success: false,
        message: 'Canal nao encontrado',
      };
    }
    return {
      success: true,
      data: channel,
    };
  }

  @Put('channels/:id')
  @Roles('admin')
  async updateChannel(
    @Param('id') id: string,
    @Body() dto: UpdateChannelDto,
    @Req() req: RequestWithUser,
  ) {
    const channel = await this.telegramService.updateChannel(
      parseInt(id, 10),
      req.user.tenantId,
      dto,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'TELEGRAM_CHANNEL_UPDATED',
      entityType: 'telegram_channel',
      entityId: channel.id,
      details: { changes: Object.keys(dto) },
    });

    return {
      success: true,
      data: channel,
      message: 'Canal atualizado com sucesso',
    };
  }

  @Delete('channels/:id')
  @Roles('admin')
  async deleteChannel(@Param('id') id: string, @Req() req: RequestWithUser) {
    await this.telegramService.deleteChannel(
      parseInt(id, 10),
      req.user.tenantId,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'TELEGRAM_CHANNEL_DELETED',
      entityType: 'telegram_channel',
      entityId: parseInt(id, 10),
    });

    return {
      success: true,
      message: 'Canal removido com sucesso',
    };
  }

  @Post('send')
  @Roles('admin')
  async sendMessage(
    @Body() dto: SendTelegramMessageDto,
    @Req() req: RequestWithUser,
  ) {
    const message = await this.telegramService.sendMessage(
      req.user.tenantId,
      dto,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'TELEGRAM_MESSAGE_SENT',
      entityType: 'telegram_message',
      entityId: message.id,
      details: { chatId: dto.chatId || dto.channelId, status: message.status },
    });

    return {
      success: true,
      data: message,
      message: 'Mensagem enviada',
    };
  }

  @Get('channels/:id/messages')
  @Roles('admin')
  async findMessagesByChannel(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    const messages = await this.telegramService.findMessagesByChannel(
      parseInt(id, 10),
      req.user.tenantId,
    );
    return {
      success: true,
      data: messages,
      count: messages.length,
    };
  }
}
