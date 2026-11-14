import { ArrowDown, ArrowUp, Calendar, CalendarCheck, CalendarX, Check, Flag, Minus, Route, TriangleAlert } from 'lucide-react'
import { MAX_WORST, SMALL_SAMPLE, changes, overText, tally, worstFirst } from '../board'
import { countText, dayText, daysBetween, percentText, plural } from '../format'
import { progressOf, trustOf } from '../glance'
import type { CheckResult, ProjectInfo } from '../types'
import { FinishGap } from './FinishGap'

// ---------- Constants ----------

const DRIVING_TIP = 'The checked activities at the lowest float, within half a working day. A must-finish date lifts the whole path off 0 days.'

interface Props {
  result: CheckResult
  project: ProjectInfo | undefined // the project picked, when the file holds more than one
  onPick: (id: string) => void // a named check
  onIssues: () => void // show the broken rows
}

/** The answer in 3 seconds: can the file be trusted, how many checks are over the limit and how serious,
 *  what drives the finish, will it finish on time, and how far along it is. */
export function Verdict({ result, project, onPick, onIssues }: Props) {
  const counts = tally(result.rules)
  const runnable = counts.flag + counts.pass
  const worst = worstFirst(result.rules).slice(0, MAX_WORST)
  const change = changes(result.rules, result.previous)
  const gap = project?.forecast_finish && project.deadline ? daysBetween(project.deadline, project.forecast_finish) : null // forecast minus deadline
  const bad = counts.flag > 0
  const none = runnable === 0 // nothing to check: not a pass
  return (
    <section className="verdict" aria-label="Verdict">
      <div className="verdict-checks">
        <Trust result={result} onIssues={onIssues} />
        <p className={`verdict-line ${none ? 'none' : bad ? 'flag' : 'pass'}`}>
          {none ? <Minus size={20} strokeWidth={2.5} aria-hidden /> : bad ? <Flag size={20} strokeWidth={2.5} aria-hidden /> : <Check size={20} strokeWidth={2.5} aria-hidden />}
          <span>
            {none ? (
              <>No check could run</>
            ) : bad ? (
              <>
                <b className="num">{counts.flag}</b> of <b className="num">{runnable}</b> checks over the limit
              </>
            ) : (
              <>All {runnable} checks within the limit</>
            )}
          </span>
        </p>
        {bad && (
          <p className="verdict-tiers">
            <span className={counts.serious > 0 ? 'serious' : undefined}>
              <b className="num">{counts.serious}</b> serious
            </span>{' '}
            · <b className="num">{counts.flag - counts.serious}</b> minor
          </p>
        )}
        {worst.length > 0 && (
          <p className="verdict-worst">
            Worst:{' '}
            {worst.map((r, i) => (
              <span key={r.id}>
                {i > 0 && ' · '}
                <button type="button" className="link-inline" onClick={() => onPick(r.id)}>
                  {r.name}
                </button>{' '}
                <span className="faint num">{overText(r)}</span>
              </span>
            ))}
          </p>
        )}
        <Driving result={result} />
        {change && (
          <p className="verdict-change">
            {change.worse === 0 && change.better === 0 ? (
              <>No change since the last upload</>
            ) : (
              <>
                {change.worse > 0 && (
                  <span className="trend worse">
                    <ArrowUp size={13} strokeWidth={2.5} aria-hidden /> {change.worse} worse
                  </span>
                )}
                {change.better > 0 && (
                  <span className="trend better">
                    <ArrowDown size={13} strokeWidth={2.5} aria-hidden /> {change.better} better
                  </span>
                )}{' '}
                than the last upload
              </>
            )}
          </p>
        )}
      </div>

      <div className="verdict-finish">
        {gap !== null ? (
          <p className={`verdict-line ${gap > 0 ? 'flag' : 'pass'}`} data-tip={`Forecast finish against the must-finish date: ${Math.abs(gap)} ${plural(Math.abs(gap), 'day')} ${gap > 0 ? 'after' : 'before'} it`}>
            {gap > 0 ? <CalendarX size={20} strokeWidth={2.5} aria-hidden /> : <CalendarCheck size={20} strokeWidth={2.5} aria-hidden />}
            <span>
              <b className="num">{Math.abs(gap)}</b> {plural(Math.abs(gap), 'day')} {gap > 0 ? 'late' : gap === 0 ? 'on the deadline' : 'early'}
            </span>
          </p>
        ) : project?.forecast_finish ? (
          <p className="verdict-line neutral">
            <Calendar size={20} aria-hidden />
            <span>Finish {dayText(project.forecast_finish)}</span>
          </p>
        ) : (
          <p className="verdict-line none">
            <CalendarX size={20} aria-hidden />
            <span>No forecast finish</span>
          </p>
        )}
        {gap !== null && <FinishGap days={gap} />}
        <p className="verdict-dates">
          {gap !== null && project?.forecast_finish && <span>Finish {dayText(project.forecast_finish)}</span>}
          {project?.deadline ? <span>Deadline {dayText(project.deadline)}</span> : project?.forecast_finish && <span>No must-finish date in the file</span>}
        </p>
        <Progress result={result} />
      </div>
    </section>
  )
}

/** The first thing to know: did the file read cleanly, or are the results partial? */
function Trust({ result, onIssues }: { result: CheckResult; onIssues: () => void }) {
  const trust = trustOf(result)
  const read = result.overview ? countText(result.overview.activities, 'activity', 'activities') : null
  const few = result.checked > 0 && result.checked < SMALL_SAMPLE ? `only ${result.checked.toLocaleString()} checked` : null
  if (trust.broken === 0 && trust.blanks === 0) {
    return (
      <p className="verdict-trust ok">
        <Check size={14} strokeWidth={2.5} aria-hidden />
        <span>File reads cleanly{read && ` · ${read} read`}{few && ` · ${few}`}</span>
      </p>
    )
  }
  const parts = [
    trust.broken > 0 && countText(trust.broken, 'broken row'),
    trust.blanks > 0 && countText(trust.blanks, 'row read with blanks', 'rows read with blanks'),
    few,
    trust.partial && 'results may be partial',
  ].filter(Boolean)
  return (
    <p className={`verdict-trust${trust.partial ? ' bad' : ''}`}>
      <TriangleAlert size={14} strokeWidth={2.5} aria-hidden />
      <button type="button" className="link-inline" onClick={onIssues} data-tip="Show the rows and what is wrong with each">
        {parts.join(' · ')}
      </button>
    </p>
  )
}

/** What drives the finish: the activities at the lowest float, and the WBS that holds most of them. */
function Driving({ result }: { result: CheckResult }) {
  const o = result.overview
  if (!o || o.driving_count == null) return null // an upload saved before the driving path was counted
  if (o.driving_count === 0 || o.lowest_float == null) {
    return (
      <p className="verdict-driving none">
        <Route size={14} aria-hidden /> No float in the file, so no driving path
      </p>
    )
  }
  const late = o.lowest_float < 0
  return (
    <p className={`verdict-driving${late ? ' late' : ''}`} data-tip={DRIVING_TIP}>
      <Route size={14} aria-hidden />
      <span>
        Driving path: <b className="num">{countText(o.driving_count, 'activity', 'activities')}</b> at <b className="num">{o.lowest_float.toFixed(1)} d</b> float
        {late && ', already late'}
        {o.driving_wbs && <>, most in {o.driving_wbs}</>}
      </span>
    </p>
  )
}

/** How far along the work is: the share complete and the count in progress. */
function Progress({ result }: { result: CheckResult }) {
  const progress = progressOf(result.overview)
  return (
    <p className="verdict-dates">
      {progress && (
        <span>
          <b className="num">{percentText(progress.percent)}</b> complete · <b className="num">{progress.active.toLocaleString()}</b> in progress
        </span>
      )}
      <span>{countText(result.checked, 'activity', 'activities')} checked</span>
    </p>
  )
}
