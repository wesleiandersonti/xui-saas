import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import {
  UpsellBanner,
  UpsellOption,
  UpsellStats,
  TrackUpsellDto,
  LimitStatus,
  PlanLimits,
  CurrentUsage,
} from './dto/upsell.dto';

interface TenantSubscription {
  planId: number;
  planName: string;
  maxClients: number;
  maxInstances: number;
  maxStorageGb: number;
  price: number;
  billingCycle: string;
}

interface AvailablePlan {
  id: number;
  name: string;
  maxClients: number;
  maxInstances: number;
  maxStorageGb: number;
  price: number;
  billingCycle: string;
  features: string[];
}

@Injectable()
export class UpsellService {
  private readonly UPSELL_THRESHOLD = 0.8; // 80%
  private readonly BANNER_COOLDOWN_HOURS = 24;

  constructor(private readonly db: DatabaseService) {}

  /**
   * Check current tenant usage against plan limits
   */
  async checkLimits(tenantId: number): Promise<LimitStatus> {
    const subscription = await this.getTenantSubscription(tenantId);
    const usage = await this.getCurrentUsage(tenantId);

    const clientsPercent = usage.activeClients / subscription.maxClients;
    const instancesPercent = usage.activeInstances / subscription.maxInstances;
    const storagePercent = usage.storageUsedGb / subscription.maxStorageGb;

    return {
      tenantId,
      currentPlan: subscription.planName,
      limits: {
        clients: {
          current: usage.activeClients,
          limit: subscription.maxClients,
          percentage: Math.round(clientsPercent * 100),
          isNearLimit: clientsPercent >= this.UPSELL_THRESHOLD,
          remaining: subscription.maxClients - usage.activeClients,
        },
        instances: {
          current: usage.activeInstances,
          limit: subscription.maxInstances,
          percentage: Math.round(instancesPercent * 100),
          isNearLimit: instancesPercent >= this.UPSELL_THRESHOLD,
          remaining: subscription.maxInstances - usage.activeInstances,
        },
        storage: {
          current: usage.storageUsedGb,
          limit: subscription.maxStorageGb,
          percentage: Math.round(storagePercent * 100),
          isNearLimit: storagePercent >= this.UPSELL_THRESHOLD,
          remaining: subscription.maxStorageGb - usage.storageUsedGb,
        },
      },
      highestUsagePercentage: Math.max(
        clientsPercent,
        instancesPercent,
        storagePercent,
      ),
    };
  }

  /**
   * Determine if an upsell banner should be shown
   */
  async shouldSuggestUpsell(tenantId: number): Promise<UpsellBanner | null> {
    const limitStatus = await this.checkLimits(tenantId);

    // Don't show if no limits are near threshold
    if (limitStatus.highestUsagePercentage < this.UPSELL_THRESHOLD) {
      return null;
    }

    // Check if user has dismissed banner recently
    const lastDismissed = await this.getLastBannerDismissed(tenantId);
    if (lastDismissed) {
      const hoursSinceDismissed =
        (Date.now() - lastDismissed.getTime()) / (1000 * 60 * 60);
      if (hoursSinceDismissed < this.BANNER_COOLDOWN_HOURS) {
        return null;
      }
    }

    // Determine which limit triggered the upsell
    let triggerType: 'clients' | 'instances' | 'storage' = 'clients';
    let triggerPercentage = 0;

    if (limitStatus.limits.clients.percentage >= triggerPercentage) {
      triggerType = 'clients';
      triggerPercentage = limitStatus.limits.clients.percentage;
    }
    if (limitStatus.limits.instances.percentage > triggerPercentage) {
      triggerType = 'instances';
      triggerPercentage = limitStatus.limits.instances.percentage;
    }
    if (limitStatus.limits.storage.percentage > triggerPercentage) {
      triggerType = 'storage';
      triggerPercentage = limitStatus.limits.storage.percentage;
    }

    // Get A/B test variant
    const variant = await this.getABTestVariant(tenantId, triggerType);

    // Generate personalized message
    const message = this.generateBannerMessage(
      triggerType,
      triggerPercentage,
      variant,
    );

    return {
      show: true,
      type: triggerType,
      percentage: triggerPercentage,
      message,
      variant,
      priority: this.calculatePriority(triggerPercentage),
      ctaText: variant === 'discount' ? 'Upgrade & Save 20%' : 'Upgrade Now',
      dismissible: true,
    };
  }

  /**
   * Get available upgrade options with pricing
   */
  async getUpsellOptions(tenantId: number): Promise<UpsellOption[]> {
    const subscription = await this.getTenantSubscription(tenantId);
    const usage = await this.getCurrentUsage(tenantId);

    // Get all available plans that are upgrades
    const availablePlans = await this.getAvailablePlans(
      tenantId,
      subscription.planId,
    );

    const options: UpsellOption[] = [];

    for (const plan of availablePlans) {
      // Calculate savings and benefits
      const monthlySavings = this.calculateMonthlySavings(
        subscription,
        plan,
        usage,
      );
      const annualSavings = monthlySavings * 12;
      const benefits = this.calculateBenefits(plan, subscription);

      // Generate recommendation score
      const recommendationScore = this.calculateRecommendationScore(
        usage,
        subscription,
        plan,
      );

      options.push({
        planId: plan.id,
        planName: plan.name,
        currentPrice: subscription.price,
        upgradePrice: plan.price,
        priceDifference: plan.price - subscription.price,
        billingCycle: plan.billingCycle,
        monthlySavings,
        annualSavings,
        benefits,
        features: plan.features,
        limits: {
          clients: plan.maxClients,
          instances: plan.maxInstances,
          storage: plan.maxStorageGb,
        },
        recommendationScore,
        isRecommended: recommendationScore > 80,
        discountInfo: await this.getDiscountInfo(tenantId, plan.id),
      });
    }

    // Sort by recommendation score
    return options.sort((a, b) => b.recommendationScore - a.recommendationScore);
  }

  /**
   * Track upsell banner view
   */
  async trackUpsellView(
    tenantId: number,
    userId: number,
    option: TrackUpsellDto,
  ): Promise<void> {
    await this.db.query<ResultSetHeader>(
      `INSERT INTO upsell_analytics 
       (tenant_id, user_id, event_type, trigger_type, variant, page_url, session_id, created_at) 
       VALUES (?, ?, 'view', ?, ?, ?, ?, NOW())`,
      [
        tenantId,
        userId,
        option.triggerType,
        option.variant || 'default',
        option.pageUrl || null,
        option.sessionId || null,
      ],
    );
  }

  /**
   * Track upsell banner click
   */
  async trackUpsellClick(
    tenantId: number,
    userId: number,
    option: TrackUpsellDto,
  ): Promise<void> {
    await this.db.query<ResultSetHeader>(
      `INSERT INTO upsell_analytics 
       (tenant_id, user_id, event_type, trigger_type, variant, page_url, session_id, clicked_plan_id, created_at) 
       VALUES (?, ?, 'click', ?, ?, ?, ?, ?, NOW())`,
      [
        tenantId,
        userId,
        option.triggerType,
        option.variant || 'default',
        option.pageUrl || null,
        option.sessionId || null,
        option.clickedPlanId || null,
      ],
    );

    // Update click-through rate for A/B testing
    await this.updateABTestMetrics(option.variant || 'default', 'click');
  }

  /**
   * Track upsell conversion (upgrade completed)
   */
  async trackUpsellConversion(
    tenantId: number,
    userId: number,
    fromPlanId: number,
    toPlanId: number,
    amount: number,
  ): Promise<void> {
    await this.db.query<ResultSetHeader>(
      `INSERT INTO upsell_conversions 
       (tenant_id, user_id, from_plan_id, to_plan_id, amount, converted_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [tenantId, userId, fromPlanId, toPlanId, amount],
    );

    // Update conversion rate for A/B testing
    const lastView = await this.getLastUpsellView(tenantId, userId);
    if (lastView) {
      await this.updateABTestMetrics(lastView.variant, 'conversion');
    }
  }

  /**
   * Get conversion analytics
   */
  async getConversionStats(tenantId: number): Promise<UpsellStats> {
    // Get view stats
    const viewStats = await this.db.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_views,
        COUNT(DISTINCT user_id) as unique_users,
        trigger_type,
        variant
       FROM upsell_analytics 
       WHERE tenant_id = ? AND event_type = 'view' 
       AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY trigger_type, variant`,
      [tenantId],
    );

    // Get click stats
    const clickStats = await this.db.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_clicks,
        COUNT(DISTINCT user_id) as unique_users,
        trigger_type,
        variant
       FROM upsell_analytics 
       WHERE tenant_id = ? AND event_type = 'click' 
       AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY trigger_type, variant`,
      [tenantId],
    );

    // Get conversion stats
    const conversionStats = await this.db.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_conversions,
        SUM(amount) as total_revenue,
        from_plan_id,
        to_plan_id
       FROM upsell_conversions 
       WHERE tenant_id = ? 
       AND converted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY from_plan_id, to_plan_id`,
      [tenantId],
    );

    // Calculate overall conversion rate
    const totalViews = viewStats.reduce((sum, row) => sum + row.total_views, 0);
    const totalClicks = clickStats.reduce((sum, row) => sum + row.total_clicks, 0);
    const totalConversions = conversionStats.reduce(
      (sum, row) => sum + row.total_conversions,
      0,
    );
    const totalRevenue = conversionStats.reduce(
      (sum, row) => sum + parseFloat(row.total_revenue || 0),
      0,
    );

    // A/B test results
    const abTestResults = await this.getABTestResults(tenantId);

    return {
      period: '30d',
      summary: {
        totalViews,
        totalClicks,
        totalConversions,
        totalRevenue,
        clickThroughRate: totalViews > 0 ? (totalClicks / totalViews) * 100 : 0,
        conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
        revenuePerView: totalViews > 0 ? totalRevenue / totalViews : 0,
      },
      byTriggerType: this.aggregateByTriggerType(viewStats, clickStats),
      byVariant: this.aggregateByVariant(viewStats, clickStats, conversionStats),
      conversions: conversionStats.map((row) => ({
        fromPlanId: row.from_plan_id,
        toPlanId: row.to_plan_id,
        count: row.total_conversions,
        revenue: parseFloat(row.total_revenue || 0),
      })),
      abTestResults,
    };
  }

  /**
   * Dismiss upsell banner
   */
  async dismissBanner(tenantId: number, userId: number): Promise<void> {
    await this.db.query<ResultSetHeader>(
      `INSERT INTO upsell_banner_dismissals 
       (tenant_id, user_id, dismissed_at) 
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE dismissed_at = NOW()`,
      [tenantId, userId],
    );
  }

  // Private helper methods

  private async getTenantSubscription(
    tenantId: number,
  ): Promise<TenantSubscription> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT 
        sp.plan_id,
        p.name as plan_name,
        COALESCE(p.max_clients, 100) as max_clients,
        COALESCE(p.max_instances, 5) as max_instances,
        COALESCE(p.max_storage_gb, 50) as max_storage_gb,
        p.price,
        sp.billing_cycle
       FROM subscription_plans sp
       JOIN plans p ON sp.plan_id = p.id
       WHERE sp.tenant_id = ? AND sp.status = 'active'
       LIMIT 1`,
      [tenantId],
    );

    if (rows.length === 0) {
      // Return default free plan limits
      return {
        planId: 0,
        planName: 'Free',
        maxClients: 10,
        maxInstances: 1,
        maxStorageGb: 5,
        price: 0,
        billingCycle: 'monthly',
      };
    }

    return {
      planId: rows[0].plan_id,
      planName: rows[0].plan_name,
      maxClients: rows[0].max_clients,
      maxInstances: rows[0].max_instances,
      maxStorageGb: rows[0].max_storage_gb,
      price: parseFloat(rows[0].price),
      billingCycle: rows[0].billing_cycle,
    };
  }

  private async getCurrentUsage(tenantId: number): Promise<CurrentUsage> {
    // Count active clients
    const clientRows = await this.db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count 
       FROM clients 
       WHERE tenant_id = ? AND status = 'active'`,
      [tenantId],
    );

    // Count active XUI instances
    const instanceRows = await this.db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count 
       FROM xui_instances 
       WHERE tenant_id = ? AND is_active = TRUE`,
      [tenantId],
    );

    // Calculate storage used (sum of backup sizes + VOD content)
    const storageRows = await this.db.query<RowDataPacket[]>(
      `SELECT 
        COALESCE(SUM(file_size), 0) as backup_size
       FROM backups 
       WHERE tenant_id = ? AND status = 'completed'`,
      [tenantId],
    );

    // Convert bytes to GB
    const storageUsedGb = Math.round(
      (parseInt(storageRows[0]?.backup_size || 0) / (1024 * 1024 * 1024)) * 100,
    ) / 100;

    return {
      activeClients: clientRows[0]?.count || 0,
      activeInstances: instanceRows[0]?.count || 0,
      storageUsedGb,
    };
  }

  private async getLastBannerDismissed(
    tenantId: number,
  ): Promise<Date | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT dismissed_at 
       FROM upsell_banner_dismissals 
       WHERE tenant_id = ? 
       ORDER BY dismissed_at DESC 
       LIMIT 1`,
      [tenantId],
    );

    return rows.length > 0 ? new Date(rows[0].dismissed_at) : null;
  }

  private async getABTestVariant(
    tenantId: number,
    triggerType: string,
  ): Promise<string> {
    // Simple A/B test: assign based on tenant ID parity
    // In production, use a proper A/B testing service
    const variants = ['default', 'urgency', 'discount', 'social-proof'];
    const hash = tenantId % variants.length;
    return variants[hash];
  }

  private generateBannerMessage(
    triggerType: string,
    percentage: number,
    variant: string,
  ): string {
    const messages: Record<string, Record<string, string>> = {
      default: {
        clients: `You've used ${percentage}% of your client limit. Upgrade to add more clients.`,
        instances: `You've used ${percentage}% of your server instances. Upgrade for more capacity.`,
        storage: `You've used ${percentage}% of your storage. Upgrade for more space.`,
      },
      urgency: {
        clients: `⚠️ Almost at capacity! ${percentage}% of client slots used. Upgrade now to avoid interruptions.`,
        instances: `⚠️ Server capacity at ${percentage}%! Upgrade before you hit the limit.`,
        storage: `⚠️ Storage at ${percentage}%! Don't run out of space - upgrade today.`,
      },
      discount: {
        clients: `🎉 You're growing fast! ${percentage}% of clients added. Upgrade now and save 20% on your first month.`,
        instances: `🚀 Scale up and save! ${percentage}% capacity used. Get 20% off when you upgrade today.`,
        storage: `📈 Growing needs? ${percentage}% storage used. Upgrade now for 20% savings!`,
      },
      'social-proof': {
        clients: `🌟 ${percentage}% of your client capacity used. Join 500+ businesses that upgraded this month!`,
        instances: `💪 ${percentage}% capacity reached. See why top businesses choose our premium plans.`,
        storage: `📊 ${percentage}% storage used. Upgrade like 1000+ successful businesses did this week.`,
      },
    };

    return messages[variant]?.[triggerType] || messages.default[triggerType];
  }

  private calculatePriority(percentage: number): 'low' | 'medium' | 'high' {
    if (percentage >= 95) return 'high';
    if (percentage >= 85) return 'medium';
    return 'low';
  }

  private async getAvailablePlans(
    tenantId: number,
    currentPlanId: number,
  ): Promise<AvailablePlan[]> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT 
        id,
        name,
        COALESCE(max_clients, 100) as max_clients,
        COALESCE(max_instances, 5) as max_instances,
        COALESCE(max_storage_gb, 50) as max_storage_gb,
        price,
        'monthly' as billing_cycle,
        features_json as features
       FROM plans 
       WHERE (tenant_id = ? OR tenant_id IS NULL)
       AND is_active = TRUE
       AND id > ?
       ORDER BY price ASC`,
      [tenantId, currentPlanId],
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      maxClients: row.max_clients,
      maxInstances: row.max_instances,
      maxStorageGb: row.max_storage_gb,
      price: parseFloat(row.price),
      billingCycle: row.billing_cycle,
      features: row.features ? JSON.parse(row.features) : [],
    }));
  }

  private calculateMonthlySavings(
    current: TenantSubscription,
    upgrade: AvailablePlan,
    usage: CurrentUsage,
  ): number {
    // Calculate potential savings from efficiency
    // Example: fewer overage fees, better resource utilization
    const overageRisk = this.calculateOverageRisk(current, usage);
    const efficiencyGain = (upgrade.price - current.price) * 0.1; // 10% efficiency

    return Math.max(0, overageRisk - efficiencyGain);
  }

  private calculateOverageRisk(
    subscription: TenantSubscription,
    usage: CurrentUsage,
  ): number {
    let risk = 0;

    // Estimate overage costs if they exceed limits
    if (usage.activeClients > subscription.maxClients) {
      risk += (usage.activeClients - subscription.maxClients) * 5; // $5 per extra client
    }
    if (usage.activeInstances > subscription.maxInstances) {
      risk += (usage.activeInstances - subscription.maxInstances) * 20; // $20 per extra instance
    }
    if (usage.storageUsedGb > subscription.maxStorageGb) {
      risk += (usage.storageUsedGb - subscription.maxStorageGb) * 0.5; // $0.50 per extra GB
    }

    return risk;
  }

  private calculateBenefits(
    upgrade: AvailablePlan,
    current: TenantSubscription,
  ): string[] {
    const benefits: string[] = [];

    if (upgrade.maxClients > current.maxClients) {
      const diff = upgrade.maxClients - current.maxClients;
      benefits.push(`+${diff} additional client slots`);
    }
    if (upgrade.maxInstances > current.maxInstances) {
      const diff = upgrade.maxInstances - current.maxInstances;
      benefits.push(`+${diff} additional server instances`);
    }
    if (upgrade.maxStorageGb > current.maxStorageGb) {
      const diff = upgrade.maxStorageGb - current.maxStorageGb;
      benefits.push(`+${diff}GB additional storage`);
    }

    return benefits;
  }

  private calculateRecommendationScore(
    usage: CurrentUsage,
    current: TenantSubscription,
    upgrade: AvailablePlan,
  ): number {
    let score = 50; // Base score

    // Usage proximity boost
    const clientsRatio = usage.activeClients / current.maxClients;
    const instancesRatio = usage.activeInstances / current.maxInstances;
    const storageRatio = usage.storageUsedGb / current.maxStorageGb;

    score += Math.max(clientsRatio, instancesRatio, storageRatio) * 30;

    // Headroom value
    const headroom =
      (upgrade.maxClients - usage.activeClients) / upgrade.maxClients;
    score += headroom * 10;

    // Price efficiency
    const pricePerClient = upgrade.price / upgrade.maxClients;
    const currentPricePerClient = current.price / current.maxClients;
    if (pricePerClient < currentPricePerClient) {
      score += 10; // Better value
    }

    return Math.min(100, Math.round(score));
  }

  private async getDiscountInfo(
    tenantId: number,
    planId: number,
  ): Promise<{ code: string; percentage: number; validUntil: Date } | null> {
    // Check for active promotions
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT 
        code,
        discount_percentage,
        valid_until
       FROM promotions 
       WHERE is_active = TRUE 
       AND valid_until > NOW()
       AND (applicable_plan_id = ? OR applicable_plan_id IS NULL)
       ORDER BY discount_percentage DESC
       LIMIT 1`,
      [planId],
    );

    if (rows.length === 0) {
      return null;
    }

    return {
      code: rows[0].code,
      percentage: rows[0].discount_percentage,
      validUntil: new Date(rows[0].valid_until),
    };
  }

  private async getLastUpsellView(
    tenantId: number,
    userId: number,
  ): Promise<{ variant: string } | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT variant 
       FROM upsell_analytics 
       WHERE tenant_id = ? AND user_id = ? AND event_type = 'view'
       ORDER BY created_at DESC 
       LIMIT 1`,
      [tenantId, userId],
    );

    return rows.length > 0 ? { variant: rows[0].variant } : null;
  }

  private async updateABTestMetrics(
    variant: string,
    event: 'click' | 'conversion',
  ): Promise<void> {
    // Update metrics for A/B testing analysis
    await this.db.query(
      `INSERT INTO ab_test_metrics 
       (variant, event_type, count, last_updated) 
       VALUES (?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE 
       count = count + 1, 
       last_updated = NOW()`,
      [variant, event],
    );
  }

  private async getABTestResults(tenantId: number): Promise<any[]> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT 
        variant,
        event_type,
        count
       FROM ab_test_metrics 
       WHERE last_updated >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       ORDER BY variant, event_type`,
    );

    const results: Record<string, any> = {};

    for (const row of rows) {
      if (!results[row.variant]) {
        results[row.variant] = { variant: row.variant, views: 0, clicks: 0, conversions: 0 };
      }
      results[row.variant][row.event_type === 'view' ? 'views' : 
                         row.event_type === 'click' ? 'clicks' : 'conversions'] = row.count;
    }

    return Object.values(results).map((r: any) => ({
      ...r,
      clickThroughRate: r.views > 0 ? (r.clicks / r.views) * 100 : 0,
      conversionRate: r.clicks > 0 ? (r.conversions / r.clicks) * 100 : 0,
    }));
  }

  private aggregateByTriggerType(
    viewStats: RowDataPacket[],
    clickStats: RowDataPacket[],
  ): Record<string, { views: number; clicks: number; ctr: number }> {
    const result: Record<string, { views: number; clicks: number; ctr: number }> = {};

    for (const row of viewStats) {
      const type = row.trigger_type;
      if (!result[type]) {
        result[type] = { views: 0, clicks: 0, ctr: 0 };
      }
      result[type].views += row.total_views;
    }

    for (const row of clickStats) {
      const type = row.trigger_type;
      if (!result[type]) {
        result[type] = { views: 0, clicks: 0, ctr: 0 };
      }
      result[type].clicks += row.total_clicks;
    }

    for (const key of Object.keys(result)) {
      result[key].ctr =
        result[key].views > 0 ? (result[key].clicks / result[key].views) * 100 : 0;
    }

    return result;
  }

  private aggregateByVariant(
    viewStats: RowDataPacket[],
    clickStats: RowDataPacket[],
    conversionStats: RowDataPacket[],
  ): Record<string, { views: number; clicks: number; conversions: number; rate: number }> {
    const result: Record<string, { views: number; clicks: number; conversions: number; rate: number }> = {};

    for (const row of viewStats) {
      const variant = row.variant;
      if (!result[variant]) {
        result[variant] = { views: 0, clicks: 0, conversions: 0, rate: 0 };
      }
      result[variant].views += row.total_views;
    }

    for (const row of clickStats) {
      const variant = row.variant;
      if (!result[variant]) {
        result[variant] = { views: 0, clicks: 0, conversions: 0, rate: 0 };
      }
      result[variant].clicks += row.total_clicks;
    }

    // Note: conversions are tracked separately, not by variant in this simplified model
    // In production, you'd track the variant through the conversion funnel

    for (const key of Object.keys(result)) {
      result[key].rate =
        result[key].views > 0 ? (result[key].clicks / result[key].views) * 100 : 0;
    }

    return result;
  }
}
