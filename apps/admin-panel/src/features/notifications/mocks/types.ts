export type NotificationChannel = "in_app" | "sms";

export type MessageStatus =
  | "Accepted"
  | "Scheduled"
  | "Queued"
  | "InProgress"
  | "Delivered"
  | "Failed"
  | "Rejected";

export type NormalizedErrorCategory =
  | "invalid_recipient"
  | "user_disabled"
  | "validation"
  | "rate_limited"
  | "provider_transient"
  | "provider_permanent"
  | "internal";

export type MockMessageLog = {
  id: string;
  sourceService: string;
  recipientUserId: string;
  channel: NotificationChannel;
  templateKey: string;
  templateParams: Record<string, string>;
  renderedContent: string | null;
  scheduledAt: string | null;
  acceptedAt: string;
  executedAt: string | null;
  status: MessageStatus;
  statusHistory: Array<{ status: MessageStatus; at: string }>;
  retryCount: number;
  providerReference: string | null;
  correlationRef: string | null;
  manual: boolean;
  adminId: string | null;
  errorCategory: NormalizedErrorCategory | null;
  errorMessage: string | null;
  priority: "high" | "normal" | "low";
};

export type MockTemplate = {
  key: string;
  label: string;
  channels: NotificationChannel[];
  paramKeys: string[];
};

export type SmsIrMockConfig = {
  apiKeySet: boolean;
  apiKeyMasked: string;
  lineNumber: string;
  verifyTemplateId: string;
  credit: number;
  lines: string[];
};

export type NotificationsMockState = {
  messages: MockMessageLog[];
  templates: MockTemplate[];
  smsir: SmsIrMockConfig;
};
