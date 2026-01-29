import { Controller, Get, Param, ParseIntPipe, Req } from '@nestjs/common';
import { Request } from 'express';
import { ChannelsService } from './channels.service';
import { AuthUser } from '../auth/auth.types';

@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get(':id')
  listByCategory(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as AuthUser;
    return this.channelsService.listByCategory(id, user);
  }
}
