// ISO 8601 date-time with an explicit time zone, e.g. 2026-11-22T14:30:00Z or
// 2026-11-22T14:30:00.5+01:00. Requiring the zone avoids ambiguous local times.
const ISO_DATETIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,6})?)?(?:Z|[+-](\d{2}):(\d{2}))$/;

/**
 * Returns the Date, or null if the string isn't a valid ISO date-time.
 * Checks the calendar too: JavaScript would silently turn 2026-02-30 into
 * March 2, which would store the wrong date.
 */
export const parseIsoDateTime = (value: string): Date | null => {
  const match = ISO_DATETIME.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute, second = '0', zoneH, zoneM] = match;
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);

  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth) return null;
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) {
    return null;
  }
  if (zoneH !== undefined && (Number(zoneH) > 14 || Number(zoneM) > 59)) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
