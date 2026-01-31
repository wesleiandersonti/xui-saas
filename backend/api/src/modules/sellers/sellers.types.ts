export interface SellerProfile {
  id: number;
  tenantId: number;
  userId: number;
  customCode: string | null;
  commissionPercentage: number;
  monthlyGoal: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SellerCustomer {
  id: number;
  tenantId: number;
  sellerId: number;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  xuiUsername: string;
  xuiPassword: string;
  planId: number;
  status: 'active' | 'inactive' | 'expired';
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SellerStats {
  totalCustomers: number;
  activeCustomers: number;
  monthlyRevenue: number;
  totalCommissions: number;
}
