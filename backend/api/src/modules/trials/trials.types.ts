export interface Trial {
  id: number;
  tenantId: number;
  userId: number;
  planId: number;
  status: 'active' | 'expired' | 'converted';
  startedAt: Date;
  expiresAt: Date;
  convertedToPaid: boolean;
  convertedAt: Date | null;
  paymentId: number | null;
  reminderSent3days: boolean;
  reminderSent1day: boolean;
  reminderSentExpired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTrialDto {
  tenantId: number;
  userId: number;
  planId: number;
  durationDays?: number;
}

export interface StartTrialDto {
  tenantId: number;
  email: string;
  password: string;
  planId: number;
  durationDays?: number;
}

export interface TrialStatusResponse {
  hasTrial: boolean;
  isActive: boolean;
  daysRemaining: number;
  expiresAt: Date | null;
  canStartTrial: boolean;
}

export interface ConvertTrialDto {
  paymentId: number;
}

export interface ExpireTrialsDto {
  trialIds?: number[];
  expireAllExpired?: boolean;
}

export interface TrialListQuery {
  status?: 'active' | 'expired' | 'converted';
  limit?: number;
  offset?: number;
}

export interface TrialListResponse {
  trials: Trial[];
  total: number;
  limit: number;
  offset: number;
}
