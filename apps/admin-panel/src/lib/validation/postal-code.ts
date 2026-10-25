/** Iranian national postal code (۱۰ رقم). */
import { toLatinDigits } from "@/lib/validation/phone";

export const IRAN_POSTAL_CODE_REGEX = /^(?!(\d)\1{3})[13-9]{4}[1346-9][013-9]{5}$/;

export function sanitizePostalCodeInput(raw: string): string {
  return toLatinDigits(raw).replace(/\D/g, "").slice(0, 10);
}

export function isValidIranPostalCode(raw: string): boolean {
  return IRAN_POSTAL_CODE_REGEX.test(toLatinDigits(raw).trim());
}
