import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  IsDateString,
} from 'class-validator';
import type { PostType } from '../marketing.types';

export class CreateDailyGameDto {
  @IsDateString()
  gameDate: string;

  @IsString()
  homeTeam: string;

  @IsString()
  awayTeam: string;

  @IsOptional()
  @IsString()
  competition?: string;

  @IsOptional()
  @IsString()
  gameTime?: string;

  @IsOptional()
  @IsString()
  channelMapping?: string;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

export class UpdateDailyGameDto {
  @IsOptional()
  @IsDateString()
  gameDate?: string;

  @IsOptional()
  @IsString()
  homeTeam?: string;

  @IsOptional()
  @IsString()
  awayTeam?: string;

  @IsOptional()
  @IsString()
  competition?: string;

  @IsOptional()
  @IsString()
  gameTime?: string;

  @IsOptional()
  @IsString()
  channelMapping?: string;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

export class CreateMarketingPostDto {
  @IsEnum(['game', 'promotion', 'announcement', 'reminder'])
  postType: PostType;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsInt()
  telegramChannelId?: number;
}

export class UpdateMarketingPostDto {
  @IsOptional()
  @IsEnum(['game', 'promotion', 'announcement', 'reminder'])
  postType?: PostType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsInt()
  telegramChannelId?: number;
}

export class SchedulePostDto {
  @IsDateString()
  scheduledFor: string;
}
