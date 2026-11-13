import { useState } from 'react'
import { countText, dateText } from '../format'
import type { CheckResult } from '../types'
import { ActionBrief } from './ActionBrief'
import { FileIssues } from './FileIssues'
import { FlaggedActivities } from './FlaggedActivities'
import { ProjectStrip } from './ProjectStrip'
import { RuleBand } from './RuleBand'
import { ScheduleOverview } from './ScheduleOverview'
import { Summary } from './Summary'

/** One checked file: its dates, what needs attention, the 3 checks and the activities behind them,
 *  then what's in the file, the summary and the file's own health. */
export function Dashboard({ result }: { result: CheckResult }) {
  // Start on the first check over its limit, so the list shows what needs a look.
  const first = result.rules.find((rule) => rule.status === 'flag') ?? result.rules[0]
  const [selected, setSelected] = useState(first?.name ?? '')
  const rule = result.rules.find((r) => r.name === selected)
  const flagged = new Set(result.rules.filter((r) => r.status === 'flag').map((r) => r.name))
  const [project, ...others] = result.projects ?? []

  /** Bring a section into view and move focus to it, for keyboard and screen reader users too. */
  function reveal(id: string) {
    const section = document.getElementById(id)
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    section?.focus({ preventScroll: true })
  }

  function showRule(name: string) {
    setSelected(name)
    reveal('activities')
  }

  return (
    <div className="dashboard">
      <header className="dash-head">
        <div className="eyebrow">Schedule check · {dateText(result.uploaded_at)}</div>
        <h1 className="file-name">{result.file_name}</h1>
        <p className="dash-meta">
          <span>{countText(result.checked, 'unfinished activity', 'unfinished activities')} checked</span>
          <span>{countText(result.broken_rows.length, 'broken row')}</span>
        </p>
      </header>

      {project && <ProjectStrip project={project} more={others.length} />}

      <ActionBrief result={result} onShowRule={showRule} onShowIssues={() => reveal('file-issues')} />

      <RuleBand rules={result.rules} checked={result.checked} selected={selected} onSelect={setSelected} />

      {/* key: each rule starts with an empty filter and its own sort */}
      {rule && <FlaggedActivities key={rule.name} rule={rule} fileName={result.file_name} />}

      {result.overview && <ScheduleOverview overview={result.overview} flagged={flagged} onShowRule={showRule} />}

      <div className="dash-grid">
        <Summary points={result.summary} author={result.summary_author} />
        <FileIssues broken={result.broken_rows} notes={result.notes} />
      </div>
    </div>
  )
}
