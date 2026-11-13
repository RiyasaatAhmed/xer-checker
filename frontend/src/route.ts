import { useCallback, useEffect, useState } from 'react'

// Each checked upload has its own address, /uploads/<id>, so refresh, Back and a shared link
// all open the same result. "/" is the empty upload screen.

// ---------- Constants ----------

const UPLOAD_PATH = /^\/uploads\/([0-9a-f-]{36})\/?$/i

/** The upload ID in a path, or null for any other path. */
export function uploadIdIn(path: string): string | null {
  return UPLOAD_PATH.exec(path)?.[1] ?? null
}

/** The path that opens one upload, or the home path for null. */
export function pathFor(uploadId: string | null): string {
  return uploadId ? `/uploads/${uploadId}` : '/'
}

/** The upload ID in the address bar, and a way to change it that adds a history entry. */
export function useUploadRoute(): [string | null, (uploadId: string | null) => void] {
  const [uploadId, setUploadId] = useState(() => uploadIdIn(window.location.pathname))

  useEffect(() => {
    const onBack = () => setUploadId(uploadIdIn(window.location.pathname))
    window.addEventListener('popstate', onBack)
    return () => window.removeEventListener('popstate', onBack)
  }, [])

  const go = useCallback((next: string | null) => {
    if (pathFor(next) !== window.location.pathname) window.history.pushState(null, '', pathFor(next))
    setUploadId(next)
  }, [])

  return [uploadId, go]
}
