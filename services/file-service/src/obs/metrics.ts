type CounterKey = string;

const counters = new Map<CounterKey, number>();
const latencySumMs = new Map<CounterKey, number>();
const latencyCount = new Map<CounterKey, number>();

function bump(map: Map<string, number>, key: string, by: number): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

export function recordHttpRequest(
  method: string,
  route: string,
  status: number,
  durationMs: number,
): void {
  const labels = `method="${method}",route="${route}",status="${status}"`;
  bump(counters, `http_requests_total{${labels}}`, 1);
  const latKey = `http_request_duration_ms_sum{method="${method}",route="${route}"}`;
  bump(latencySumMs, latKey, durationMs);
  bump(latencyCount, latKey.replace("_sum{", "_count{"), 1);
}

export function renderPrometheus(): string {
  const lines: string[] = [
    "# HELP file_service_up 1 if process is up",
    "# TYPE file_service_up gauge",
    "file_service_up 1",
    "# HELP http_requests_total Total HTTP requests",
    "# TYPE http_requests_total counter",
  ];
  for (const [key, value] of counters) {
    lines.push(`${key} ${value}`);
  }
  lines.push("# HELP http_request_duration_ms_sum Sum of request durations in ms");
  lines.push("# TYPE http_request_duration_ms_sum counter");
  for (const [key, value] of latencySumMs) {
    lines.push(`${key} ${value}`);
  }
  lines.push("# HELP http_request_duration_ms_count Count of timed requests");
  lines.push("# TYPE http_request_duration_ms_count counter");
  for (const [key, value] of latencyCount) {
    lines.push(`${key} ${value}`);
  }
  lines.push("");
  return lines.join("\n");
}
