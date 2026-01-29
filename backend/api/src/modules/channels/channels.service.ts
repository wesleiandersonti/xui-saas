import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuthUser } from '../auth/auth.types';
import { RowDataPacket } from 'mysql2/promise';

@Injectable()
export class ChannelsService {
  constructor(private readonly db: DatabaseService) {}

  async listByCategory(categoryId: number, user: AuthUser) {
    const rows = await this.db.query<RowDataPacket[]>(
      `
      SELECT ch.id, ch.name, ch.logo_url AS logoUrl, ch.stream_url AS streamUrl
      FROM channels ch
      INNER JOIN categories c ON c.id = ch.category_id
      INNER JOIN playlists p ON p.id = c.playlist_id
      WHERE c.id = ? AND p.tenant_id = ?
      ORDER BY ch.id
    `,
      [categoryId, user.tenantId],
    );

    return rows;
  }
}
