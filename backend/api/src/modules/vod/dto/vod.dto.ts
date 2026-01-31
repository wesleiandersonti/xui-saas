import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  IsDateString,
} from 'class-validator';
import type { ContentType } from '../vod.types';

export class CreateContentDto {
  @IsString()
  title: string;

  @IsEnum(['movie', 'tv_show', 'series'])
  contentType: ContentType;

  @IsOptional()
  @IsInt()
  tmdbId?: number;

  @IsOptional()
  @IsString()
  originalTitle?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  posterUrl?: string;

  @IsOptional()
  @IsString()
  backdropUrl?: string;

  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @IsOptional()
  @IsInt()
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  rating?: string;

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @IsString()
  cast?: string;

  @IsOptional()
  @IsString()
  director?: string;

  @IsOptional()
  @IsString()
  streamUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  adultContent?: boolean;

  @IsOptional()
  @IsInt({ each: true })
  categoryIds?: number[];
}

export class UpdateContentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(['movie', 'tv_show', 'series'])
  contentType?: ContentType;

  @IsOptional()
  @IsInt()
  tmdbId?: number;

  @IsOptional()
  @IsString()
  originalTitle?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  posterUrl?: string;

  @IsOptional()
  @IsString()
  backdropUrl?: string;

  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @IsOptional()
  @IsInt()
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  rating?: string;

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @IsString()
  cast?: string;

  @IsOptional()
  @IsString()
  director?: string;

  @IsOptional()
  @IsString()
  streamUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  adultContent?: boolean;

  @IsOptional()
  @IsInt({ each: true })
  categoryIds?: number[];
}

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SearchTmdbDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsInt()
  page?: number;
}

export class ImportFromTmdbDto {
  @IsInt()
  tmdbId: number;

  @IsEnum(['movie', 'tv_show'])
  contentType: 'movie' | 'tv_show';
}

export class AssignCategoryDto {
  @IsInt()
  categoryId: number;
}
