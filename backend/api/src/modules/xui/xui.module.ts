import { Module } from '@nestjs/common';
import { XuiController } from './xui.controller';
import { XuiService } from './xui.service';

@Module({
  controllers: [XuiController],
  providers: [XuiService],
})
export class XuiModule {}
