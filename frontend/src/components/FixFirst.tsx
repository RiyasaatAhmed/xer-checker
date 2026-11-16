import { Link2Off, Repeat2 } from 'lucide-react'
import { countText } from '../format'
import type { FixFirst as Fixes, Repeat, RuleResult } from '../types'

// ---------- Constants ----------

const OPEN_END_CHECK = 'missing-links' // an activity with nothing after it is listed under this check

interface Props {
  fixes: Fixes
  rules: RuleResult[] // to name the checks an activity fails
  onShow: (code: string, checkId?: string) => void // list the activity, in this check
}

/** Where one fix helps most: one missing link behind many flags, and activities that fail several checks.
 *  Those activities are a grid, checks down and activities across: one shared pattern is one problem to fix. */
export function FixFirst({ fixes, rules, onShow }: Props) {
  if (fixes.open_ends.length === 0 && fixes.repeat_offenders.length === 0) return null
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
            {fixes.repeat_offenders.some((r) => (r.checks ?? []).length > 0) ? (
              <FailGrid offenders={fixes.repeat_offenders} rules={rules} idButton={idButton} />
            ) : (
              <ul className="fixlist">
                {fixes.repeat_offenders.map((r) => (
                  <li key={r.code}>
                    {idButton(r.code, r.name, r.checks?.[0])} fails <b className="num">{r.fails}</b> checks.
                    {r.wbs && <span className="fix-wbs faint"> {r.wbs}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

/** The activities that fail the most checks: a column each, a row per check any of them fails, in board order.
 *  A filled mark where the activity fails the check. The foot counts each column. */
function FailGrid({ offenders, rules, idButton }: { offenders: Repeat[]; rules: RuleResult[]; idButton: (code: string, name: string, checkId?: string) => React.ReactNode }) {
  const failed = new Set(offenders.flatMap((o) => o.checks ?? []))
  const rows = rules.filter((r) => failed.has(r.id))
  return (
    <div className="table-scroll">
      <table className="failgrid" aria-label="Activities that fail the most checks">
        <thead>
          <tr>
            <th scope="col">
              <span className="vh">Check</span>
            </th>
            {offenders.map((o) => (
              <th key={o.code} scope="col" data-tip={o.wbs ? `${o.name}. ${o.wbs}` : o.name}>
                {idButton(o.code, o.name, o.checks?.[0])}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <th scope="row">{r.name}</th>
              {offenders.map((o) => {
                const fails = (o.checks ?? []).includes(r.id)
                return (
                  <td key={o.code}>
                    {fails ? <span className="faildot" role="img" aria-label={`${o.code} fails ${r.name}`} /> : <span className="vh">passes</span>}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Checks failed</th>
            {offenders.map((o) => (
              <td key={o.code} className="num">
                {o.fails}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
