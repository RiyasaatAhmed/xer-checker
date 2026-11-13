import { useRef } from 'react'

interface Props {
  busy: boolean // true while a file is being checked
  onFile: (file: File) => void
}

/** One button that opens the file picker for a .xer file. */
export function UploadButton({ busy, onFile }: Props) {
  const input = useRef<HTMLInputElement>(null)

  function picked(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // so picking the same file again still triggers a check
    if (file) onFile(file)
  }

  return (
    <>
      <input ref={input} type="file" accept=".xer" hidden onChange={picked} data-testid="file-input" />
      <button type="button" className="upload-button" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? 'Checking…' : 'Upload a .xer file'}
      </button>
    </>
  )
}
