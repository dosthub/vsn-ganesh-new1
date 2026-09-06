export const VISIT_RECORD_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function shouldRecordVisit(
  lastRecordedAt: number | null,
  now = Date.now(),
) {
  if (lastRecordedAt === null || !Number.isFinite(lastRecordedAt)) return true;

  const elapsed = now - lastRecordedAt;
  return elapsed < 0 || elapsed >= VISIT_RECORD_INTERVAL_MS;
}
