import { percentText } from '../format'
import type { Overview } from '../types'

// ---------- Constants ----------

// Each band's look. Color follows how close to critical the work is, not which check flags it.
const LOOK: Record<string, string> = {
  negative: 'f-neg', zero: 'f-zero', d1_5: 'f-near', d6_10: 'f-near2', d11_20: 'f-fine', d21_44: 'f-fine2', d45_90: 'f-spare', d90: 'f-spare',
  // the older, coarser bands of an upload saved before the finer ones
  low: 'f-near', mid: 'f-fine2', high: 'f-spare',
}
const SPARE = new Set(['d45_90', 'd90', 'high']) // over 44 days: the high float check's range
const HIGH_FLOAT_LIMIT = 5 // percent of activities: where DCMA flags too much spare time

interface Props {
  overview: Overview
  onShow: (checkId: string) => void // pick the check that a band feeds
}

/** Float of the unfinished work in one bar: from late, through critical and close to critical, to spare time. */
export function FloatStrip({ overview: o, onShow }: Props) {
  const bands = o.float_bands && o.float_bands.length > 0 ? o.float_bands : o.float_profile
  const total = o.checked - o.no_float
  const spare = bands.filter((b) => SPARE.has(b.key)).reduce((sum, b) => sum + b.count, 0)
  const feeds = (key: string) => (key === 'negative' ? 'negative-float' : SPARE.has(key) ? 'high-float' : null)
  return (
    <section className="card floatstrip" aria-label="Float of the unfinished work">
      <div className="floatstrip-head">
        <h2>Float of the unfinished work</h2>
        <span className="hint small">
          {o.lowest_float != null && <>Lowest {o.lowest_float.toFixed(1)} d · </>}
          Over 44 d: <b className="num">{spare.toLocaleString()}</b> of {total.toLocaleString()} ({percentText(total ? (100 * spare) / total : 0)}), limit {HIGH_FLOAT_LIMIT}%
        </span>
      </div>
      <div className="fbands" role="img" aria-label={bands.map((b) => `${b.label} days ${b.count}`).join(', ')}>
        {bands.filter((b) => b.count > 0).map((b) => (
          <span key={b.key} className={`fband ${LOOK[b.key] ?? 'f-fine'}`} style={{ flexGrow: b.count }} title={`${b.label} days: ${b.count.toLocaleString()} of ${total.toLocaleString()}`} />
        ))}
        <span className="flimit" style={{ left: `${100 - HIGH_FLOAT_LIMIT}%` }} title={`DCMA limit: ${HIGH_FLOAT_LIMIT}% over 44 days`} />
      </div>
      <ul className="legend">
        {bands.map((b) => {
          const check = b.count > 0 ? feeds(b.key) : null
          const inner = (
            <>
              <span className={`swatch ${LOOK[b.key] ?? 'f-fine'}`} aria-hidden="true" />
              {b.label.replace(/ days.*/, '')} <span className="num">{b.count.toLocaleString()}</span>
            </>
          )
          return (
            <li key={b.key} className={b.count === 0 ? 'zero' : undefined}>
              {check ? (
                <button type="button" className="legend-button" onClick={() => onShow(check)} title="Show these activities">
                  {inner}
                </button>
              ) : (
                inner
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
