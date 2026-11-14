import { ChevronDown, ChevronRight, TriangleAlert } from 'lucide-react'
import { countText } from '../format'
import type { RowNote } from '../types'

interface Props {
  broken: RowNote[] // rows the checker couldn't use
  notes: RowNote[] // rows that ended early and were read with blanks
  open: boolean
  onToggle: (open: boolean) => void
}

/** Broken rows and notes, each with its line number, folded under the verdict. Shown only when the file has some. */
export function FileIssues({ broken, notes, open, onToggle }: Props) {
  const title = [broken.length > 0 && countText(broken.length, 'broken row'), notes.length > 0 && countText(notes.length, 'row read with blanks', 'rows read with blanks')].filter(Boolean).join(' · ')
  return (
    <details className={`card issues${broken.length > 0 ? ' bad' : ''}`} id="file-issues" tabIndex={-1} open={open} onToggle={(event) => onToggle(event.currentTarget.open)}>
      <summary aria-label={`Rows with problems: ${title}`}>
        {open ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
        <TriangleAlert size={14} aria-hidden />
        <h2 id="issues-title">{title}</h2>
        <span className="faint small">{open ? 'Hide' : 'Show'} the rows</span>
      </summary>
      <IssueTable title={countText(broken.length, 'broken row')} rows={broken} />
      <IssueTable title={countText(notes.length, 'row read with blanks', 'rows read with blanks')} rows={notes} />
    </details>
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
