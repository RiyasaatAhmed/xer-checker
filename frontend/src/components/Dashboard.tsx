import { useState } from 'react'
import { countText, dateText } from '../format'
import type { CheckResult } from '../types'
import { ActionBrief } from './ActionBrief'
import { FileIssues } from './FileIssues'
import { FlaggedActivities } from './FlaggedActivities'
import { RuleBand } from './RuleBand'
import { Summary } from './Summary'

/** One checked file: what needs attention first, then the 3 checks, then the detail behind them. */
export function Dashboard({ result }: { result: CheckResult }) {
  // Start on the first check over its limit, so the list shows what needs a look.
  const first = result.rules.find((rule) => rule.status === 'flag') ?? result.rules[0]
  const [selected, setSelected] = useState(first?.name ?? '')
  const rule = result.rules.find((r) => r.name === selected)

  /** Bring a section into view and move focus to it, for keyboard and screen reader users too. */
  function reveal(id: string) {
    const section = document.getElementById(id)
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    section?.focus({ preventScroll: true })
  }

  return (
    <div className="dashboard">
      <header className="dash-head">
        <div className="eyebrow">Schedule check · {dateText(result.uploaded_at)}</div>
        <h1 className="file-name">{result.file_name}</h1>
        <p className="dash-meta">
          <span>{countText(result.checked, 'unfinished activity', 'unfinished activities')} checked</span>
          <span>{countText(result.broken_rows.length, 'broken row')}</span>
          <span>DCMA-EA PAM 200.1, section 4</span>
        </p>
      </header>

      <ActionBrief
        result={result}
        onShowRule={(name) => {
          setSelected(name)
          reveal('activities')
        }}
        onShowIssues={() => reveal('file-issues')}
      />

      <RuleBand rules={result.rules} checked={result.checked} selected={selected} onSelect={setSelected} />

      <div className="dash-grid">
        {/* key: each rule starts with an empty filter */}
        {rule && <FlaggedActivities key={rule.name} rule={rule} fileName={result.file_name} />}
        <div className="stack">
          <Summary points={result.summary} author={result.summary_author} />
          <FileIssues broken={result.broken_rows} notes={result.notes} />
        </div>
      </div>
    </div>
  )
}
