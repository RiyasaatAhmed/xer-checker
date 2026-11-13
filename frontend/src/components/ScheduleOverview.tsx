import { countText, percentText } from '../format'
import type { Overview, Part } from '../types'

// ---------- Constants ----------

// Status is an order (not started, then in progress, then complete): one navy ramp, light to dark.
const STATUS_TONE: Record<string, string> = { TK_NotStart: 'step-1', TK_Active: 'step-2', TK_Complete: 'step-3' }
// The float bands the negative and high float checks flag; the rest are neutral.
const FLAGGED_BANDS: Record<string, string> = { negative: 'Negative float', high: 'High float' }

interface Props {
  overview: Overview
  flagged: Set<string> // the checks over their limit, so their float bands can say so
  onShowRule: (name: string) => void
}

/** "What's in the file": the schedule counted, as facts read from it. Not pass or fail. */
export function ScheduleOverview({ overview: o, flagged, onShowRule }: Props) {
  const most = Math.max(1, ...o.float_profile.map((b) => b.count))
  return (
    <section className="overview" aria-labelledby="overview-title">
      <div className="overview-head">
        <div className="eyebrow">What’s in the file</div>
        <h2 id="overview-title">The schedule, counted</h2>
        <p className="hint">Facts read straight from the file, not pass or fail. Links and constraints are counted the way Kazinex counts them, checked on the 2 sample files.</p>
      </div>

      <div className="overview-grid">
        <div className="card panel">
          <PanelHead label="Activities" value={o.activities} note={`DCMA checks ${o.checked.toLocaleString()} of them: unfinished work, without milestones, level of effort or WBS summaries`} />
          <div className="segments" role="img" aria-label={o.by_status.map((p) => `${p.label} ${p.count}`).join(', ')}>
            {o.by_status.map((p) => (
              <span key={p.key} className={`segment ${STATUS_TONE[p.key] ?? 'step-1'}`} style={{ flexGrow: p.count }} title={`${p.label}: ${p.count} (${percentText(p.percent)})`} />
            ))}
          </div>
          <ul className="legend">
            {o.by_status.map((p) => (
              <li key={p.key}>
                <span className={`swatch ${STATUS_TONE[p.key] ?? 'step-1'}`} aria-hidden="true" />
                {p.label} <span className="num">{p.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
          <BarList parts={o.by_type} title="By type" />
        </div>

        <div className="card panel">
          <PanelHead label="Links" value={o.links} note="One per pair of activities" />
          <BarList parts={o.by_link_type} title="By type" showPercent />
          <dl className="facts">
            <div><dt>Leads (negative lag)</dt><dd className="num">{o.leads.toLocaleString()}</dd></div>
            <div><dt>Lags (positive lag)</dt><dd className="num">{o.lags.toLocaleString()}</dd></div>
          </dl>
          {o.duplicate_links > 0 && (
            <p className="note">
              {countText(o.duplicate_links, 'pair of activities is', 'pairs of activities are')} linked twice in the file. Each pair is counted once, using its later row, as Kazinex does.
            </p>
          )}
        </div>

        <div className="card panel wide">
          <PanelHead label="Float" value={o.checked} note="The checked activities, by total float in working days" unit="activities" />
          <ul className="float-bars">
            {o.float_profile.map((band) => {
              const rule = FLAGGED_BANDS[band.key]
              const over = rule !== undefined && flagged.has(rule)
              return (
                <li key={band.key} className={over ? 'over' : undefined}>
                  <span className="float-label">{band.label}</span>
                  <span className="float-track" aria-hidden="true">
                    {band.count > 0 && <span className="float-fill" style={{ width: `${(100 * band.count) / most}%` }} />}
                  </span>
                  <span className="float-count num">{band.count.toLocaleString()}</span>
                  {rule && band.count > 0 ? (
                    <button type="button" className="link-button" onClick={() => onShowRule(rule)}>
                      {over ? `${rule}: over the limit` : rule}
                    </button>
                  ) : (
                    <span />
                  )}
                </li>
              )
            })}
          </ul>
          {o.no_float > 0 && <p className="note">{countText(o.no_float, 'checked activity has', 'checked activities have')} no float in the file.</p>}
        </div>

        <div className="card panel">
          <PanelHead label="Constraints" value={o.constraints} note="Dates set by hand in P6, which can override the logic" />
          {o.by_constraint.length > 0 ? <BarList parts={o.by_constraint} title="By type" /> : <p className="hint">No activity has a constraint.</p>}
        </div>
      </div>
    </section>
  )
}

function PanelHead({ label, value, note, unit }: { label: string; value: number; note: string; unit?: string }) {
  return (
    <div className="panel-head">
      <h3 className="label">{label}</h3>
      <div className="panel-value num">
        {value.toLocaleString()}
        {unit && <span className="panel-unit"> {unit}</span>}
      </div>
      <p className="hint small">{note}</p>
    </div>
  )
}

/** A label, a bar and a figure per row, bars on one scale. */
function BarList({ parts, title, showPercent }: { parts: Part[]; title: string; showPercent?: boolean }) {
  const most = Math.max(1, ...parts.map((p) => p.count))
  return (
    <div className="bar-list">
      <div className="label">{title}</div>
      <ul>
        {parts.map((p) => (
          <li key={p.key}>
            <span className="bar-label">{p.label}</span>
            <span className="bar-track" aria-hidden="true">
              <span className="bar-fill" style={{ width: `${(100 * p.count) / most}%` }} />
            </span>
            <span className="bar-count num">
              {p.count.toLocaleString()}
              {showPercent && <span className="faint"> {percentText(p.percent)}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
