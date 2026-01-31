import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
} from 'class-validator';

export class SaveTelegramConfigDto {
  @IsString()
  botToken: string;

  @IsOptional()
  @IsString()
  botUsername?: string;

  @IsOptional()
  @IsString()
  defaultChatId?: string;

  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @IsOptional()
  @IsString()
  welcomeMessage?: string;
}

export class CreateChannelDto {
  @IsString()
  channelId: string;

  @IsString()
  channelName: string;

  @IsOptional()
  @IsString()
  channelType?: string;

  @IsOptional()
  @IsBoolean()
  requiresAdult?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateChannelDto {
  @IsOptional()
  @IsString()
  channelId?: string;

  @IsOptional()
  @IsString()
  channelName?: string;

  @IsOptional()
  @IsString()
  channelType?: string;

  @IsOptional()
  @IsBoolean()
  requiresAdult?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SendTelegramMessageDto {
  @IsOptional()
  @IsInt()
  channelId?: number;

  @IsOptional()
  @IsString()
  chatId?: string;

  @IsString()
  messageText: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  mediaType?: string;

  @IsOptional()
  @IsEnum(['HTML', 'Markdown', 'MarkdownV2'])
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}
