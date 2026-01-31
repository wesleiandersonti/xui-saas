import { Module } from '@nestjs/common';
import { TrialsController } from './trials.controller';
import { TrialsService } from './trials.service';
import { TrialsCronService } from './trials-cron.service';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [DatabaseModule, AuditModule, ScheduleModule.forRoot()],
  controllers: [TrialsController],
  providers: [TrialsService, TrialsCronService],
  exports: [TrialsService],
})
export class TrialsModule {}
