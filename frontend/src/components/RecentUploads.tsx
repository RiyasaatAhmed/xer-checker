import { TriangleAlert } from 'lucide-react'
import { byFile, groupsOf, isSerious } from '../board'
import { countText, dateText, dayText, daysBetween, plural } from '../format'
import { pathFor } from '../route'
import type { UploadSummary } from '../types'
import { MiniStrip } from './MiniStrip'

interface Props {
  uploads: UploadSummary[]
  onOpen: (uploadId: string) => void
}

/** Finish against deadline for one row: "10 days early", "3 days late", or the finish date when there is no deadline. */
function finishText(u: UploadSummary): { text: string; under: string | null; late: boolean } | null {
  if (!u.forecast_finish) return null
  if (!u.deadline) return { text: dayText(u.forecast_finish), under: 'No deadline', late: false }
  const gap = daysBetween(u.deadline, u.forecast_finish)
  return { text: `${Math.abs(gap)} ${plural(Math.abs(gap), 'day')} ${gap > 0 ? 'late' : gap === 0 ? 'on the deadline' : 'early'}`, under: dayText(u.forecast_finish), late: gap > 0 }
}

/** Saved schedules. A repeat of one file sits under its name, so the strip shows the trend. A failed one shows why. */
export function RecentUploads({ uploads, onOpen }: Props) {
  const sets = groupsOf(uploads.find((u) => u.checks && u.checks.length > 0)?.checks ?? []) // the strip's sets, left to right
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
            <th scope="col" className="label">
              Checks{sets.length > 0 && <span className="faint recent-sets"> by set: {sets.join(' · ')}</span>}
            </th>
            <th scope="col" className="label">Finish</th>
            <th scope="col" className="label">Data date</th>
          </tr>
        </thead>
        {byFile(uploads).map((file) => (
          <tbody key={file.name}>
            {file.uploads.length > 1 && (
              <tr className="recent-group">
                <th scope="rowgroup" colSpan={4}>
                  {file.name} <span className="faint">{file.uploads.length} uploads, newest first</span>
                </th>
              </tr>
            )}
            {file.uploads.map((upload) => {
              const finish = finishText(upload)
              const repeat = file.uploads.length > 1
              return (
                <tr key={upload.upload_id} className={repeat ? 'recent-repeat' : undefined}>
                  <td className="recent-file">
                    {upload.status === 'ready' ? (
                      <a href={pathFor(upload.upload_id)} onClick={(event) => open(event, upload.upload_id)}>
                        {repeat ? dateText(upload.uploaded_at) : upload.file_name}
                      </a>
                    ) : (
                      <span>{repeat ? dateText(upload.uploaded_at) : upload.file_name}</span>
                    )}
                    {!repeat && (
                      <span className="faint small recent-sub">
                        {upload.project ? `${upload.project} · ` : ''}
                        {upload.projects && upload.projects > 1 ? `${upload.projects} projects · ` : ''}
                        {dateText(upload.uploaded_at)}
                      </span>
                    )}
                  </td>
                  <td>
                    {upload.status === 'failed' ? (
                      <span className="failed-reason" data-tip={`Couldn’t be checked: ${upload.failure_reason ?? 'no reason saved'}`}>
                        <TriangleAlert size={13} aria-hidden /> Can’t be read<span className="vh">: {upload.failure_reason}</span>
                      </span>
                    ) : (
                      <span className="recent-checks">
                        <MiniStrip checks={upload.checks ?? []} />
                        <span className={upload.flags ? 'flagcount' : 'okcount'}>{upload.flags ? `${upload.flags} over` : 'All within'}</span>
                        <Marks upload={upload} />
                      </span>
                    )}
                  </td>
                  <td className={`nowrap${finish?.late ? ' late' : ''}`}>
                    {finish ? (
                      <>
                        {finish.text}
                        {finish.under && <span className="faint small recent-sub">{finish.under}</span>}
                      </>
                    ) : (
                      <span className="faint">–</span>
                    )}
                  </td>
                  <td className="num faint nowrap">{upload.data_date ? dayText(upload.data_date) : '–'}</td>
                </tr>
              )
            })}
          </tbody>
        ))}
      </table>
    </div>
  )
}

/** How many failing checks are serious, and whether the file read cleanly. */
function Marks({ upload }: { upload: UploadSummary }) {
  const serious = (upload.checks ?? []).filter((c) => c.status === 'flag' && isSerious(c)).length
  return (
    <>
      {serious > 0 && <span className="serious-count">{serious} serious</span>}
      {(upload.broken_rows ?? 0) > 0 && (
        <span className="broken-count" data-tip="Results may be partial">
          <TriangleAlert size={12} aria-hidden /> {countText(upload.broken_rows ?? 0, 'broken row')}
        </span>
      )}
    </>
  )
}
