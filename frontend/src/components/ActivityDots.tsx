import type { Category } from '../categories'
import type { ActivityRow } from '../types'

export type Dotted = ActivityRow & { n: number }

export interface DotGroup {
  id: string
  name: string
  rows: Dotted[]
}

interface Props {
  groups: DotGroup[]
  size: number // a dot's side in px: smaller when there are very many
  categoryOf: (row: ActivityRow) => Category
  selected: string | null // the activity picked
  onSelect: (code: string | null) => void
}

/** One small square per activity, grouped by WBS group and colored by kind. It stays short however many there are. */
export function ActivityDots({ groups, size, categoryOf, selected, onSelect }: Props) {
  return (
    <div className="dots" style={{ ['--dot' as string]: `${size}px` }}>
      {groups.map((g) => (
        <section key={g.id} className="dot-group" aria-label={`${g.name}: ${g.rows.length}`}>
          <h3 className="dot-group-head">
            <span>{g.name}</span>
            <span className="faint num">{g.rows.length}</span>
          </h3>
          <div className="dot-wrap">
            {g.rows.map((r) => {
              const category = categoryOf(r)
              const label = `${r.code}: ${r.name}. ${category.label}`
              return (
                <button
                  key={r.n}
                  type="button"
                  className={`dot t-${category.tone}${selected === r.code ? ' sel' : ''}`}
                  aria-label={label}
                  aria-pressed={selected === r.code}
                  title={label}
                  onClick={() => onSelect(selected === r.code ? null : r.code)}
                />
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
