import { Check, Copy, Download, Rows3, Search, Table2, X } from 'lucide-react'
import { useState } from 'react'
import { compare, type Column, type Row } from '../activitySort'
import { categorize } from '../categories'
import { countText, csvText } from '../format'
import { topGroupOfName, topLevel } from '../tree'
import type { ActivityRow, RuleResult, WbsGroup } from '../types'
import { ActivityGroups, type RowGroup } from './ActivityGroups'
import { ActivityTable } from './ActivityTable'

// ---------- Constants ----------

const COPIED_MS = 2000 // how long the check mark shows on the copy button
const OTHER = { id: '', name: 'Other' } // activities whose WBS group isn't under a top-level group

type View = 'groups' | 'table'

interface Props {
  rule: RuleResult
  fileName: string // names the CSV download
  groups: WbsGroup[] // the WBS tree: activities are grouped under its top-level groups
  wbs?: { names: Set<string>; label: string } | null // only the activities in this WBS group, picked on the map
  onClearWbs?: () => void
}

/** The activities behind one check, grouped by WBS group with each activity's logic on its line. A table when you want to sort. */
export function FlaggedActivities({ rule, fileName, groups, wbs, onClearWbs }: Props) {
  const [filter, setFilter] = useState('')
  const [copied, setCopied] = useState(false)
  const hasDetails = Boolean(rule.details?.length)
  const [view, setView] = useState<View>(hasDetails ? 'groups' : 'table')
  const [sort, setSort] = useState<{ by: Column; up: boolean }>({ by: 'n', up: true })
  const [logicOf, setLogicOf] = useState<string | null>(null) // the list row whose logic diagram is open
  const [only, setOnly] = useState<string | null>(null) // show one kind only

  // Older uploads have IDs only: show them as rows with the rest blank.
  const rows: Row[] = (rule.details?.length ? rule.details : rule.activities.map(blankRow)).map((row, i) => ({ ...row, n: i + 1 }))
  const { categories, of } = categorize(rule.name, rows)
  const query = filter.trim().toLowerCase()
  const inContext = rows
    .filter((r) => !wbs || !hasDetails || wbs.names.has(r.wbs)) // a group picked on the map
    .filter((r) => [r.code, r.name, r.wbs].some((text) => text.toLowerCase().includes(query)))
  const shown = inContext.filter((r) => !only || of(r) === only)
  const sorted = [...shown].sort((a, b) => compare(a, b, sort.by) * (sort.up ? 1 : -1))
  const categoryOf = (r: ActivityRow) => categories.find((c) => c.key === of(r)) ?? categories[0]
  const rowGroups = groupRows(sorted, groups)

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

  function sortBy(column: Column) {
    setSort((s) => ({ by: column, up: s.by === column ? !s.up : column !== 'float' })) // float starts largest first
  }

  return (
    <section className="card activities" id="activities" aria-label={`${rule.name}: ${countText(rule.count, 'activity', 'activities')}`} tabIndex={-1}>
      <div className="card-head">
        <h2>
          {rule.name} <span className="faint num">{rule.count.toLocaleString()}</span>
        </h2>
        {rows.length > 0 && (
          <div className="toolbar">
            {hasDetails && (
              <div className="seg" role="group" aria-label="View">
                <button type="button" aria-pressed={view === 'groups'} onClick={() => setView('groups')}>
                  <Rows3 size={14} aria-hidden /> Groups
                </button>
                <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}>
                  <Table2 size={14} aria-hidden /> Table
                </button>
              </div>
            )}
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
            {wbs && hasDetails && (
              <span className="chip">
                {wbs.label}: {shown.length}
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
                    {c.label} <span className="num">{inContext.filter((r) => of(r) === c.key).length.toLocaleString()}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {view === 'groups' && hasDetails ? (
            shown.length === 0 ? (
              <p className="hint empty-filter">Nothing matches.</p>
            ) : (
              <ActivityGroups groups={rowGroups} categories={categories} categoryOf={categoryOf} />
            )
          ) : (
            <ActivityTable rows={sorted} hasDetails={hasDetails} sort={sort} onSort={sortBy} logicOf={logicOf} onLogic={setLogicOf} />
          )}
        </>
      )}
    </section>
  )
}

/** The rows under their top-level WBS group, in the map's order. Rows outside every group go last, under "Other". */
function groupRows(rows: Row[], groups: WbsGroup[]): RowGroup[] {
  const top = topLevel(groups)
  const owner = topGroupOfName(groups)
  const buckets = new Map<string, Row[]>(top.map((g) => [g.id, []]))
  buckets.set(OTHER.id, [])
  for (const r of rows) buckets.get(owner.get(r.wbs) ?? OTHER.id)?.push(r)
  return [...top, OTHER].map((g) => ({ id: g.id, name: g.name, rows: buckets.get(g.id) ?? [] })).filter((g) => g.rows.length > 0)
}

function blankRow(code: string): ActivityRow {
  return { code, name: '', wbs: '', status: '', float_days: null, duration_days: null, start: null, finish: null, predecessors: 0, successors: 0, before: [], after: [] }
}
