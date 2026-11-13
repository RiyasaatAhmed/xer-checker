import { CircleAlert } from 'lucide-react'

/** Why the file couldn't be checked or opened. The upload button is on the page under it. */
export function ErrorNotice({ message }: { message: string }) {
  return (
    <section className="notice" role="alert">
      <CircleAlert size={20} strokeWidth={2.25} aria-hidden className="notice-icon" />
      <p className="notice-text">{message}</p>
    </section>
  )
}
