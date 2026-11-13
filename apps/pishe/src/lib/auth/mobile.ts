const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Convert Persian/Arabic digits to Latin, strip non-digits later via normalize. */
export function toLatinDigits(input: string): string {
  return input
    .split("")
    .map((ch) => {
      const p = PERSIAN_DIGITS.indexOf(ch);
      if (p >= 0) return String(p);
      const a = ARABIC_DIGITS.indexOf(ch);
      if (a >= 0) return String(a);
      return ch;
    })
    .join("");
}

/** Normalize Iranian mobile to 09xxxxxxxxx username form. */
export function normalizeIranMobile(input: string): string | null {
  const digits = toLatinDigits(input).replace(/[^\d]/g, "");
  let normalized = digits;

  if (normalized.startsWith("0098") && normalized.length === 14) {
    normalized = `0${normalized.slice(4)}`;
  } else if (normalized.startsWith("98") && normalized.length === 12) {
    normalized = `0${normalized.slice(2)}`;
  } else if (normalized.length === 10 && normalized.startsWith("9")) {
    normalized = `0${normalized}`;
  }

  if (!/^09\d{9}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

export function generateTempPassword(length = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return `A1${out.slice(2)}`;
}
