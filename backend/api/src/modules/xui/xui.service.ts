import { Injectable } from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import { TestConnectionDto } from './dto/test-connection.dto';

@Injectable()
export class XuiService {
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
}
