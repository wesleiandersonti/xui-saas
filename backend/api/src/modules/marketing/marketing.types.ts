export type PostType = 'game' | 'promotion' | 'announcement' | 'reminder';
export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';

export interface DailyGame {
  id: number;
  tenantId: number;
  gameDate: Date;
  homeTeam: string;
  awayTeam: string;
  competition: string | null;
  gameTime: string | null;
  channelMapping: string | null;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketingPost {
  id: number;
  tenantId: number;
  postType: PostType;
  title: string;
  content: string | null;
  mediaUrl: string | null;
  scheduledFor: Date | null;
  postedAt: Date | null;
  status: PostStatus;
  telegramChannelId: number | null;
  createdAt: Date;
  updatedAt: Date;
}
