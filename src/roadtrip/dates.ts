export function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function dateDaysAgo(days: number): string {
  return isoDaysAgo(days).slice(0, 10);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
