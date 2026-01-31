import { Controller, Get, Param, ParseIntPipe, Req } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import type { RequestWithUser } from '../../shared/types/request.types';

@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get(':id')
  listByCategory(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    return this.channelsService.listByCategory(id, req.user);
  }
}
