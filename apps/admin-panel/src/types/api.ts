export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  userId: string;
  email: string;
  fullName: string | null;
  role: string;
  permissions: string[];
}

export interface CustomerSendOtpRequest {
  phone: string;
}

export interface CustomerSendOtpResponse {
  sent: boolean;
  expiresIn: number;
  exists: boolean;
  hasPassword: boolean;
  devHint?: string;
}

export interface CustomerCheckPhoneResponse {
  exists: boolean;
  hasPassword: boolean;
}

export type CustomerVerifyOtpIntent = "login" | "reset";

export interface CustomerVerifyOtpRequest {
  phone: string;
  code: string;
  intent?: CustomerVerifyOtpIntent;
}

export interface CustomerVerifyOtpResetResponse {
  verified: true;
}

export interface CustomerVerifyOtpResponse {
  requiresProfile: boolean;
  phone?: string;
  auth?: CustomerAuthResponse;
  verified?: boolean;
}

export interface CustomerCompleteProfileRequest {
  phone: string;
  code: string;
  firstName: string;
  lastName: string;
  password?: string;
}

export interface CustomerUpdateProfileRequest {
  firstName: string;
  lastName: string;
}

export interface CustomerLoginPasswordRequest {
  phone: string;
  password: string;
}

export interface CustomerResetPasswordRequest {
  phone: string;
  code: string;
  password: string;
  passwordConfirm: string;
}

export interface CustomerAuthResponse {
  userId: string;
  email: string;
  phone: string;
  fullName: string | null;
  role: string;
}
