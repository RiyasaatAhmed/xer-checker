import { percentText } from '../format'
import type { RuleResult, RuleStatus } from '../types'

// ---------- Constants ----------

// Status always shows an icon and words, never color alone.
const STATUS_LABEL: Record<RuleStatus, string> = { pass: '✓ Within limit', flag: '⚑ Over limit', 'n/a': '– Nothing to check' }

interface Props {
  rules: RuleResult[]
  checked: number // activities checked: the "of N" in each figure
  selected: string // the rule whose activities are listed below
  onSelect: (name: string) => void
}

/** One row per DCMA rule: its share of activities as a bar, with the rule's limit marked. */
export function RuleMeters({ rules, checked, selected, onSelect }: Props) {
  return (
    <section className="card" aria-labelledby="rules-title">
      <h2 id="rules-title">DCMA checks</h2>
      <p className="hint">Each bar is the share of checked activities that break the rule. The dark line is DCMA’s limit.</p>
      <ul className="meters">
        {rules.map((rule) => {
          const figure = `${rule.count.toLocaleString()} of ${checked.toLocaleString()} (${percentText(rule.percent)})`
          return (
            <li key={rule.name}>
              <button
                type="button"
                className={`meter status-${statusClass(rule.status)}`}
                aria-pressed={selected === rule.name}
                onClick={() => onSelect(rule.name)}
                title={`${rule.name}: ${figure}. DCMA limit ${percentText(rule.limit_percent)}.`}
              >
                <span className="meter-name">
                  {rule.name} <span className="meter-section">DCMA {rule.dcma_section}</span>
                </span>
                <span className="meter-track" aria-hidden="true">
                  <span className="meter-fill" style={{ width: `${Math.min(rule.percent, 100)}%` }} />
                  <span className="meter-limit" style={{ left: `${rule.limit_percent}%` }} />
                </span>
                <span className="meter-figure">{figure}</span>
                <span className="meter-status">
                  {STATUS_LABEL[rule.status]} · limit {percentText(rule.limit_percent)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** "n/a" can't be a CSS class name. */
function statusClass(status: RuleStatus): string {
  return status === 'n/a' ? 'none' : status
}
