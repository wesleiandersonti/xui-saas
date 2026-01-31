import { Injectable, NotFoundException } from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import * as crypto from 'crypto';
import { TestConnectionDto } from './dto/test-connection.dto';
import { CreateXuiInstanceDto } from './dto/create-xui-instance.dto';
import { UpdateXuiInstanceDto } from './dto/update-xui-instance.dto';
import { DatabaseService } from '../database/database.service';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export interface XuiInstance {
  id: number;
  tenantId: number;
  name: string;
  host: string;
  port: number;
  databaseName: string;
  username: string;
  isActive: boolean;
  isPrimary: boolean;
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class XuiService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly db: DatabaseService) {
    const secretKey = process.env.XUI_ENCRYPTION_KEY;
    if (!secretKey) {
      throw new Error(
        'XUI_ENCRYPTION_KEY environment variable is required. ' +
          'Please set a secure 32-character encryption key in your .env file. ' +
          'Generate one with: openssl rand -base64 24',
      );
    }
    if (secretKey.length < 32) {
      throw new Error(
        'XUI_ENCRYPTION_KEY must be at least 32 characters long. ' +
          `Current length: ${secretKey.length} characters.`,
      );
    }
    this.key = crypto.scryptSync(secretKey, 'salt', 32);
  }

  async testConnection(dto: TestConnectionDto) {
    try {
      const connection = await mysql.createConnection({
        host: dto.host,
        port: dto.port,
        user: dto.user,
        password: dto.password,
        database: dto.database,
        connectTimeout: 7000,
      });

      await connection.ping();
      await connection.end();

      return {
        success: true,
        message: 'Conexao com MariaDB do XUI realizada com sucesso',
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Erro ao conectar no MariaDB do XUI',
        error: error.message,
      };
    }
  }

  async createInstance(
    tenantId: number,
    dto: CreateXuiInstanceDto,
  ): Promise<XuiInstance> {
    const encryptedPassword = this.encrypt(dto.password);

    const result = await this.db.query<ResultSetHeader>(
      `INSERT INTO xui_instances 
       (tenant_id, name, host, port, database_name, username, password_encrypted, is_primary) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        dto.name,
        dto.host,
        dto.port,
        dto.databaseName,
        dto.username,
        encryptedPassword,
        dto.isPrimary ?? false,
      ],
    );

    const instance = await this.findById(result.insertId, tenantId);
    if (!instance) {
      throw new Error('Falha ao criar instancia');
    }

    return instance;
  }

  async findAllByTenant(tenantId: number): Promise<XuiInstance[]> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, name, host, port, database_name, username, 
              is_active, is_primary, last_sync_at, created_at, updated_at
       FROM xui_instances 
       WHERE tenant_id = ? 
       ORDER BY created_at DESC`,
      [tenantId],
    );

    return rows.map((row) => this.mapRowToInstance(row));
  }

  async findById(id: number, tenantId: number): Promise<XuiInstance | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT id, tenant_id, name, host, port, database_name, username, 
              is_active, is_primary, last_sync_at, created_at, updated_at
       FROM xui_instances 
       WHERE id = ? AND tenant_id = ? 
       LIMIT 1`,
      [id, tenantId],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToInstance(rows[0]);
  }

  async updateInstance(
    id: number,
    tenantId: number,
    dto: UpdateXuiInstanceDto,
  ): Promise<XuiInstance> {
    const instance = await this.findById(id, tenantId);
    if (!instance) {
      throw new NotFoundException('Instancia nao encontrada');
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (dto.name !== undefined) {
      updates.push('name = ?');
      values.push(dto.name);
    }
    if (dto.host !== undefined) {
      updates.push('host = ?');
      values.push(dto.host);
    }
    if (dto.port !== undefined) {
      updates.push('port = ?');
      values.push(dto.port);
    }
    if (dto.databaseName !== undefined) {
      updates.push('database_name = ?');
      values.push(dto.databaseName);
    }
    if (dto.username !== undefined) {
      updates.push('username = ?');
      values.push(dto.username);
    }
    if (dto.password !== undefined) {
      updates.push('password_encrypted = ?');
      values.push(this.encrypt(dto.password));
    }
    if (dto.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(dto.isActive);
    }
    if (dto.isPrimary !== undefined) {
      updates.push('is_primary = ?');
      values.push(dto.isPrimary);
    }

    if (updates.length === 0) {
      return instance;
    }

    values.push(id);
    values.push(tenantId);

    await this.db.query(
      `UPDATE xui_instances SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
      values,
    );

    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Falha ao atualizar instancia');
    }

    return updated;
  }

  async deleteInstance(id: number, tenantId: number): Promise<void> {
    const result = await this.db.query<ResultSetHeader>(
      'DELETE FROM xui_instances WHERE id = ? AND tenant_id = ?',
      [id, tenantId],
    );

    if (result.affectedRows === 0) {
      throw new NotFoundException('Instancia nao encontrada');
    }
  }

  async getInstancePassword(
    id: number,
    tenantId: number,
  ): Promise<string | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      'SELECT password_encrypted FROM xui_instances WHERE id = ? AND tenant_id = ? LIMIT 1',
      [id, tenantId],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.decrypt(rows[0].password_encrypted as string);
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private mapRowToInstance(row: RowDataPacket): XuiInstance {
    return {
      id: row.id as number,
      tenantId: row.tenant_id as number,
      name: row.name as string,
      host: row.host as string,
      port: row.port as number,
      databaseName: row.database_name as string,
      username: row.username as string,
      isActive: Boolean(row.is_active),
      isPrimary: Boolean(row.is_primary),
      lastSyncAt: row.last_sync_at
        ? new Date(row.last_sync_at as string)
        : null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
