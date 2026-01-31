import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { XuiModule } from './modules/xui/xui.module';
import { DatabaseModule } from './modules/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CommissionsModule } from './modules/commissions/commissions.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { JwtAuthGuard } from './modules/auth/jwt.guard';
import { RolesGuard } from './modules/auth/roles.guard';
import { PlaylistsModule } from './modules/playlists/playlists.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { VodModule } from './modules/vod/vod.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { SellersModule } from './modules/sellers/sellers.module';
import { BackupsModule } from './modules/backups/backups.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'general',
          ttl: 60000,
          limit: 100,
        },
        {
          name: 'auth',
          ttl: 60000,
          limit: 20,
        },
      ],
    }),
    DatabaseModule,
    AuthModule,
    AuditModule,
    DashboardModule,
    PaymentsModule,
    CommissionsModule,
    WhatsappModule,
    TelegramModule,
    XuiModule,
    PlaylistsModule,
    ChannelsModule,
    VodModule,
    MarketingModule,
    SellersModule,
    BackupsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
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
