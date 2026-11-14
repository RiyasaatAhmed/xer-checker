import { DropArea } from './DropArea'
import { HeroDemo } from './HeroDemo'
import { LiveCheck, type Fresh } from './LiveCheck'
import { RecentUploads } from './RecentUploads'
import { UploadButton } from './UploadButton'
import type { UploadSummary } from '../types'
import { MAX_UPLOAD_MB } from '../validate'

interface Props {
  uploads: UploadSummary[] | null // null while the list loads
  onFile: (file: File) => void
  onOpen: (uploadId: string) => void
  onDelete: (uploadId: string) => Promise<void>
  fresh: Fresh | null // the file just uploaded: shown here, checking and then checked
}

/** The home page, laid out as the demo: the drop area, the file being checked, then the saved schedules,
 *  the newest open on its 5 headline checks. Before anything is uploaded: the demo and the upload button. */
export function Home({ uploads, onFile, onOpen, onDelete, fresh }: Props) {
  const listed = fresh?.result != null && (uploads ?? []).some((u) => u.upload_id === fresh.result?.upload_id) // the list then shows it, open
  if (uploads === null && !fresh) return null // the list is loading: show nothing, not a demo that then disappears
  if (!fresh && (!uploads || uploads.length === 0)) {
    return (
      <section className="home-empty" aria-label="Upload a schedule">
        <HeroDemo />
        <div className="home-action">
          <UploadButton busy={false} onFile={onFile} />
          <p className="hint">Or drop a .xer file anywhere on this page. Up to {MAX_UPLOAD_MB} MB.</p>
        </div>
      </section>
    )
  }
  return (
    <section className="home-panel" aria-label="Check a schedule">
      <DropArea busy={fresh !== null && fresh.result === null} onFile={onFile} />
      {fresh && !listed && <LiveCheck fresh={fresh} onOpen={onOpen} />}
      {uploads && uploads.length > 0 && (
        <section className="home-recent" aria-labelledby="recent-title">
          <h1 id="recent-title" className="label">
            Recent schedules
          </h1>
          <RecentUploads uploads={uploads} onOpen={onOpen} onDelete={onDelete} />
        </section>
      )}
    </section>
  )
}
