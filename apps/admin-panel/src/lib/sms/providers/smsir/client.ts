import type { SmsirProviderConfig } from "@/lib/sms/types";

export const SMSIR_BASE_URL = "https://api.sms.ir/v1";

export const SMSIR_STATUS_MESSAGES: Record<number, string> = {
  0: "مشکلی در سامانه رخ داده است",
  1: "موفق",
  10: "کلید وب‌سرویس نامعتبر است",
  11: "کلید وب‌سرویس غیرفعال است",
  12: "کلید وب‌سرویس محدود به IPهای تعریف‌شده است",
  13: "حساب کاربری غیرفعال است",
  14: "حساب کاربری در حالت تعلیق است",
  20: "تعداد درخواست بیشتر از حد مجاز است",
  101: "شماره خط نامعتبر است",
  102: "اعتبار کافی نیست",
  103: "متن پیام خالی است",
  104: "شماره موبایل نادرست است",
  105: "تعداد موبایل‌ها بیشتر از حد مجاز است",
  106: "تعداد متن‌ها بیشتر از حد مجاز است",
  107: "لیست موبایل‌ها خالی است",
  108: "لیست متن‌ها خالی است",
  109: "زمان ارسال نامعتبر است",
  110: "تعداد موبایل و متن برابر نیست",
  111: "با این شناسه ارسالی ثبت نشده است",
  112: "رکوردی برای حذف یافت نشد",
  113: "قالب یافت نشد",
  114: "طول مقدار پارامتر بیش از حد مجاز است",
  115: "شماره در لیست سیاه است",
  116: "نام پارامتر خالی است",
  117: "متن ارسال‌شده مورد تایید نیست",
  118: "تعداد پیام‌ها بیش از حد مجاز است",
  119: "برای قالب شخصی‌سازی‌شده پلن را ارتقا دهید",
  123: "خط ارسال‌کننده نیاز به فعال‌سازی دارد",
};

export const SMSIR_DELIVERY_STATE_LABELS: Record<number, string> = {
  1: "رسیده به گوشی",
  2: "نرسیده به گوشی",
  3: "پردازش در مخابرات",
  4: "نرسیده به مخابرات",
  5: "رسیده به مخابرات",
  6: "خطا",
  7: "لیست سیاه",
};

export interface SmsirApiResponse<T = unknown> {
  status: number;
  message: string;
  data: T;
}

export class SmsirApiError extends Error {
  readonly status: number;
  readonly httpStatus?: number;
  readonly raw?: unknown;

  constructor(status: number, message: string, httpStatus?: number, raw?: unknown) {
    super(message);
    this.name = "SmsirApiError";
    this.status = status;
    this.httpStatus = httpStatus;
    this.raw = raw;
  }
}

export function normalizeSmsirMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  if (digits.startsWith("98") && digits.length === 12) return digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) return digits.slice(1);
  return digits;
}

export function parseSmsirConfig(config: Record<string, unknown>): SmsirProviderConfig {
  return {
    apiKey: String(config.apiKey ?? ""),
    lineNumber: String(config.lineNumber ?? ""),
    verifyTemplateId: String(config.verifyTemplateId ?? ""),
    otpParamName: String(config.otpParamName ?? "CODE"),
    sandbox: Boolean(config.sandbox ?? false),
  };
}

export async function smsirRequest<T>(
  apiKey: string,
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<SmsirApiResponse<T>> {
  if (!apiKey.trim()) {
    throw new SmsirApiError(10, SMSIR_STATUS_MESSAGES[10]);
  }

  const response = await fetch(`${SMSIR_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-api-key": apiKey,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  let payload: SmsirApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as SmsirApiResponse<T>;
  } catch {
    throw new SmsirApiError(0, "پاسخ نامعتبر از SMS.ir", response.status);
  }

  if (!response.ok || payload.status !== 1) {
    const status = payload.status ?? 0;
    const message =
      payload.message || SMSIR_STATUS_MESSAGES[status] || `خطای SMS.ir (${status})`;
    throw new SmsirApiError(status, message, response.status, payload);
  }

  return payload;
}
