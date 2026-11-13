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
};

export type LoginSessionResponse = {
  id: string;
  createdAt: string;
  deviceLabel: string;
  ip: string | null;
};
