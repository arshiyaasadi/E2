import { config } from "../config.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

function emit(level: LogLevel, message: string, fields: LogFields = {}): void {
  if (level === "debug" && config.environment === "production") {
    return;
  }
  const line = {
    timestamp: new Date().toISOString(),
    level,
    service: config.serviceName,
    environment: config.environment,
    version: config.version,
    message,
    ...fields,
  };
  const text = JSON.stringify(line);
  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(text);
  } else {
    // eslint-disable-next-line no-console
    console.log(text);
  }
}

export const log = {
  debug: (message: string, fields?: LogFields) => emit("debug", message, fields),
  info: (message: string, fields?: LogFields) => emit("info", message, fields),
  warn: (message: string, fields?: LogFields) => emit("warn", message, fields),
  error: (message: string, fields?: LogFields) => emit("error", message, fields),
  audit: (
    message: string,
    fields: LogFields & {
      action: string;
      client_id: string;
      user_id: string;
      file_id?: string;
      request_id?: string;
      trace_id?: string;
    },
  ) =>
    emit("info", message, {
      event_type: "audit",
      ...fields,
    }),
};
