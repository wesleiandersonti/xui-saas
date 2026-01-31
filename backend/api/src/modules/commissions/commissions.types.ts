export interface Commission {
  id: number;
  tenantId: number;
  sellerId: number;
  paymentId: number;
  amount: number;
  percentage: number;
  status: 'pending' | 'paid' | 'cancelled';
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SellerConfig {
  id: number;
  tenantId: number;
  sellerId: number;
  commissionPercentage: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommissionSummary {
  totalCommissions: number;
  pendingAmount: number;
  paidAmount: number;
  totalSales: number;
}
