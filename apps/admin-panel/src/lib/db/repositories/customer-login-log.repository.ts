import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";

export type CustomerLoginMethod = "otp" | "password" | "register" | "reset_password";

export type CustomerLoginLogDto = {
  id: string;
  method: CustomerLoginMethod | string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export async function getRequestClientMeta() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const realIp = h.get("x-real-ip");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    realIp?.trim() ||
    h.get("cf-connecting-ip")?.trim() ||
    null;
  const userAgent = h.get("user-agent");
  return { ip, userAgent };
}

export async function createCustomerLoginLog(input: {
  customerId: string;
  method: CustomerLoginMethod;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  await prisma.$executeRaw`
    INSERT INTO customer_login_logs (customer_id, method, ip_address, user_agent)
    VALUES (
      ${input.customerId}::uuid,
      ${input.method},
      ${input.ipAddress ?? null}::inet,
      ${input.userAgent ?? null}
    )
  `;
}

export async function listCustomerLoginLogs(
  customerId: string,
  limit = 50,
): Promise<CustomerLoginLogDto[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      method: string;
      ip_address: string | null;
      user_agent: string | null;
      created_at: Date;
    }>
  >`
    SELECT id, method, host(ip_address)::text AS ip_address, user_agent, created_at
    FROM customer_login_logs
    WHERE customer_id = ${customerId}::uuid
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    method: row.method,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at.toISOString(),
  }));
}
