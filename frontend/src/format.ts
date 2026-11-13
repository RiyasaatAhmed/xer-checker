// Small text helpers, shared by the components.

/** 15 -> "15.0%". */
export function percentText(value: number): string {
  return `${value.toFixed(1)}%`
}

/** (1, "row") -> "1 row", (7, "row") -> "7 rows", (2, "activity", "activities") -> "2 activities". */
export function countText(count: number, noun: string, plural = `${noun}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? noun : plural}`
}

/** "2026-11-14T03:07:55Z" -> "14 Nov 2026, 09:07", in the viewer's own time zone. */
export function dateText(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

/** One CSV file: a header row, then the rows. Values with commas or quotes are quoted. */
export function csvText(header: string[], rows: string[][]): string {
  const cell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)
  return [header, ...rows].map((row) => row.map(cell).join(',')).join('\n') + '\n'
}

/** A P6 date (site-local, no time zone) -> "6 May 2027". */
export function dayText(local: string): string {
  return new Date(local).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Calendar days from one P6 date to another, by their dates alone (so no clock or time zone shifts it). */
export function daysBetween(from: string, to: string): number {
  const day = (local: string) => {
    const d = new Date(local)
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  }
  return Math.round((day(to) - day(from)) / 86_400_000)
}

/** 51.21 -> "51.2", null -> "–". Working days, 1 decimal, as the checks round them. */
export function daysText(days: number | null): string {
  return days === null ? '–' : days.toFixed(1)
}
