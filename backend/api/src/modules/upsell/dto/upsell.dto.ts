import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsEnum,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

// ==================== Request DTOs ====================

export class TrackUpsellViewDto {
  @IsString()
  triggerType: string;

  @IsOptional()
  @IsString()
  variant?: string;

  @IsOptional()
  @IsString()
  pageUrl?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class TrackUpsellClickDto {
  @IsString()
  triggerType: string;

  @IsOptional()
  @IsString()
  variant?: string;

  @IsOptional()
  @IsInt()
  clickedPlanId?: number;

  @IsOptional()
  @IsString()
  pageUrl?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class TrackUpsellDto {
  @IsString()
  triggerType: string;

  @IsOptional()
  @IsString()
  variant?: string;

  @IsOptional()
  @IsInt()
  clickedPlanId?: number;

  @IsOptional()
  @IsString()
  pageUrl?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

// ==================== Response Types ====================

export interface UpsellBanner {
  show: boolean;
  type: 'clients' | 'instances' | 'storage';
  percentage: number;
  message: string;
  variant: string;
  priority: 'low' | 'medium' | 'high';
  ctaText: string;
  dismissible: boolean;
}

export interface LimitDetail {
  current: number;
  limit: number;
  percentage: number;
  isNearLimit: boolean;
  remaining: number;
}

export interface PlanLimits {
  clients: LimitDetail;
  instances: LimitDetail;
  storage: LimitDetail;
}

export interface LimitStatus {
  tenantId: number;
  currentPlan: string;
  limits: PlanLimits;
  highestUsagePercentage: number;
}

export interface UpsellOption {
  planId: number;
  planName: string;
  currentPrice: number;
  upgradePrice: number;
  priceDifference: number;
  billingCycle: string;
  monthlySavings: number;
  annualSavings: number;
  benefits: string[];
  features: string[];
  limits: {
    clients: number;
    instances: number;
    storage: number;
  };
  recommendationScore: number;
  isRecommended: boolean;
  discountInfo: {
    code: string;
    percentage: number;
    validUntil: Date;
  } | null;
}

export interface CurrentUsage {
  activeClients: number;
  activeInstances: number;
  storageUsedGb: number;
}

export interface UpsellStats {
  period: string;
  summary: {
    totalViews: number;
    totalClicks: number;
    totalConversions: number;
    totalRevenue: number;
    clickThroughRate: number;
    conversionRate: number;
    revenuePerView: number;
  };
  byTriggerType: Record<string, {
    views: number;
    clicks: number;
    ctr: number;
  }>;
  byVariant: Record<string, {
    views: number;
    clicks: number;
    conversions: number;
    rate: number;
  }>;
  conversions: Array<{
    fromPlanId: number;
    toPlanId: number;
    count: number;
    revenue: number;
  }>;
  abTestResults: Array<{
    variant: string;
    views: number;
    clicks: number;
    conversions: number;
    clickThroughRate: number;
    conversionRate: number;
  }>;
}

// ==================== A/B Test Types ====================

export type BannerVariant = 'default' | 'urgency' | 'discount' | 'social-proof';

export interface ABTestConfig {
  variant: BannerVariant;
  weight: number;
  enabled: boolean;
}

// ==================== Database Entity Types ====================

export interface UpsellAnalytics {
  id: number;
  tenantId: number;
  userId: number;
  eventType: 'view' | 'click';
  triggerType: string;
  variant: string;
  pageUrl: string | null;
  sessionId: string | null;
  clickedPlanId: number | null;
  createdAt: Date;
}

export interface UpsellConversion {
  id: number;
  tenantId: number;
  userId: number;
  fromPlanId: number;
  toPlanId: number;
  amount: number;
  convertedAt: Date;
}

export interface UpsellBannerDismissal {
  id: number;
  tenantId: number;
  userId: number;
  dismissedAt: Date;
}

// ==================== Pricing Types ====================

export interface PricingBreakdown {
  basePrice: number;
  discountAmount: number;
  discountCode: string | null;
  taxAmount: number;
  totalPrice: number;
  billingCycle: 'monthly' | 'yearly';
  savings: {
    monthly: number;
    yearly: number;
    percentage: number;
  };
}

// ==================== Notification Types ====================

export interface UpsellNotification {
  id: string;
  tenantId: number;
  type: 'limit_warning' | 'upgrade_available' | 'discount_expiring';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  actionUrl: string;
  actionText: string;
  expiresAt: Date | null;
  isRead: boolean;
  createdAt: Date;
}
