import { Check, Flag } from 'lucide-react'
import type { RuleStatus } from '../types'

/** How the demo's 3 checks came out, in one pill: "2 of 3 over the limit" or "All 3 within the limit". */
export function ThreeBadge({ checks }: { checks: { status: RuleStatus }[] }) {
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
