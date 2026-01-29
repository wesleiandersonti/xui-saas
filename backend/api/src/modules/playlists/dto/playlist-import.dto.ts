import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class PlaylistImportDto {
  @IsUrl({ require_protocol: true })
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}
