import { ArrowRight, ChevronDown, Trash2, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { dateText } from '../format'
import { headlineOf } from '../board'
import { pathFor } from '../route'
import type { UploadSummary } from '../types'
import { HeadlineBadge } from './HeadlineBadge'
import { HeadlineChecks } from './HeadlineChecks'

interface Props {
  uploads: UploadSummary[] // newest first
  onOpen: (uploadId: string) => void
  onDelete: (uploadId: string) => Promise<void>
}

/** Saved schedules, drawn as the demo draws a file: its row, and under it the 5 headline checks. Each row opens and
 *  closes; the newest opens by default, and again when a new file arrives. Each row opens its report in one click,
 *  and deletes the file after a second click to confirm. */
export function RecentUploads({ uploads, onOpen, onDelete }: Props) {
  const first = uploads.find((u) => u.status === 'ready')?.upload_id ?? null
  const [open, setOpen] = useState<{ first: string | null; ids: Set<string> }>(() => ({ first, ids: new Set(first ? [first] : []) }))
  // A new newest file: open it alone, so its checks arrive as in the demo (adjusted during render, not in an effect)
  const ids = open.first === first ? open.ids : new Set(first ? [first] : [])
  if (open.first !== first) setOpen({ first, ids })

  function toggle(id: string) {
    const next = new Set(ids)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setOpen({ first, ids: next })
  }

  return (
    <ul className="files">
      {uploads.map((upload) => {
        const ready = upload.status === 'ready'
        const shown = ready && ids.has(upload.upload_id)
        const headline = headlineOf(upload.checks ?? [])
        const panel = `file-${upload.upload_id}`
        const head = (
          <>
            <span className="live-xer" aria-hidden>
              <span />
            </span>
            <span className="file-name">{upload.file_name}</span>
            {ready ? (
              <HeadlineBadge checks={headline} />
            ) : (
              <span className="pill flag" data-tip={`Couldn’t be checked: ${upload.failure_reason ?? 'no reason saved'}`}>
                <TriangleAlert size={12} strokeWidth={2.5} aria-hidden /> Can’t be read<span className="sr-only">: {upload.failure_reason}</span>
              </span>
            )}
            <span className="file-when">{dateText(upload.uploaded_at)}</span>
          </>
        )
        return (
          <li key={upload.upload_id}>
            <div className="file-row">
              {ready ? (
                <button type="button" className="file-head" aria-expanded={shown} aria-controls={panel} onClick={() => toggle(upload.upload_id)}>
                  {head}
                  <ChevronDown className="file-chevron" size={16} aria-hidden />
                </button>
              ) : (
                <div className="file-head failed">{head}</div>
              )}
              <Actions upload={upload} onOpen={onOpen} onDelete={onDelete} />
            </div>
            {shown && (
              <div id={panel} className="file-panel">
                <HeadlineChecks checks={headline} />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** A row's actions: its report in one click, and delete, which asks once before it deletes. */
function Actions({ upload, onOpen, onDelete }: { upload: UploadSummary; onOpen: (uploadId: string) => void; onDelete: (uploadId: string) => Promise<void> }) {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)

  async function confirm() {
    setBusy(true)
    await onDelete(upload.upload_id) // the row goes once the list drops it
    setBusy(false)
    setAsking(false)
  }

  if (asking) {
    return (
      <div className="file-actions" role="group" aria-label={`Delete ${upload.file_name}?`}>
        <span className="file-ask">Delete for good?</span>
        <button type="button" className="file-action danger" disabled={busy} onClick={confirm}>
          {busy ? 'Deleting…' : 'Delete'}
        </button>
        <button type="button" className="file-action" disabled={busy} onClick={() => setAsking(false)}>
          Cancel
        </button>
      </div>
    )
  }
  return (
    <div className="file-actions">
      {upload.status === 'ready' && (
        <a
          className="file-action"
          href={pathFor(upload.upload_id)}
          aria-label={`Open the report for ${upload.file_name}`}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return // a new tab or window
            event.preventDefault()
            onOpen(upload.upload_id)
          }}
        >
          Report <ArrowRight size={13} aria-hidden />
        </a>
      )}
      <button type="button" className="file-action icon" aria-label={`Delete ${upload.file_name}`} data-tip="Delete this file and its results" onClick={() => setAsking(true)}>
        <Trash2 size={14} aria-hidden />
      </button>
    </div>
  )
}
