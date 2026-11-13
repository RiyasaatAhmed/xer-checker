import { FileUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/** Lets a file be dropped anywhere on the page. Shows a full-page target while a file is dragged over. */
export function DropOverlay({ onFile }: { onFile: (file: File) => void }) {
  const [over, setOver] = useState(false)
  const latest = useRef(onFile)
  useEffect(() => {
    latest.current = onFile
  })

  useEffect(() => {
    let depth = 0 // dragenter and dragleave fire for every child element crossed
    const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false
    const enter = (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth += 1
      setOver(true)
    }
    const leave = (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setOver(false)
    }
    const overPage = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault() // allows the drop
    }
    const drop = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault() // the browser would otherwise open the file
      depth = 0
      setOver(false)
      const file = event.dataTransfer?.files[0]
      if (file) latest.current(file)
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', overPage)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', overPage)
      window.removeEventListener('drop', drop)
    }
  }, [])

  if (!over) return null
  return (
    <div className="drop-overlay" aria-hidden="true">
      <div className="drop-overlay-box">
        <FileUp size={36} strokeWidth={1.75} />
        <div className="drop-overlay-title">Drop the .xer file to check it</div>
      </div>
    </div>
  )
}
