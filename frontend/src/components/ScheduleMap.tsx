import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { flaggedIn, heatFor, type Scope } from '../board'
import { countText, dayText } from '../format'
import { domainOf, percentAt, ticks } from '../timeline'
import { childrenOf, topLevel, visibleGroups } from '../tree'
import type { ProjectInfo, RuleResult, WbsGroup } from '../types'
import { WbsMatrix } from './WbsMatrix'

// ---------- Constants ----------

const CLOSE = 24 // two marker labels closer than this (% of the axis) go on different lines
const NEAR_END = 70 // a label past this (%) is written leftwards from its line, so it stays inside
const MANY_FLAGGED = 0.25 // with no month data: a group with at least this share flagged is drawn red

export interface ScopeChoice {
  key: 'check' | 'group' | 'all'
  label: string
}

interface Props {
  groups: WbsGroup[]
  project: ProjectInfo | undefined // its dates are marked on the timeline
  rules: RuleResult[]
  months: string[] // the month axis of each group's heat
  scope: Scope // what the flagged counts mean: one check, a set of checks, or all together
  choices: ScopeChoice[] // the scopes the user can pick
  choice: ScopeChoice['key']
  onChoice: (key: ScopeChoice['key']) => void
  selectedId: string | null // the group whose activities are listed below
  onSelect: (id: string | null) => void
  group: string | null // the set of checks picked, for the matrix
  onGroup: (group: string | null) => void
}

/** One picture of the schedule: a row per WBS group, how many of its activities are flagged, and when. */
export function ScheduleMap({ groups, project, rules, months, scope, choices, choice, onChoice, selectedId, onSelect, group, onGroup }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [view, setView] = useState<'time' | 'sets'>('time')
  const [worstFirst, setWorstFirst] = useState(true)
  const children = childrenOf(groups)
  const rows = visibleGroups(groups, expanded, worstFirst ? (g) => (g.checked ? flaggedIn(g, scope, rules) / g.checked : 0) : undefined)
  const top = topLevel(groups)
  const parents = groups.filter((g) => (children.get(g.id) ?? []).length > 0).map((g) => g.id)
  const allOpen = parents.length > 0 && parents.every((id) => expanded.has(id))
  const indent = (g: WbsGroup) => Math.max(0, g.depth - (top[0]?.depth ?? 0))

  const markers = [
    { key: 'data', label: 'Data date', date: project?.data_date ?? null },
    { key: 'forecast', label: 'Forecast', date: project?.forecast_finish ?? null },
    { key: 'deadline', label: 'Deadline', date: project?.deadline ?? null },
  ].filter((m): m is { key: string; label: string; date: string } => m.date !== null)
  const monthStarts = useMemo(() => months.map((m) => `${m}-01T00:00:00`), [months])
  const domain = domainOf([...rows.flatMap((g) => [g.start, g.finish]), ...markers.map((m) => m.date), monthStarts[0], monthStarts[monthStarts.length - 1]])
  const most = Math.max(1, ...rows.map((g) => g.checked))
  const heats = rows.map((g) => heatFor(g.heat, scope, rules))
  const hottest = Math.max(1, ...heats.flat())
  const dataAt = domain && project?.data_date ? percentAt(domain, project.data_date) : 0

  // Labels go on two lines when their markers sit close together, and lean inwards at the edges.
  const placed: { key: string; label: string; date: string; at: number; line: number }[] = []
  if (domain) {
    for (const m of markers.map((m) => ({ ...m, at: percentAt(domain, m.date) })).sort((a, b) => a.at - b.at)) {
      const prev = placed[placed.length - 1]
      placed.push({ ...m, line: prev && m.at - prev.at < CLOSE ? 1 - prev.line : 0 })
    }
  }

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
        <h2 id="smap-title">Where</h2>
        <div className="tools">
          <span className="seg" role="group" aria-label="What the map counts">
            {choices.map((c) => (
              <button key={c.key} type="button" aria-pressed={choice === c.key} onClick={() => onChoice(c.key)}>{c.label}</button>
            ))}
          </span>
          <span className="seg" role="group" aria-label="View">
            <button type="button" aria-pressed={view === 'time'} onClick={() => setView('time')}>By time</button>
            <button type="button" aria-pressed={view === 'sets'} onClick={() => setView('sets')}>By set of checks</button>
          </span>
          <button type="button" className="button secondary small" aria-pressed={worstFirst} onClick={() => setWorstFirst(!worstFirst)} data-tip="Sort the groups by their share flagged">
            Worst first
          </button>
          {parents.length > 0 && (
            <button type="button" className="button secondary small" onClick={() => setExpanded(allOpen ? new Set() : new Set(parents))}>
              {allOpen ? <ChevronsDownUp size={14} aria-hidden /> : <ChevronsUpDown size={14} aria-hidden />}
              {allOpen ? 'Collapse all' : 'Expand all'}
            </button>
          )}
        </div>
      </div>

      {view === 'sets' ? (
        <WbsMatrix rows={rows} rules={rules} selectedId={selectedId} group={group} indent={indent} onSelect={onSelect} onGroup={onGroup} />
      ) : (
        <div className="smap-grid" role="table" aria-label="WBS groups, their flagged activities and their dates">
          <div className="smap-row smap-head" role="row">
            <span className="label" role="columnheader">Group</span>
            <span className="label" role="columnheader">Flagged of checked</span>
            <span className="smap-axis" role="columnheader" aria-label="Timeline">
              {domain && ticks(domain).map((t) => (
                <span key={t.at} className="smap-tick" style={{ left: `${t.at}%` }}>{t.label}</span>
              ))}
              {placed.map((m) => (
                <span key={m.key}>
                  <span className={`smap-stem m-${m.key}`} style={{ left: `${m.at}%`, top: m.line === 0 ? 14 : 29 }} aria-hidden="true" />
                  <span className={`smap-mlabel l${m.line} m-${m.key} ${m.at > NEAR_END ? 'end' : 'start'}`} style={{ left: `${m.at}%` }}>
                    {m.label} {dayText(m.date)}
                  </span>
                </span>
              ))}
            </span>
          </div>

          {rows.map((g, n) => {
            const kids = children.get(g.id) ?? []
            const flagged = flaggedIn(g, scope, rules)
            const share = g.checked > 0 ? flagged / g.checked : 0
            const open = expanded.has(g.id)
            const heat = heats[n]
            const done = g.total ? (g.complete ?? 0) / g.total : 0
            const span = domain && g.start && g.finish ? { left: percentAt(domain, g.start), width: Math.max(0.8, percentAt(domain, g.finish) - percentAt(domain, g.start)) } : null
            return (
              <div key={g.id} className={`smap-row${selectedId === g.id ? ' selected' : ''}`} role="row">
                <span className="smap-name" role="cell" style={{ paddingLeft: `${indent(g) * 16}px` }}>
                  {kids.length > 0 ? (
                    <button type="button" className="smap-toggle" aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${g.name}`} onClick={() => toggle(g.id)}>
                      {open ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
                    </button>
                  ) : (
                    <span className="smap-toggle" aria-hidden="true" />
                  )}
                  <button type="button" className="smap-pick" aria-pressed={selectedId === g.id} onClick={() => onSelect(selectedId === g.id ? null : g.id)} data-tip={`${g.name}: ${flagged} of ${g.checked} flagged. Click to list its activities.`}>
                    {g.name}
                  </button>
                </span>

                <span className="smap-flag" role="cell">
                  {g.checked > 0 ? (
                    <>
                      <span className="smap-track" aria-hidden="true" style={{ width: `${(100 * g.checked) / most}%` }}>
                        <span className="smap-flagged" style={{ width: `${100 * share}%` }} />
                      </span>
                      <span className={`smap-count num${flagged > 0 ? ' has' : ''}`}>
                        {flagged.toLocaleString()}
                        <span className="faint"> / {g.checked.toLocaleString()}</span>
                      </span>
                    </>
                  ) : (
                    <span className="faint">–</span>
                  )}
                </span>

                <span className="smap-time" role="cell">
                  {domain && <span className="smap-past" style={{ width: `${dataAt}%` }} aria-hidden="true" />}
                  {domain && markers.map((m) => <span key={m.key} className={`smap-marker m-${m.key}`} style={{ left: `${percentAt(domain, m.date)}%` }} aria-hidden="true" />)}
                  {span && (
                    <span className="smap-span" style={{ left: `${span.left}%`, width: `${span.width}%` }} data-tip={`${dayText(g.start as string)} to ${dayText(g.finish as string)}. ${Math.round(100 * done)}% of its activities are finished.`}>
                      <span className="smap-done" style={{ width: `${100 * done}%` }} />
                    </span>
                  )}
                  {domain && heat.some((c) => c > 0)
                    ? heat.map((count, m) => {
                        if (count === 0) return null
                        const left = percentAt(domain, monthStarts[m])
                        const right = percentAt(domain, monthStarts[m + 1] ?? `${months[m]}-28T00:00:00`)
                        return <span key={months[m]} className={`smap-cell h${Math.max(1, Math.ceil((4 * count) / hottest))}`} style={{ left: `${left}%`, width: `${Math.max(0.6, right - left)}%` }} data-tip={`${months[m]}: ${countText(count, 'flagged activity', 'flagged activities')} start`} />
                      })
                    : span && flagged > 0 && <span className={`smap-bar${share >= MANY_FLAGGED ? ' many' : ''}`} style={{ left: `${span.left}%`, width: `${span.width}%` }} aria-hidden="true" />}
                </span>
              </div>
            )
          })}
        </div>
      )}
      {view === 'time' && (
        <p className="smap-key hint small">
          Darker cell: more flagged activities start that month. Thin bar: the group’s span, filled for the finished share. Grey wash: before the data date.
        </p>
      )}
    </section>
  )
}
