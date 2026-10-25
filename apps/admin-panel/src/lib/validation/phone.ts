import { normalizeCustomerPhone } from "@/config/customer-auth";

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Iranian mobile: 09XXXXXXXXX (11 digits). */
export const IRAN_MOBILE_MAX_LENGTH = 11;

/** Convert Persian/Arabic numerals to ASCII digits. */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (char) => String(PERSIAN_DIGITS.indexOf(char)))
    .replace(/[٠-٩]/g, (char) => String(ARABIC_DIGITS.indexOf(char)));
}

/** Normalize raw keystrokes into a bounded Iranian mobile string. */
export function formatPhoneInputValue(raw: string): string {
  let digits = toLatinDigits(raw).replace(/\D/g, "");

  if (digits.startsWith("98")) {
    digits = `0${digits.slice(2)}`;
  }

  if (digits.startsWith("9") && !digits.startsWith("09")) {
    digits = `0${digits}`;
  }

  if (digits.length > 0 && !digits.startsWith("0")) {
    digits = "";
  }

  if (digits.length > 1 && !digits.startsWith("09") && digits.startsWith("0")) {
    const second = digits[1];
    if (second !== "9") {
      digits = `09${digits.slice(2)}`.slice(0, IRAN_MOBILE_MAX_LENGTH);
    }
  }

  return digits.slice(0, IRAN_MOBILE_MAX_LENGTH);
}

export type PhoneValidationState = "empty" | "incomplete" | "invalid" | "valid";

export function getPhoneValidationState(raw: string): PhoneValidationState {
  const formatted = formatPhoneInputValue(raw);
  if (!formatted) return "empty";
  if (formatted.length < IRAN_MOBILE_MAX_LENGTH) return "incomplete";
  return isValidIranianMobile(formatted) ? "valid" : "invalid";
}

export function isValidIranianMobile(raw: string): boolean {
  return normalizeCustomerPhone(raw) !== null;
}

export function formatPhoneDisplay(raw: string): string {
  const normalized = normalizeCustomerPhone(raw);
  return normalized ?? formatPhoneInputValue(raw);
}

/** @deprecated Use formatPhoneInputValue */
export function sanitizePhoneInput(raw: string): string {
  return formatPhoneInputValue(raw);
}

