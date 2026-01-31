import {
  IsInt,
  IsString,
  Max,
  Min,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateXuiInstanceDto {
  @IsString()
  name: string;

  @IsString()
  host: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @IsString()
  databaseName: string;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
