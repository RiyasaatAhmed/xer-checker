import { Check, Flag, Minus } from 'lucide-react'
import { percentText } from '../format'
import { ruleText } from '../rules'
import type { RuleResult } from '../types'

interface Props {
  rules: RuleResult[]
  checked: number // activities checked: the "of N" under each figure
  selected: string // the rule whose activities are listed below
  onSelect: (name: string) => void
}

/** The 3 DCMA checks side by side on a navy band. A check over its limit turns orange. */
export function RuleBand({ rules, checked, selected, onSelect }: Props) {
  return (
    <section className="band" aria-labelledby="band-title">
      <h2 id="band-title" className="visually-hidden">DCMA checks</h2>
      <div className="band-grid">
        {rules.map((rule) => (
          <button
            key={rule.name}
            type="button"
            className={`band-cell status-${rule.status === 'n/a' ? 'none' : rule.status}`}
            aria-pressed={selected === rule.name}
            onClick={() => onSelect(rule.name)}
          >
            <span className="band-top">
              <span className="band-section mono">DCMA {rule.dcma_section}</span>
              {selected === rule.name && <span className="band-showing mono">Listed below</span>}
            </span>
            <span className="band-name">{rule.name}</span>
            <span className="band-short">{ruleText(rule.name).short}</span>
            <span className="band-figure num">{percentText(rule.percent)}</span>
            <span className="band-count num">
              {rule.count.toLocaleString()} of {checked.toLocaleString()} activities
            </span>
            <span className="band-meter" aria-hidden="true">
              <span className="band-fill" style={{ width: `${Math.min(rule.percent, 100)}%` }} />
              <span className="band-limit" style={{ left: `${rule.limit_percent}%` }} />
            </span>
            <span className="band-status">
              <StatusIcon status={rule.status} />
              {statusWords(rule)}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function StatusIcon({ status }: { status: RuleResult['status'] }) {
  const Icon = status === 'flag' ? Flag : status === 'pass' ? Check : Minus
  return <Icon size={14} strokeWidth={2.5} aria-hidden />
}

/** "Over the 5% limit", "Within the 0% limit", or "Nothing to check". */
function statusWords(rule: RuleResult): string {
  if (rule.status === 'n/a') return 'Nothing to check'
  return `${rule.status === 'flag' ? 'Over' : 'Within'} the ${rule.limit_percent}% limit`
}
