import type { SmsFeatureId, SmsFeatureMeta, SmsProviderCode } from "@/lib/sms/types";

const ALL_FEATURES: SmsFeatureId[] = [
  "verify",
  "bulk",
  "likeToLike",
  "scheduled",
  "cancelScheduled",
  "messageStatus",
  "packReports",
  "liveReports",
  "archiveReports",
  "receive",
  "credit",
  "lines",
  "sandbox",
];

function features(supported: SmsFeatureId[]): SmsFeatureMeta[] {
  const set = new Set(supported);
  return ALL_FEATURES.map((id) => ({ id, supported: set.has(id) }));
}

export const SMS_PROVIDER_FEATURES: Record<SmsProviderCode, SmsFeatureMeta[]> = {
  smsir: features([
    "verify",
    "bulk",
    "likeToLike",
    "scheduled",
    "cancelScheduled",
    "messageStatus",
    "packReports",
    "liveReports",
    "archiveReports",
    "receive",
    "credit",
    "lines",
    "sandbox",
  ]),
  console: features(["verify", "bulk", "likeToLike", "sandbox", "credit", "lines"]),
};

export function getProviderFeatures(code: SmsProviderCode): SmsFeatureMeta[] {
  return SMS_PROVIDER_FEATURES[code] ?? features([]);
}
