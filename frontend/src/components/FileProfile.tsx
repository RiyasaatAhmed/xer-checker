import { Info } from 'lucide-react'
import { percentText } from '../format'
import type { Overview } from '../types'

// ---------- Constants ----------

// Status is an order (not started, in progress, complete): one slate ramp, light to dark.
const STATUS_TONE: Record<string, string> = { TK_NotStart: 'step-1', TK_Active: 'step-2', TK_Complete: 'step-3' }
// Float runs from bad to fine: negative red, zero amber, then slate steps. Over 44 days is red too when its check is over.
const FLOAT_TONE: Record<string, string> = { negative: 'tone-bad', zero: 'tone-warn', low: 'step-1', mid: 'step-2', high: 'step-3' }
const FLOAT_CHECK: Record<string, string> = { negative: 'Negative float', high: 'High float' } // the checks these bands feed

interface Props {
  overview: Overview
  flagged: Set<string> // the checks over their limit
  onShowRule: (name: string) => void
}

/** What's in the file, in one small card: five counts and two bars. Facts from the file, not pass or fail. */
export function FileProfile({ overview: o, flagged, onShowRule }: Props) {
  const fs = o.by_link_type.find((p) => p.key === 'PR_FS')
  const stats = [
    { label: 'activities', value: o.activities, title: `${o.checked.toLocaleString()} of them are checked: unfinished work, without milestones, level of effort or WBS summaries` },
    { label: 'links', value: o.links, title: fs ? `${percentText(fs.percent)} are finish to start` : undefined },
    { label: 'leads', value: o.leads, title: 'Links with a negative lag' },
    { label: 'lags', value: o.lags, title: 'Links with a positive lag' },
    { label: 'constraints', value: o.constraints, title: 'Dates set by hand in P6' },
  ]
  return (
    <section className="card profile" aria-label="File profile">
      <p className="stats">
        {stats.map((s) => (
          <span key={s.label} title={s.title}>
            <b className="num">{s.value.toLocaleString()}</b> {s.label}
          </span>
        ))}
        {o.duplicate_links > 0 && (
          <span className="info" title={`${o.duplicate_links} pairs of activities are linked twice. Each pair counts once, by its later link, as Kazinex does.`} aria-label={`${o.duplicate_links} pairs of activities are linked twice`}>
            <Info size={14} aria-hidden />
          </span>
        )}
      </p>
      <div className="stacks">
        <Stack title="Status" total={o.activities} parts={o.by_status.map((p) => ({ key: p.key, label: p.label, count: p.count, tone: STATUS_TONE[p.key] ?? 'step-1' }))} />
        <Stack
          title="Float of the checked activities"
          total={o.checked - o.no_float}
          parts={o.float_profile.map((b) => ({ key: b.key, label: b.label, count: b.count, tone: b.key === 'high' && flagged.has('High float') ? 'tone-bad' : FLOAT_TONE[b.key] }))}
          action={(key) => (FLOAT_CHECK[key] && flagged.has(FLOAT_CHECK[key]) ? () => onShowRule(FLOAT_CHECK[key]) : null)}
        />
      </div>
    </section>
  )
}

interface Part {
  key: string
  label: string
  count: number
  tone: string
}

/** One whole as a single bar split into parts, with a legend. Segments are 2px apart. */
function Stack({ title, total, parts, action }: { title: string; total: number; parts: Part[]; action?: (key: string) => (() => void) | null }) {
  return (
    <div className="stack-bar">
      <div className="label">{title}</div>
      <div className="segments" role="img" aria-label={parts.map((p) => `${p.label} ${p.count}`).join(', ')}>
        {parts.filter((p) => p.count > 0).map((p) => (
          <span key={p.key} className={`segment ${p.tone}`} style={{ flexGrow: p.count }} title={`${p.label}: ${p.count} of ${total}`} />
        ))}
      </div>
      <ul className="legend">
        {parts.map((p) => {
          const run = p.count > 0 ? action?.(p.key) : null
          const inner = (
            <>
              <span className={`swatch ${p.tone}`} aria-hidden="true" />
              {p.label} <span className="num">{p.count.toLocaleString()}</span>
            </>
          )
          return (
            <li key={p.key} className={p.count === 0 ? 'zero' : undefined}>
              {run ? (
                <button type="button" className="legend-button" onClick={run} title="Show these activities">
                  {inner}
                </button>
              ) : (
                inner
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
