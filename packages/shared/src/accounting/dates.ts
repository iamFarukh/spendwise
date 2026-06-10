/** YYYY-MM-DD for `date` in the given IANA timezone. */
export function toDateStringInTimezone(
  date: Date,
  timezone: string,
): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);

    const year = parts.find((p) => p.type === "year")?.value ?? "1970";
    const month = parts.find((p) => p.type === "month")?.value ?? "01";
    const day = parts.find((p) => p.type === "day")?.value ?? "01";
    return `${year}-${month}-${day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function getMonthRange(
  timezone: string,
  referenceDate = new Date(),
): { start: string; end: string } {
  const today = toDateStringInTimezone(referenceDate, timezone);
  const [year, month] = today.split("-");
  const start = `${year}-${month}-01`;
  const end = today;
  return { start, end };
}

export function isDateInRange(
  date: string,
  start: string,
  end: string,
): boolean {
  return date >= start && date <= end;
}

/** Shift a calendar date by `days` and return YYYY-MM-DD in `timezone`. */
export function addDaysInTimezone(
  dateStr: string,
  days: number,
  timezone: string,
): string {
  const base = new Date(`${dateStr}T12:00:00`);
  const shifted = new Date(base.getTime() + days * 86_400_000);
  return toDateStringInTimezone(shifted, timezone);
}
