import { ArrowDown, ArrowUp, Check, Copy, Download, Search } from 'lucide-react'
import { useState } from 'react'
import { countText, csvText, dayText, daysText } from '../format'
import { ruleText } from '../rules'
import type { ActivityRow, RuleResult } from '../types'

// ---------- Constants ----------

const COPIED_MS = 2000 // how long "Copied" shows on the button

type Column = 'n' | 'code' | 'name' | 'links' | 'float' | 'duration' | 'start' | 'finish' | 'status'
type Row = ActivityRow & { n: number } // n: its place in the checker's list
const COLUMNS: { key: Column; label: string; numeric?: boolean }[] = [
  { key: 'n', label: '#', numeric: true },
  { key: 'code', label: 'Activity ID' },
  { key: 'name', label: 'Name and WBS' },
  { key: 'links', label: 'Pred / Succ', numeric: true },
  { key: 'float', label: 'Float (d)', numeric: true },
  { key: 'duration', label: 'Remaining (d)', numeric: true },
  { key: 'start', label: 'Start', numeric: true },
  { key: 'finish', label: 'Finish', numeric: true },
  { key: 'status', label: 'Status' },
]

interface Props {
  rule: RuleResult
  fileName: string // names the CSV download
}

/** The activities behind one rule's number: sort, filter, copy their IDs for P6, or download them. */
export function FlaggedActivities({ rule, fileName }: Props) {
  const [filter, setFilter] = useState('')
  const [copied, setCopied] = useState(false)
  const [sort, setSort] = useState<{ by: Column; up: boolean }>({ by: 'n', up: true })

  // Older uploads have IDs only: show them as rows with the rest blank.
  const rows: Row[] = (rule.details?.length ? rule.details : rule.activities.map(blankRow)).map((row, i) => ({ ...row, n: i + 1 }))
  const hasDetails = Boolean(rule.details?.length)
  const query = filter.trim().toLowerCase()
  const shown = rows
    .filter((r) => [r.code, r.name, r.wbs].some((text) => text.toLowerCase().includes(query)))
    .sort((a, b) => compare(a, b, sort.by) * (sort.up ? 1 : -1))

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
    <section className="card activities" id="activities" aria-labelledby="activities-title" tabIndex={-1}>
      <div className="card-head">
        <div>
          <div className="label">Activities behind the number</div>
          <h2 id="activities-title">
            {rule.name}: {countText(rule.count, 'activity', 'activities')}
          </h2>
        </div>
        {rows.length > 0 && (
          <div className="tools">
            <button type="button" className="button secondary small" onClick={copy}>
              {copied ? <Check size={14} strokeWidth={2.5} aria-hidden /> : <Copy size={14} strokeWidth={2.25} aria-hidden />}
              {copied ? 'Copied' : 'Copy IDs'}
            </button>
            <button type="button" className="button secondary small" onClick={download}>
              <Download size={14} strokeWidth={2.25} aria-hidden />
              CSV
            </button>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="hint">No activity breaks this rule.</p>
      ) : (
        <>
          <p className="hint">{ruleText(rule.name).action}</p>
          <label className="search">
            <Search size={15} strokeWidth={2.25} aria-hidden />
            <input
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter by ID, name or WBS"
              aria-label="Filter by activity ID, name or WBS"
            />
          </label>
          <div className="table-scroll">
            <table className="activity-table">
              <thead>
                <tr>
                  {COLUMNS.filter((c) => hasDetails || c.key === 'n' || c.key === 'code').map((c) => (
                    <th key={c.key} scope="col" className={`label${c.numeric ? ' right' : ''}`} aria-sort={sort.by === c.key ? (sort.up ? 'ascending' : 'descending') : undefined}>
                      <button type="button" className="sort" onClick={() => sortBy(c.key)}>
                        {c.label}
                        {sort.by === c.key && (sort.up ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.n}>
                    <td className="num faint right">{r.n}</td>
                    <td className="mono nowrap">{r.code}</td>
                    {hasDetails && (
                      <>
                        <td className="name-cell">
                          <span className="code-inline mono">{r.code}</span>
                          <span className="name">{r.name}</span>
                          <span className="wbs">{r.wbs}</span>
                        </td>
                        <td className="num right nowrap" aria-label={`${r.predecessors} before, ${r.successors} after`}>
                          <span className={r.predecessors === 0 ? 'zero-link' : undefined}>{r.predecessors}</span>
                          {' / '}
                          <span className={r.successors === 0 ? 'zero-link' : undefined}>{r.successors}</span>
                        </td>
                        <td className="num right strong">{daysText(r.float_days)}</td>
                        <td className="num right">{daysText(r.duration_days)}</td>
                        <td className="num right nowrap">{r.start ? dayText(r.start) : '–'}</td>
                        <td className="num right nowrap">{r.finish ? dayText(r.finish) : '–'}</td>
                        <td className="nowrap">{r.status}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 && <p className="hint empty-filter">Nothing matches “{filter}”.</p>}
          </div>
          <p className="hint small table-foot">Pred / Succ: how many predecessors and successors it has; a 0 is a missing link. Float and remaining duration are in working days, on each activity’s own calendar.</p>
        </>
      )}
    </section>
  )
}

function blankRow(code: string): ActivityRow {
  return { code, name: '', wbs: '', status: '', float_days: null, duration_days: null, start: null, finish: null, predecessors: 0, successors: 0 }
}

/** Sort order for one column. A blank float or duration sorts as the lowest. */
function compare(a: Row, b: Row, by: Column): number {
  const value = (r: Row): number | string => {
    switch (by) {
      case 'n': return r.n
      case 'code': return r.code
      case 'name': return r.name
      case 'links': return Math.min(r.predecessors, r.successors) // the side with fewest links first
      case 'float': return r.float_days ?? Number.NEGATIVE_INFINITY
      case 'duration': return r.duration_days ?? Number.NEGATIVE_INFINITY
      case 'start': return r.start ?? ''
      case 'finish': return r.finish ?? ''
      case 'status': return r.status
    }
  }
  const x = value(a), y = value(b)
  return typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })
}
