import { countText } from '../format'
import type { RowNote } from '../types'

interface Props {
  broken: RowNote[] // rows the checker couldn't use
  notes: RowNote[] // rows that ended early and were read with blanks
}

/** Broken rows and notes, each with its line number. Shown only when the file has some. */
export function FileIssues({ broken, notes }: Props) {
  return (
    <section className="card" id="file-issues" aria-labelledby="issues-title" tabIndex={-1}>
      <div className="card-head">
        <h2 id="issues-title">Rows with problems</h2>
      </div>
      <IssueTable title={countText(broken.length, 'broken row')} rows={broken} />
      <IssueTable title={countText(notes.length, 'row read with blanks', 'rows read with blanks')} rows={notes} />
    </section>
  )
}

function IssueTable({ title, rows }: { title: string; rows: RowNote[] }) {
  if (rows.length === 0) return null
  return (
    <div className="issue-group">
      <h3>{title}</h3>
      <div className="table-scroll short">
        <table>
          <thead>
            <tr>
              <th scope="col">Line</th>
              <th scope="col">What’s wrong</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.line}-${row.message}`}>
                <td className="num faint">{row.line}</td>
                <td>{row.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
