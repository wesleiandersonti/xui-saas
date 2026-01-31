import { Controller, Get, Inject } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('health')
export class HealthController {
  private readonly startTime: Date;

  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
  ) {
    this.startTime = new Date();
  }

  @Get()
  async check(): Promise<{
    status: string;
    database: string;
    timestamp: string;
    uptime: number;
  }> {
    let database = 'ok';
    let status = 'ok';

    try {
      await this.databaseService.query('SELECT 1');
    } catch {
      database = 'error';
      status = 'error';
    }

    const now = new Date();
    const uptime = Math.floor(
      (now.getTime() - this.startTime.getTime()) / 1000,
    );

    return {
      status,
      database,
      timestamp: now.toISOString(),
      uptime,
    };
  }
}
