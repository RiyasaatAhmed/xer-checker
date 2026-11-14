import { ArrowRight, ChevronDown, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { dateText } from '../format'
import { threeOf } from '../board'
import { pathFor } from '../route'
import type { UploadSummary } from '../types'
import { ThreeBadge } from './ThreeBadge'
import { ThreeChecks } from './ThreeChecks'

interface Props {
  uploads: UploadSummary[] // newest first
  onOpen: (uploadId: string) => void
}

/** Saved schedules, drawn as the demo draws a file: its row, and under it the 3 checks. Each row opens and
 *  closes; the newest opens by default, and again when a new file arrives. */
export function RecentUploads({ uploads, onOpen }: Props) {
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
      {uploads.map((upload) => (
        <li key={upload.upload_id}>
          {upload.status === 'ready' ? (
            <Ready upload={upload} open={ids.has(upload.upload_id)} onToggle={() => toggle(upload.upload_id)} onOpen={onOpen} />
          ) : (
            <div className="file-head failed">
              <span className="live-xer" aria-hidden>
                <span />
              </span>
              <span className="file-name">{upload.file_name}</span>
              <span className="pill flag" data-tip={`Couldn’t be checked: ${upload.failure_reason ?? 'no reason saved'}`}>
                <TriangleAlert size={12} strokeWidth={2.5} aria-hidden /> Can’t be read<span className="sr-only">: {upload.failure_reason}</span>
              </span>
              <span className="file-when">{dateText(upload.uploaded_at)}</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

/** A checked file: a row that opens to show its 3 checks, and a link to its full report. */
function Ready({ upload, open, onToggle, onOpen }: { upload: UploadSummary; open: boolean; onToggle: () => void; onOpen: (uploadId: string) => void }) {
  const three = threeOf(upload.checks ?? [])
  const panel = `file-${upload.upload_id}`
  return (
    <>
      <button type="button" className="file-head" aria-expanded={open} aria-controls={panel} onClick={onToggle}>
        <span className="live-xer" aria-hidden>
          <span />
        </span>
        <span className="file-name">{upload.file_name}</span>
        <ThreeBadge checks={three} />
        <span className="file-when">{dateText(upload.uploaded_at)}</span>
        <ChevronDown className="file-chevron" size={16} aria-hidden />
      </button>
      {open && (
        <div id={panel} className="file-panel">
          <ThreeChecks checks={three} />
          <a
            className="file-report"
            href={pathFor(upload.upload_id)}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return // a new tab or window
              event.preventDefault()
              onOpen(upload.upload_id)
            }}
          >
            Full report <ArrowRight size={13} aria-hidden />
          </a>
        </div>
      )}
    </>
  )
}
