import { IsNumber, Min, Max, IsOptional } from 'class-validator';

export class CreateSellerConfigDto {
  @IsNumber()
  sellerId: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercentage: number;
}

export class UpdateSellerConfigDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercentage?: number;

  @IsOptional()
  isActive?: boolean;
}
