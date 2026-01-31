export interface TelegramConfig {
  id: number;
  tenantId: number;
  botToken: string | null;
  botUsername: string | null;
  defaultChatId: string | null;
  webhookUrl: string | null;
  isActive: boolean;
  welcomeMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TelegramChannel {
  id: number;
  tenantId: number;
  channelId: string;
  channelName: string;
  channelType: string | null;
  description: string | null;
  isActive: boolean;
  requiresAdult: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TelegramMessage {
  id: number;
  tenantId: number;
  channelId: number | null;
  chatId: string;
  messageText: string;
  mediaUrl: string | null;
  mediaType: string | null;
  status: 'pending' | 'sent' | 'failed';
  telegramMessageId: string | null;
  errorMessage: string | null;
  sentAt: Date | null;
  createdAt: Date;
}

export interface SendTelegramMessageDto {
  channelId?: number;
  chatId?: string;
  messageText: string;
  mediaUrl?: string;
  mediaType?: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}
