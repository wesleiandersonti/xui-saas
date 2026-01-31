import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  Length,
} from 'class-validator';

export class CreateSellerProfileDto {
  @IsNumber()
  userId: number;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  customCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyGoal?: number;
}

export class UpdateSellerProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  customCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyGoal?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateSellerCustomerDto {
  @IsString()
  @Length(1, 100)
  customerName: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  customerEmail?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  customerPhone?: string;

  @IsOptional()
  @IsNumber()
  planId?: number;
}

export class UpdateSellerCustomerDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  customerName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  customerEmail?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  customerPhone?: string;

  @IsOptional()
  @IsNumber()
  planId?: number;

  @IsOptional()
  @IsString()
  status?: 'active' | 'inactive' | 'expired';

  @IsOptional()
  expiresAt?: Date;
}
