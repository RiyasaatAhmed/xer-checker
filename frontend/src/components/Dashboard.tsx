import { Check, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { worstFirst, type Scope } from '../board'
import { countText, dateText } from '../format'
import { ruleText } from '../rules'
import { namesIn } from '../tree'
import type { CheckResult } from '../types'
import { CheckBoard } from './CheckBoard'
import { FileIssues } from './FileIssues'
import { FileProfile } from './FileProfile'
import { FixFirst } from './FixFirst'
import { FlaggedActivities } from './FlaggedActivities'
import { FloatStrip } from './FloatStrip'
import { ScheduleMap, type ScopeChoice } from './ScheduleMap'
import { Summary } from './Summary'
import { Verdict } from './Verdict'

interface Props {
  result: CheckResult
  checkId: string | null // the check named in the address, if any
  onCheck: (checkId: string) => void
}

/** One checked schedule: the verdict, the checks, where the problems are, then the activities behind a check. */
export function Dashboard({ result, checkId, onCheck }: Props) {
  const { rules } = result
  // Start on the worst check over its limit, so the list shows what needs a look.
  const first = worstFirst(rules)[0] ?? rules.find((r) => r.status !== 'n/a') ?? rules[0]
  const rule = rules.find((r) => r.id === checkId) ?? first
  const [project] = result.projects ?? []
  const [setOfChecks, setSetOfChecks] = useState<string | null>(null) // the set of checks picked on the strip
  const [mapChoice, setMapChoice] = useState<ScopeChoice['key']>('check') // what the map counts
  const [groupId, setGroupId] = useState<string | null>(null) // the WBS group picked on the map
  const groups = useMemo(() => result.structure ?? [], [result.structure])
  const group = groups.find((g) => g.id === groupId)
  const wbs = useMemo(() => (group ? { names: namesIn(groups, group.id), label: group.name } : null), [groups, group])
  const issues = result.broken_rows.length + result.notes.length

  const choice: ScopeChoice['key'] = mapChoice === 'group' && !setOfChecks ? 'check' : mapChoice
  const scope: Scope = choice === 'all' ? null : choice === 'group' && setOfChecks ? { group: setOfChecks } : { check: rule.id }
  const choices: ScopeChoice[] = [
    { key: 'check', label: rule.name },
    ...(setOfChecks ? [{ key: 'group' as const, label: `${setOfChecks} checks` }] : []),
    { key: 'all', label: 'All checks' },
  ]

  /** Bring a section into view and move focus to it, for keyboard and screen reader users too. */
  function reveal(id: string) {
    const section = document.getElementById(id)
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    section?.focus({ preventScroll: true })
  }

  function showRule(id: string) {
    onCheck(id)
    setMapChoice('check')
    reveal('activities')
  }

  function pickSet(name: string | null) {
    setSetOfChecks(name)
    setMapChoice(name ? 'group' : 'check')
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

      <Verdict result={result} onPick={showRule} />

      <CheckBoard rules={rules} previous={result.previous} selected={rule?.id ?? ''} group={setOfChecks} lowestFloat={result.overview?.lowest_float} onPick={showRule} onGroup={pickSet} />

      {result.overview && <FloatStrip overview={result.overview} onShow={showRule} />}

      {groups.length > 0 && rule && (
        <ScheduleMap
          groups={groups}
          project={project}
          rules={rules}
          months={result.months ?? []}
          scope={scope}
          choices={choices}
          choice={choice}
          onChoice={setMapChoice}
          selectedId={groupId}
          onSelect={pickGroup}
          group={setOfChecks}
          onGroup={pickSet}
        />
      )}

      {result.fix_first && <FixFirst fixes={result.fix_first} />}

      {rule?.status === 'n/a' && (
        <section className="card activities" id="activities" aria-label={`${rule.name}: can't be checked`} tabIndex={-1}>
          <div className="card-head">
            <h2>{rule.name}</h2>
          </div>
          <p>{rule.na_reason ?? 'Nothing to check.'}</p>
          <p className="hint">{ruleText(rule.id).short}.</p>
        </section>
      )}
      {/* key: each check starts with an empty filter and its own sort */}
      {rule && rule.status !== 'n/a' && (
        <FlaggedActivities
          key={rule.id}
          uploadId={result.upload_id}
          rule={rule}
          fileName={result.file_name}
          groups={groups}
          dataDate={project?.data_date ?? null}
          wbs={wbs}
          onClearWbs={() => setGroupId(null)}
        />
      )}

      {result.overview && <FileProfile overview={result.overview} />}

      <Summary points={result.summary} author={result.summary_author} />

      {issues > 0 && <FileIssues broken={result.broken_rows} notes={result.notes} />}
    </div>
  )
}
