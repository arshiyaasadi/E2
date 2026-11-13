import { config } from "../config.js";
import { log } from "./log.js";

/**
 * Best-effort OTLP bootstrap. When OTEL_EXPORTER_OTLP_ENDPOINT is unset,
 * the process still emits JSON logs to stdout for the cluster collector.
 */
export async function startOtel(): Promise<() => Promise<void>> {
  if (!config.otel.endpoint) {
    log.info("otel_disabled", { reason: "OTEL_EXPORTER_OTLP_ENDPOINT empty" });
    return async () => undefined;
  }

  try {
    const [
      { NodeSDK },
      { getNodeAutoInstrumentations },
      { OTLPTraceExporter },
      { OTLPMetricExporter },
      { PeriodicExportingMetricReader },
      { Resource },
      semconv,
    ] = await Promise.all([
      import("@opentelemetry/sdk-node"),
      import("@opentelemetry/auto-instrumentations-node"),
      import("@opentelemetry/exporter-trace-otlp-http"),
      import("@opentelemetry/exporter-metrics-otlp-http"),
      import("@opentelemetry/sdk-metrics"),
      import("@opentelemetry/resources"),
      import("@opentelemetry/semantic-conventions"),
    ]);

    const serviceNameKey =
      "ATTR_SERVICE_NAME" in semconv
        ? (semconv as { ATTR_SERVICE_NAME: string }).ATTR_SERVICE_NAME
        : "service.name";
    const serviceVersionKey =
      "ATTR_SERVICE_VERSION" in semconv
        ? (semconv as { ATTR_SERVICE_VERSION: string }).ATTR_SERVICE_VERSION
        : "service.version";

    const endpoint = config.otel.endpoint.replace(/\/$/, "");
    const tracesUrl = endpoint.includes("4317")
      ? endpoint.replace("4317", "4318") + "/v1/traces"
      : `${endpoint}/v1/traces`;
    const metricsUrl = endpoint.includes("4317")
      ? endpoint.replace("4317", "4318") + "/v1/metrics"
      : `${endpoint}/v1/metrics`;

    const sdk = new NodeSDK({
      resource: new Resource({
        [serviceNameKey]: config.serviceName,
        [serviceVersionKey]: config.version,
        "deployment.environment": config.environment,
      }),
      traceExporter: new OTLPTraceExporter({ url: tracesUrl }),
      metricReader: new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: metricsUrl }),
        exportIntervalMillis: 30_000,
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          "@opentelemetry/instrumentation-fs": { enabled: false },
        }),
      ],
    });

    await sdk.start();
    log.info("otel_started", { tracesUrl, metricsUrl });
    return async () => {
      await sdk.shutdown();
    };
  } catch (err) {
    log.warn("otel_start_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return async () => undefined;
  }
}
