import { countText, percentText } from '../format'
import type { Overview } from '../types'

// ---------- Constants ----------

// Status is an order (not started, in progress, complete): one navy ramp, light to dark.
const STATUS_TONE: Record<string, string> = { TK_NotStart: 'step-1', TK_Active: 'step-2', TK_Complete: 'step-3' }
// Float runs from bad to fine: negative and critical orange, then neutral steps. High float is drawn orange too when its check is over.
const FLOAT_TONE: Record<string, string> = { negative: 'tone-bad', zero: 'tone-warn', low: 'step-2', mid: 'step-1', high: 'step-3' }
const FLOAT_CHECK: Record<string, string> = { negative: 'Negative float', high: 'High float' } // the checks these bands feed

interface Props {
  overview: Overview
  flagged: Set<string> // the checks over their limit
  onShowRule: (name: string) => void
}

/** "What's in the file", at a glance: five counts and two bars. Facts from the file, not pass or fail. */
export function ScheduleOverview({ overview: o, flagged, onShowRule }: Props) {
  const fs = o.by_link_type.find((p) => p.key === 'PR_FS')
  const counts = [
    { label: 'Activities', value: o.activities, note: `${o.checked.toLocaleString()} checked` },
    { label: 'Links', value: o.links, note: fs ? `${percentText(fs.percent)} finish to start` : undefined },
    { label: 'Leads', value: o.leads, note: 'negative lag' },
    { label: 'Lags', value: o.lags, note: 'positive lag' },
    { label: 'Constraints', value: o.constraints, note: 'dates set by hand' },
  ]
  return (
    <section className="card overview" aria-labelledby="overview-title">
      <div className="card-head">
        <h2 id="overview-title">What’s in the file</h2>
      </div>

      <dl className="counts">
        {counts.map((c) => (
          <div key={c.label}>
            <dt className="label">{c.label}</dt>
            <dd className="num">{c.value.toLocaleString()}</dd>
            {c.note && <dd className="hint small">{c.note}</dd>}
          </div>
        ))}
      </dl>

      <Stack title="Status" total={o.activities} parts={o.by_status.map((p) => ({ key: p.key, label: p.label, count: p.count, tone: STATUS_TONE[p.key] ?? 'step-1' }))} />
      <Stack
        title="Float of the checked activities"
        total={o.checked - o.no_float}
        parts={o.float_profile.map((b) => ({ key: b.key, label: b.label, count: b.count, tone: b.key === 'high' && flagged.has('High float') ? 'tone-bad' : FLOAT_TONE[b.key] }))}
        action={(key) => (FLOAT_CHECK[key] && flagged.has(FLOAT_CHECK[key]) ? { label: `${FLOAT_CHECK[key]}: over the limit`, run: () => onShowRule(FLOAT_CHECK[key]) } : null)}
      />

      {o.duplicate_links > 0 && (
        <p className="note">{countText(o.duplicate_links, 'pair is', 'pairs are')} linked twice in the file. Each counts once, by its later link, as Kazinex does.</p>
      )}
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
function Stack({ title, total, parts, action }: { title: string; total: number; parts: Part[]; action?: (key: string) => { label: string; run: () => void } | null }) {
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
          const link = action?.(p.key)
          return (
            <li key={p.key}>
              <span className={`swatch ${p.tone}`} aria-hidden="true" />
              {p.label} <span className="num">{p.count.toLocaleString()}</span>
              {link && p.count > 0 && (
                <button type="button" className="link-button" onClick={link.run}>
                  {link.label}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
