import { CircleAlert } from 'lucide-react'
import { UploadButton } from './UploadButton'

/** Why the file couldn't be checked or opened, and a way to try another file. */
export function ErrorNotice({ message, onFile }: { message: string; onFile: (file: File) => void }) {
  return (
    <section className="notice" role="alert">
      <CircleAlert size={20} strokeWidth={2.25} aria-hidden className="notice-icon" />
      <p className="notice-text">{message}</p>
      <UploadButton busy={false} onFile={onFile} label="Try another file" variant="secondary" />
    </section>
  )
}
