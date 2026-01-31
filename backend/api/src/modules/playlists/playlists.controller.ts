import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
} from '@nestjs/common';
import { PlaylistsService } from './playlists.service';
import { PlaylistImportDto } from './dto/playlist-import.dto';
import { Roles } from '../auth/roles.decorator';
import type { RequestWithUser } from '../../shared/types/request.types';

@Controller('playlist')
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Roles('admin')
  @Post('import')
  import(@Body() dto: PlaylistImportDto, @Req() req: RequestWithUser) {
    return this.playlistsService.importPlaylist(dto, req.user);
  }

  @Get()
  list(@Req() req: RequestWithUser) {
    return this.playlistsService.listPlaylists(req.user);
  }

  @Get(':id/categories')
  listCategories(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    return this.playlistsService.listCategories(id, req.user);
  }
}
