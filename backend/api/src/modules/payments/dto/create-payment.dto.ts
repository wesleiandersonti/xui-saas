import {
  IsInt,
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from 'class-validator';

export enum PaymentProvider {
  MERCADOPAGO = 'mercadopago',
  CORA = 'cora',
}

export enum PaymentMethod {
  PIX = 'pix',
  CREDIT_CARD = 'credit_card',
}

export class CreatePaymentDto {
  @IsInt()
  planId: number;

  @IsOptional()
  @IsInt()
  sellerId?: number;

  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
