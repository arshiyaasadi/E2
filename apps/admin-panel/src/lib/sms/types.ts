export type SmsProviderCode = "smsir" | "console";

export type SmsChannel =
  | "verify"
  | "bulk"
  | "like_to_like"
  | "url"
  | "scheduled_cancel";

export type SmsFeatureId =
  | "verify"
  | "bulk"
  | "likeToLike"
  | "scheduled"
  | "cancelScheduled"
  | "messageStatus"
  | "packReports"
  | "liveReports"
  | "archiveReports"
  | "receive"
  | "credit"
  | "lines"
  | "sandbox";

export interface SmsFeatureMeta {
  id: SmsFeatureId;
  supported: boolean;
}

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  packId?: string;
  messageIds?: Array<string | null>;
  cost?: number;
  errorCode?: string | number;
  errorMessage?: string;
  raw?: unknown;
}

export interface SmsDeliveryStatus {
  messageId: string;
  mobile?: string;
  messageText?: string;
  sendDateTime?: number;
  lineNumber?: string;
  cost?: number;
  deliveryState?: number | null;
  deliveryDateTime?: number | null;
  raw?: unknown;
}

export interface SmsPackSummary {
  packId: string;
  recipientCount: number;
  creationDateTime: number;
}

export interface SmsReceivedMessage {
  receiveReturnId?: string;
  mobile: string;
  messageText: string;
  number?: string;
  receivedDateTime: number;
}

export interface SmsVerifyInput {
  mobile: string;
  templateId: string | number;
  parameters: Array<{ name: string; value: string }>;
}

export interface SmsBulkInput {
  lineNumber: string | number;
  messageText: string;
  mobiles: string[];
  sendDateTime?: number | null;
}

export interface SmsLikeToLikeInput {
  lineNumber: string | number;
  messageTexts: string[];
  mobiles: string[];
  sendDateTime?: number | null;
}

export interface SmsArchiveQuery {
  fromDate?: number;
  toDate?: number;
  pageSize?: number;
  pageNumber?: number;
}

export interface SmsLiveQuery {
  pageSize?: number;
  pageNumber?: number;
  sortByNewest?: boolean;
}

export interface SmsProvider {
  readonly code: SmsProviderCode;
  readonly name: string;
  readonly features: SmsFeatureMeta[];

  sendVerify(input: SmsVerifyInput): Promise<SmsSendResult>;
  sendBulk(input: SmsBulkInput): Promise<SmsSendResult>;
  sendLikeToLike(input: SmsLikeToLikeInput): Promise<SmsSendResult>;
  cancelScheduled(packId: string): Promise<SmsSendResult>;

  getMessageStatus(messageId: string): Promise<SmsDeliveryStatus>;
  listTodayPacks(query?: SmsLiveQuery): Promise<SmsPackSummary[]>;
  getPackMessages(packId: string): Promise<SmsDeliveryStatus[]>;
  listLiveMessages(query?: SmsLiveQuery): Promise<SmsDeliveryStatus[]>;
  listArchiveMessages(query?: SmsArchiveQuery): Promise<SmsDeliveryStatus[]>;

  listLatestReceived(count?: number): Promise<SmsReceivedMessage[]>;
  listLiveReceived(query?: SmsLiveQuery): Promise<SmsReceivedMessage[]>;
  listArchiveReceived(query?: SmsArchiveQuery): Promise<SmsReceivedMessage[]>;

  getCredit(): Promise<number>;
  getLines(): Promise<string[]>;
}

export interface SmsirProviderConfig {
  apiKey: string;
  lineNumber: string;
  verifyTemplateId: string;
  otpParamName: string;
  sandbox: boolean;
}

export interface ConsoleProviderConfig {
  logOtp?: boolean;
}

export type SmsProviderConfig = SmsirProviderConfig | ConsoleProviderConfig | Record<string, unknown>;
