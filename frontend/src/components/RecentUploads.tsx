import { countText } from '../format'
import type { UploadSummary } from '../types'

interface Props {
  uploads: UploadSummary[]
  openId: string | null // the upload shown in the dashboard
  onOpen: (uploadId: string) => void
}

/** Saved uploads, newest first. A checked one opens again; a failed one shows why. */
export function RecentUploads({ uploads, openId, onOpen }: Props) {
  if (uploads.length === 0) return null
  return (
    <section className="card" aria-labelledby="recent-title">
      <h2 id="recent-title">Recent uploads</h2>
      <ul className="recent">
        {uploads.map((upload) => (
          <li key={upload.upload_id}>
            {upload.status === 'ready' ? (
              <button
                type="button"
                className="recent-item"
                aria-current={upload.upload_id === openId}
                onClick={() => onOpen(upload.upload_id)}
              >
                <span className="recent-name">{upload.file_name}</span>
                <span className="recent-detail">
                  {countText(upload.checked ?? 0, 'activity', 'activities')} ·{' '}
                  {upload.flags ? `⚑ ${countText(upload.flags, 'check')} over the limit` : '✓ All within limits'}
                </span>
                <span className="recent-date">{dateText(upload.uploaded_at)}</span>
              </button>
            ) : (
              <div className="recent-item failed">
                <span className="recent-name">{upload.file_name}</span>
                <span className="recent-detail">Couldn’t be checked: {upload.failure_reason}</span>
                <span className="recent-date">{dateText(upload.uploaded_at)}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** "2026-11-14T03:07:55Z" -> "14 Nov 2026, 03:07", in the viewer's own time zone. */
function dateText(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}
