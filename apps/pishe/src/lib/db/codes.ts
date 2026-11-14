import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db/prisma";

/** 8-digit profile invite code (10000000–99999999). */
export function generateInviteCode(): string {
  return String(randomInt(10_000_000, 100_000_000));
}

/** 6-digit business project code (100000–999999). */
export function generateBusinessCode(): string {
  return String(randomInt(100_000, 1_000_000));
}

export async function allocateUniqueInviteCode(
  maxAttempts = 12,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateInviteCode();
    const existing = await prisma.profile.findUnique({
      where: { inviteCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("Failed to allocate unique invite code");
}

export async function allocateUniqueBusinessCode(
  maxAttempts = 12,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateBusinessCode();
    const existing = await prisma.business.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("Failed to allocate unique business code");
}
