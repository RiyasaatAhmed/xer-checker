import { ArrowDown, ArrowUp, Check, Flag, Minus } from 'lucide-react'
import { SMALL_SAMPLE, TIMES_SHOWN, barAt, isSerious, ratio, type Trend } from '../board'
import { percentText } from '../format'
import { ruleText } from '../rules'
import type { RuleResult, RuleStatus } from '../types'

// ---------- Constants ----------

const ICON = { flag: Flag, pass: Check, 'n/a': Minus }
const WORDS: Record<RuleStatus, string> = { flag: 'Over the limit', pass: 'Within the limit', 'n/a': "Can't be checked" } // for screen readers: the icon is the sign
const INDEX_SPAN = 1.5 // an index's bar ends at this many times its limit

interface Props {
  rule: RuleResult
  trend: Trend | null // the change since the last upload, if there is one
  selected: boolean
  onSelect: (id: string) => void
  checked: number // activities checked: a small file shows "1 of 4", not a share
  note?: string // what else the row counts, like "18 leads" beside "11 activities"
  lowestFloat?: number | null // for a passing negative float check: how close to critical the schedule is
  quiet?: boolean // a smaller, greyer row for a check within its limit
}

/** One check as a bullet bar: its value against its limit, how many times over, and the change since last time.
 *  Every bar ends at the same multiple of its limit, so the bars compare down the board. A limit of 0 has no bar. */
export function CheckRow({ rule, trend, selected, onSelect, checked, note, lowestFloat, quiet = false }: Props) {
  const Icon = ICON[rule.status]
  const over = ratio(rule)
  const serious = rule.status === 'flag' && isSerious(rule)
  const index = rule.measure === 'index'
  const at = (value: number) => (index ? Math.min(100, (100 * value) / (rule.limit_percent * INDEX_SPAN)) : barAt(value, rule.limit_percent))
  const limitAt = at(rule.limit_percent)
  const hasBar = rule.limit_percent > 0 && rule.measure !== 'test'
  const overflows = !index && rule.percent > rule.limit_percent * TIMES_SHOWN
  const small = rule.measure === 'percent' && checked > 0 && checked < SMALL_SAMPLE
  const value = small ? `${rule.count.toLocaleString()} of ${checked.toLocaleString()}` : percentText(rule.percent)
  return (
    <button
      type="button"
      className={`crow ${rule.status}${quiet ? ' quiet' : ''}${serious ? ' serious' : ''}`}
      aria-pressed={selected}
      aria-label={`${rule.name}, ${value}, ${WORDS[rule.status].toLowerCase()}${over !== null ? `, ${over.toFixed(1)} times the limit` : ''}${rule.status === 'flag' ? (serious ? ', serious' : ', minor') : ''}`}
      onClick={() => onSelect(rule.id)}
      data-tip={`${rule.dcma_section ? `DCMA ${rule.dcma_section}: ` : 'Not a DCMA check: '}${ruleText(rule.id).short}`}
    >
      <span className="crow-name">
        <Icon size={15} strokeWidth={2.5} fill={serious ? 'currentColor' : 'none'} aria-hidden />
        <span>{rule.name}</span>
      </span>
      {hasBar ? (
        <span className="crow-bar" aria-hidden="true">
          <span className="crow-zone" style={rule.direction === 'below' ? { left: 0, width: `${limitAt}%` } : { left: `${limitAt}%`, right: 0 }} />
          <span className="crow-fill" style={{ width: `${at(rule.percent)}%` }} />
          <span className="crow-limit" style={{ left: `${limitAt}%` }} />
          {overflows && <span className="crow-break">»</span>}
        </span>
      ) : (
        <span className="crow-nobar" aria-hidden="true" />
      )}
      <span className="crow-value num">{value}</span>
      <span className="crow-ratio">
        {rule.status === 'flag' && (over !== null ? `${over.toFixed(1)}x limit` : 'none allowed')}
        {rule.status !== 'flag' && lowestFloat != null && rule.id === 'negative-float' && `lowest float ${lowestFloat.toFixed(1)} d`}
      </span>
      <span className="crow-trend">{trend && <TrendWords trend={trend} />}</span>
      <span className="crow-count num">
        {rule.count.toLocaleString()} {rule.count === 1 ? 'activity' : 'activities'}
        {note && <span className="faint crow-note"> ({note})</span>}
      </span>
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
