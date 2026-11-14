import { Link2Off, Repeat2 } from 'lucide-react'
import { countText } from '../format'
import type { FixFirst as Fixes, RuleResult } from '../types'

// ---------- Constants ----------

const OPEN_END_CHECK = 'missing-links' // an activity with nothing after it is listed under this check

interface Props {
  fixes: Fixes
  rules: RuleResult[] // to name the checks an activity fails
  onShow: (code: string, checkId?: string) => void // list the activity, in this check
}

/** Where one fix helps most: one missing link behind many flags, and activities that fail several checks. */
export function FixFirst({ fixes, rules, onShow }: Props) {
  if (fixes.open_ends.length === 0 && fixes.repeat_offenders.length === 0) return null
  const nameOf = (id: string) => rules.find((r) => r.id === id)?.name ?? id
  const idButton = (code: string, name: string, checkId?: string) => (
    <button type="button" className="link-inline mono id" onClick={() => onShow(code, checkId)} data-tip={`${name}. Click to list it`}>
      {code}
    </button>
  )
  return (
    <section className="card fixfirst" aria-label="Fix first">
      <h2>Fix first</h2>
      <div className="fix-cols">
        {fixes.open_ends.length > 0 && (
          <div>
            <h3 className="label">
              <Link2Off size={14} aria-hidden /> Open ends behind many flags
            </h3>
            <ul className="fixlist">
              {fixes.open_ends.map((e, i) => (
                <li key={`${e.code}-${i}`}>
                  {idButton(e.code, e.name, OPEN_END_CHECK)} has nothing after it.{' '}
                  <b className="num">{countText(e.clears, 'flagged activity', 'flagged activities')}</b> lead only into it.
                  {e.wbs && <span className="fix-wbs faint"> {e.wbs}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {fixes.repeat_offenders.length > 0 && (
          <div>
            <h3 className="label">
              <Repeat2 size={14} aria-hidden /> Fail the most checks
            </h3>
            <ul className="fixlist">
              {fixes.repeat_offenders.map((r) => (
                <li key={r.code}>
                  {idButton(r.code, r.name, r.checks?.[0])} fails <b className="num">{r.fails}</b> checks
                  {r.checks && r.checks.length > 0 ? <>: {r.checks.map(nameOf).join(', ')}.</> : '.'}
                  {r.wbs && <span className="fix-wbs faint"> {r.wbs}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
