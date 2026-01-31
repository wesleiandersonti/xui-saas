import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { DatabaseService } from '../database/database.service';
import { PlaylistImportDto } from './dto/playlist-import.dto';
import { AuthUser } from '../auth/auth.types';
import { assertSafeUrl } from '../../shared/security/ssrf';
import { parseM3U } from './m3u-parser';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

@Injectable()
export class PlaylistsService {
  constructor(private readonly db: DatabaseService) {}

  async importPlaylist(dto: PlaylistImportDto, user: AuthUser) {
    const allowlist = this.parseAllowlist(process.env.PLAYLIST_ALLOWLIST);
    const maxRedirects = this.getNumber(process.env.PLAYLIST_MAX_REDIRECTS, 2);
    const timeoutMs = this.getNumber(process.env.PLAYLIST_TIMEOUT_MS, 20000);
    const maxBytes = this.getNumber(process.env.PLAYLIST_MAX_BYTES, 5_000_000);
    const maxChannels = this.getNumber(
      process.env.PLAYLIST_MAX_CHANNELS,
      20000,
    );
    const userAgent = process.env.PLAYLIST_USER_AGENT || 'VLC/3.0.0-git';

    const downloadStartedAt = Date.now();
    const content = await this.fetchPlaylist(dto.url, {
      allowlist,
      maxRedirects,
      timeoutMs,
      maxBytes,
      userAgent,
    });

    const parsed = parseM3U(content);

    if (parsed.totalEntries === 0 || parsed.groups.size === 0) {
      throw new BadRequestException('Playlist sem entradas validas');
    }

    if (parsed.totalEntries > maxChannels) {
      throw new BadRequestException('Playlist excede o limite de canais');
    }

    const result = await this.db.withTransaction(async (conn) => {
      const [playlistResult] = await conn.query<ResultSetHeader>(
        'INSERT INTO playlists (tenant_id, name, source_url) VALUES (?,?,?)',
        [user.tenantId, dto.name?.trim() || 'Minha Playlist', dto.url.trim()],
      );

      const playlistId = playlistResult.insertId;
      let categoriesInserted = 0;
      let channelsInserted = 0;
      let duplicates = 0;
      let invalids = parsed.invalidCount;

      for (const [group, channels] of parsed.groups.entries()) {
        const [categoryResult] = await conn.query<ResultSetHeader>(
          'INSERT INTO categories (playlist_id, name) VALUES (?,?)',
          [playlistId, group],
        );

        const categoryId = categoryResult.insertId;
        categoriesInserted += 1;

        for (const channel of channels) {
          if (!channel.url || !channel.name) {
            invalids += 1;
            continue;
          }

          const [channelResult] = await conn.query<ResultSetHeader>(
            `
            INSERT IGNORE INTO channels (category_id, name, logo_url, stream_url)
            VALUES (?,?,?,?)
          `,
            [categoryId, channel.name, channel.logo || null, channel.url],
          );

          if (channelResult.affectedRows === 1) {
            channelsInserted += 1;
          } else {
            duplicates += 1;
          }
        }
      }

      return {
        playlistId,
        categoriesInserted,
        channelsInserted,
        duplicates,
        invalids,
      };
    });

    const downloadMs = Date.now() - downloadStartedAt;

    return {
      status: 'ok',
      playlistId: result.playlistId,
      categories: result.categoriesInserted,
      channels: result.channelsInserted,
      duplicates: result.duplicates,
      invalids: result.invalids,
      downloadMs,
    };
  }

  async listPlaylists(user: AuthUser) {
    const rows = await this.db.query<RowDataPacket[]>(
      'SELECT id, name, source_url AS sourceUrl, created_at AS createdAt FROM playlists WHERE tenant_id = ? ORDER BY id DESC',
      [user.tenantId],
    );

    return rows;
  }

  async listCategories(playlistId: number, user: AuthUser) {
    const rows = await this.db.query<RowDataPacket[]>(
      `
      SELECT c.id, c.name, c.created_at AS createdAt
      FROM categories c
      INNER JOIN playlists p ON p.id = c.playlist_id
      WHERE c.playlist_id = ? AND p.tenant_id = ?
      ORDER BY c.id
    `,
      [playlistId, user.tenantId],
    );

    return rows;
  }

  private parseAllowlist(raw?: string): string[] {
    if (!raw) {
      return [];
    }

    return raw
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  private getNumber(raw: string | undefined, fallback: number): number {
    const value = raw ? Number(raw) : fallback;
    return Number.isFinite(value) ? value : fallback;
  }

  private async fetchPlaylist(
    url: string,
    options: {
      allowlist: string[];
      maxRedirects: number;
      timeoutMs: number;
      maxBytes: number;
      userAgent: string;
    },
  ): Promise<string> {
    let currentUrl = url;

    for (let attempt = 0; attempt <= options.maxRedirects; attempt += 1) {
      await assertSafeUrl(currentUrl, { allowlist: options.allowlist });

      const response = await axios.get<string>(currentUrl, {
        headers: {
          'User-Agent': options.userAgent,
          Accept: '*/*',
        },
        timeout: options.timeoutMs,
        maxContentLength: options.maxBytes,
        maxBodyLength: options.maxBytes,
        responseType: 'text',
        validateStatus: (status) => status >= 200 && status < 400,
        transitional: { forcedJSONParsing: false },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers?.location;
        if (!location) {
          throw new BadRequestException('Redirect sem destino');
        }

        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      if (!response.data) {
        throw new BadRequestException('Resposta vazia ao baixar playlist');
      }

      return response.data;
    }

    throw new BadRequestException('Redirects excedidos');
  }
}
