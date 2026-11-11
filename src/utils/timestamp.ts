/**
 * Generate ISO 8601 UTC timestamp with milliseconds and trailing Z
 * ABDM V3 format: YYYY-MM-DDTHH:mm:ss.sssZ
 */
export function generateUtcTimestamp(): string {
  return new Date().toISOString();
}
