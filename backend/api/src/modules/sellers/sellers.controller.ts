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
import { SellersService } from './sellers.service';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { Roles } from '../auth/roles.decorator';
import { RowDataPacket } from 'mysql2/promise';
import {
  CreateSellerProfileDto,
  UpdateSellerProfileDto,
  CreateSellerCustomerDto,
  UpdateSellerCustomerDto,
} from './dto/sellers.dto';
import type { RequestWithUser } from '../../shared/types/request.types';

@Controller('sellers')
export class SellersController {
  constructor(
    private readonly sellersService: SellersService,
    private readonly auditService: AuditService,
    private readonly db: DatabaseService,
  ) {}

  @Post('profiles')
  @Roles('admin')
  async createSellerProfile(
    @Body() dto: CreateSellerProfileDto,
    @Req() req: RequestWithUser,
  ) {
    const profile = await this.sellersService.createSellerProfile(
      req.user.tenantId,
      dto,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'SELLER_PROFILE_CREATED',
      entityType: 'seller_profile',
      entityId: profile.id,
      details: { userId: dto.userId, customCode: dto.customCode },
    });

    return {
      success: true,
      data: profile,
      message: 'Perfil de vendedor criado com sucesso',
    };
  }

  @Get('profiles')
  @Roles('admin')
  async findAllSellers(@Req() req: RequestWithUser) {
    const sellers = await this.sellersService.findAllSellers(req.user.tenantId);
    return {
      success: true,
      data: sellers,
      count: sellers.length,
    };
  }

  @Get('profiles/me')
  async getMySellerProfile(@Req() req: RequestWithUser) {
    const profile = await this.sellersService.findSellerProfile(
      req.user.sub,
      req.user.tenantId,
    );

    if (!profile) {
      return {
        success: false,
        message: 'Perfil de vendedor nao encontrado',
      };
    }

    return {
      success: true,
      data: profile,
    };
  }

  @Put('profiles/:userId')
  @Roles('admin')
  async updateSellerProfile(
    @Param('userId') userId: string,
    @Body() dto: UpdateSellerProfileDto,
    @Req() req: RequestWithUser,
  ) {
    const profile = await this.sellersService.updateSellerProfile(
      parseInt(userId, 10),
      req.user.tenantId,
      dto,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'SELLER_PROFILE_UPDATED',
      entityType: 'seller_profile',
      entityId: profile.id,
      details: { userId, changes: Object.keys(dto) },
    });

    return {
      success: true,
      data: profile,
      message: 'Perfil de vendedor atualizado com sucesso',
    };
  }

  @Delete('profiles/:userId')
  @Roles('admin')
  async deactivateSeller(
    @Param('userId') userId: string,
    @Req() req: RequestWithUser,
  ) {
    const profile = await this.sellersService.deactivateSeller(
      parseInt(userId, 10),
      req.user.tenantId,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'SELLER_DEACTIVATED',
      entityType: 'seller_profile',
      entityId: profile.id,
      details: { userId },
    });

    return {
      success: true,
      data: profile,
      message: 'Vendedor desativado com sucesso',
    };
  }

  @Post('customers')
  async createCustomer(
    @Body() dto: CreateSellerCustomerDto,
    @Req() req: RequestWithUser,
  ) {
    const customer = await this.sellersService.createCustomer(
      req.user.tenantId,
      req.user.sub,
      dto,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'SELLER_CUSTOMER_CREATED',
      entityType: 'seller_customer',
      entityId: customer.id,
      details: { customerName: dto.customerName },
    });

    return {
      success: true,
      data: customer,
      message: 'Cliente criado com sucesso',
    };
  }

  @Get('customers')
  async getMyCustomers(
    @Req() req: RequestWithUser,
    @Query('status') status?: string,
  ) {
    const customers = await this.sellersService.findCustomersBySeller(
      req.user.sub,
      req.user.tenantId,
      status,
    );

    return {
      success: true,
      data: customers,
      count: customers.length,
    };
  }

  @Get('customers/all')
  @Roles('admin')
  async getAllCustomers(@Req() req: RequestWithUser) {
    const allCustomers = await this.db.query<RowDataPacket[]>(
      `SELECT sc.*, u.email as seller_email 
       FROM seller_customers sc
       JOIN seller_profiles sp ON sc.seller_id = sp.user_id
       JOIN users u ON sp.user_id = u.id
       WHERE sc.tenant_id = ?
       ORDER BY sc.created_at DESC`,
      [req.user.tenantId],
    );

    return {
      success: true,
      data: allCustomers,
      count: allCustomers.length,
    };
  }

  @Put('customers/:id')
  async updateCustomer(
    @Param('id') id: string,
    @Body() dto: UpdateSellerCustomerDto,
    @Req() req: RequestWithUser,
  ) {
    const customer = await this.sellersService.findCustomerById(
      parseInt(id, 10),
      req.user.tenantId,
    );

    if (!customer) {
      return {
        success: false,
        message: 'Cliente nao encontrado',
      };
    }

    if (req.user.role !== 'admin' && customer.sellerId !== req.user.sub) {
      return {
        success: false,
        message: 'Acesso negado',
      };
    }

    const updated = await this.sellersService.updateCustomer(
      parseInt(id, 10),
      req.user.tenantId,
      dto,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'SELLER_CUSTOMER_UPDATED',
      entityType: 'seller_customer',
      entityId: parseInt(id, 10),
      details: { changes: Object.keys(dto) },
    });

    return {
      success: true,
      data: updated,
      message: 'Cliente atualizado com sucesso',
    };
  }

  @Delete('customers/:id')
  async deleteCustomer(@Param('id') id: string, @Req() req: RequestWithUser) {
    const customer = await this.sellersService.findCustomerById(
      parseInt(id, 10),
      req.user.tenantId,
    );

    if (!customer) {
      return {
        success: false,
        message: 'Cliente nao encontrado',
      };
    }

    if (req.user.role !== 'admin' && customer.sellerId !== req.user.sub) {
      return {
        success: false,
        message: 'Acesso negado',
      };
    }

    await this.sellersService.deleteCustomer(
      parseInt(id, 10),
      req.user.tenantId,
    );

    await this.auditService.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'SELLER_CUSTOMER_DELETED',
      entityType: 'seller_customer',
      entityId: parseInt(id, 10),
      details: { customerName: customer.customerName },
    });

    return {
      success: true,
      message: 'Cliente excluido com sucesso',
    };
  }

  @Get('stats')
  async getMyStats(@Req() req: RequestWithUser) {
    const stats = await this.sellersService.getSellerStats(
      req.user.sub,
      req.user.tenantId,
    );

    return {
      success: true,
      data: stats,
    };
  }

  @Get('stats/:userId')
  @Roles('admin')
  async getSellerStats(
    @Param('userId') userId: string,
    @Req() req: RequestWithUser,
  ) {
    const stats = await this.sellersService.getSellerStats(
      parseInt(userId, 10),
      req.user.tenantId,
    );

    return {
      success: true,
      data: stats,
    };
  }
}
