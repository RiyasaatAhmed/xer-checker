import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { Row } from '../activitySort'
import type { Category } from '../categories'
import { daysText, rangeText } from '../format'
import { LogicChain } from './LogicChain'

// ---------- Constants ----------

const PAGE = 20 // rows shown per group, then "Show more"
const BUDGET = 24 // groups open by themselves while their rows add up to this: a small result shows everything at once
const FLOAT_BAR_PX = 48 // the longest float bar

export interface RowGroup {
  id: string
  name: string
  rows: Row[]
}

interface Props {
  groups: RowGroup[]
  categories: Category[]
  categoryOf: (row: Row) => Category
}

/** The activities under their WBS group. Each row shows the activity and its logic on one line, so nothing needs a click to check.
 *  A group header carries the count and a bar of its kinds, so a big result is read from the headers first. */
export function ActivityGroups({ groups, categories, categoryOf }: Props) {
  const [toggled, setToggled] = useState<Record<string, boolean>>({}) // a group the user opened or closed
  const [extra, setExtra] = useState<Record<string, number>>({}) // rows revealed beyond the first page
  const longest = Math.max(1, ...groups.flatMap((g) => g.rows.map((r) => Math.max(0, r.float_days ?? 0))))

  // Open groups from the top while their rows fit the budget. The first group is always open.
  const auto = new Set<string>()
  let used = 0
  let full = false
  groups.forEach((g, i) => {
    const take = Math.min(g.rows.length, PAGE)
    if (i === 0 || (!full && used + take <= BUDGET)) {
      auto.add(g.id)
      used += take
    } else {
      full = true
    }
  })

  return (
    <div className="agroups">
      {groups.map((g) => {
        const open = toggled[g.id] ?? auto.has(g.id)
        const rows = g.rows.slice(0, PAGE + (extra[g.id] ?? 0))
        const left = g.rows.length - rows.length
        return (
          <section key={g.id} className="agroup" aria-label={`${g.name}: ${g.rows.length}`}>
            <button type="button" className="agroup-head" aria-expanded={open} onClick={() => setToggled({ ...toggled, [g.id]: !open })}>
              {open ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
              <span className="agroup-name">{g.name}</span>
              <span className="faint num">{g.rows.length}</span>
              <span className="kindbar" aria-hidden="true">
                {categories.map((c) => {
                  const count = g.rows.filter((r) => categoryOf(r).key === c.key).length
                  return count > 0 && <span key={c.key} className={`segment t-${c.tone}`} style={{ flexGrow: count }} title={`${c.label}: ${count}`} />
                })}
              </span>
            </button>
            {open && (
              <ul className="arows">
                {rows.map((r) => (
                  <li key={r.n} className="arow">
                    <span className="who">
                      <span className="who-top">
                        <span className="id mono">{r.code}</span>
                        <span className="name">{r.name}</span>
                      </span>
                      <span className="wbs">{r.wbs}</span>
                    </span>
                    <LogicChain row={r} tone={categoryOf(r).tone} />
                    <span className="afloat num">
                      <span className="float-cell">
                        {r.float_days !== null && r.float_days > 0 && <span className="fbar" aria-hidden="true" style={{ width: `${(FLOAT_BAR_PX * r.float_days) / longest}px` }} />}
                        <span className={(r.float_days ?? 0) < 0 ? 'neg' : undefined}>{daysText(r.float_days)}</span>
                      </span>
                      <span className="adates">{rangeText(r.start, r.finish)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {open && left > 0 && (
              <div className="more">
                <button type="button" className="button secondary small" onClick={() => setExtra({ ...extra, [g.id]: (extra[g.id] ?? 0) + PAGE })}>
                  Show {Math.min(PAGE, left)} more
                </button>
                <span className="hint small num">{left} left</span>
                {left > PAGE && (
                  <button type="button" className="link-inline" onClick={() => setExtra({ ...extra, [g.id]: g.rows.length })}>
                    Show all
                  </button>
                )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
