import { ChevronDown, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Row } from '../activitySort'
import type { Category } from '../categories'
import { daysText, rangeText } from '../format'
import { useMediaQuery } from '../useMediaQuery'
import { LogicChain } from './LogicChain'
import { VirtualList } from './VirtualList'

// ---------- Constants ----------

const HEAD_PX = 40 // a group header
const ROW_PX = { wide: 56, phone: 108 } // an activity line: on a phone its parts stack, so it is taller
const WINDOW_PX = 520 // the list is this tall at most, however many activities there are
const BUDGET = 24 // groups open by themselves while their rows add up to this: a small result shows everything at once
const FLOAT_BAR_PX = 48 // the longest float bar

export interface RowGroup {
  id: string
  name: string
  rows: Row[]
  kinds: Record<string, number> // how many rows of each kind, counted once when the group is built
}

type Item = { kind: 'head'; group: RowGroup; open: boolean } | { kind: 'row'; row: Row; group: RowGroup; open: true }

interface Props {
  groups: RowGroup[]
  categories: Category[]
  categoryOf: (row: Row) => Category
  resetKey: string // a new key starts the list at the top: the filter, kind or sort changed
}

/** The activities under their WBS group in one fixed-height scroll window. Each activity is one line with its logic.
 *  Only the lines on screen are in the page, so 20 activities or 20,000 are equally light. */
export function ActivityGroups({ groups, categories, categoryOf, resetKey }: Props) {
  const [toggled, setToggled] = useState<Record<string, boolean>>({}) // a group the user opened or closed
  const phone = useMediaQuery('(max-width: 760px)')
  const rowPx = phone ? ROW_PX.phone : ROW_PX.wide
  const longest = useMemo(() => Math.max(1, ...groups.flatMap((g) => g.rows.map((r) => Math.max(0, r.float_days ?? 0)))), [groups])

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
      if (open) for (const row of g.rows) list.push({ kind: 'row', row, group: g, open: true })
    }
    return list
  }, [groups, toggled])
  const heights = useMemo(() => items.map((it) => (it.kind === 'head' ? HEAD_PX : rowPx)), [items, rowPx])

  const toggle = (g: RowGroup, open: boolean) => setToggled((now) => ({ ...now, [g.id]: !open }))
  const head = (g: RowGroup, open: boolean, pin = false) => (
    <button type="button" className={`agroup-head${pin ? ' pin' : ''}`} aria-expanded={open} onClick={() => toggle(g, open)}>
      {open ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
      <span className="agroup-name">{g.name}</span>{' '}
      <span className="faint num">{g.rows.length.toLocaleString()}</span>
      <span className="kindbar" aria-hidden="true">
        {categories.map((c) => (g.kinds[c.key] ?? 0) > 0 && <span key={c.key} className={`segment t-${c.tone}`} style={{ flexGrow: g.kinds[c.key] }} title={`${c.label}: ${g.kinds[c.key]}`} />)}
      </span>
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
        const r = it.row
        return (
          <div className="arow">
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
          </div>
        )
      }}
      // While you scroll deep into a group its header is out of sight: keep its name at the top.
      pinned={(first) => {
        const it = items[first]
        return it && it.kind === 'row' ? head(it.group, true, true) : null
      }}
    />
  )
}
