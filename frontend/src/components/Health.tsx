import { Check, Flag, Minus } from 'lucide-react'
import { percentText } from '../format'
import { ruleText } from '../rules'
import type { RuleResult, RuleStatus } from '../types'

// ---------- Constants ----------

const ICON = { flag: Flag, pass: Check, 'n/a': Minus }
const WORDS: Record<RuleStatus, string> = { flag: 'Over the limit', pass: 'Within the limit', 'n/a': 'Nothing to check' } // for screen readers: the icon is the sign

interface Props {
  rules: RuleResult[]
  checked: number // activities checked: the "of N" under each figure
  selected: string // the check whose activities are listed below
  onSelect: (name: string) => void
}

/** The 3 checks side by side. Each is a value against its DCMA limit, on one 0 to 100% scale so they compare. */
export function Health({ rules, checked, selected, onSelect }: Props) {
  return (
    <section className="health" aria-label="DCMA checks">
      {rules.map((rule) => {
        const Icon = ICON[rule.status]
        return (
          <button
            key={rule.name}
            type="button"
            className={`meter ${rule.status === 'n/a' ? 'none' : rule.status}`}
            aria-pressed={selected === rule.name}
            onClick={() => onSelect(rule.name)}
            title={`DCMA ${rule.dcma_section}: ${ruleText(rule.name).short}`}
          >
            <span className="meter-top">
              <span>{rule.name}</span>
              <Icon size={16} strokeWidth={2.5} aria-hidden />
              <span className="vh">{WORDS[rule.status]}</span>
            </span>
            <span className="meter-value num">{percentText(rule.percent)}</span>
            <span className="meter-bar" aria-hidden="true">
              <span className="meter-fill" style={{ width: `${Math.min(rule.percent, 100)}%` }} />
              <span className="meter-limit" style={{ left: `${rule.limit_percent}%` }} />
            </span>
            <span className="meter-foot">
              <span className="num">
                {rule.count.toLocaleString()} of {checked.toLocaleString()}
              </span>
              <span>limit {rule.limit_percent}%</span>
            </span>
          </button>
        )
      })}
    </section>
  )
}
