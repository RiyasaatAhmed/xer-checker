import { ArrowDown, ArrowUp, Network } from 'lucide-react'
import { daysText, rangeText } from '../format'
import type { Column, Row } from '../activitySort'
import { LogicDiagram } from './LogicDiagram'

// ---------- Constants ----------

const FLOAT_BAR_PX = 56 // the longest float bar

const COLUMNS: { key: Column; label: string; right?: boolean }[] = [
  { key: 'code', label: 'Activity' },
  { key: 'links', label: 'Links', right: true },
  { key: 'float', label: 'Float (days)', right: true },
  { key: 'start', label: 'Dates' },
]

interface Props {
  rows: Row[] // already filtered
  hasDetails: boolean // false for an upload saved with IDs only
  sort: { by: Column; up: boolean }
  onSort: (column: Column) => void
  logicOf: string | null // the activity whose logic diagram is open
  onLogic: (code: string | null) => void
}

/** The activities as a list: sort any column, open an activity's logic. The "List" view. */
export function ActivityTable({ rows, hasDetails, sort, onSort, logicOf, onLogic }: Props) {
  const longest = Math.max(1, ...rows.map((r) => Math.max(0, r.float_days ?? 0)))
  return (
    <div className="table-scroll">
      <table className="activity-table">
        <thead>
          <tr>
            {COLUMNS.filter((c) => hasDetails || c.key === 'code').map((c) => (
              <th key={c.key} scope="col" className={c.right ? 'right' : undefined} aria-sort={sort.by === c.key ? (sort.up ? 'ascending' : 'descending') : undefined}>
                <button type="button" className="sort" onClick={() => onSort(c.key)}>
                  {c.label}
                  {sort.by === c.key && (sort.up ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.flatMap((r) => [
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
                      onClick={() => onLogic(logicOf === r.code ? null : r.code)}
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
      {rows.length === 0 && <p className="hint empty-filter">Nothing matches.</p>}
    </div>
  )
}
