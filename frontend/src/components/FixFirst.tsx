import { Link2Off, Repeat2 } from 'lucide-react'
import { countText } from '../format'
import type { FixFirst as Fixes } from '../types'

/** Where one fix helps most: one missing link behind many flags, and activities that fail several checks. */
export function FixFirst({ fixes }: { fixes: Fixes }) {
  if (fixes.open_ends.length === 0 && fixes.repeat_offenders.length === 0) return null
  return (
    <section className="card fixfirst" aria-label="Fix first">
      <h2>Fix first</h2>
      <div className="fix-cols">
        {fixes.open_ends.length > 0 && (
          <div>
            <h3 className="label">
              <Link2Off size={14} aria-hidden /> One missing link, many flags
            </h3>
            <ul className="fixlist">
              {fixes.open_ends.map((e) => (
                <li key={e.code} data-tip={`${e.name}, ${e.wbs}`}>
                  <span className="mono id">{e.code}</span> has nothing after it.{' '}
                  <b className="num">{countText(e.clears, 'flagged activity', 'flagged activities')}</b> lead only into it.
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
                <li key={r.code} data-tip={`${r.name}, ${r.wbs}`}>
                  <span className="mono id">{r.code}</span> fails <b className="num">{r.fails}</b> checks.
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
