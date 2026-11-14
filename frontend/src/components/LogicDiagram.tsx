import { ArrowRight } from 'lucide-react'
import { daysText, linkText } from '../format'
import type { ActivityRow, Neighbor } from '../types'

/** One activity and its neighbors: what comes before it, it, and what comes after.
 *  A side with nothing on it is the missing link, drawn as an empty orange box. */
export function LogicDiagram({ row }: { row: ActivityRow }) {
  return (
    <div className="logic" aria-label={`Logic around ${row.code}`}>
      <Side items={row.before} total={row.predecessors} empty="Nothing before it" />
      <ArrowRight size={18} aria-hidden className="logic-arrow" />
      <div className="logic-box this">
        <span className="mono logic-code">{row.code}</span>
        <span className="logic-name">{row.name}</span>
        <span className="logic-meta">Float {daysText(row.float_days)} d</span>
      </div>
      <ArrowRight size={18} aria-hidden className="logic-arrow" />
      <Side items={row.after} total={row.successors} empty="Nothing after it" />
    </div>
  )
}

function Side({ items, total, empty }: { items: Neighbor[]; total: number; empty: string }) {
  if (total === 0) return <div className="logic-box missing">{empty}</div>
  return (
    <ul className="logic-side">
      {items.map((n) => (
        <li key={n.code} className="logic-box">
          <span className="mono logic-code">{n.code}</span>
          <span className="logic-name">{n.name}</span>
          <span className="logic-meta">{linkText(n)}</span>
        </li>
      ))}
      {total > items.length && <li className="logic-more">+{total - items.length} more</li>}
    </ul>
  )
}
