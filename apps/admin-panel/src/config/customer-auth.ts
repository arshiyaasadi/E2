/** Normalize Iranian mobile numbers to 09XXXXXXXXX. */
export function normalizeCustomerPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("09")) {
    return digits;
  }

  if (digits.length === 12 && digits.startsWith("989")) {
    return `0${digits.slice(2)}`;
  }

  if (digits.length === 10 && digits.startsWith("9")) {
    return `0${digits}`;
  }

  return null;
}

export function customerEmailFromPhone(phone: string): string {
  return `${phone.replace(/\D/g, "")}@phone.customer.local`;
}

export function isSyntheticCustomerEmail(email: string | null | undefined): boolean {
  if (!email) return true;
  return email.trim().toLowerCase().endsWith("@phone.customer.local");
}

export function displayCustomerEmail(email: string | null | undefined): string {
  if (!email || isSyntheticCustomerEmail(email)) return "";
  return email;
}
