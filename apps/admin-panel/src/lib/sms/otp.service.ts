import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import type { SmsProviderCode } from "@/lib/sms/types";

const OTP_TTL_SECONDS = 120;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RATE_LIMIT_PER_HOUR = 5;

function hashOtp(phone: string, code: string): string {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

function generateOtpCode(): string {
  return String(randomInt(100000, 999999));
}

export async function countRecentOtpChallenges(phone: string): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM sms_otp_challenges
    WHERE phone = ${phone}
      AND created_at > now() - interval '1 hour'
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function createOtpChallenge(input: {
  phone: string;
  providerCode?: SmsProviderCode | null;
  externalMessageId?: string | null;
  ttlSeconds?: number;
}): Promise<{ code: string; expiresIn: number; challengeId: string }> {
  const recent = await countRecentOtpChallenges(input.phone);
  if (recent >= OTP_RATE_LIMIT_PER_HOUR) {
    throw new Error("OTP_RATE_LIMIT");
  }

  const code = generateOtpCode();
  const ttl = input.ttlSeconds ?? OTP_TTL_SECONDS;
  const codeHash = hashOtp(input.phone, code);

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO sms_otp_challenges (
      phone, code_hash, provider_code, external_message_id, expires_at, max_attempts
    )
    VALUES (
      ${input.phone},
      ${codeHash},
      ${input.providerCode ?? null}::sms_provider_code,
      ${input.externalMessageId ?? null},
      now() + make_interval(secs => ${ttl}),
      ${OTP_MAX_ATTEMPTS}
    )
    RETURNING id
  `;

  return {
    code,
    expiresIn: ttl,
    challengeId: rows[0]!.id,
  };
}

export async function verifyOtpChallenge(
  phone: string,
  code: string,
  options: { consume?: boolean } = {},
): Promise<{ ok: true } | { ok: false; reason: "INVALID" | "EXPIRED" | "LOCKED" }> {
  const consume = options.consume ?? true;
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      code_hash: string;
      expires_at: Date;
      attempts: number;
      max_attempts: number;
      consumed_at: Date | null;
    }>
  >`
    SELECT id, code_hash, expires_at, attempts, max_attempts, consumed_at
    FROM sms_otp_challenges
    WHERE phone = ${phone}
      AND consumed_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const challenge = rows[0];
  if (!challenge) return { ok: false, reason: "INVALID" };
  if (challenge.attempts >= challenge.max_attempts) return { ok: false, reason: "LOCKED" };
  if (challenge.expires_at.getTime() < Date.now()) return { ok: false, reason: "EXPIRED" };

  const expected = Buffer.from(challenge.code_hash, "hex");
  const actual = Buffer.from(hashOtp(phone, code), "hex");
  const matches =
    expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!matches) {
    await prisma.$executeRaw`
      UPDATE sms_otp_challenges
      SET attempts = attempts + 1
      WHERE id = ${challenge.id}::uuid
    `;
    return { ok: false, reason: "INVALID" };
  }

  if (consume) {
    await prisma.$executeRaw`
      UPDATE sms_otp_challenges
      SET consumed_at = now(), attempts = attempts + 1
      WHERE id = ${challenge.id}::uuid
    `;
  }

  return { ok: true };
}

export async function logSmsMessage(input: {
  providerCode: SmsProviderCode;
  channel: string;
  mobile?: string | null;
  externalMessageId?: string | null;
  packId?: string | null;
  status?: string;
  cost?: number | null;
  requestPayload?: unknown;
  responsePayload?: unknown;
  errorMessage?: string | null;
}) {
  await prisma.$executeRaw`
    INSERT INTO sms_message_logs (
      provider_code, channel, mobile, external_message_id, pack_id,
      status, cost, request_payload, response_payload, error_message
    )
    VALUES (
      ${input.providerCode}::sms_provider_code,
      ${input.channel},
      ${input.mobile ?? null},
      ${input.externalMessageId ?? null},
      ${input.packId ?? null},
      ${input.status ?? "submitted"},
      ${input.cost ?? null},
      ${JSON.stringify(input.requestPayload ?? null)}::jsonb,
      ${JSON.stringify(input.responsePayload ?? null)}::jsonb,
      ${input.errorMessage ?? null}
    )
  `;
}
