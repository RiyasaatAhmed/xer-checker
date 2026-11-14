import { Check, Copy, Download, Search, X } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { SORTS, compare, type Row, type SortKey } from '../activitySort'
import { categorize } from '../categories'
import { countText, csvText } from '../format'
import { topGroupOfName, topLevel } from '../tree'
import type { ActivityRow, RuleResult, WbsGroup } from '../types'
import { ActivityGroups, type RowGroup } from './ActivityGroups'
import { VirtualList } from './VirtualList'

// ---------- Constants ----------

const COPIED_MS = 2000 // how long the check mark shows on the copy button
const OTHER = { id: '', name: 'Other' } // activities whose WBS group isn't under a top-level group
const ID_ROW_PX = 30 // a line in the plain list of IDs
const ID_LIST_PX = 260 // that list's height at most

interface Props {
  rule: RuleResult
  fileName: string // names the CSV download
  groups: WbsGroup[] // the WBS tree: activities are grouped under its top-level groups
  wbs?: { names: Set<string>; label: string } | null // only the activities in this WBS group, picked on the map. Keep it stable between renders
  onClearWbs?: () => void
}

/** The activities behind one check, in a fixed-height scroll window that stays light for any number of them. */
export function FlaggedActivities({ rule, fileName, groups, wbs, onClearWbs }: Props) {
  const [filter, setFilter] = useState('')
  const [copied, setCopied] = useState(false)
  const [sort, setSort] = useState<SortKey>('file')
  const [only, setOnly] = useState<string | null>(null) // show one kind only
  const query = useDeferredValue(filter.trim().toLowerCase()) // typing stays instant while a big list catches up

  const hasDetails = Boolean(rule.details?.length)
  // Older uploads have IDs only: they're listed plainly, with no logic to show.
  const rows = useMemo<Row[]>(() => (rule.details?.length ? rule.details : rule.activities.map(blankRow)).map((row, i) => ({ ...row, n: i + 1 })), [rule])
  const { categories, of } = useMemo(() => categorize(rule.name, rows), [rule.name, rows])
  const inContext = useMemo(
    () => rows.filter((r) => !wbs || !hasDetails || wbs.names.has(r.wbs)).filter((r) => !query || [r.code, r.name, r.wbs].some((text) => text.toLowerCase().includes(query))),
    [rows, wbs, hasDetails, query],
  )
  const kindCounts = useMemo(() => countBy(inContext, of), [inContext, of])
  const shown = useMemo(() => (only ? inContext.filter((r) => of(r) === only) : inContext), [inContext, only, of])
  const sorted = useMemo(() => {
    const { by, up } = SORTS[sort]
    return sort === 'file' ? shown : [...shown].sort((a, b) => compare(a, b, by) * (up ? 1 : -1))
  }, [shown, sort])
  const rowGroups = useMemo(() => groupRows(sorted, groups, of), [sorted, groups, of])
  const ids = useMemo(() => sorted.map((r) => r.code), [sorted])
  const idHeights = useMemo(() => ids.map(() => ID_ROW_PX), [ids])

  async function copy() {
    await navigator.clipboard.writeText(rule.activities.join('\n')) // one ID per line, ready to paste
    setCopied(true)
    window.setTimeout(() => setCopied(false), COPIED_MS)
  }

  function download() {
    const header = ['Check', 'Activity ID', 'Name', 'WBS', 'Predecessors', 'Successors', 'Total float (working days)', 'Remaining duration (working days)', 'Start', 'Finish', 'Status']
    const csv = csvText(header, rows.map((r) => [rule.name, r.code, r.name, r.wbs, String(r.predecessors), String(r.successors), r.float_days?.toString() ?? '', r.duration_days?.toString() ?? '', r.start ?? '', r.finish ?? '', r.status]))
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = `${fileName.replace(/\.xer$/i, '')} - ${rule.name}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <section className="card activities" id="activities" aria-label={`${rule.name}: ${countText(rule.count, 'activity', 'activities')}`} tabIndex={-1}>
      <div className="card-head">
        <h2>
          {rule.name} <span className="faint num">{rule.count.toLocaleString()}</span>
        </h2>
        {rows.length > 0 && (
          <div className="toolbar">
            <button type="button" className="icon-button" aria-label={copied ? 'Copied' : 'Copy IDs'} title="Copy the IDs, one per line, to paste into P6" onClick={copy}>
              {copied ? <Check size={15} strokeWidth={2.5} aria-hidden /> : <Copy size={15} aria-hidden />}
            </button>
            <button type="button" className="icon-button" aria-label="Download CSV" title="Download every column as CSV" onClick={download}>
              <Download size={15} aria-hidden />
            </button>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="hint">No activity breaks this rule.</p>
      ) : (
        <>
          <div className="toolbar">
            <label className="search">
              <Search size={15} aria-hidden />
              <input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter by ID, name or WBS" aria-label="Filter by activity ID, name or WBS" />
            </label>
            {hasDetails && (
              <select className="select" aria-label="Sort" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
                {Object.entries(SORTS).map(([key, s]) => (
                  <option key={key} value={key}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}
            {wbs && hasDetails && (
              <span className="chip">
                {wbs.label}: {shown.length.toLocaleString()}
                <button type="button" className="chip-x" aria-label="Show every group again" onClick={onClearWbs}>
                  <X size={12} aria-hidden />
                </button>
              </span>
            )}
          </div>

          {hasDetails && (categories.length > 1 || rule.name === 'Missing links') && (
            <ul className="kinds" aria-label="Kinds">
              {categories.map((c) => (
                <li key={c.key}>
                  <button type="button" className="kind" aria-pressed={only === c.key} onClick={() => setOnly(only === c.key ? null : c.key)} title="Show only these">
                    <span className={`swatch t-${c.tone}`} aria-hidden="true" />
                    {c.label} <span className="num">{(kindCounts[c.key] ?? 0).toLocaleString()}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {shown.length === 0 ? (
            <p className="hint empty-filter">Nothing matches.</p>
          ) : hasDetails ? (
            <ActivityGroups groups={rowGroups} categories={categories} categoryOf={(r) => categories.find((c) => c.key === of(r)) ?? categories[0]} resetKey={`${rule.name}|${query}|${only}|${sort}|${wbs?.label ?? ''}`} />
          ) : (
            <VirtualList heights={idHeights} maxHeight={ID_LIST_PX} label="Activity IDs" renderItem={(i) => <span className="mono id-only">{ids[i]}</span>} />
          )}
        </>
      )}
    </section>
  )
}

/** The rows under their top-level WBS group, in the map's order. Rows outside every group go last, under "Other". */
function groupRows(rows: Row[], groups: WbsGroup[], of: (r: ActivityRow) => string): RowGroup[] {
  const top = topLevel(groups)
  const owner = topGroupOfName(groups)
  const buckets = new Map<string, Row[]>(top.map((g) => [g.id, []]))
  buckets.set(OTHER.id, [])
  for (const r of rows) buckets.get(owner.get(r.wbs) ?? OTHER.id)?.push(r)
  return [...top, OTHER]
    .map((g) => ({ id: g.id, name: g.name, rows: buckets.get(g.id) ?? [], kinds: {} as Record<string, number> }))
    .filter((g) => g.rows.length > 0)
    .map((g) => ({ ...g, kinds: countBy(g.rows, of) }))
}

/** How many rows fall in each kind. */
function countBy(rows: Row[], of: (r: ActivityRow) => string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const r of rows) counts[of(r)] = (counts[of(r)] ?? 0) + 1
  return counts
}

function blankRow(code: string): ActivityRow {
  return { code, name: '', wbs: '', status: '', float_days: null, duration_days: null, start: null, finish: null, predecessors: 0, successors: 0, before: [], after: [] }
}
