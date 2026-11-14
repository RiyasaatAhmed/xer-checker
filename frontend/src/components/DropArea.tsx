import { FileUp } from 'lucide-react'
import { useRef } from 'react'
import { MAX_UPLOAD_MB } from '../validate'

interface Props {
  busy: boolean // true while a file is being checked
  onFile: (file: File) => void
}

/** The drop area, as in the demo. A file dropped anywhere on the page is caught by DropOverlay;
 *  a click here opens the file picker. */
export function DropArea({ busy, onFile }: Props) {
  const input = useRef<HTMLInputElement>(null)

  function picked(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // so picking the same file again still triggers a check
    if (file) onFile(file)
  }

  return (
    <>
      <input ref={input} type="file" accept=".xer" hidden onChange={picked} data-testid="file-input" />
      <button type="button" className="drop-area" disabled={busy} onClick={() => input.current?.click()} data-tip={`Or click to pick one. Up to ${MAX_UPLOAD_MB} MB`}>
        <FileUp size={18} strokeWidth={2} aria-hidden />
        <span>{busy ? 'Checking…' : 'Drop a .xer file to check it'}</span>
      </button>
    </>
  )
}
