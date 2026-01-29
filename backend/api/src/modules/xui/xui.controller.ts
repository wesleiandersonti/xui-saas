import { Body, Controller, Post } from '@nestjs/common';
import { XuiService } from './xui.service';
import { TestConnectionDto } from './dto/test-connection.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('xui')
export class XuiController {
  constructor(private readonly xuiService: XuiService) {}

  @Post('test-connection')
  @Roles('admin')
  testConnection(@Body() dto: TestConnectionDto) {
    return this.xuiService.testConnection(dto);
  }
}
