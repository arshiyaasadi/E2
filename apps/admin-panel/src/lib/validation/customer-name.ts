/** Customer given/family name helpers — stored as combined `full_name` in DB. */

export const CUSTOMER_NAME_PART_MIN = 2;
export const CUSTOMER_NAME_PART_MAX = 60;

export function joinCustomerName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export function splitCustomerName(fullName: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName?.trim() ?? "";
  if (!trimmed) return { firstName: "", lastName: "" };

  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) {
    return { firstName: trimmed, lastName: "" };
  }

  return {
    firstName: trimmed.slice(0, spaceIndex).trim(),
    lastName: trimmed.slice(spaceIndex + 1).trim(),
  };
}

export function isCustomerNamePartValid(value: string): boolean {
  const length = value.trim().length;
  return length >= CUSTOMER_NAME_PART_MIN && length <= CUSTOMER_NAME_PART_MAX;
}

export function isCustomerNameValid(firstName: string, lastName: string): boolean {
  return isCustomerNamePartValid(firstName) && isCustomerNamePartValid(lastName);
}
