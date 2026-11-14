import { tally } from '../board'
import { checkName } from '../rules'
import type { CheckStatus } from '../types'

/** The same strip, small and not clickable, for a row of the schedule list. The words beside it carry the meaning. */
export function MiniStrip({ checks }: { checks: CheckStatus[] }) {
  if (checks.length === 0) return <span className="faint">–</span>
  const counts = tally(checks)
  const sets = [...new Set(checks.map((c) => c.group))]
  return (
    <span className="mini" role="img" aria-label={`${counts.flag} over the limit, ${counts.pass} within, ${counts.na} can't be checked`}>
      {sets.map((name) => {
        const inSet = checks.filter((c) => c.group === name)
        // A set where no check can run is one cell, as on the board
        const cells = inSet.length > 1 && inSet.every((c) => c.status === 'n/a') ? [{ id: name, name: `${name}: ${inSet.length} checks`, status: 'n/a' as const }] : inSet
        return (
          <span key={name} className="mini-set">
            {cells.map((c) => (
              <span key={c.id} className={`mini-cell ${c.status}`} data-tip={`${checkName(c)}: ${c.status === 'flag' ? 'over the limit' : c.status === 'pass' ? 'within the limit' : "can't be checked"}`} />
            ))}
          </span>
        )
      })}
    </span>
  )
}
