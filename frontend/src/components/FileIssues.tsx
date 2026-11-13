import { countText } from '../format'
import type { RowNote } from '../types'

interface Props {
  broken: RowNote[] // rows the checker couldn't use
  notes: RowNote[] // rows that ended early and were read with blanks
}

/** Broken rows and notes, each with its line number in the file. */
export function FileIssues({ broken, notes }: Props) {
  return (
    <section className="card" aria-labelledby="issues-title">
      <h2 id="issues-title">The file</h2>
      {broken.length === 0 && notes.length === 0 ? (
        <p className="hint">✓ Every row was read. No broken rows.</p>
      ) : (
        <>
          <IssueTable title={countText(broken.length, 'broken row')} rows={broken} />
          <IssueTable title={countText(notes.length, 'row read with blanks', 'rows read with blanks')} rows={notes} />
        </>
      )}
    </section>
  )
}

function IssueTable({ title, rows }: { title: string; rows: RowNote[] }) {
  if (rows.length === 0) return null
  return (
    <div className="table-scroll">
      <table>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Line</th>
            <th scope="col">What’s wrong</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.line}-${row.message}`}>
              <td className="number">{row.line}</td>
              <td>{row.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
