import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'
import { dayText } from '../format'
import { domainOf, percentAt, ticks } from '../timeline'
import { childrenOf, topLevel, visibleGroups } from '../tree'
import type { ProjectInfo, WbsGroup } from '../types'

// ---------- Constants ----------

const MANY_FLAGGED = 0.25 // a group with at least this share flagged is drawn orange on the timeline

interface Props {
  groups: WbsGroup[]
  project: ProjectInfo | undefined // its dates are marked on the timeline
  selectedId: string | null // the group whose activities are listed below
  onSelect: (id: string | null) => void
}

/** One picture of the schedule: a row per WBS group, how many of its activities are flagged,
 *  and when its work happens. The project's key dates are marked on the same axis. */
export function ScheduleMap({ groups, project, selectedId, onSelect }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const children = childrenOf(groups)
  const rows = visibleGroups(groups, expanded)
  const top = topLevel(groups)
  const parents = groups.filter((g) => (children.get(g.id) ?? []).length > 0).map((g) => g.id)
  const allOpen = parents.length > 0 && parents.every((id) => expanded.has(id))

  const markers = [
    { key: 'data', label: 'Data date', date: project?.data_date ?? null },
    { key: 'forecast', label: 'Forecast finish', date: project?.forecast_finish ?? null },
    { key: 'deadline', label: 'Deadline', date: project?.deadline ?? null },
  ].filter((m): m is { key: string; label: string; date: string } => m.date !== null)
  const domain = domainOf([...rows.flatMap((g) => [g.start, g.finish]), ...markers.map((m) => m.date)])
  const most = Math.max(1, ...rows.map((g) => g.checked))

  function toggle(id: string) {
    setExpanded((now) => {
      const next = new Set(now)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  return (
    <section className="card smap" aria-labelledby="smap-title">
      <div className="card-head">
        <div>
          <div className="label">Where and when</div>
          <h2 id="smap-title">Schedule map</h2>
        </div>
        {parents.length > 0 && (
          <button type="button" className="button secondary small" onClick={() => setExpanded(allOpen ? new Set() : new Set(parents))}>
            {allOpen ? <ChevronsDownUp size={14} aria-hidden /> : <ChevronsUpDown size={14} aria-hidden />}
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        )}
      </div>

      <div className="smap-grid" role="table" aria-label="WBS groups, their flagged activities and their dates">
        <div className="smap-row smap-head" role="row">
          <span className="label" role="columnheader">Group</span>
          <span className="label" role="columnheader">Flagged of checked</span>
          <span className="smap-axis" role="columnheader" aria-label="Timeline">
            {domain && ticks(domain).map((t) => (
              <span key={t.at} className="smap-tick label" style={{ left: `${t.at}%` }}>{t.label}</span>
            ))}
          </span>
        </div>

        {rows.map((g) => {
          const kids = children.get(g.id) ?? []
          const share = g.checked > 0 ? g.flagged / g.checked : 0
          const open = expanded.has(g.id)
          const indent = Math.max(0, g.depth - (top[0]?.depth ?? 0))
          return (
            <div key={g.id} className={`smap-row${selectedId === g.id ? ' selected' : ''}`} role="row">
              <span className="smap-name" role="cell" style={{ paddingLeft: `${indent * 16}px` }}>
                {kids.length > 0 ? (
                  <button type="button" className="smap-toggle" aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${g.name}`} onClick={() => toggle(g.id)}>
                    {open ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
                  </button>
                ) : (
                  <span className="smap-toggle" aria-hidden="true" />
                )}
                <button type="button" className="smap-pick" aria-pressed={selectedId === g.id} onClick={() => onSelect(selectedId === g.id ? null : g.id)} title={`${g.name}: ${g.flagged} of ${g.checked} flagged. Click to list its activities.`}>
                  {g.name}
                </button>
              </span>

              <span className="smap-flag" role="cell">
                {g.checked > 0 ? (
                  <>
                    <span className="smap-track" aria-hidden="true" style={{ width: `${(100 * g.checked) / most}%` }}>
                      <span className="smap-flagged" style={{ width: `${100 * share}%` }} />
                    </span>
                    <span className={`smap-count num${g.flagged > 0 ? ' has' : ''}`}>
                      {g.flagged}
                      <span className="faint"> / {g.checked}</span>
                    </span>
                  </>
                ) : (
                  <span className="faint">–</span>
                )}
              </span>

              <span className="smap-time" role="cell">
                {domain && markers.map((m) => <span key={m.key} className={`smap-marker m-${m.key}`} style={{ left: `${percentAt(domain, m.date)}%` }} aria-hidden="true" />)}
                {domain && g.start && g.finish && (
                  <span
                    className={`smap-bar${share >= MANY_FLAGGED ? ' many' : ''}`}
                    style={{ left: `${percentAt(domain, g.start)}%`, width: `${Math.max(0.8, percentAt(domain, g.finish) - percentAt(domain, g.start))}%` }}
                    title={`${dayText(g.start)} to ${dayText(g.finish)}`}
                  />
                )}
              </span>
            </div>
          )
        })}
      </div>

      <ul className="smap-legend">
        <li><span className="swatch flagged" aria-hidden="true" /> Flagged by a DCMA check</li>
        <li><span className="swatch ok" aria-hidden="true" /> Checked, fine</li>
        <li><span className="swatch bar many" aria-hidden="true" /> Work period, a quarter or more flagged</li>
        {markers.map((m) => (
          <li key={m.key}>
            <span className={`marker-key m-${m.key}`} aria-hidden="true" /> {m.label} <span className="num">{dayText(m.date)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
