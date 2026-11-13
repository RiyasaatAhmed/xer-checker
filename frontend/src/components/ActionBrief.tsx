import { ArrowRight } from 'lucide-react'
import { countText, percentText } from '../format'
import { ruleText } from '../rules'
import type { CheckResult } from '../types'
import { StatusPill } from './StatusPill'

interface Props {
  result: CheckResult
  onShowRule: (name: string) => void // list a rule's activities
  onShowIssues: () => void // jump to the broken rows
}

interface Item {
  title: string
  text: string
  next: string
  button: string
  onClick: () => void
}

/** "What needs attention", first: one numbered item per check over its limit, and broken rows. */
export function ActionBrief({ result, onShowRule, onShowIssues }: Props) {
  const flagged = result.rules.filter((rule) => rule.status === 'flag')
  const items: Item[] = flagged.map((rule) => {
    const words = ruleText(rule.name)
    return {
      title: `${rule.name}: ${rule.count.toLocaleString()} of ${result.checked.toLocaleString()} activities (${percentText(rule.percent)})`,
      text: `${countText(rule.count, 'activity', 'activities')} ${words.meaning} DCMA's limit is ${rule.limit_percent}%.`,
      next: words.action,
      button: `Show the ${countText(rule.count, 'activity', 'activities')}`,
      onClick: () => onShowRule(rule.name),
    }
  })
  if (result.broken_rows.length > 0) {
    items.push({
      title: `${countText(result.broken_rows.length, 'row')} couldn't be read`,
      text: 'They were left out of the checks, so the numbers above may be low.',
      next: 'Fix them in P6, or export the schedule again.',
      button: 'Show the rows',
      onClick: onShowIssues,
    })
  }

  return (
    <section className="card raised brief" aria-labelledby="brief-title">
      <div className="card-head">
        <h2 id="brief-title">What needs attention</h2>
        {result.checked === 0 ? (
          <StatusPill status="n/a" label="Nothing to check" />
        ) : flagged.length > 0 ? (
          <StatusPill status="flag" label={`${flagged.length} of ${result.rules.length} checks over the limit`} />
        ) : (
          <StatusPill status="pass" label="All checks within limits" />
        )}
      </div>
      {items.length === 0 ? (
        <p className="brief-clear">
          {result.checked === 0
            ? 'The file has no unfinished work activities to check.'
            : `Nothing to fix. All ${result.rules.length} checks are within DCMA's limits, and every row was read.`}
        </p>
      ) : (
        <ol className="brief-items">
          {items.map((item, index) => (
            <li key={item.title}>
              <span className="brief-number mono">{String(index + 1).padStart(2, '0')}</span>
              <div className="brief-body">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <p className="brief-next">{item.next}</p>
              </div>
              <button type="button" className="button secondary small" onClick={item.onClick}>
                {item.button}
                <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
