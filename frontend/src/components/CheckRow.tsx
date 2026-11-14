import { ArrowDown, ArrowUp, Check, Flag, Minus } from 'lucide-react'
import { ratio, type Trend } from '../board'
import { percentText } from '../format'
import { ruleText } from '../rules'
import type { RuleResult, RuleStatus } from '../types'

// ---------- Constants ----------

const ICON = { flag: Flag, pass: Check, 'n/a': Minus }
const WORDS: Record<RuleStatus, string> = { flag: 'Over the limit', pass: 'Within the limit', 'n/a': "Can't be checked" } // for screen readers: the icon is the sign
const LIMIT_SPAN = 3 // the bar ends at this many times its limit, so the limit tick sits a third in
const MIN_SPAN = 5 // percent: the bar's end for a check with a limit of 0
const INDEX_SPAN = 1.5 // an index's bar ends at this many times its limit

interface Props {
  rule: RuleResult
  trend: Trend | null // the change since the last upload, if there is one
  selected: boolean
  onSelect: (id: string) => void
  lowestFloat?: number | null // for a passing negative float check: how close to critical the schedule is
  quiet?: boolean // a smaller, greyer row for a check within its limit
}

/** One check as a bullet bar: its value against its limit, how many times over, and the change since last time. */
export function CheckRow({ rule, trend, selected, onSelect, lowestFloat, quiet = false }: Props) {
  const Icon = ICON[rule.status]
  const over = ratio(rule)
  const below = rule.direction === 'below'
  const end = below ? rule.limit_percent * INDEX_SPAN : rule.limit_percent > 0 ? rule.limit_percent * LIMIT_SPAN : Math.max(MIN_SPAN, rule.percent * 1.25)
  const at = (value: number) => Math.min(100, Math.max(0, (100 * value) / end))
  const limitAt = at(rule.limit_percent)
  const overflows = rule.percent > end
  return (
    <button
      type="button"
      className={`crow ${rule.status}${quiet ? ' quiet' : ''}`}
      aria-pressed={selected}
      aria-label={`${rule.name}, ${percentText(rule.percent)}, ${WORDS[rule.status].toLowerCase()}${over !== null ? `, ${over.toFixed(1)} times the limit` : ''}`}
      onClick={() => onSelect(rule.id)}
      title={`${rule.dcma_section ? `DCMA ${rule.dcma_section}: ` : 'Not a DCMA check: '}${ruleText(rule.id).short}`}
    >
      <span className="crow-name">
        <Icon size={15} strokeWidth={2.5} aria-hidden />
        <span>{rule.name}</span>
      </span>
      <span className="crow-bar" aria-hidden="true">
        <span className="crow-zone" style={below ? { left: 0, width: `${limitAt}%` } : { left: `${limitAt}%`, right: 0 }} />
        <span className="crow-fill" style={{ width: `${at(rule.percent)}%` }} />
        <span className="crow-limit" style={{ left: `${limitAt}%` }} />
        {overflows && <span className="crow-break">»</span>}
      </span>
      <span className="crow-value num">{percentText(rule.percent)}</span>
      <span className="crow-ratio">
        {rule.status === 'flag' && (over !== null ? `${over.toFixed(1)}x limit` : 'none allowed')}
        {rule.status !== 'flag' && lowestFloat != null && rule.id === 'negative-float' && `lowest float ${lowestFloat.toFixed(1)} d`}
      </span>
      <span className="crow-trend">{trend && <TrendWords trend={trend} />}</span>
      <span className="crow-count num">{rule.count.toLocaleString()} {rule.count === 1 ? 'activity' : 'activities'}</span>
    </button>
  )
}

/** "from 52.0%" with an arrow and a color: green when it improved, red when it got worse. */
function TrendWords({ trend }: { trend: Trend }) {
  if (trend.better === null) {
    return (
      <span className="trend same">
        <Minus size={12} aria-hidden /> same
      </span>
    )
  }
  const Arrow = trend.delta < 0 ? ArrowDown : ArrowUp
  return (
    <span className={`trend ${trend.better ? 'better' : 'worse'}`}>
      <Arrow size={12} strokeWidth={2.5} aria-hidden />
      {trend.better ? 'better' : 'worse'} by {Math.abs(trend.delta).toFixed(1)}
    </span>
  )
}
