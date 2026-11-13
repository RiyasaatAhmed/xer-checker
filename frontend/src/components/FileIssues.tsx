import { Check } from 'lucide-react'
import { countText } from '../format'
import type { RowNote } from '../types'

interface Props {
  broken: RowNote[] // rows the checker couldn't use
  notes: RowNote[] // rows that ended early and were read with blanks
}

/** Broken rows and notes, each with its line number in the file. */
export function FileIssues({ broken, notes }: Props) {
  return (
    <section className="card" id="file-issues" aria-labelledby="issues-title" tabIndex={-1}>
      <div className="card-head">
        <h2 id="issues-title">The file</h2>
      </div>
      {broken.length === 0 && notes.length === 0 ? (
        <p className="ok-line">
          <Check size={16} strokeWidth={2.5} aria-hidden /> Every row was read. No broken rows.
        </p>
      ) : (
        <>
          <IssueTable title={countText(broken.length, 'broken row')} hint="Left out of the checks." rows={broken} />
          <IssueTable
            title={countText(notes.length, 'row read with blanks', 'rows read with blanks')}
            hint="They ended early; the missing values aren't needed by the checks."
            rows={notes}
          />
        </>
      )}
    </section>
  )
}

function IssueTable({ title, hint, rows }: { title: string; hint: string; rows: RowNote[] }) {
  if (rows.length === 0) return null
  return (
    <div className="issue-group">
      <h3>{title}</h3>
      <p className="hint">{hint}</p>
      <div className="table-scroll short">
        <table>
          <thead>
            <tr>
              <th scope="col" className="label">Line</th>
              <th scope="col" className="label">What’s wrong</th>
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
