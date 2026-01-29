export function parseDurationToSeconds(value: string | number | undefined, fallbackSeconds: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (!value) {
    return fallbackSeconds;
  }

  const text = String(value).trim();
  const match = /^([0-9]+)\s*([smhd])?$/i.exec(text);

  if (!match) {
    return fallbackSeconds;
  }

  const amount = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();

  if (!Number.isFinite(amount)) {
    return fallbackSeconds;
  }

  switch (unit) {
    case 's':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 60 * 60;
    case 'd':
      return amount * 60 * 60 * 24;
    default:
      return fallbackSeconds;
  }
}

export function addSecondsToDate(seconds: number): Date {
  const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
  return new Date(Date.now() + safeSeconds * 1000);
}
