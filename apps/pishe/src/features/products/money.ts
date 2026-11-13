/** Store and APIs use integer rial. Display toman as rial / 10. */

const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toLatinDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(persianDigits.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => persianDigits[Number(d)] ?? d);
}

export function formatGroupedNumber(value: number): string {
  const abs = Math.abs(Math.trunc(value));
  const grouped = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const signed = value < 0 ? `-${grouped}` : grouped;
  return toPersianDigits(signed);
}

export function rialToToman(rial: number): number {
  return Math.trunc(rial / 10);
}

export function formatTomanFromRial(rial: number): string {
  return formatGroupedNumber(rialToToman(rial));
}

export function parseRialInput(raw: string): number | null {
  const cleaned = toLatinDigits(raw).replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.trunc(n);
}
