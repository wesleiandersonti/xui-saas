import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsString()
  eventType: string;

  @IsString()
  template: string;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SendMessageDto {
  @IsString()
  phoneNumber: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsInt()
  templateId?: number;
}
