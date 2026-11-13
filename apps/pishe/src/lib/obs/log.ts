import { serverEnv } from "@/config/env.server";

type LogFields = Record<string, unknown>;

function emit(level: "info" | "warn" | "error", message: string, fields: LogFields = {}) {
  const line = {
    timestamp: new Date().toISOString(),
    level,
    service: "pishe",
    environment: serverEnv.APP_ENV,
    message,
    ...fields,
  };
  const text = JSON.stringify(line);
  if (level === "error") {
    console.error(text);
  } else if (level === "warn") {
    console.warn(text);
  } else {
    console.log(text);
  }

  void shipOtlpLog(level, message, fields, line.timestamp);
}

/**
 * Best-effort OTLP/HTTP logs export. No-op when OTEL_EXPORTER_OTLP_ENDPOINT is unset.
 * Use the WireGuard collector endpoint so events appear in SigNoz (noz.abysso.ir).
 */
async function shipOtlpLog(
  severityText: string,
  body: string,
  fields: LogFields,
  timestampIso: string,
) {
  const raw = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
  if (!raw) return;

  const base = raw.replace(/\/$/, "");
  const logsUrl = base.includes("/v1/logs")
    ? base
    : base.includes("4317")
      ? `${base.replace("4317", "4318")}/v1/logs`
      : `${base}/v1/logs`;

  const timeUnixNano = String(BigInt(Date.parse(timestampIso)) * BigInt(1_000_000));
  const attributes = Object.entries(fields).map(([key, value]) => ({
    key,
    value: { stringValue: value == null ? "" : String(value) },
  }));

  const payload = {
    resourceLogs: [
      {
        resource: {
          attributes: [
            { key: "service.name", value: { stringValue: "pishe" } },
            {
              key: "deployment.environment",
              value: { stringValue: serverEnv.APP_ENV },
            },
          ],
        },
        scopeLogs: [
          {
            scope: { name: "pishe" },
            logRecords: [
              {
                timeUnixNano,
                severityText: severityText.toUpperCase(),
                body: { stringValue: body },
                attributes,
              },
            ],
          },
        ],
      },
    ],
  };

  try {
    await fetch(logsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Monitoring must not break auth flows.
  }
}

export const log = {
  info: (message: string, fields?: LogFields) => emit("info", message, fields),
  warn: (message: string, fields?: LogFields) => emit("warn", message, fields),
  error: (message: string, fields?: LogFields) => emit("error", message, fields),
};

/** Structured monitor event for SigNoz / stdout. Never include passwords. */
export function logPreRegistration(fields: {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
}) {
  log.info("pishe.pre_registration", {
    event: "pishe.pre_registration",
    userId: fields.userId,
    username: fields.username,
    firstName: fields.firstName,
    lastName: fields.lastName,
  });
}
