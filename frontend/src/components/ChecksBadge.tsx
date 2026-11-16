import { Check, Flag } from 'lucide-react'
import type { RuleStatus } from '../types'

/** How a file's checks came out, in one pill: "7 of 17 over the limit" or "All 17 within the limit". Checks that couldn't run aren't counted. */
export function ChecksBadge({ checks }: { checks: { status: RuleStatus }[] }) {
  const ran = checks.filter((c) => c.status !== 'n/a')
  const over = ran.filter((c) => c.status === 'flag').length
  if (ran.length === 0) return <span className="pill none">No check could run</span>
  if (over > 0) {
    return (
      <span className="pill flag">
        <Flag size={12} strokeWidth={2.5} aria-hidden /> {over} of {ran.length} over the limit
      </span>
    )
  }
  return (
    <span className="pill pass">
      <Check size={12} strokeWidth={2.5} aria-hidden /> All {ran.length} within the limit
    </span>
  )
}
