import { Info } from 'lucide-react'
import { percentText } from '../format'
import type { Overview } from '../types'

// ---------- Constants ----------

// Status is an order (not started, in progress, complete): one slate ramp, light to dark.
const STATUS_TONE: Record<string, string> = { TK_NotStart: 'step-1', TK_Active: 'step-2', TK_Complete: 'step-3' }
const LEFT_OUT_TONE = 'step-1' // activities the checks skip, drawn light next to the checked ones

interface Props {
  overview: Overview
}

/** What's in the file, in one small card: five counts, the status of the work, and what the checks skip. Facts, not pass or fail. */
export function FileProfile({ overview: o }: Props) {
  const fs = o.by_link_type.find((p) => p.key === 'PR_FS')
  const stats = [
    { label: 'activities', value: o.activities, title: `${o.checked.toLocaleString()} of them are checked: unfinished work, without milestones, level of effort or WBS summaries` },
    { label: 'links', value: o.links, title: fs ? `${percentText(fs.percent)} are finish to start` : undefined },
    { label: 'leads', value: o.leads, title: 'Links with a negative lag' },
    { label: 'lags', value: o.lags, title: 'Links with a positive lag' },
    { label: 'constraints', value: o.constraints, title: 'Dates set by hand in P6' },
  ]
  const skipped = o.left_out ?? []
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
        {skipped.length > 0 && (
          <Stack
            title="Checked and left out"
            total={o.activities}
            parts={[{ key: 'checked', label: 'Checked', count: o.checked, tone: 'step-2' }, ...skipped.map((p) => ({ key: p.key, label: p.label, count: p.count, tone: LEFT_OUT_TONE }))]}
          />
        )}
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
function Stack({ title, total, parts }: { title: string; total: number; parts: Part[] }) {
  return (
    <div className="stack-bar">
      <div className="label">{title}</div>
      <div className="segments" role="img" aria-label={parts.map((p) => `${p.label} ${p.count}`).join(', ')}>
        {parts.filter((p) => p.count > 0).map((p) => (
          <span key={p.key} className={`segment ${p.tone}`} style={{ flexGrow: p.count }} title={`${p.label}: ${p.count} of ${total}`} />
        ))}
      </div>
      <ul className="legend">
        {parts.map((p) => (
          <li key={p.key} className={p.count === 0 ? 'zero' : undefined}>
            <span className={`swatch ${p.tone}`} aria-hidden="true" />
            {p.label} <span className="num">{p.count.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
