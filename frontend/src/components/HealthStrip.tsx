import { Check, Flag, Minus } from 'lucide-react'
import { groupsOf, tally } from '../board'
import type { RuleResult, RuleStatus } from '../types'

// ---------- Constants ----------

const ICON = { flag: Flag, pass: Check, 'n/a': Minus }
const WORDS: Record<RuleStatus, string> = { flag: 'over the limit', pass: 'within the limit', 'n/a': "can't be checked" }

interface Props {
  rules: RuleResult[]
  selected: string // the check picked
  group: string | null // the group of checks picked, if any
  onPick: (id: string) => void
  onGroup: (group: string | null) => void
}

/** One small cell per check, in sets, so 25 checks read as a handful of shapes. Click a cell or a set name to pick it. */
export function HealthStrip({ rules, selected, group, onPick, onGroup }: Props) {
  const counts = tally(rules)
  return (
    <div className="strip-wrap">
      <div className="strip" role="group" aria-label="All checks">
        {groupsOf(rules).map((name) => {
          const inGroup = rules.filter((r) => r.group === name)
          const over = inGroup.filter((r) => r.status === 'flag').length
          return (
            <div key={name} className="strip-set">
              <div className="strip-cells">
                {inGroup.map((r) => {
                  const Icon = ICON[r.status]
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className={`cell ${r.status}`}
                      aria-pressed={selected === r.id}
                      aria-label={`${r.name}: ${WORDS[r.status]}`}
                      title={`${r.name}: ${WORDS[r.status]}`}
                      onClick={() => onPick(r.id)}
                    >
                      <Icon size={12} strokeWidth={3} aria-hidden />
                    </button>
                  )
                })}
              </div>
              <button type="button" className={`strip-name${over > 0 ? ' has' : ''}`} aria-pressed={group === name} onClick={() => onGroup(group === name ? null : name)} title={`Show only the ${name} checks`}>
                {name}
                {over > 0 && <span className="num"> {over}</span>}
              </button>
            </div>
          )
        })}
      </div>
      <p className="strip-words">
        <b className="num">{counts.flag}</b> over the limit · <b className="num">{counts.pass}</b> within · <b className="num">{counts.na}</b> can’t be checked
      </p>
    </div>
  )
}
