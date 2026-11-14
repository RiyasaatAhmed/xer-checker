import { ChevronDown, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Row } from '../activitySort'
import type { Category } from '../categories'
import { daysText, rangeText } from '../format'
import { percentAt, type Domain } from '../timeline'
import { useMediaQuery } from '../useMediaQuery'
import { LogicChain } from './LogicChain'
import { VirtualList } from './VirtualList'

// ---------- Constants ----------

const HEAD_PX = 40 // a group header
const ROW_PX = { wide: 60, phone: 112 } // an activity line: on a phone its parts stack, so it is taller
const WINDOW_PX = 520 // the list is this tall at most, however many activities there are
const BUDGET = 24 // groups open by themselves while their rows add up to this: a small result shows everything at once
const FLOAT_BAR_PX = 48 // the longest float bar
const ROWS_PER_GROUP = 8 // rows a group shows before "Show all": the worst ones come first
const MORE_PX = 34 // the "Show all" line
const STATUS_TONE: Record<string, string> = { 'Not started': 'step-1', 'In progress': 'step-2', Complete: 'step-3' } // the same ramp as the status bar

export interface RowGroup {
  id: string
  name: string
  rows: Row[]
  kinds: Record<string, number> // how many rows of each kind, counted once when the group is built
}

type Item =
  | { kind: 'head'; group: RowGroup; open: boolean }
  | { kind: 'row'; row: Row; group: RowGroup; open: true }
  | { kind: 'more'; group: RowGroup; hidden: number }

interface Props {
  groups: RowGroup[]
  categories: Category[]
  categoryOf: (row: Row) => Category
  resetKey: string // a new key starts the list at the top: the filter, kind or sort changed
  domain: Domain | null // the dates the mini timelines are drawn on
  dataDate: string | null // marked on each mini timeline
}

/** The activities under their WBS group in one fixed-height scroll window. Each activity is one line with its logic.
 *  Only the lines on screen are in the page, so 20 activities or 20,000 are equally light. */
export function ActivityGroups({ groups, categories, categoryOf, resetKey, domain, dataDate }: Props) {
  const [toggled, setToggled] = useState<Record<string, boolean>>({}) // a group the user opened or closed
  const [showAll, setShowAll] = useState<Record<string, boolean>>({}) // a group the user asked to see in full
  const phone = useMediaQuery('(max-width: 760px)')
  const rowPx = phone ? ROW_PX.phone : ROW_PX.wide
  const longest = useMemo(() => Math.max(1, ...groups.flatMap((g) => g.rows.map((r) => Math.max(0, r.float_days ?? 0)))), [groups])
  const biggest = Math.max(1, ...groups.map((g) => g.rows.length)) // the group the header bars are measured against

  // The header and, when it's open, the lines of every group, as one flat list.
  const items = useMemo(() => {
    // Open groups from the top while their rows fit the budget. The first group is always open.
    const auto = new Set<string>()
    let used = 0
    let full = false
    groups.forEach((g, i) => {
      if (i === 0 || (!full && used + g.rows.length <= BUDGET)) {
        auto.add(g.id)
        used += g.rows.length
      } else {
        full = true
      }
    })
    const list: Item[] = []
    for (const g of groups) {
      const open = toggled[g.id] ?? auto.has(g.id)
      list.push({ kind: 'head', group: g, open })
      if (open) {
        const shown = showAll[g.id] ? g.rows : g.rows.slice(0, ROWS_PER_GROUP)
        for (const row of shown) list.push({ kind: 'row', row, group: g, open: true })
        if (shown.length < g.rows.length) list.push({ kind: 'more', group: g, hidden: g.rows.length - shown.length })
      }
    }
    return list
  }, [groups, toggled, showAll])
  const heights = useMemo(() => items.map((it) => (it.kind === 'head' ? HEAD_PX : it.kind === 'more' ? MORE_PX : rowPx)), [items, rowPx])

  const toggle = (g: RowGroup, open: boolean) => setToggled((now) => ({ ...now, [g.id]: !open }))
  const head = (g: RowGroup, open: boolean, pin = false) => (
    <button type="button" className={`agroup-head${pin ? ' pin' : ''}`} aria-expanded={open} onClick={() => toggle(g, open)}>
      {open ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
      <span className="agroup-name">{g.name}</span>{' '}
      <span className="faint num">{g.rows.length.toLocaleString()}</span>
      {categories.length > 1 && (
        <span className="kindbar" aria-hidden="true" style={{ width: `${Math.max(16, (120 * g.rows.length) / biggest)}px` }}>
          {categories.map((c) => (g.kinds[c.key] ?? 0) > 0 && <span key={c.key} className={`segment t-${c.tone}`} style={{ flexGrow: g.kinds[c.key] }} title={`${c.label}: ${g.kinds[c.key]}`} />)}
        </span>
      )}
    </button>
  )

  return (
    <VirtualList
      key={resetKey}
      heights={heights}
      maxHeight={WINDOW_PX}
      label="Activities"
      renderItem={(i) => {
        const it = items[i]
        if (it.kind === 'head') return head(it.group, it.open)
        if (it.kind === 'more') {
          return (
            <button type="button" className="amore" onClick={() => setShowAll((now) => ({ ...now, [it.group.id]: true }))}>
              Show all {(it.group.rows.length).toLocaleString()} in {it.group.name} ({it.hidden.toLocaleString()} more)
            </button>
          )
        }
        const r = it.row
        const span = domain && r.start && r.finish ? { left: percentAt(domain, r.start), width: Math.max(1.5, percentAt(domain, r.finish) - percentAt(domain, r.start)) } : null
        return (
          <div className="arow">
            <span className="who">
              <span className="who-top">
                <span className={`sdot ${STATUS_TONE[r.status] ?? 'step-1'}`} title={r.status} role="img" aria-label={r.status} />
                <span className="id mono">{r.code}</span>
                <span className="name">{r.name}</span>
                {(r.fails ?? 1) > 1 && <span className="fails" title="Flagged by more than one check">fails {r.fails}</span>}
              </span>
              {r.wbs !== it.group.name && <span className="wbs">{r.wbs}</span>}
            </span>
            <LogicChain row={r} tone={categoryOf(r).tone} />
            <span className="afloat num" title={rangeText(r.start, r.finish)}>
              <span className="float-cell">
                {r.float_days !== null && r.float_days > 0 && <span className="fbar" aria-hidden="true" style={{ width: `${(FLOAT_BAR_PX * r.float_days) / longest}px` }} />}
                <span className={(r.float_days ?? 0) < 0 ? 'neg' : undefined}>{daysText(r.float_days)} d</span>
              </span>
              {domain && (
                <span className="atime" aria-hidden="true">
                  {dataDate && <span className="atime-now" style={{ left: `${percentAt(domain, dataDate)}%` }} />}
                  {span && <span className="atime-bar" style={{ left: `${span.left}%`, width: `${span.width}%` }} />}
                </span>
              )}
            </span>
          </div>
        )
      }}
      // While you scroll deep into a group its header is out of sight: keep its name at the top.
      pinned={(first) => {
        const it = items[first]
        return it && it.kind !== 'head' ? head(it.group, true, true) : null
      }}
    />
  )
}
