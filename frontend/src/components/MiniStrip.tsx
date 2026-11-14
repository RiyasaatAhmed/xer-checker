import { tally } from '../board'
import type { CheckStatus } from '../types'

/** The same strip, small and not clickable, for a row of the schedule list. The words beside it carry the meaning. */
export function MiniStrip({ checks }: { checks: CheckStatus[] }) {
  if (checks.length === 0) return <span className="faint">–</span>
  const counts = tally(checks)
  const sets = [...new Set(checks.map((c) => c.group))]
  return (
    <span className="mini" role="img" aria-label={`${counts.flag} over the limit, ${counts.pass} within, ${counts.na} can't be checked`}>
      {sets.map((name) => (
        <span key={name} className="mini-set">
          {checks.filter((c) => c.group === name).map((c) => (
            <span key={c.id} className={`mini-cell ${c.status}`} data-tip={`${c.name}: ${c.status === 'flag' ? 'over the limit' : c.status === 'pass' ? 'within the limit' : "can't be checked"}`} />
          ))}
        </span>
      ))}
    </span>
  )
}
