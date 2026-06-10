export function formatBackupTimestamp(
  iso: string | null | undefined,
  timezone: string,
): string {
  if (!iso) {
    return "No backup yet";
  }

  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
