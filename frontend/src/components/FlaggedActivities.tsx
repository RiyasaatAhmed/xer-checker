import { ArrowDown, ArrowUp, Check, Copy, Download, Network, Search, X } from 'lucide-react'
import { useState } from 'react'
import { countText, csvText, daysText, rangeText } from '../format'
import type { ActivityRow, RuleResult } from '../types'
import { LogicDiagram } from './LogicDiagram'

// ---------- Constants ----------

const COPIED_MS = 2000 // how long the check mark shows on the copy button
const FLOAT_BAR_PX = 56 // the longest float bar

type Column = 'n' | 'code' | 'links' | 'float' | 'start'
type Row = ActivityRow & { n: number } // n: its place in the checker's list
const COLUMNS: { key: Column; label: string; right?: boolean }[] = [
  { key: 'code', label: 'Activity' },
  { key: 'links', label: 'Links', right: true },
  { key: 'float', label: 'Float (days)', right: true },
  { key: 'start', label: 'Dates' },
]

interface Props {
  rule: RuleResult
  fileName: string // names the CSV download
  wbs?: { names: Set<string>; label: string } | null // only the activities in this WBS group, picked on the map
  onClearWbs?: () => void
}

/** The activities behind one check: sort, filter, copy their IDs for P6, or download them with every column. */
export function FlaggedActivities({ rule, fileName, wbs, onClearWbs }: Props) {
  const [filter, setFilter] = useState('')
  const [copied, setCopied] = useState(false)
  const [sort, setSort] = useState<{ by: Column; up: boolean }>({ by: 'n', up: true })
  const [logicOf, setLogicOf] = useState<string | null>(null) // the activity whose logic diagram is open

  // Older uploads have IDs only: show them as rows with the rest blank.
  const rows: Row[] = (rule.details?.length ? rule.details : rule.activities.map(blankRow)).map((row, i) => ({ ...row, n: i + 1 }))
  const hasDetails = Boolean(rule.details?.length)
  const query = filter.trim().toLowerCase()
  const shown = rows
    .filter((r) => !wbs || !hasDetails || wbs.names.has(r.wbs)) // a group picked on the map
    .filter((r) => [r.code, r.name, r.wbs].some((text) => text.toLowerCase().includes(query)))
    .sort((a, b) => compare(a, b, sort.by) * (sort.up ? 1 : -1))
  const longest = Math.max(1, ...shown.map((r) => Math.max(0, r.float_days ?? 0)))

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

          <div className="table-scroll">
            <table className="activity-table">
              <thead>
                <tr>
                  {COLUMNS.filter((c) => hasDetails || c.key === 'code').map((c) => (
                    <th key={c.key} scope="col" className={c.right ? 'right' : undefined} aria-sort={sort.by === c.key ? (sort.up ? 'ascending' : 'descending') : undefined}>
                      <button type="button" className="sort" onClick={() => sortBy(c.key)}>
                        {c.label}
                        {sort.by === c.key && (sort.up ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.flatMap((r) => [
                  <tr key={r.n} className={logicOf === r.code ? 'sel' : undefined}>
                    <td>
                      <span className="who">
                        <span className="who-top">
                          <span className="id mono">{r.code}</span>
                          {hasDetails && <span className="name">{r.name}</span>}
                        </span>
                        {hasDetails && <span className="wbs">{r.wbs}</span>}
                      </span>
                    </td>
                    {hasDetails && (
                      <>
                        <td className="right nowrap num">
                          <button
                            type="button"
                            className="logic-toggle"
                            aria-expanded={logicOf === r.code}
                            aria-label={`${r.code}: ${r.predecessors} before, ${r.successors} after. Show its logic`}
                            title="Links before / after. A 0 is a missing link. Click for its logic."
                            onClick={() => setLogicOf(logicOf === r.code ? null : r.code)}
                          >
                            <span className={r.predecessors === 0 ? 'zero-link' : undefined}>{r.predecessors}</span>
                            {' / '}
                            <span className={r.successors === 0 ? 'zero-link' : undefined}>{r.successors}</span>
                            <Network size={13} aria-hidden />
                          </button>
                        </td>
                        <td className={`float-cell num${(r.float_days ?? 0) < 0 ? ' neg' : ''}`}>
                          {r.float_days !== null && r.float_days > 0 && <span className="fbar" aria-hidden="true" style={{ width: `${(FLOAT_BAR_PX * r.float_days) / longest}px` }} />}
                          {daysText(r.float_days)}
                        </td>
                        <td className="nowrap num">{rangeText(r.start, r.finish)}</td>
                      </>
                    )}
                  </tr>,
                  logicOf === r.code && (
                    <tr key={`${r.n}-logic`} className="logic-row">
                      <td colSpan={COLUMNS.length}>
                        <LogicDiagram row={r} />
                      </td>
                    </tr>
                  ),
                ])}
              </tbody>
            </table>
            {shown.length === 0 && <p className="hint empty-filter">Nothing matches.</p>}
          </div>
        </>
      )}
    </section>
  )
}

function blankRow(code: string): ActivityRow {
  return { code, name: '', wbs: '', status: '', float_days: null, duration_days: null, start: null, finish: null, predecessors: 0, successors: 0, before: [], after: [] }
}

/** Sort order for one column. A blank float sorts as the lowest. */
function compare(a: Row, b: Row, by: Column): number {
  const value = (r: Row): number | string => {
    switch (by) {
      case 'n': return r.n
      case 'code': return r.code
      case 'links': return Math.min(r.predecessors, r.successors) // the side with fewest links first
      case 'float': return r.float_days ?? Number.NEGATIVE_INFINITY
      case 'start': return r.start ?? ''
    }
  }
  const x = value(a), y = value(b)
  return typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })
}
