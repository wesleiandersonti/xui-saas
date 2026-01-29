import { IsInt, IsString, Max, Min } from 'class-validator';

export class TestConnectionDto {
  @IsString()
  host: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @IsString()
  user: string;

  @IsString()
  password: string;

  @IsString()
  database: string;
}
