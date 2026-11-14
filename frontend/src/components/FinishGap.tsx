// The forecast finish against the deadline, magnified: a short track with the deadline in the middle.
// The dot slides left when the forecast is early and right when it is late, so a gap of days is visible.

// ---------- Constants ----------

const FULL_DAYS = 60 // a gap of this many days or more puts the dot at the end of the track
const REACH = 46 // percent of the track the dot can move from the middle

/** days: forecast minus deadline, in days. Negative means early. */
export function FinishGap({ days }: { days: number }) {
  const at = 50 + (Math.max(-FULL_DAYS, Math.min(FULL_DAYS, days)) / FULL_DAYS) * REACH
  return (
    <span className={`gap ${days > 0 ? 'late' : 'early'}`} role="img" aria-label={days > 0 ? `Forecast ${days} days after the deadline` : `Forecast ${-days} days before the deadline`}>
      <span className="gap-span" style={{ left: `${Math.min(at, 50)}%`, width: `${Math.abs(at - 50)}%` }} />
      <span className="gap-deadline" />
      <span className="gap-dot" style={{ left: `${at}%` }} />
    </span>
  )
}
