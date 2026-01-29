import { Body, Controller, Get, Param, ParseIntPipe, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { PlaylistsService } from './playlists.service';
import { PlaylistImportDto } from './dto/playlist-import.dto';
import { Roles } from '../auth/roles.decorator';
import { AuthUser } from '../auth/auth.types';

@Controller('playlist')
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Roles('admin')
  @Post('import')
  import(@Body() dto: PlaylistImportDto, @Req() req: Request) {
    const user = req.user as AuthUser;
    return this.playlistsService.importPlaylist(dto, user);
  }

  @Get()
  list(@Req() req: Request) {
    const user = req.user as AuthUser;
    return this.playlistsService.listPlaylists(user);
  }

  @Get(':id/categories')
  listCategories(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as AuthUser;
    return this.playlistsService.listCategories(id, user);
  }
}
