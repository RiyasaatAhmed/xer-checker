import type { CheckResult } from '../types'

/** The headline numbers: activities checked, checks over their limit, broken rows. */
export function StatTiles({ result }: { result: CheckResult }) {
  const flagged = result.rules.filter((rule) => rule.status === 'flag').length
  const tiles = [
    { label: 'Activities checked', value: result.checked.toLocaleString(), note: 'Unfinished work only' },
    { label: 'Checks over the limit', value: `${flagged} of ${result.rules.length}`, note: 'A reason to look closer' },
    { label: 'Broken rows', value: result.broken_rows.length.toLocaleString(), note: 'Rows the checker couldn’t use' },
  ]
  return (
    <section className="tiles" aria-label="Headline numbers">
      {tiles.map((tile) => (
        <div className="tile" key={tile.label}>
          <div className="tile-label">{tile.label}</div>
          <div className="tile-value">{tile.value}</div>
          <div className="tile-note">{tile.note}</div>
        </div>
      ))}
    </section>
  )
}
