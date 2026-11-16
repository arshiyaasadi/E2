export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

export type AuthUserResponse = {
  userId: string;
  username: string;
  displayName: string;
  firstName: string;
  lastName: string;
  mobile: string;
  shopName: string | null;
  avatarUrl: string | null;
  mustChangePassword: boolean;
  currency: "rial";
  /** Thin Prisma Profile fields (SSO identity remains Keycloak). */
  inviteCode: string | null;
  isSuperAdmin: boolean;
  profileId: string | null;
};

export type BusinessLinkResponse = {
  id: string;
  title: string;
  url: string;
  sortOrder: number;
};

export type BusinessResponse = {
  id: string;
  code: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  color: string | null;
  assignedAt: string;
  createdAt: string;
  updatedAt: string;
  links: BusinessLinkResponse[];
};

export type BusinessMemberResponse = {
  membershipId: string;
  role: "MANAGER" | "ASSISTANT";
  inviteCode: string;
  displayName: string | null;
  profileId: string;
};

export type LoginSessionResponse = {
  id: string;
  createdAt: string;
  deviceLabel: string;
  ip: string | null;
};

export type FileSpaceUsageResponse = {
  id: string;
  kind: "USER" | "BUSINESS";
  ownerProfileId: string | null;
  businessId: string | null;
  quotaBytes: string;
  usedBytes: string;
  remainingBytes: string;
  updatedAt: string;
};

export type TelegramBindingResponse = {
  id: string;
  businessId: string;
  telegramChatId: string | null;
  telegramUserId: string | null;
  registeredByProfileId: string;
  status: "PENDING" | "ACTIVE" | "REVOKED";
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TelegramIngestConfigResponse = {
  storeText: boolean;
  downloadPhoto: boolean;
  downloadDocument: boolean;
  downloadVideo: boolean;
  downloadAudio: boolean;
  maxMediaBytes: string;
  updatedAt: string;
};

export type BusinessTelegramStateResponse = {
  binding: TelegramBindingResponse | null;
  config: TelegramIngestConfigResponse;
  usage: FileSpaceUsageResponse;
  deepLink: string | null;
  botUsername: string;
  businessCode: string;
};
