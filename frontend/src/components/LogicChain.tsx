import { ArrowRight } from 'lucide-react'
import { linkText } from '../format'
import type { ActivityRow, Neighbor } from '../types'

// ---------- Constants ----------

const CHIPS = 2 // neighbors named per side; "+N" says how many more

/** One activity's logic on a single line: what comes before it, it, and what comes after.
 *  A side with nothing on it is the missing link: a red dashed "none". */
export function LogicChain({ row, tone }: { row: ActivityRow; tone: string }) {
  return (
    <span className="chain">
      <Side items={row.before} total={row.predecessors} none="Nothing before it" />
      <ArrowRight size={12} aria-hidden className="chain-arrow" />
      <span className={`chain-me t-${tone}`} aria-hidden="true" />
      <ArrowRight size={12} aria-hidden className="chain-arrow" />
      <Side items={row.after} total={row.successors} none="Nothing after it" />
    </span>
  )
}

function Side({ items, total, none }: { items: Neighbor[]; total: number; none: string }) {
  if (total === 0) {
    return (
      <span className="chain-none" aria-label={none} data-tip={none}>
        none
      </span>
    )
  }
  return (
    <span className="chain-side">
      {items.slice(0, CHIPS).map((n) => (
        <span key={n.code} className="chain-chip mono" data-tip={`${n.name} (${linkText(n)})`}>
          {n.code}
        </span>
      ))}
      {total > CHIPS && (
        <span className="chain-more" data-tip={items.slice(CHIPS).map((n) => `${n.code}: ${n.name} (${linkText(n)})`).join('\n') || undefined}>
          +{total - CHIPS}
        </span>
      )}
    </span>
  )
}
