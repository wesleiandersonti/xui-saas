import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { XuiModule } from './modules/xui/xui.module';
import { DatabaseModule } from './modules/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/jwt.guard';
import { RolesGuard } from './modules/auth/roles.guard';
import { PlaylistsModule } from './modules/playlists/playlists.module';
import { ChannelsModule } from './modules/channels/channels.module';

@Module({
  imports: [DatabaseModule, AuthModule, XuiModule, PlaylistsModule, ChannelsModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
