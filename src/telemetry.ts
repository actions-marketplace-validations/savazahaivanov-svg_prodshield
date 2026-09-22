export interface TelemetryEvent {
  version: string;
  durationMs: number;
  findings: number;
}

const TIMEOUT_MS = 1500;

export function telemetryEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const off = (v: string | undefined) => v === "1" || v?.toLowerCase() === "true";
  if (off(env.DO_NOT_TRACK) || off(env.PRODSHIELD_NO_ANALYTICS)) return false;
  return Boolean(env.PRODSHIELD_TELEMETRY_URL);
}

/**
 * Sends only the CLI version, run duration and total finding count.
 * Never includes paths, file names, code or secret values. Never throws.
 * Nothing is sent unless PRODSHIELD_TELEMETRY_URL points at a collector.
 */
export async function sendTelemetry(event: TelemetryEvent): Promise<void> {
  if (!telemetryEnabled()) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    await fetch(process.env.PRODSHIELD_TELEMETRY_URL as string, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        version: event.version,
        durationMs: Math.round(event.durationMs),
        findings: event.findings
      }),
      signal: controller.signal
    });
  } catch {
    // Fail silently: telemetry must never affect the scan result.
  } finally {
    clearTimeout(timer);
  }
}
