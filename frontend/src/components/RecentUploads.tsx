import { dateText } from '../format'
import { pathFor } from '../route'
import type { UploadSummary } from '../types'
import { StatusPill } from './StatusPill'

interface Props {
  uploads: UploadSummary[]
  onOpen: (uploadId: string) => void
}

/** Saved checks, newest first. A checked one opens; a failed one shows why. */
export function RecentUploads({ uploads, onOpen }: Props) {
  /** Open in place, unless the user asked for a new tab or window. */
  function open(event: React.MouseEvent, uploadId: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    onOpen(uploadId)
  }

  return (
    <div className="table-scroll recent">
        <table>
          <thead>
            <tr>
              <th scope="col" className="label">File</th>
              <th scope="col" className="label">Checked</th>
              <th scope="col" className="label">Result</th>
              <th scope="col" className="label">Date</th>
            </tr>
          </thead>
          <tbody>
            {uploads.map((upload) => (
              <tr key={upload.upload_id}>
                <td className="recent-file">
                  {upload.status === 'ready' ? (
                    <a href={pathFor(upload.upload_id)} onClick={(event) => open(event, upload.upload_id)}>
                      {upload.file_name}
                    </a>
                  ) : (
                    <span>{upload.file_name}</span>
                  )}
                </td>
                <td className="num">{upload.checked?.toLocaleString() ?? '–'}</td>
                <td>
                  {upload.status === 'failed' ? (
                    <span className="failed-reason">Couldn’t be checked: {upload.failure_reason}</span>
                  ) : upload.flags ? (
                    <StatusPill status="flag" label={`${upload.flags} over the limit`} />
                  ) : (
                    <StatusPill status="pass" label="All within limits" />
                  )}
                </td>
                <td className="num faint nowrap">{dateText(upload.uploaded_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>
  )
}
