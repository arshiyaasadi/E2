/**
 * Display helpers: UI always shows Jalali; storage stays ISO/UTC.
 */

const JALALI_OPTS: Intl.DateTimeFormatOptions = {
  calendar: "persian",
  numberingSystem: "latn",
};

export function formatJalaliDateTime(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      ...JALALI_OPTS,
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Tehran",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

export function formatJalaliDate(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      ...JALALI_OPTS,
      dateStyle: "medium",
      timeZone: "Asia/Tehran",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

export function formatNowJalaliDateTime(): string {
  return formatJalaliDateTime(new Date());
}
