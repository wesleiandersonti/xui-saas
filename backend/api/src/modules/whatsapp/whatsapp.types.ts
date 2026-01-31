export interface WhatsappConfig {
  id: number;
  tenantId: number;
  isActive: boolean;
  evolutionApiUrl: string | null;
  evolutionApiKey: string | null;
  instanceName: string | null;
  defaultTemplate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhatsappTemplate {
  id: number;
  tenantId: number;
  name: string;
  eventType: string;
  template: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhatsappLog {
  id: number;
  tenantId: number;
  templateId: number | null;
  phoneNumber: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  errorMessage: string | null;
  sentAt: Date | null;
  createdAt: Date;
}

export interface SendMessageDto {
  phoneNumber: string;
  message: string;
  templateId?: number;
}

export interface TemplateVariables {
  [key: string]: string;
}
