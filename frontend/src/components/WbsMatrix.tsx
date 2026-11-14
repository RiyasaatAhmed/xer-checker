import { groupsOf, shade } from '../board'
import type { RuleResult, WbsGroup } from '../types'

interface Props {
  rows: WbsGroup[] // the WBS groups on show
  rules: RuleResult[]
  selectedId: string | null
  group: string | null // the check group picked
  indent: (g: WbsGroup) => number
  onSelect: (id: string | null) => void
  onGroup: (group: string | null) => void
}

/** WBS groups down, sets of checks across: each cell is the share of the group's activities that a check of that set flags. */
export function WbsMatrix({ rows, rules, selectedId, group, indent, onSelect, onGroup }: Props) {
  const sets = groupsOf(rules).filter((name) => rules.some((r) => r.group === name && r.status !== 'n/a')) // a set that can't run has no column
  return (
    <div className="matrix" role="table" aria-label="Flagged activities by WBS group and set of checks" style={{ gridTemplateColumns: `minmax(170px, 1fr) repeat(${sets.length}, minmax(64px, 1fr))` }}>
      <div className="matrix-head" role="row" style={{ display: 'contents' }}>
        <span className="label" role="columnheader">Group</span>
        {sets.map((name) => (
          <button key={name} type="button" className="matrix-col" role="columnheader" aria-pressed={group === name} onClick={() => onGroup(group === name ? null : name)} title={`Show the ${name} checks`}>
            {name}
          </button>
        ))}
      </div>
      {rows.map((g) => (
        <div key={g.id} className={`matrix-row${selectedId === g.id ? ' selected' : ''}`} role="row" style={{ display: 'contents' }}>
          <button type="button" className="matrix-name" role="rowheader" style={{ paddingLeft: `${indent(g) * 16}px` }} onClick={() => onSelect(selectedId === g.id ? null : g.id)} title={`${g.name}: ${g.checked} checked`}>
            {g.name}
          </button>
          {sets.map((name) => {
            const n = g.by_group?.[name] ?? 0
            return (
              <span key={name} role="cell" className={`mcell h${shade(g.checked ? n / g.checked : 0)}`} title={`${g.name}, ${name}: ${n} of ${g.checked} flagged`}>
                {n > 0 ? n.toLocaleString() : ''}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}
