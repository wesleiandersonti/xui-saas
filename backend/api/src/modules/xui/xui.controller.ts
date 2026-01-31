import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  Ip,
  Headers,
  Query,
} from '@nestjs/common';
import { XuiService } from './xui.service';
import { AuditService } from '../audit/audit.service';
import { TestConnectionDto } from './dto/test-connection.dto';
import { CreateXuiInstanceDto } from './dto/create-xui-instance.dto';
import { UpdateXuiInstanceDto } from './dto/update-xui-instance.dto';
import { Roles } from '../auth/roles.decorator';
import type { RequestWithUser } from '../../shared/types/request.types';

@Controller('xui')
export class XuiController {
  constructor(
    private readonly xuiService: XuiService,
    private readonly auditService: AuditService,
  ) {}

  @Post('test-connection')
  @Roles('admin')
  testConnection(@Body() dto: TestConnectionDto) {
    return this.xuiService.testConnection(dto);
  }

  @Post('instances')
  @Roles('admin')
  async createInstance(
    @Body() dto: CreateXuiInstanceDto,
    @Req() req: RequestWithUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const instance = await this.xuiService.createInstance(
      req.user.tenantId,
      dto,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'XUI_INSTANCE_CREATED',
      entityType: 'xui_instance',
      entityId: instance.id,
      details: { name: instance.name, host: instance.host },
      ipAddress: ip,
      userAgent,
    });

    return {
      success: true,
      data: instance,
      message: 'Instancia criada com sucesso',
    };
  }

  @Get('instances')
  @Roles('admin')
  async findAllInstances(@Req() req: RequestWithUser) {
    const instances = await this.xuiService.findAllByTenant(req.user.tenantId);
    return {
      success: true,
      data: instances,
      count: instances.length,
    };
  }

  @Get('instances/:id')
  @Roles('admin')
  async findOneInstance(@Param('id') id: string, @Req() req: RequestWithUser) {
    const instance = await this.xuiService.findById(
      parseInt(id, 10),
      req.user.tenantId,
    );
    if (!instance) {
      return {
        success: false,
        message: 'Instancia nao encontrada',
      };
    }
    return {
      success: true,
      data: instance,
    };
  }

  @Put('instances/:id')
  @Roles('admin')
  async updateInstance(
    @Param('id') id: string,
    @Body() dto: UpdateXuiInstanceDto,
    @Req() req: RequestWithUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const instance = await this.xuiService.updateInstance(
      parseInt(id, 10),
      req.user.tenantId,
      dto,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'XUI_INSTANCE_UPDATED',
      entityType: 'xui_instance',
      entityId: instance.id,
      details: { name: instance.name, changes: Object.keys(dto) },
      ipAddress: ip,
      userAgent,
    });

    return {
      success: true,
      data: instance,
      message: 'Instancia atualizada com sucesso',
    };
  }

  @Delete('instances/:id')
  @Roles('admin')
  async deleteInstance(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const instance = await this.xuiService.findById(
      parseInt(id, 10),
      req.user.tenantId,
    );
    await this.xuiService.deleteInstance(parseInt(id, 10), req.user.tenantId);

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'XUI_INSTANCE_DELETED',
      entityType: 'xui_instance',
      entityId: parseInt(id, 10),
      details: instance ? { name: instance.name, host: instance.host } : { id },
      ipAddress: ip,
      userAgent,
    });

    return {
      success: true,
      message: 'Instancia removida com sucesso',
    };
  }

  @Get('audit-logs')
  @Roles('admin')
  async getAuditLogs(
    @Req() req: RequestWithUser,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Query('action') action?: string,
  ) {
    const result = await this.auditService.findByTenant(req.user.tenantId, {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      action,
    });

    return {
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      },
    };
  }
}
