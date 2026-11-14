// The date axis of the schedule map: where a date sits on it, and where the labels go.
// P6 dates are site-local with no time zone, so they're read as local dates and never shifted.

export interface Domain {
  from: number // ms
  to: number
}

// ---------- Constants ----------

const PADDING = 0.03 // of the span, on each side, so a bar or marker at the edge isn't cut
const MAX_TICKS = 6 // the most labels on the axis
const STEPS = [1, 3, 6, 12, 24, 60] // months between labels, the smallest that fits
const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' })
const YEAR = new Intl.DateTimeFormat('en-GB', { year: 'numeric' })

/** The span that holds every given date, with a little room. Null when there are no dates. */
export function domainOf(dates: (string | null | undefined)[]): Domain | null {
  const times = dates.filter((d): d is string => Boolean(d)).map((d) => new Date(d).getTime())
  if (times.length === 0) return null
  const from = Math.min(...times)
  const to = Math.max(...times)
  const pad = Math.max(to - from, 86_400_000) * PADDING
  return { from: from - pad, to: to + pad }
}

/** Where a date sits on the axis, 0 to 100, kept inside it. */
export function percentAt(domain: Domain, date: string): number {
  const at = (new Date(date).getTime() - domain.from) / (domain.to - domain.from)
  return Math.min(100, Math.max(0, 100 * at))
}

/** Labels for the axis: month starts, spaced so that at most MAX_TICKS fit. */
export function ticks(domain: Domain): { label: string; at: number }[] {
  const months = (domain.to - domain.from) / (30.44 * 86_400_000)
  const step = STEPS.find((s) => months / s <= MAX_TICKS) ?? STEPS[STEPS.length - 1]
  const first = new Date(domain.from)
  const out: { label: string; at: number }[] = []
  // Start at the first month, quarter, half year or year boundary at or after the start of the span.
  let year = first.getFullYear()
  let month = Math.ceil(first.getMonth() / step) * step
  if (new Date(year, month, 1).getTime() < domain.from) month += step
  for (;;) {
    const date = new Date(year, month, 1)
    if (date.getTime() > domain.to) break
    out.push({ label: (step >= 12 ? YEAR : MONTH).format(date), at: (100 * (date.getTime() - domain.from)) / (domain.to - domain.from) })
    month += step
    year += Math.floor(month / 12)
    month %= 12
  }
  return out
}
