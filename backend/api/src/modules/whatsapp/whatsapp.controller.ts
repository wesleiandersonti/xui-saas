import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  Query,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  SendMessageDto,
} from './dto/whatsapp.dto';
import { Roles } from '../auth/roles.decorator';
import type { RequestWithUser } from '../../shared/types/request.types';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly auditService: AuditService,
  ) {}

  @Post('config')
  @Roles('admin')
  async saveConfig(
    @Body()
    data: {
      evolutionApiUrl: string;
      evolutionApiKey: string;
      instanceName: string;
      defaultTemplate?: string;
    },
    @Req() req: RequestWithUser,
  ) {
    const config = await this.whatsappService.saveConfig(
      req.user.tenantId,
      data,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'WHATSAPP_CONFIG_UPDATED',
      entityType: 'whatsapp_config',
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
    const config = await this.whatsappService.getConfig(req.user.tenantId);
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

  @Post('templates')
  @Roles('admin')
  async createTemplate(
    @Body() dto: CreateTemplateDto,
    @Req() req: RequestWithUser,
  ) {
    const template = await this.whatsappService.createTemplate(
      req.user.tenantId,
      dto,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'WHATSAPP_TEMPLATE_CREATED',
      entityType: 'whatsapp_template',
      entityId: template.id,
      details: { name: template.name, eventType: template.eventType },
    });

    return {
      success: true,
      data: template,
      message: 'Template criado com sucesso',
    };
  }

  @Get('templates')
  @Roles('admin')
  async findAllTemplates(@Req() req: RequestWithUser) {
    const templates = await this.whatsappService.findAllTemplates(
      req.user.tenantId,
    );
    return {
      success: true,
      data: templates,
      count: templates.length,
    };
  }

  @Get('templates/:id')
  @Roles('admin')
  async findOneTemplate(@Param('id') id: string, @Req() req: RequestWithUser) {
    const template = await this.whatsappService.findTemplateById(
      parseInt(id, 10),
      req.user.tenantId,
    );
    if (!template) {
      return {
        success: false,
        message: 'Template nao encontrado',
      };
    }
    return {
      success: true,
      data: template,
    };
  }

  @Put('templates/:id')
  @Roles('admin')
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @Req() req: RequestWithUser,
  ) {
    const template = await this.whatsappService.updateTemplate(
      parseInt(id, 10),
      req.user.tenantId,
      dto,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'WHATSAPP_TEMPLATE_UPDATED',
      entityType: 'whatsapp_template',
      entityId: template.id,
      details: { changes: Object.keys(dto) },
    });

    return {
      success: true,
      data: template,
      message: 'Template atualizado com sucesso',
    };
  }

  @Delete('templates/:id')
  @Roles('admin')
  async deleteTemplate(@Param('id') id: string, @Req() req: RequestWithUser) {
    await this.whatsappService.deleteTemplate(
      parseInt(id, 10),
      req.user.tenantId,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'WHATSAPP_TEMPLATE_DELETED',
      entityType: 'whatsapp_template',
      entityId: parseInt(id, 10),
    });

    return {
      success: true,
      message: 'Template removido com sucesso',
    };
  }

  @Post('send')
  @Roles('admin')
  async sendMessage(@Body() dto: SendMessageDto, @Req() req: RequestWithUser) {
    const log = await this.whatsappService.sendMessage(req.user.tenantId, dto);

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'WHATSAPP_MESSAGE_SENT',
      entityType: 'whatsapp_log',
      entityId: log.id,
      details: { phoneNumber: dto.phoneNumber, status: log.status },
    });

    return {
      success: true,
      data: log,
      message: 'Mensagem enviada',
    };
  }

  @Get('logs')
  @Roles('admin')
  async findLogs(
    @Req() req: RequestWithUser,
    @Query('limit') limit: string = '50',
  ) {
    const logs = await this.whatsappService.findLogsByTenant(
      req.user.tenantId,
      parseInt(limit, 10),
    );
    return {
      success: true,
      data: logs,
      count: logs.length,
    };
  }
}
