import { Module } from '@nestjs/common';
import { VodController } from './vod.controller';
import { VodService } from './vod.service';
import { TmdbService } from './tmdb.service';

@Module({
  controllers: [VodController],
  providers: [VodService, TmdbService],
  exports: [VodService, TmdbService],
})
export class VodModule {}
