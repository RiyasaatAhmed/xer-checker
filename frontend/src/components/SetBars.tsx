import { Check, Flag, Minus } from 'lucide-react'
import { countText, percentText } from '../format'
import type { RuleResult, SetCount } from '../types'

interface Props {
  sets: SetCount[] // activities flagged per set, from the backend
  rules: RuleResult[] // to tell how many checks in a set are over, and why a set can't run
  checked: number // activities checked: the base of every share
  group: string | null // the set picked, if any
  onGroup: (group: string | null) => void // pick a set to show only its checks below
}

/** One bar per set of checks, on the board's own 0 to 100% axis: the share of activities that fail at least one check
 *  in the set, each activity counted once. Red when a check in the set is over its limit, green when all are within.
 *  A set where no check could run is one line with the reason. Click a set to show only its checks. */
export function SetBars({ sets, rules, checked, group, onGroup }: Props) {
  return (
    <div className="crows sets" role="group" aria-label="Activities flagged, by set of checks">
      <h3 className="tier-title">Sets of checks</h3>
      {sets.map((s) => {
        const inSet = rules.filter((r) => r.group === s.group)
        const ran = inSet.filter((r) => r.status !== 'n/a')
        if (ran.length === 0) return <CantRun key={s.group} name={s.group} rules={inSet} />
        const over = ran.filter((r) => r.status === 'flag').length
        const share = checked > 0 ? (100 * s.flagged) / checked : 0
        const activities = countText(s.flagged, 'activity', 'activities')
        const Icon = over > 0 ? Flag : Check
        const picked = group === s.group
        return (
          <button
            key={s.group}
            type="button"
            className={`crow set-row ${over > 0 ? 'flag' : 'pass'}`}
            aria-pressed={picked}
            aria-label={`${s.group}: ${activities}, ${percentText(share, s.flagged)}, ${over > 0 ? `${over} of ${ran.length} checks over the limit` : 'every check within the limit'}`}
            data-tip={`${s.group}: ${activities} fail at least one of its ${ran.length} checks, each counted once. ${picked ? 'Click to show every check again' : 'Click to show only these checks'}`}
            onClick={() => onGroup(picked ? null : s.group)}
          >
            <span className="crow-name">
              <Icon size={15} strokeWidth={2.5} aria-hidden />
              <span>{s.group}</span>
            </span>
            <span className="crow-bar" aria-hidden="true">
              {s.flagged > 0 && <span className="crow-fill" style={{ width: `${Math.min(100, share)}%` }} />}
            </span>
            <span className="crow-value num">{percentText(share, s.flagged)}</span>
            <span className="crow-ratio">{over > 0 ? `${over} of ${ran.length} over` : 'all within'}</span>
            <span className="crow-trend" />
            <span className="crow-count num">{activities}</span>
          </button>
        )
      })}
    </div>
  )
}

/** A set where no check could run: its name and the reason they share, as the folded checks below give it. */
function CantRun({ name, rules }: { name: string; rules: RuleResult[] }) {
  const reasons = [...new Set(rules.map((r) => r.na_reason).filter(Boolean))]
  return (
    <div className="crow na">
      <span className="crow-name">
        <Minus size={15} strokeWidth={2.5} aria-hidden />
        <span>{name}</span>
        <span className="vh">Can’t be checked</span>
      </span>
      <span className="crow-why">
        {countText(rules.length, 'check')} can’t run{reasons.length === 1 ? `: ${reasons[0]}` : ''}
      </span>
    </div>
  )
}
