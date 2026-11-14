import { ArrowDown, ArrowUp, CalendarCheck, CalendarX, Check, Flag } from 'lucide-react'
import { MAX_WORST, changes, ratio, tally, worstFirst } from '../board'
import { countText, dayText, daysBetween, plural } from '../format'
import type { CheckResult } from '../types'
import { FinishGap } from './FinishGap'

interface Props {
  result: CheckResult
  onPick: (id: string) => void // a named check
}

/** The answer in 3 seconds: will it finish on time, how many checks are over the limit, which are worst, and what changed. */
export function Verdict({ result, onPick }: Props) {
  const [project] = result.projects ?? []
  const counts = tally(result.rules)
  const runnable = counts.flag + counts.pass
  const worst = worstFirst(result.rules).slice(0, MAX_WORST)
  const change = changes(result.rules, result.previous)
  const gap = project?.forecast_finish && project.deadline ? daysBetween(project.deadline, project.forecast_finish) : null // forecast minus deadline
  const bad = counts.flag > 0
  return (
    <section className="verdict" aria-label="Verdict">
      <div className="verdict-checks">
        <p className={`verdict-line ${bad ? 'flag' : 'pass'}`}>
          {bad ? <Flag size={20} strokeWidth={2.5} aria-hidden /> : <Check size={20} strokeWidth={2.5} aria-hidden />}
          <span>
            {bad ? (
              <>
                <b className="num">{counts.flag}</b> of <b className="num">{runnable}</b> checks over the limit
              </>
            ) : (
              <>All {runnable} checks within the limit</>
            )}
          </span>
        </p>
        {worst.length > 0 && (
          <p className="verdict-worst">
            Worst:{' '}
            {worst.map((r, i) => (
              <span key={r.id}>
                {i > 0 && ', '}
                <button type="button" className="link-inline" onClick={() => onPick(r.id)}>
                  {r.name}
                </button>{' '}
                <span className="faint num">{ratio(r) !== null ? `${ratio(r)?.toFixed(1)}x` : r.count.toLocaleString()}</span>
              </span>
            ))}
          </p>
        )}
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
        {gap === null ? (
          <p className="verdict-line none">
            <CalendarX size={20} aria-hidden />
            <span>{project?.forecast_finish ? 'No deadline set' : 'No forecast finish'}</span>
          </p>
        ) : (
          <p className={`verdict-line ${gap > 0 ? 'flag' : 'pass'}`}>
            {gap > 0 ? <CalendarX size={20} strokeWidth={2.5} aria-hidden /> : <CalendarCheck size={20} strokeWidth={2.5} aria-hidden />}
            <span>
              <b className="num">{Math.abs(gap)}</b> {plural(Math.abs(gap), 'day')} {gap > 0 ? 'late' : gap === 0 ? 'on the deadline' : 'early'}
            </span>
          </p>
        )}
        {gap !== null && <FinishGap days={gap} />}
        <p className="verdict-dates">
          {project?.forecast_finish && <span>Finish {dayText(project.forecast_finish)}</span>}
          {project?.deadline && <span>Deadline {dayText(project.deadline)}</span>}
          {project?.data_date && <span>Data date {dayText(project.data_date)}</span>}
          <span>{countText(result.checked, 'activity', 'activities')} checked</span>
        </p>
      </div>
    </section>
  )
}
