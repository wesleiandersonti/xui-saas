export interface Payment {
  id: number;
  tenantId: number;
  userId: number;
  planId: number | null;
  sellerId: number | null;
  externalId: string | null;
  provider: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
  paymentMethod: string | null;
  paidAt: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentConfig {
  id: number;
  tenantId: number;
  provider: 'mercadopago' | 'cora';
  isActive: boolean;
  configJson: {
    accessToken?: string;
    publicKey?: string;
    webhookSecret?: string;
    [key: string]: unknown;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Plan {
  id: number;
  tenantId: number;
  name: string;
  description: string | null;
  price: number;
  durationDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentDto {
  planId: number;
  sellerId?: number;
  provider: 'mercadopago' | 'cora';
  paymentMethod: 'pix' | 'credit_card';
}

export interface MercadoPagoPreference {
  items: Array<{
    title: string;
    description?: string;
    unit_price: number;
    quantity: number;
    currency_id: string;
  }>;
  payer?: {
    email?: string;
    name?: string;
  };
  back_urls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
  auto_return?: string;
  notification_url?: string;
  external_reference?: string;
}

export interface MercadoPagoPayment {
  id: string;
  status: string;
  status_detail: string;
  transaction_amount: number;
  date_approved: string | null;
  payment_method_id: string;
  external_reference: string;
  payer: {
    email: string;
  };
}
