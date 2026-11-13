import { HeroDemo } from './HeroDemo'
import { RecentUploads } from './RecentUploads'
import { UploadButton } from './UploadButton'
import type { UploadSummary } from '../types'
import { MAX_UPLOAD_MB } from '../validate'

interface Props {
  uploads: UploadSummary[] | null // null while the list loads
  onFile: (file: File) => void
  onOpen: (uploadId: string) => void
}

/** The home page. With saved checks: the list and the upload button. With none: the demo and the upload button. */
export function Home({ uploads, onFile, onOpen }: Props) {
  if (uploads === null) return null // the list is loading: show nothing, not a demo that then disappears
  if (uploads.length === 0) {
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
    <section aria-labelledby="recent-title">
      <div className="home-head">
        <h1 id="recent-title">Recent checks</h1>
        <UploadButton busy={false} onFile={onFile} />
      </div>
      <RecentUploads uploads={uploads} onOpen={onOpen} />
    </section>
  )
}
