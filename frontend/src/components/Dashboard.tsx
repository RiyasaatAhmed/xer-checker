import { useMemo, useState } from 'react'
import { worstFirst, type Scope } from '../board'
import { countText, dateText, dayText, plural } from '../format'
import { statusAge } from '../glance'
import { checkName, ruleText } from '../rules'
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
export function Dashboard({ result: saved, checkId, onCheck }: Props) {
  // Every part shows a check by the problem it finds: "No resources", not "Resources"
  const result = useMemo(() => ({ ...saved, rules: saved.rules.map((r) => ({ ...r, name: checkName(r) })) }), [saved])
  const { rules } = result
  // Start on the worst check over its limit, so the list shows what needs a look.
  const first = worstFirst(rules)[0] ?? rules.find((r) => r.status !== 'n/a') ?? rules[0]
  const rule = rules.find((r) => r.id === checkId) ?? first
  const projects = result.projects ?? []
  const [projectAt, setProjectAt] = useState(0) // the project picked, when the file holds more than one
  const project = projects[projectAt] ?? projects[0]
  const [issuesOpen, setIssuesOpen] = useState(false)
  const [focus, setFocus] = useState<{ check: string; code: string } | null>(null) // an activity picked in Fix first
  const [setOfChecks, setSetOfChecks] = useState<string | null>(null) // the set of checks picked on the strip
  const [mapChoice, setMapChoice] = useState<ScopeChoice['key']>('check') // what the map counts
  const [groupId, setGroupId] = useState<string | null>(null) // the WBS group picked on the map
  const groups = useMemo(() => result.structure ?? [], [result.structure])
  const group = groups.find((g) => g.id === groupId)
  const wbs = useMemo(() => (group ? { names: namesIn(groups, group.id), label: group.name } : null), [groups, group])
  const issues = result.broken_rows.length + result.notes.length
  const o = result.overview
  // What else a row counts, beside its activities: a check counts activities, the file profile counts links
  const notes: Record<string, string> = o ? { leads: countText(o.leads, 'lead'), lags: countText(o.lags, 'lag') } : {}
  const age = statusAge(project?.data_date, result.uploaded_at)
  const checkNames = useMemo(() => Object.fromEntries(rules.map((r) => [r.id, r.name])), [rules])

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

  /** Open a check's activities, and count it on the map. */
  function openCheck(id: string) {
    onCheck(id)
    setMapChoice('check')
    reveal('activities')
  }

  function showRule(id: string) {
    setFocus(null) // a check picked by hand starts with an empty filter
    openCheck(id)
  }

  /** Open the broken rows under the verdict, and bring them into view. */
  function showIssues() {
    setIssuesOpen(true)
    reveal('file-issues')
  }

  /** List one activity from Fix first: in the check named, else in the check on screen, filtered to its ID. */
  function showActivity(code: string, checkIdOf?: string) {
    const target = rules.some((r) => r.id === checkIdOf && r.status !== 'n/a') ? (checkIdOf as string) : rule.id
    setGroupId(null)
    openCheck(target)
    setFocus({ check: target, code })
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
        <h1 className="file-name">{project?.name || result.file_name}</h1>
        <p className="meta">
          {project?.data_date && (
            <span className="meta-date">
              Data date {dayText(project.data_date)}
              {age !== null && age !== 0 && (
                <span className="faint">
                  {' '}
                  · {Math.abs(age)} {plural(Math.abs(age), 'day')} {age > 0 ? 'before' : 'after'} upload
                </span>
              )}
            </span>
          )}
          {project?.name && <span className="mono">{result.file_name}</span>}
          <span>Uploaded {dateText(result.uploaded_at)}</span>
          {projects.length > 1 && (
            <label className="meta-project" data-tip="The checks cover every project in the file together. The dates follow the project picked.">
              {projects.length} projects:
              <select className="select small" aria-label="Project" value={projectAt} onChange={(event) => setProjectAt(Number(event.target.value))}>
                {projects.map((p, i) => (
                  <option key={`${p.name}-${i}`} value={i}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </p>
      </header>

      <Verdict result={result} project={project} onIssues={showIssues} />

      {issues > 0 && <FileIssues broken={result.broken_rows} notes={result.notes} open={issuesOpen} onToggle={setIssuesOpen} />}

      <CheckBoard rules={rules} previous={result.previous} selected={rule?.id ?? ''} group={setOfChecks} lowestFloat={result.overview?.lowest_float} checked={result.checked} notes={notes} onPick={showRule} onGroup={pickSet} sets={result.sets} />

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

      {result.fix_first && <FixFirst fixes={result.fix_first} rules={rules} onShow={showActivity} />}

      {rule?.status === 'n/a' && (
        <section className="card activities" id="activities" aria-label={`${rule.name}: can't be checked`} tabIndex={-1}>
          <div className="card-head">
            <h2>{rule.name}</h2>
          </div>
          <p>{rule.na_reason ?? 'Nothing to check.'}</p>
          <p className="hint">{ruleText(rule.id).short}.</p>
        </section>
      )}
      {/* key: each check starts with its own sort, and an empty filter unless Fix first picked an activity */}
      {rule && rule.status !== 'n/a' && (
        <FlaggedActivities
          key={`${rule.id}|${focus?.check === rule.id ? focus.code : ''}`}
          initialFilter={focus?.check === rule.id ? focus.code : ''}
          uploadId={result.upload_id}
          rule={rule}
          fileName={result.file_name}
          groups={groups}
          dataDate={project?.data_date ?? null}
          wbs={wbs}
          onClearWbs={() => setGroupId(null)}
          checkNames={checkNames}
        />
      )}

      {result.overview && <FileProfile overview={result.overview} />}

      <Summary points={result.summary} author={result.summary_author} result={result} project={project} />
    </div>
  )
}
