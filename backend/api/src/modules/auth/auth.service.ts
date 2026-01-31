import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthUser } from './auth.types';
import {
  addSecondsToDate,
  parseDurationToSeconds,
} from '../../shared/utils/duration';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresAt: string;
}

@Injectable()
export class AuthService {
  private readonly accessTtl: string;
  private readonly refreshTtl: string;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
  ) {
    this.accessTtl = process.env.JWT_ACCESS_TTL || '15m';
    this.refreshTtl = process.env.JWT_REFRESH_TTL || '7d';
    this.issuer = process.env.JWT_ISSUER || 'xui-saas';
    this.audience = process.env.JWT_AUDIENCE || 'xui-saas';
  }

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.db.withTransaction(async (conn) => {
      const [tenantResult] = await conn.query<ResultSetHeader>(
        'INSERT INTO tenants (name) VALUES (?)',
        [dto.tenantName.trim()],
      );

      const tenantId = tenantResult.insertId;

      let userId = 0;

      try {
        const [userResult] = await conn.query<ResultSetHeader>(
          'INSERT INTO users (tenant_id, email, password_hash, role) VALUES (?,?,?,?)',
          [tenantId, dto.email.trim().toLowerCase(), passwordHash, 'admin'],
        );
        userId = userResult.insertId;
      } catch (error: unknown) {
        const mysqlError = error as { code?: string };
        if (mysqlError?.code === 'ER_DUP_ENTRY') {
          throw new ConflictException('Email ja cadastrado');
        }
        throw error;
      }

      const payload = this.buildPayload({
        id: userId,
        tenantId,
        role: 'admin',
        email: dto.email.trim().toLowerCase(),
      });

      const tokens = await this.issueTokens(payload, conn);

      return {
        user: {
          id: userId,
          tenantId,
          role: 'admin',
          email: dto.email.trim().toLowerCase(),
        },
        ...tokens,
      };
    });
  }

  async login(dto: LoginDto) {
    const rows = await this.db.query<RowDataPacket[]>(
      'SELECT id, tenant_id, email, password_hash, role FROM users WHERE email = ? LIMIT 1',
      [dto.email.trim().toLowerCase()],
    );

    const user = rows[0];

    if (!user) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const matches = await bcrypt.compare(
      dto.password,
      user.password_hash as string,
    );

    if (!matches) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const payload = this.buildPayload({
      id: user.id as number,
      tenantId: user.tenant_id as number,
      role: user.role as string,
      email: user.email as string,
    });

    const tokens = await this.issueTokens(payload);

    return {
      user: {
        id: user.id as number,
        tenantId: user.tenant_id as number,
        role: user.role as string,
        email: user.email as string,
      },
      ...tokens,
    };
  }

  async refresh(dto: RefreshDto) {
    let payload: AuthUser;

    try {
      payload = await this.jwtService.verifyAsync<AuthUser>(dto.refreshToken, {
        audience: this.audience,
        issuer: this.issuer,
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalido');
    }

    if (!payload || payload.tokenUse !== 'refresh' || !payload.jti) {
      throw new UnauthorizedException('Refresh token invalido');
    }

    const tokenRows = await this.db.query<RowDataPacket[]>(
      `
      SELECT id, token_hash, expires_at, revoked_at
      FROM refresh_tokens
      WHERE jti = ? AND user_id = ?
      LIMIT 1
    `,
      [payload.jti, payload.sub],
    );

    const tokenRecord = tokenRows[0];

    if (!tokenRecord) {
      throw new UnauthorizedException('Refresh token invalido');
    }

    if (tokenRecord.revoked_at) {
      throw new UnauthorizedException('Refresh token revogado');
    }

    const expiresAt = new Date(tokenRecord.expires_at as string);

    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    const matches = await bcrypt.compare(
      dto.refreshToken,
      tokenRecord.token_hash as string,
    );

    if (!matches) {
      throw new UnauthorizedException('Refresh token invalido');
    }

    const userRows = await this.db.query<RowDataPacket[]>(
      'SELECT id, tenant_id, email, role FROM users WHERE id = ? LIMIT 1',
      [payload.sub],
    );

    const user = userRows[0];

    if (!user) {
      throw new UnauthorizedException('Usuario nao encontrado');
    }

    const newPayload = this.buildPayload({
      id: user.id as number,
      tenantId: user.tenant_id as number,
      role: user.role as string,
      email: user.email as string,
    });

    const tokens = await this.db.withTransaction(async (conn) => {
      await conn.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?',
        [tokenRecord.id],
      );

      return this.issueTokens(newPayload, conn);
    });

    return {
      ...tokens,
    };
  }

  async me(user: AuthUser) {
    const rows = await this.db.query<RowDataPacket[]>(
      'SELECT id, tenant_id, email, role, created_at FROM users WHERE id = ? LIMIT 1',
      [user.sub],
    );

    const record = rows[0];

    if (!record) {
      throw new UnauthorizedException('Usuario nao encontrado');
    }

    return {
      id: record.id,
      tenantId: record.tenant_id,
      email: record.email,
      role: record.role,
      createdAt: record.created_at,
    };
  }

  private buildPayload(user: {
    id: number;
    tenantId: number;
    role: string;
    email: string;
  }): AuthUser {
    return {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      tokenUse: 'access',
    };
  }

  private async issueTokens(
    payload: AuthUser,
    conn?: PoolConnection,
  ): Promise<TokenPair> {
    const accessPayload: AuthUser = { ...payload, tokenUse: 'access' };
    const accessToken = await this.jwtService.signAsync(accessPayload, {
      expiresIn: parseDurationToSeconds(this.accessTtl, 900),
      audience: this.audience,
      issuer: this.issuer,
    });

    const jti = randomUUID();
    const refreshPayload: AuthUser = { ...payload, tokenUse: 'refresh', jti };
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      expiresIn: parseDurationToSeconds(this.refreshTtl, 604800),
      audience: this.audience,
      issuer: this.issuer,
    });

    const refreshSeconds = parseDurationToSeconds(
      this.refreshTtl,
      60 * 60 * 24 * 7,
    );
    const refreshExpiresAt = addSecondsToDate(refreshSeconds);

    const refreshHash = await bcrypt.hash(refreshToken, 10);

    const executor = conn ?? this.db.getPool();

    await executor.query(
      `
      INSERT INTO refresh_tokens (user_id, token_hash, jti, expires_at)
      VALUES (?,?,?,?)
    `,
      [payload.sub, refreshHash, jti, refreshExpiresAt],
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: parseDurationToSeconds(this.accessTtl, 60 * 15),
      refreshExpiresAt: refreshExpiresAt.toISOString(),
    };
  }
}
