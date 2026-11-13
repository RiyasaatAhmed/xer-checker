import { FileUp } from 'lucide-react'
import { MAX_UPLOAD_MB } from '../validate'
import { HeroDemo } from './HeroDemo'
import { UploadButton } from './UploadButton'

/** The first screen: what the checker does, where to drop a file, and a short demo of the result. */
export function EmptyState({ onFile }: { onFile: (file: File) => void }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <div className="eyebrow">Schedule health check</div>
        <h1 id="hero-title">Find what’s slowing your schedule down.</h1>
        <p className="hero-lead">
          Upload a P6 export. In seconds you get the DCMA checks that matter most, each with the activities behind it.
        </p>
        <div className="dropzone">
          <FileUp size={28} strokeWidth={1.75} aria-hidden className="dropzone-icon" />
          <div>
            <div className="dropzone-title">Drop a .xer file anywhere on this page</div>
            <div className="hint">P6 XER export, up to {MAX_UPLOAD_MB} MB. The file isn’t kept; its results are.</div>
          </div>
          <UploadButton busy={false} onFile={onFile} label="Choose a file" />
        </div>
        <ul className="hero-checks">
          <li><span className="mono">4.1</span> Missing links</li>
          <li><span className="mono">4.7</span> Negative float</li>
          <li><span className="mono">4.6</span> High float</li>
        </ul>
      </div>
      <div className="hero-demo">
        <HeroDemo />
      </div>
    </section>
  )
}
