import { Check, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { countText, dateText } from '../format'
import { namesIn } from '../tree'
import type { CheckResult } from '../types'
import { FileIssues } from './FileIssues'
import { FileProfile } from './FileProfile'
import { FlaggedActivities } from './FlaggedActivities'
import { Health } from './Health'
import { ScheduleMap } from './ScheduleMap'
import { Summary } from './Summary'

/** One checked file: the 3 checks first, then where the problems are, then the activities behind them. */
export function Dashboard({ result }: { result: CheckResult }) {
  // Start on the first check over its limit, so the list shows what needs a look.
  const first = result.rules.find((rule) => rule.status === 'flag') ?? result.rules[0]
  const [selected, setSelected] = useState(first?.name ?? '')
  const rule = result.rules.find((r) => r.name === selected)
  const flagged = new Set(result.rules.filter((r) => r.status === 'flag').map((r) => r.name))
  const [project] = result.projects ?? []
  const [groupId, setGroupId] = useState<string | null>(null) // the WBS group picked on the map
  const groups = useMemo(() => result.structure ?? [], [result.structure])
  const group = groups.find((g) => g.id === groupId)
  const wbs = useMemo(() => (group ? { names: namesIn(groups, group.id), label: group.name } : null), [groups, group])
  const issues = result.broken_rows.length + result.notes.length

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

  /** Pick a WBS group on the map: list its activities, for the check that's selected. */
  function pickGroup(id: string | null) {
    setGroupId(id)
    if (id) reveal('activities')
  }

  return (
    <div className="check">
      <header className="check-head">
        <h1 className="file-name">{result.file_name}</h1>
        <p className="meta">
          <span>{countText(result.checked, 'activity', 'activities')} checked</span>
          {result.broken_rows.length === 0 ? (
            <span className="ok">
              <Check size={14} aria-hidden /> 0 broken rows
            </span>
          ) : (
            <button type="button" className="link-inline bad" onClick={() => reveal('file-issues')}>
              <TriangleAlert size={14} aria-hidden /> {countText(result.broken_rows.length, 'broken row')}
            </button>
          )}
          {project && <span>{project.name}</span>}
          <span>{dateText(result.uploaded_at)}</span>
        </p>
      </header>

      <Health rules={result.rules} checked={result.checked} selected={selected} onSelect={showRule} />

      {groups.length > 0 && <ScheduleMap groups={groups} project={project} selectedId={groupId} onSelect={pickGroup} />}

      {/* key: each rule starts with an empty filter and its own sort */}
      {rule && (
        <FlaggedActivities
          key={rule.name}
          rule={rule}
          fileName={result.file_name}
          groups={groups}
          wbs={wbs}
          onClearWbs={() => setGroupId(null)}
        />
      )}

      {result.overview && <FileProfile overview={result.overview} flagged={flagged} onShowRule={showRule} />}

      <Summary points={result.summary} author={result.summary_author} />

      {issues > 0 && <FileIssues broken={result.broken_rows} notes={result.notes} />}
    </div>
  )
}
