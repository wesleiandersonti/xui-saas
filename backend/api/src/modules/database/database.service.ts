import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import mysql, { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'xui_saas',
      connectionLimit: Number(process.env.DB_POOL_SIZE || '10'),
      charset: 'utf8mb4',
      timezone: 'Z',
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureSchema();
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  getPool(): Pool {
    return this.pool;
  }

  async query<T = RowDataPacket[] | ResultSetHeader>(sql: string, params?: any[]): Promise<T> {
    const [rows] = await this.pool.query(sql, params);
    return rows as T;
  }

  async withTransaction<T>(handler: (conn: PoolConnection) => Promise<T>): Promise<T> {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();
      const result = await handler(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  private async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_email (email),
        KEY idx_users_tenant (tenant_id),
        CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        jti VARCHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        revoked_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_refresh_jti (jti),
        KEY idx_refresh_user (user_id),
        CONSTRAINT fk_refresh_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS playlists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        source_url VARCHAR(2048) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_playlists_tenant (tenant_id),
        CONSTRAINT fk_playlists_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        playlist_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_category (playlist_id, name),
        CONSTRAINT fk_categories_playlist FOREIGN KEY (playlist_id)
          REFERENCES playlists(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS channels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        logo_url VARCHAR(2048) NULL,
        stream_url VARCHAR(2048) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_channel (category_id, stream_url),
        CONSTRAINT fk_channels_category FOREIGN KEY (category_id)
          REFERENCES categories(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }
}
